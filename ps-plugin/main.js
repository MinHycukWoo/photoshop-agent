// PS Agent 플러그인: MCP 서버(ws://127.0.0.1:8765)에 접속해서 명령을 받아 포토샵에서 실행한다
const { app, action, core } = require("photoshop");
const { storage } = require("uxp");
const firefly = require("./firefly.js");

const SERVER_URL = "ws://127.0.0.1:8765"; // mcp-server/config.json 의 port 와 같아야 한다
// manifest network.domains 는 "all" 이어야 한다: 주소 지정 형식은 PS 28 에서 Permission denied (4단계에서 재검증)
// 대신 접속 주소는 아래 SERVER_URL 하나로 고정돼 있고, 서버는 127.0.0.1 전용 + Origin 허용 목록으로 지킨다
const BUILD = 8; // 새로 로드됐는지 확인용 (코드·manifest 를 바꿀 때마다 올린다)

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

// ── 공통 도우미 ───────────────────────────────────────
function requireDocument() {
  const doc = app.activeDocument;
  if (!doc) throw new Error("열린 문서가 없습니다. ps_create_document 로 먼저 캔버스를 만들어 주세요.");
  return doc;
}

// 레이어 정보를 JSON 으로 (그룹이면 안쪽 레이어까지)
function describeLayer(l) {
  const b = l.bounds;
  const info = {
    id: l.id,
    name: l.name,
    kind: l.kind,
    visible: l.visible,
    opacity: l.opacity,
    bounds: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
  };
  if (l.layers && l.layers.length) info.layers = l.layers.map(describeLayer);
  return info;
}

// batchPlay 는 실패해도 예외 대신 {_obj:"error"} 를 돌려줄 수 있어 직접 검사한다
async function play(descriptors) {
  const results = await action.batchPlay(descriptors, {});
  for (const r of results) {
    if (r && r._obj === "error") throw new Error(`포토샵 명령 실패: ${r.message} (code ${r.result})`);
  }
  return results;
}

// 생성 전후 레이어 id 를 비교해서 새로 생긴 레이어를 찾는다
async function runAndFindNewLayers(doc, commandName, work) {
  const before = new Set(doc.layers.map((l) => l.id));
  const started = Date.now();
  await core.executeAsModal(work, { commandName });
  const newLayers = doc.layers.filter((l) => !before.has(l.id)).map(describeLayer);
  return { seconds: Math.round((Date.now() - started) / 100) / 10, newLayers };
}

// ArrayBuffer → base64 (UXP 에는 Node 의 Buffer 가 없어서 직접 변환)
function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? chars[n & 63] : "=";
  }
  return out;
}

// ── 명령 처리기: MCP 서버가 보낼 수 있는 명령은 여기 있는 것뿐이다 ──
// (임의 코드를 실행하는 명령은 일부러 만들지 않는다)
const handlers = {
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
      pluginBuild: BUILD,
      documentCount: docs.length,
      activeDocumentId: active ? active.id : null,
      documents: docs,
    };
  },

  // 새 캔버스 (공식 DOM API: app.documents.add, 모드·채움은 기본값 RGB·흰색)
  async createDocument({ width, height, name }) {
    let doc;
    await core.executeAsModal(
      async () => {
        doc = await app.documents.add({ width, height, resolution: 72, name });
      },
      { commandName: "PS Agent: 새 문서" },
    );
    return { id: doc.id, name: doc.name, width: doc.width, height: doc.height };
  },

  async listLayers() {
    const doc = requireDocument();
    return {
      documentId: doc.id,
      documentName: doc.name,
      width: doc.width,
      height: doc.height,
      layers: doc.layers.map(describeLayer), // 맨 위 레이어가 먼저
    };
  },

  async generateImage({ prompt }) {
    const doc = requireDocument();
    const r = await runAndFindNewLayers(doc, "PS Agent: 이미지 생성", async () => {
      await play([firefly.generateImage(prompt)]);
    });
    return { documentId: doc.id, ...r };
  },

  async generativeFill({ prompt, left, top, right, bottom }) {
    const doc = requireDocument();
    if (left < 0 || top < 0 || right > doc.width || bottom > doc.height || left >= right || top >= bottom) {
      throw new Error(
        `영역이 캔버스(${doc.width}x${doc.height}) 밖이거나 잘못됐습니다: left ${left}, top ${top}, right ${right}, bottom ${bottom}`,
      );
    }
    const r = await runAndFindNewLayers(doc, "PS Agent: 생성형 채우기", async () => {
      await play([firefly.selectRectangle({ left, top, right, bottom }), firefly.generativeFill(prompt)]);
      // 선택 영역을 남겨 두면 다음 생성에 영향을 줄 수 있어 해제한다 (실패해도 결과에는 영향 없음)
      try {
        await doc.selection.deselect();
      } catch (e) {
        log(`선택 해제 실패(무시): ${e.message}`);
      }
    });
    return { documentId: doc.id, ...r };
  },

  // 보이는 모습 그대로 PNG 로 저장해서 내용을 서버로 보낸다. 실제 파일 저장 위치는 서버가 정한다.
  async exportPng() {
    const doc = requireDocument();
    const tmp = await storage.localFileSystem.getTemporaryFolder(); // 권한 없이 쓸 수 있는 플러그인 임시 폴더
    const file = await tmp.createFile("ps-agent-export.png", { overwrite: true });
    await core.executeAsModal(
      async () => {
        await doc.saveAs.png(file, undefined, true); // true = 사본으로 저장 (작업 문서는 그대로)
      },
      { commandName: "PS Agent: PNG 내보내기" },
    );
    const data = await file.read({ format: storage.formats.binary });
    return { documentId: doc.id, documentName: doc.name, width: doc.width, height: doc.height, pngBase64: toBase64(data) };
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
    log(`▶ ${command}`);
    const result = await handler(params || {});
    socket.send(JSON.stringify({ id, ok: true, result }));
    log(`✔ ${command}`);
  } catch (e) {
    // 실패도 같은 id 로 돌려줘야 서버가 기다리지 않는다
    const message = e && e.message ? e.message : String(e);
    if (socket) socket.send(JSON.stringify({ id, ok: false, error: message }));
    log(`✘ ${command}: ${message}`);
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
log(`플러그인 시작 · 빌드 ${BUILD}`);
