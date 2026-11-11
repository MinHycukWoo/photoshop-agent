// PS Agent 플러그인: MCP 서버(ws://127.0.0.1:8765)에 접속해서 명령을 받아 포토샵에서 실행한다
const { app } = require("photoshop");

const SERVER_URL = "ws://127.0.0.1:8765"; // mcp-server/config.json 의 port 와 같아야 한다

let socket = null;

// ── 화면 표시 ─────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function setState(kind, text) {
  $("dot").className = "dot" + (kind === "on" ? " on" : kind === "wait" ? " wait" : "");
  $("state").textContent = text;
  $("connectBtn").textContent = kind === "off" ? "연결" : "연결 끊기";
}

function log(text) {
  const time = new Date().toLocaleTimeString();
  $("log").textContent = `${time} ${text}\n` + $("log").textContent.slice(0, 2000);
}

// ── 명령 처리기: MCP 서버가 보낼 수 있는 명령은 여기 있는 것뿐이다 ──
const handlers = {
  // 읽기만 하므로 executeAsModal 이 필요 없다
  async status() {
    const docs = app.documents.map((d) => ({
      id: d.id,
      name: d.name,
      width: d.width,
      height: d.height,
      resolution: d.resolution,
      layerCount: d.layers.length,
    }));
    const active = app.activeDocument;
    return {
      // app.version 은 PS 28 에서 null 이라, UXP 의 호스트 정보에서 읽는다 (2단계에서 확인)
      photoshopVersion: require("uxp").host.version,
      documentCount: docs.length,
      activeDocumentId: active ? active.id : null,
      documents: docs,
    };
  },
};

async function handleMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    log("해석할 수 없는 메시지를 받음");
    return;
  }
  const { id, command, params } = msg;
  const handler = handlers[command];
  try {
    if (!handler) throw new Error(`알 수 없는 명령: ${command}`);
    const result = await handler(params || {});
    socket.send(JSON.stringify({ id, ok: true, result }));
    log(`✔ ${command}`);
  } catch (e) {
    // 실패도 같은 id 로 돌려줘야 서버가 기다리지 않는다
    socket.send(JSON.stringify({ id, ok: false, error: e && e.message ? e.message : String(e) }));
    log(`✘ ${command}: ${e && e.message}`);
  }
}

// ── 연결 / 끊기 ───────────────────────────────────────
function connect() {
  setState("wait", "연결 중...");
  try {
    socket = new WebSocket(SERVER_URL);
  } catch (e) {
    setState("off", "연결 안 됨");
    log(`연결 실패: ${e.message}`);
    return;
  }
  socket.onopen = () => {
    setState("on", "MCP 서버에 연결됨");
    log(`연결됨 ${SERVER_URL}`);
  };
  socket.onmessage = (event) => handleMessage(event.data);
  socket.onerror = () => log("연결 오류 (MCP 서버가 실행 중인지 확인)");
  socket.onclose = () => {
    setState("off", "연결 안 됨");
    log("연결 종료");
    socket = null;
  };
}

$("connectBtn").addEventListener("click", () => {
  if (socket) socket.close();
  else connect();
});

setState("off", "연결 안 됨");
// 새로 로드됐는지 확인용 표시 (manifest 를 바꿀 때마다 숫자를 올린다)
log("플러그인 시작 · 빌드 5 (network: all)");
