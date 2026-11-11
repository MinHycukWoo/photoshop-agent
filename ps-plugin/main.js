// PS Agent 플러그인: MCP 서버(ws://127.0.0.1:8765)에 접속해서 명령을 받아 포토샵에서 실행한다
const { app, action, core } = require("photoshop");
const { storage } = require("uxp");
const firefly = require("./firefly.js");

const SERVER_URL = "ws://127.0.0.1:8765"; // mcp-server/config.json 의 port 와 같아야 한다
// manifest network.domains 는 "all" 이어야 한다: 주소 지정 형식은 PS 28 에서 Permission denied (4단계에서 재검증)
// 대신 접속 주소는 아래 SERVER_URL 하나로 고정돼 있고, 서버는 127.0.0.1 전용 + Origin 허용 목록으로 지킨다
const BUILD = 12; // 새로 로드됐는지 확인용 (코드·manifest 를 바꿀 때마다 올린다)

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
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const newLayers = doc.layers.filter((l) => !before.has(l.id)).map(describeLayer);
  // 5단계에서 발견: Firefly 가 요청을 거절하면 batchPlay 는 오류 없이 2초쯤 만에 끝나고 레이어만 안 생긴다.
  // "오류가 없으면 성공"이 아니라 "새 레이어가 생겨야 성공"으로 판단한다.
  if (newLayers.length === 0) {
    // 원인은 포토샵이 알려 주지 않으므로 가능한 원인을 모두 알리고, 먼저 화면 확인을 부탁하게 한다
    throw new Error(
      `생성이 실패했습니다: 포토샵이 ${seconds}초 만에 끝냈지만 새 레이어가 생기지 않았습니다. 포토샵은 이유를 알려 주지 않습니다. ` +
        "가능한 원인: ① 크레딧·체험 횟수 부족으로 포토샵에 크레딧 구매 창이 뜸 ② Firefly 콘텐츠 정책 거절(폭력·공포·실존 인물·상표 등) ③ 로그인 만료. " +
        "먼저 사용자에게 포토샵 화면에 창이나 알림이 떠 있는지 확인해 달라고 하세요. 창이 떠 있으면 닫아야 다음 명령이 실행됩니다. " +
        "창이 없었다면 표현을 순화해 다시 시도할 수 있습니다.",
    );
  }
  return { seconds, newLayers };
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
      generativeModels: firefly.MODEL, // 지금 쓰는 생성 모델 (표준 크레딧용)
      documentCount: docs.length,
      activeDocumentId: active ? active.id : null,
      documents: docs,
    };
  },

  // 새 캔버스 (공식 DOM API: app.documents.add, 모드·채움은 기본값 RGB·흰색)
  // 5단계에서 발견: DOM 이 "Failed to create new document with given parameters." 만 돌려줘서 원인을 알 수 없었다.
  // → 실패하면 1단계에서 녹화로 확인한 batchPlay "make" 로 한 번 더 시도하고, 그것도 실패하면 포토샵의 자세한 오류를 돌려준다.
  async createDocument({ width, height, name }) {
    let doc;
    let domError = null;
    let via = "documents.add";
    await core.executeAsModal(
      async () => {
        try {
          doc = await app.documents.add({ width, height, resolution: 72, name });
        } catch (e) {
          domError = e && e.message ? e.message : String(e);
          log(`documents.add 실패 → batchPlay make 로 재시도: ${domError}`);
          via = "batchPlay make (이름 지정 없음)";
          await play([firefly.makeDocument({ width, height })]); // 실패하면 포토샵의 오류 메시지로 예외
          doc = app.activeDocument;
        }
      },
      { commandName: "PS Agent: 새 문서" },
    ).catch((e) => {
      const detail = e && e.message ? e.message : String(e);
      throw new Error(
        `새 문서를 만들 수 없습니다. 포토샵 오류: ${detail}` +
          (domError ? ` (먼저 documents.add 도 실패: ${domError})` : "") +
          ". 포토샵에 대화상자나 경고 창이 열려 있으면 다른 명령이 막히므로, 사용자에게 포토샵 화면을 확인해 달라고 요청하세요.",
      );
    });
    return { id: doc.id, name: doc.name, width: doc.width, height: doc.height, via };
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
    let message = e && e.message ? e.message : String(e);
    // 포토샵에 창(대화상자·크레딧 구매 창 등)이 열려 있으면 모든 명령이 이 오류로 막힌다 (5단계에서 확인)
    if (/modal state/i.test(message)) {
      message =
        "포토샵에 창(대화상자·경고·크레딧 구매 창 등)이 열려 있어 명령을 실행할 수 없습니다. " +
        `사용자에게 포토샵 화면의 창을 닫아 달라고 요청한 뒤 다시 시도하세요. (원문: ${message})`;
    }
    if (socket) socket.send(JSON.stringify({ id, ok: false, error: message }));
    log(`✘ ${command}: ${message}`);
  }
}

// ── 연결 / 끊기 ───────────────────────────────────────
// 사용자가 "연결"을 누른 뒤에는 연결이 끊겨도 자동으로 다시 붙는다.
// (Claude Desktop 이 MCP 서버를 다시 띄우거나, 서버가 여러 개라 중계소가 바뀔 때)
const RETRY_MS = 2000;
let wantConnected = false; // 사용자가 연결을 원하는 상태인지
let retryTimer = null;
let retrying = false; // 재연결 중에는 로그를 한 번만 남긴다

function connect() {
  clearTimeout(retryTimer);
  setState("wait", retrying ? "재연결 대기 중..." : "연결 중...");
  try {
    socket = new WebSocket(SERVER_URL);
  } catch (e) {
    socket = null;
    log(`연결 실패: ${e.message}`);
    scheduleRetry();
    return;
  }
  socket.onopen = () => {
    retrying = false;
    setState("on", "MCP 서버에 연결됨");
    log(`연결됨 ${SERVER_URL}`);
  };
  socket.onmessage = (event) => handleMessage(event.data);
  socket.onerror = () => {
    if (!retrying) log("연결 오류 (MCP 서버가 실행 중인지 확인)");
  };
  socket.onclose = () => {
    socket = null;
    if (wantConnected) {
      if (!retrying) log(`연결 끊김 → ${RETRY_MS / 1000}초마다 다시 연결 시도`);
      scheduleRetry();
    } else {
      setState("off", "연결 안 됨");
      log("연결 종료");
    }
  };
}

function scheduleRetry() {
  if (!wantConnected) return setState("off", "연결 안 됨");
  retrying = true;
  setState("wait", "재연결 대기 중...");
  retryTimer = setTimeout(connect, RETRY_MS);
}

$("connectBtn").addEventListener("click", () => {
  if (wantConnected) {
    // 연결 끊기: 자동 재연결도 멈춘다
    wantConnected = false;
    retrying = false;
    clearTimeout(retryTimer);
    if (socket) socket.close();
    else setState("off", "연결 안 됨");
  } else {
    wantConnected = true;
    connect();
  }
});

setState("off", "연결 안 됨");
log(`플러그인 시작 · 빌드 ${BUILD}`);
