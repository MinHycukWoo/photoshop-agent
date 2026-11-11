// 모든 도구 호출을 logs/ 에 기록한다 (어떤 MCP 클라이언트에서 호출해도 남는다)
//  - YYYY-MM-DD.md    : 사람이 읽는 기록 (VS Code 에서 Ctrl+Shift+V 로 열면 결과 이미지까지 보임)
//  - YYYY-MM-DD.jsonl : 프로그램이 읽는 기록 (한 줄 = 호출 1번)
import { appendFile, mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { SERVER_DIR } from "./config.js";

// 환경 변수 PS_AGENT_LOGS_DIR 이 있으면 그 폴더에 (자동 테스트 기록이 실제 기록에 섞이지 않게)
export const LOGS_DIR = process.env.PS_AGENT_LOGS_DIR || resolve(SERVER_DIR, "..", "logs");

type Content = { type: string; text?: string; data?: string; mimeType?: string };

export interface CallRecord {
  tool: string;
  args: unknown;
  startedAt: Date;
  ms: number;
  isError: boolean;
  content: Content[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export async function logCall(rec: CallRecord) {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const texts = rec.content.filter((c) => c.type === "text").map((c) => c.text ?? "");
    // 결과 글에서 저장된 PNG 경로를 찾아 이미지 링크로 쓴다
    const images = texts.flatMap((t) => [...t.matchAll(/저장: (.+?\.png)/g)].map((m) => m[1]));

    // ① 프로그램용 (이미지 데이터 자체는 빼고 경로만)
    const line = {
      time: rec.startedAt.toISOString(),
      tool: rec.tool,
      args: rec.args,
      ms: rec.ms,
      isError: rec.isError,
      text: texts,
      images,
    };
    await appendFile(join(LOGS_DIR, `${day(rec.startedAt)}.jsonl`), JSON.stringify(line) + "\n");

    // ② 사람용 Markdown
    const status = rec.isError ? "❌ 오류" : "✅";
    const md = [
      `## ${time(rec.startedAt)} \`${rec.tool}\` ${status} · ${(rec.ms / 1000).toFixed(1)}초`,
      "",
      "**입력**",
      "```json",
      JSON.stringify(rec.args ?? {}, null, 2),
      "```",
      "**결과**",
      "```",
      texts.join("\n").slice(0, 3000),
      "```",
      // 이미지 링크는 logs/ 기준 상대 경로 (Markdown 미리보기에서 바로 보이게)
      ...images.map((p) => `![결과](${relative(LOGS_DIR, p).replaceAll("\\", "/")})`),
      "",
      "---",
      "",
    ].join("\n");
    await appendFile(join(LOGS_DIR, `${day(rec.startedAt)}.md`), md);
  } catch (err) {
    // 기록 실패가 도구 실행을 막으면 안 된다
    console.error(`[ps-agent] 로그 기록 실패: ${(err as Error).message}`);
  }
}
