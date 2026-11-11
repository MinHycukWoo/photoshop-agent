// 포토샵 없이 MCP 서버를 점검하는 자동 테스트 (크레딧 사용 없음)
//  ① 도구 목록   ② 미연결 안내   ③ 가짜 플러그인 왕복(status)
//  ④ ps_export_png: PNG 저장 + 미리보기 이미지 반환   ⑤ 위험한 파일 이름이 output/ 밖으로 못 나가는지
//  ⑥ logs 기록   ⑦ 생성 횟수 상한   ⑧ 잘못된 영역 거절   ⑨ 브라우저 Origin 접속 거절
//  ⑩ 서버 2개 동시 실행(relay)   ⑪ 중계소가 꺼지면 relay 가 넘겨받기
//  ⑫ 프롬프트 가이드(RAG)   ⑬ 생성 실패 시 실패 분석   ⑭ 구도 RAG   ⑮ 점검 안 받은 프롬프트 거절   ⑯ 정보 수집관 패턴
// 실행: npm run build 후  node scripts/selftest.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import WebSocket from "ws";

// 실제 사용 포트(8765)와 겹치지 않게 테스트 전용 포트를 쓴다
const PORT = 18765;
// 테스트 기록은 임시 폴더에 (실제 logs/ 와 섞이지 않게)
const LOGS = mkdtempSync(join(tmpdir(), "ps-agent-selftest-"));
// RAG 테스트용으로 "실패 → 고쳐서 성공" 기록 한 쌍을 미리 심어 둔다 (모델이 기록된 실패 = 원인 확실)
writeFileSync(
  join(LOGS, "2000-01-01.jsonl"),
  [
    { time: "2000-01-01T00:00:00.000Z", tool: "ps_generate_image", args: { prompt: "a giant near the Eiffel Tower in Paris" }, isError: true, text: ['생성이 실패했습니다 ("model": "clio3/me_md")'] },
    { time: "2000-01-01T00:01:00.000Z", tool: "ps_generate_image", args: { prompt: "a giant near a tall iron lattice tower on a parisian boulevard" }, isError: false, text: ['{ "seconds": 12, "model": "clio3" }'] },
  ]
    .map((o) => JSON.stringify(o))
    .join("\n") + "\n",
);
const client = new Client({ name: "selftest", version: "0.0.1" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    // 생성 상한을 2로 낮춰서 3번째가 막히는지 본다
    env: { ...process.env, PS_AGENT_PORT: String(PORT), PS_AGENT_LOGS_DIR: LOGS, PS_AGENT_MAX_GENERATIONS: "2" },
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
check("① 도구 목록", tools.length === 7, tools.join(", "));

const notConnected = await call("ps_status");
check("② 미연결 안내", notConnected.content[0].text.includes("연결"), "ps_status");
const genNotConnected = await call("ps_generate_image", { prompt: "x", documentId: 1 });
check("② 미연결 시 생성 도구는 오류", genNotConnected.isError === true);

// 가짜 플러그인: status 와 exportPng 에 답한다 (64x64 빨간 PNG)
const redPng = (await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ff0000" } }).png().toBuffer()).toString("base64");
const fake = new WebSocket(`ws://127.0.0.1:${PORT}`);
await new Promise((r) => fake.on("open", r));
const received = []; // 가짜 플러그인이 받은 명령 (포토샵까지 전달됐는지 확인용)
fake.on("message", (raw) => {
  const { id, command } = JSON.parse(raw.toString());
  received.push(command);
  // 프롬프트에 REJECT 가 있으면 Firefly 거절을 흉내 낸다 (⑬ 실패 분석 테스트용)
  if (command === "generateImage" && String(JSON.parse(raw.toString()).params?.prompt).includes("REJECT")) {
    return fake.send(JSON.stringify({ id, ok: false, error: "생성이 실패했습니다: 포토샵이 0.9초 만에 끝냈지만 새 레이어가 생기지 않았습니다." }));
  }
  const result =
    command === "exportPng"
      ? { pngBase64: redPng, documentName: "fake", width: 64, height: 64 }
      : command === "generateImage" || command === "generativeFill"
        ? { seconds: 0, newLayers: [] }
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
const jsonl = logFiles.find((f) => f.endsWith(".jsonl") && !f.startsWith("2000")); // 미리 심은 RAG 기록은 제외
const mdText = md ? readFileSync(join(LOGS, md), "utf8") : "";
const lines = jsonl ? readFileSync(join(LOGS, jsonl), "utf8").trim().split("\n") : [];
// (테스트 기록은 임시 폴더라 이미지 링크가 ../output 이 아닌 절대 경로가 된다)
check("⑥ 사람용 기록(.md)에 입력값·이미지 링크", mdText.includes('"filename": "selftest"') && mdText.includes("![결과]("), md);
// 위에서 부른 도구: status, generate_image(미연결), status, export_png ×2 = 5번
check("⑥ 프로그램용 기록(.jsonl) 호출 수", lines.length === 5, `${lines.length}줄`);

// ⑦ 생성 횟수 상한 (테스트에서는 2회): 3번째는 포토샵에 보내지 않고 오류
const savedPaths = [savedPath, evilPath];
const pathOf = (r) => r.content.find((c) => c.type === "text")?.text.match(/"savedTo": "(.+?\.png)"/)?.[1]?.replaceAll("\\\\", "\\");
// ⑮ 사전 점검을 안 거친 프롬프트는 크레딧(횟수)을 쓰기 전에 거절된다
const unchecked = await call("ps_generate_image", { prompt: "one", documentId: 1 });
check("⑮ 점검 안 받은 프롬프트는 생성 거절", unchecked.isError === true && unchecked.content[0].text.includes("사전 점검"));
check("⑮ 거절된 생성은 횟수를 쓰지 않음", JSON.parse((await call("ps_status")).content[0].text).generations.used === 0);
// 점검(draft)을 거치면 생성 가능
await call("ps_prompt_guide", { request: "테스트", draft: "one" });
await call("ps_prompt_guide", { request: "테스트", draft: "two" });
const g1 = await call("ps_generate_image", { prompt: "one", documentId: 1 });
const g2 = await call("ps_generative_fill", { prompt: "two", left: 0, top: 0, right: 10, bottom: 10, documentId: 1 });
savedPaths.push(pathOf(g1), pathOf(g2));
check("⑦ 상한 안의 생성은 성공 (1/2, 2/2)", !g1.isError && !g2.isError && g2.content[0].text.includes('"generationCount": "2/2"'));
await call("ps_prompt_guide", { request: "테스트", draft: "three" });
const g3 = await call("ps_generate_image", { prompt: "three", documentId: 1 });
check("⑦ 상한을 넘은 생성은 오류", g3.isError === true && g3.content[0].text.includes("상한"));
check("⑦ 막힌 생성은 포토샵에 전달 안 됨", received.filter((c) => c.startsWith("generat")).length === 2, received.join(","));
const st = JSON.parse((await call("ps_status")).content[0].text);
check("⑦ ps_status 에 남은 횟수 표시", st.generations?.remaining === 0, JSON.stringify(st.generations));

// ⑧ 좌표가 뒤집힌 채우기는 횟수를 쓰기 전에 거절 (상한과 무관하게 영역 오류가 먼저)
await call("ps_prompt_guide", { request: "테스트", draft: "x" });
const bad = await call("ps_generative_fill", { prompt: "x", left: 100, top: 0, right: 50, bottom: 10, documentId: 1 });
check("⑧ 잘못된 영역은 거절", bad.isError === true && bad.content[0].text.includes("영역이 잘못"));

// ⑨ Origin 허용 목록: 웹페이지(https://), 로컬 HTML 파일(null) 은 거절
const tryConnect = (origin) =>
  new Promise((r) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`, { headers: { Origin: origin } });
    ws.on("open", () => (ws.close(), r("열림")));
    ws.on("error", (e) => r(`거절 (${e.message})`));
  });
for (const origin of ["https://evil.example", "null"]) {
  const r = await tryConnect(origin);
  check(`⑨ Origin "${origin}" 접속 거절`, r.startsWith("거절"), r);
}
const st2 = JSON.parse((await call("ps_status")).content[0].text);
check("⑨ 기존 플러그인 연결은 유지", st2.connected === true && st2.rejectedConnections === 2);

// ⑩ 서버가 2개 떠도 동작 (Claude Desktop 이 서버를 2번 실행한 상황 재현)
//    두 번째 서버는 포트를 못 잡으므로 relay 가 되어, 첫 번째 서버(hub)를 거쳐 플러그인에 전달해야 한다
const client2 = new Client({ name: "selftest-2", version: "0.0.1" });
await client2.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, PS_AGENT_PORT: String(PORT), PS_AGENT_LOGS_DIR: LOGS, PS_AGENT_MAX_GENERATIONS: "2" },
    stderr: "inherit",
  }),
);
await new Promise((r) => setTimeout(r, 500)); // relay 가 중계소에 붙을 시간
const status2 = JSON.parse((await client2.callTool({ name: "ps_status", arguments: {} })).content[0].text);
check("⑩ 두 번째 서버는 relay 로 연결됨", status2.serverRole === "relay" && status2.connected === true, `role=${status2.serverRole}`);
const exp2 = await client2.callTool({ name: "ps_export_png", arguments: { filename: "relay" } });
const relayPath = exp2.content.find((c) => c.type === "text")?.text.match(/저장: (.+?\.png)/)?.[1];
savedPaths.push(relayPath);
check("⑩ relay 를 거쳐 PNG 내보내기", !exp2.isError && !!relayPath && existsSync(relayPath));

// ⑫ 프롬프트 가이드(RAG): 가이드 문서 + 과거 사례 + 초안의 실패 표현 점검
const guide = (await client2.callTool({ name: "ps_prompt_guide", arguments: { request: "파리를 걷는 거인", draft: "a giant walking near the Eiffel Tower" } })).content[0].text;
check("⑫ 가이드 문서 포함 (작가·사전 점검 규칙)", guide.includes("# 1. 프롬프트 작성 가이드") && guide.includes("절대 하지 않는 것"));
check("⑫ 과거 '실패→성공' 사례 검색", guide.includes("❌→✅") && guide.includes("lattice"));
check("⑫ 초안의 과거 실패 표현(eiffel) 경고", /⚠️ "eiffel"/.test(guide) && !/"eiffel"[^\n]*원인 불확실/.test(guide));

// ⑭ 구도 RAG: 사용자 말에서 촬영 기법을 찾는다 (어미가 바뀌어도: 따라가며 → 따라가는)
const cam1 = (await client2.callTool({ name: "ps_prompt_guide", arguments: { request: "거인이 질주하는 걸 옆에서 따라가며 찍은 느낌" } })).content[0].text;
check("⑭ '따라가며 · 질주' → 트래킹 · 팬 추천", cam1.includes("## 트래킹") && cam1.includes("## 팬"));
const cam2 = (await client2.callTool({ name: "ps_prompt_guide", arguments: { request: "고양이 그려줘" } })).content[0].text;
check("⑭ 구도 언급 없음 → 기본 제안 + 역동성 재료", cam2.includes("구도·촬영 기법 언급이 없음") && cam2.includes("역동성 재료"));

// ⑯ 정보 수집관 RAG: 웹에서 모은 실제 사용 패턴 중 요청에 맞는 것 (출처 포함)
const pat = (await client2.callTool({ name: "ps_prompt_guide", arguments: { request: "화장품 병 광고 사진" } })).content[0].text;
check("⑯ '화장품 광고' → 제품 사진 패턴 + 출처", pat.includes("## 제품 사진") && /출처: https?:\/\//.test(pat));
check("⑯ 공식 작성 원칙 항상 포함", pat.includes("## Adobe 공식 작성 원칙"));

// ⑬ 생성 실패 시 실패 분석이 붙는다 (원인 추정 + 원인 표 + 비슷한 실패→성공 사례)
await client2.callTool({ name: "ps_prompt_guide", arguments: { request: "테스트", draft: "REJECT a giant near the Eiffel Tower" } });
const rejected = await client2.callTool({ name: "ps_generate_image", arguments: { prompt: "REJECT a giant near the Eiffel Tower", documentId: 1 } });
const rejText = rejected.content[0].text;
check("⑬ 실패 시 [실패 분석] 첨부", rejected.isError === true && rejText.includes("[실패 분석]") && rejText.includes("원인 추정"));
check("⑬ 비슷한 실패→성공 사례 첨부", rejText.includes("실패→성공") && rejText.includes("lattice"));

// ⑪ 중계소(첫 번째 서버)가 꺼지면 relay 가 포트를 넘겨받는다
await client.close(); // 첫 번째 서버 종료 → 가짜 플러그인 연결도 끊김
let role2 = "";
for (let i = 0; i < 20 && role2 !== "hub"; i++) {
  await new Promise((r) => setTimeout(r, 200));
  role2 = JSON.parse((await client2.callTool({ name: "ps_status", arguments: {} })).content[0].text).serverRole;
}
check("⑪ 중계소가 꺼지면 relay 가 새 중계소가 됨", role2 === "hub", `role=${role2}`);
await client2.close();

// 테스트로 만든 파일 정리
for (const p of savedPaths) if (p && existsSync(p)) rmSync(p);
rmSync(LOGS, { recursive: true, force: true });

fake.close();
console.log(failed ? `\n${failed}개 실패` : "\n모두 통과");
process.exit(failed ? 1 : 0);
