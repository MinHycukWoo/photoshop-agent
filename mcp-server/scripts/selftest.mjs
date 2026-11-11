// 포토샵 없이 MCP 서버를 점검하는 자동 테스트
//  1) MCP 클라이언트로 서버를 실행 → 도구 목록 확인
//  2) 플러그인 미연결 상태에서 ps_status → "연결 버튼을 눌러 주세요" 안내가 나오는지
//  3) 가짜 플러그인(WebSocket 클라이언트)을 붙여 ps_status → 응답이 id 로 매칭되어 돌아오는지
// 실행: npm run build 후  node scripts/selftest.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import WebSocket from "ws";

const client = new Client({ name: "selftest", version: "0.0.1" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/index.js"], stderr: "inherit" }));

const tools = await client.listTools();
console.log("① 도구 목록:", tools.tools.map((t) => t.name).join(", "));

const callStatus = async () => (await client.callTool({ name: "ps_status", arguments: {} })).content[0].text;
console.log("② 미연결 상태:", await callStatus());

// 가짜 플러그인: status 명령을 받으면 그럴듯한 답을 보낸다
const fake = new WebSocket("ws://127.0.0.1:8765");
await new Promise((r) => fake.on("open", r));
fake.on("message", (raw) => {
  const { id, command } = JSON.parse(raw.toString());
  fake.send(JSON.stringify({ id, ok: true, result: { photoshopVersion: "fake-1.0", command } }));
});
await new Promise((r) => setTimeout(r, 200)); // 서버가 접속을 처리할 시간
console.log("③ 가짜 플러그인 연결:", await callStatus());

fake.close();
await client.close();
