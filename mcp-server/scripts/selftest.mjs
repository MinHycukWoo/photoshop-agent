// 포토샵 없이 MCP 서버를 점검하는 자동 테스트 (크레딧 사용 없음)
//  ① 도구 목록   ② 미연결 안내   ③ 가짜 플러그인 왕복(status)
//  ④ ps_export_png: PNG 저장 + 미리보기 이미지 반환   ⑤ 위험한 파일 이름이 output/ 밖으로 못 나가는지
// 실행: npm run build 후  node scripts/selftest.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import WebSocket from "ws";

// 실제 사용 포트(8765)와 겹치지 않게 테스트 전용 포트를 쓴다
const PORT = 18765;
// 테스트 기록은 임시 폴더에 (실제 logs/ 와 섞이지 않게)
const LOGS = mkdtempSync(join(tmpdir(), "ps-agent-selftest-"));
const client = new Client({ name: "selftest", version: "0.0.1" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, PS_AGENT_PORT: String(PORT), PS_AGENT_LOGS_DIR: LOGS },
    stderr: "inherit",
  }),
);

const call = (name, args = {}) => client.callTool({ name, arguments: args });
let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failed++;
};

const tools = (await client.listTools()).tools.map((t) => t.name);
check("① 도구 목록", tools.length === 6, tools.join(", "));

const notConnected = await call("ps_status");
check("② 미연결 안내", notConnected.content[0].text.includes("연결"), "ps_status");
const genNotConnected = await call("ps_generate_image", { prompt: "x" });
check("② 미연결 시 생성 도구는 오류", genNotConnected.isError === true);

// 가짜 플러그인: status 와 exportPng 에 답한다 (64x64 빨간 PNG)
const redPng = (await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ff0000" } }).png().toBuffer()).toString("base64");
const fake = new WebSocket(`ws://127.0.0.1:${PORT}`);
await new Promise((r) => fake.on("open", r));
fake.on("message", (raw) => {
  const { id, command } = JSON.parse(raw.toString());
  const result =
    command === "exportPng"
      ? { pngBase64: redPng, documentName: "fake", width: 64, height: 64 }
      : { photoshopVersion: "fake-1.0" };
  fake.send(JSON.stringify({ id, ok: true, result }));
});
await new Promise((r) => setTimeout(r, 200));

const status = await call("ps_status");
check("③ 가짜 플러그인 왕복", status.content[0].text.includes("fake-1.0"));

const exp = await call("ps_export_png", { filename: "selftest" });
const img = exp.content.find((c) => c.type === "image");
const pathText = exp.content.find((c) => c.type === "text")?.text ?? "";
const savedPath = pathText.match(/저장: (.+?\.png)/)?.[1];
check("④ 미리보기 이미지 반환", !!img && img.mimeType === "image/jpeg");
check("④ PNG 파일 저장", !!savedPath && existsSync(savedPath), savedPath);

const evil = await call("ps_export_png", { filename: "../../evil" });
const evilPath = evil.content.find((c) => c.type === "text")?.text.match(/저장: (.+?\.png)/)?.[1] ?? "";
check("⑤ '../../evil' 도 output 안에 저장", /[\\/]output[\\/][^\\/]+\.png$/.test(evilPath), evilPath);

// ⑥ 호출 기록이 logs 에 남았는지 (md: 사람용, jsonl: 프로그램용)
const logFiles = readdirSync(LOGS);
const md = logFiles.find((f) => f.endsWith(".md"));
const jsonl = logFiles.find((f) => f.endsWith(".jsonl"));
const mdText = md ? readFileSync(join(LOGS, md), "utf8") : "";
const lines = jsonl ? readFileSync(join(LOGS, jsonl), "utf8").trim().split("\n") : [];
// (테스트 기록은 임시 폴더라 이미지 링크가 ../output 이 아닌 절대 경로가 된다)
check("⑥ 사람용 기록(.md)에 입력값·이미지 링크", mdText.includes('"filename": "selftest"') && mdText.includes("![결과]("), md);
// 위에서 부른 도구: status, generate_image(미연결), status, export_png ×2 = 5번
check("⑥ 프로그램용 기록(.jsonl) 호출 수", lines.length === 5, `${lines.length}줄`);

// 테스트로 만든 파일 정리
for (const p of [savedPath, evilPath]) if (p && existsSync(p)) rmSync(p);
rmSync(LOGS, { recursive: true, force: true });

fake.close();
await client.close();
console.log(failed ? `\n${failed}개 실패` : "\n모두 통과");
process.exit(failed ? 1 : 0);
