// PS Agent 플러그인: MCP 서버(ws://127.0.0.1:8765)에 접속해서 명령을 받아 포토샵에서 실행한다
const { app, action, core, constants } = require("photoshop");
const { storage } = require("uxp");
const firefly = require("./firefly.js");
const cutout = require("./cutout.js");

const SERVER_URL = "ws://127.0.0.1:8765"; // mcp-server/config.json 의 port 와 같아야 한다
// manifest network.domains 는 "all" 이어야 한다: 주소 지정 형식은 PS 28 에서 Permission denied (4단계에서 재검증)
// 대신 접속 주소는 아래 SERVER_URL 하나로 고정돼 있고, 서버는 127.0.0.1 전용 + Origin 허용 목록으로 지킨다
const BUILD = 22; // 새로 로드됐는지 확인용 (코드·manifest 를 바꿀 때마다 올린다)

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
// documentId 가 있으면 그 문서를, 없으면 활성 문서를 쓴다.
// 5단계에서 발견: 새 문서 만들기가 실패했는데 "활성 문서"에 생성해서 엉뚱한 그림에 들어갔다 → 생성은 문서 번호를 꼭 지정한다.
function requireDocument(documentId) {
  if (documentId !== undefined && documentId !== null) {
    let found = null;
    app.documents.forEach((d) => {
      if (d.id === documentId) found = d;
    });
    if (!found) {
      throw new Error(`문서 id ${documentId} 를 찾을 수 없습니다(닫혔을 수 있음). ps_status 로 열린 문서를 확인하고, 다른 문서에 대신 생성하지 말고 사용자에게 알리세요.`);
    }
    return found;
  }
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
  let created = [];
  await core.executeAsModal(
    async () => {
      app.activeDocument = doc; // 지정한 문서에서 작업 (공식 DOM: activeDocument 는 읽기·쓰기)
      await work();
      created = doc.layers.filter((l) => !before.has(l.id));
      // 5단계에서 발견: Firefly 는 새 레이어를 "맨 위"가 아니라 "선택된 레이어 바로 위"에 넣는다.
      // 다른 레이어에 가려지면 저장된 PNG 에 결과가 안 보이므로 맨 위로 옮긴다. (공식 DOM: Layer.move + PLACEBEFORE = 기준 레이어 위로)
      for (const layer of created) {
        if (doc.layers[0].id !== layer.id) layer.move(doc.layers[0], constants.ElementPlacement.PLACEBEFORE);
      }
    },
    { commandName },
  );
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const newLayers = created.map(describeLayer);
  // 옮긴 뒤 정말 맨 위인지 확인 (확인 못 하면 성공으로 보고하지 않는다)
  if (created.length && doc.layers[0].id !== created[created.length - 1].id && !created.some((l) => l.id === doc.layers[0].id)) {
    throw new Error(`새 레이어(${newLayers.map((l) => l.name).join(", ")})는 생겼지만 맨 위로 옮기지 못했습니다. 다른 레이어에 가려져 결과가 보이지 않을 수 있으니 사용자에게 레이어 패널 확인을 부탁하세요.`);
  }
  // 5단계에서 발견: Firefly 가 요청을 거절하면 batchPlay 는 오류 없이 2초쯤 만에 끝나고 레이어만 안 생긴다.
  // "오류가 없으면 성공"이 아니라 "새 레이어가 생겨야 성공"으로 판단한다.
  if (newLayers.length === 0) {
    // 원인은 포토샵이 알려 주지 않으므로 가능한 원인을 모두 알리고, 먼저 화면 확인을 부탁하게 한다
    throw new Error(
      `생성이 실패했습니다: 포토샵이 ${seconds}초 만에 끝냈지만 새 레이어가 생기지 않았습니다 ("model": "${firefly.MODEL.textToImage}/${firefly.MODEL.inPainting}"). 포토샵은 이유를 알려 주지 않습니다. ` +
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

// base64 → ArrayBuffer (toBase64 의 반대)
function fromBase64(text) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = text.replace(/[^A-Za-z0-9+/]/g, ""); // '=' 와 줄바꿈 제거
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let j = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (chars.indexOf(clean[i]) << 18) |
      (chars.indexOf(clean[i + 1]) << 12) |
      ((i + 2 < clean.length ? chars.indexOf(clean[i + 2]) : 0) << 6) |
      (i + 3 < clean.length ? chars.indexOf(clean[i + 3]) : 0);
    bytes[j++] = (n >> 16) & 255;
    if (i + 2 < clean.length) bytes[j++] = (n >> 8) & 255;
    if (i + 3 < clean.length) bytes[j++] = n & 255;
  }
  return bytes.buffer.slice(0, j);
}

// 레이어 픽셀의 "지문": 작은 썸네일(높이 64)을 읽어 숫자 하나로 요약한다 (공식 Imaging API, 모달 안에서 불러야 함)
// 작업 전후 지문이 다르면 픽셀이 바뀐 것
async function layerSignature(doc, layer) {
  const px = await require("photoshop").imaging.getPixels({ documentID: doc.id, layerID: layer.id, targetSize: { height: 64 } });
  const data = await px.imageData.getData();
  let hash = 0;
  for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]) % 1000000007;
  px.imageData.dispose();
  return hash;
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
          `. 지금 열린 문서 ${app.documents.length}개. ` +
          "⚠️ 다른 문서에 대신 생성하지 말고 여기서 멈춘 뒤 사용자에게 알리세요. " +
          "가능한 원인: 열린 문서가 많아 탭 공간이 부족함(안 쓰는 문서를 닫아 달라고 요청), 대화상자·경고 창이 열려 있음(닫아 달라고 요청).",
      );
    });
    return { id: doc.id, name: doc.name, width: doc.width, height: doc.height, via };
  },

  async listLayers({ documentId }) {
    const doc = requireDocument(documentId);
    return {
      documentId: doc.id,
      documentName: doc.name,
      width: doc.width,
      height: doc.height,
      layers: doc.layers.map(describeLayer), // 맨 위 레이어가 먼저
    };
  },

  async generateImage({ prompt, documentId }) {
    const doc = requireDocument(documentId);
    const r = await runAndFindNewLayers(doc, "PS Agent: 이미지 생성", async () => {
      await play([firefly.generateImage(prompt)]);
    });
    // model 을 기록해 두면, 나중에 실패 사례가 "크레딧 한도 시기"인지 구분할 수 있다 (RAG 데이터 품질)
    return { documentId: doc.id, model: firefly.MODEL.textToImage, ...r };
  },

  async generativeFill({ prompt, left, top, right, bottom, documentId }) {
    const doc = requireDocument(documentId);
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
    return { documentId: doc.id, model: firefly.MODEL.inPainting, ...r };
  },

  // 사진 열기: 서버가 input/ 폴더에서 읽어 보낸 파일을 플러그인 임시 폴더에 쓰고 포토샵으로 연다.
  // (임시 폴더는 추가 권한 없이 쓸 수 있어서 manifest 를 바꾸지 않아도 된다. 공식 DOM: app.open(entry))
  async openImage({ fileName, dataBase64 }) {
    const tmp = await storage.localFileSystem.getTemporaryFolder();
    // 실사용에서 발견(빌드 16): 같은 사진을 두 번 열면, 포토샵에 열려 있는 임시 파일을 덮어쓰고 다시 열게 되어
    // 포토샵이 응답하지 않았다(상태 확인까지 120초 멈춤). → 열 때마다 새 폴더를 만들어 파일이 서로 부딪히지 않게 한다.
    // (문서 이름은 원래 파일 이름 그대로 보인다)
    const folder = await tmp.createFolder(`open-${Date.now()}`);
    const file = await folder.createFile(fileName, { overwrite: true }); // 이름은 서버가 안전하게 정리해서 보낸다
    await file.write(fromBase64(dataBase64), { format: storage.formats.binary });
    let doc;
    await core.executeAsModal(
      async () => {
        doc = await app.open(file);
      },
      { commandName: "PS Agent: 사진 열기" },
    ).catch((e) => {
      throw new Error(
        `사진을 열 수 없습니다. 포토샵 오류: ${e && e.message ? e.message : e}. ` +
          "가능한 원인: 포토샵이 지원하지 않는 형식이거나 파일이 손상됨, 대화상자가 열려 있음, 열린 문서가 너무 많음.",
      );
    });
    return { id: doc.id, name: doc.name, width: doc.width, height: doc.height, layers: doc.layers.map(describeLayer) };
  },

  // 누끼: 피사체 선택 → 레이어 마스크 (원본 픽셀은 지우지 않고 가린다 → 나중에 마스크를 고칠 수 있다)
  // backgroundFill: 피사체가 빠진 자리를 어떻게 채울지 — "remove"(AI 제거, 기본) / "generative"(AI 생성형 채우기) / "contentAware"(내용 인식, 무료) / "none"
  // refine: 1차 AI 뒤에 같은 영역을 생성형 채우기(refinePrompt)로 한 번 더 다듬는다 (사용자 요청, 크레딧 1회 추가)
  async removeBackground({
    documentId,
    layerId,
    backgroundFill = "remove",
    expandPercent = 2,
    backgroundPrompt = "",
    refine = false,
    refinePrompt = "",
  }) {
    const doc = requireDocument(documentId);
    let layer = null;
    if (layerId !== undefined && layerId !== null) {
      layer = doc.layers.filter((l) => l.id === layerId)[0] || null; // (기존 코드처럼 filter 사용: 컬렉션에 find 가 있는지 미확인)
      if (!layer) throw new Error(`레이어 id ${layerId} 를 찾을 수 없습니다. ps_list_layers 로 확인하세요.`);
    } else if (doc.layers.length === 1) {
      layer = doc.layers[0];
    } else {
      throw new Error(
        `이 문서에는 레이어가 ${doc.layers.length}개라 어느 레이어의 누끼를 딸지 정할 수 없습니다. ` +
          "ps_list_layers 로 확인한 뒤 layerId 를 지정하세요.",
      );
    }
    // 실사용에서 발견(빌드 15): layer.kind 는 "pixel" 같은 글자인데 constants.LayerKind.PIXEL 과 같지 않아 정상 사진도 거절됐다.
    // → 실제로 돌아오는 글자와 직접 비교한다 (대소문자 무시: 스마트 오브젝트는 "smartObject")
    const kind = String(layer.kind).toLowerCase();
    if (kind !== "pixel" && kind !== "smartobject") {
      throw new Error(`"${layer.name}" 은 ${layer.kind} 레이어라 누끼를 딸 수 없습니다. 사진(픽셀) 레이어를 지정하세요.`);
    }

    // 결과는 세 레이어 (사용자 요청: 원본 · 누끼 딴 피사체 · 피사체가 제거된 배경이 각각 있어야 한다)
    //   위   "피사체"              원본 복제 + 레이어 마스크
    //   가운데 "배경 (피사체 제거)"   원본 복제에서 피사체 자리를 채움
    //   아래  "원본"                손대지 않음, 숨김
    const started = Date.now();
    let subject = null;
    let cleanBg = null;
    let original = null;
    let subjectBounds = null;
    let coverage = null;
    let fillInfo = { method: backgroundFill, refine };

    // AI 한 번 실행 + 결과 확인 + 배경에 합치기 (현재 선택 영역, 현재 레이어 = cleanBg 기준)
    // kind: "remove" | "generative". 모달 안에서만 부른다.
    const aiPass = async (kind, prompt) => {
      const info = { kind };
      const label = kind === "remove" ? "AI 제거(Remove)" : "AI 생성형 채우기";
      doc.activeLayers = [cleanBg];
      const before = new Set(doc.layers.map((l) => l.id));
      // 제거는 결과가 새 레이어 없이 현재 레이어를 직접 고칠 수도 있어서, 전후 픽셀을 비교해 성공을 판정한다
      const beforeSig = await layerSignature(doc, cleanBg);
      const t0 = Date.now();
      if (kind === "remove") {
        await play([cutout.removeButton()]);
      } else {
        await play([firefly.generativeFill(prompt)]);
        info.prompt = prompt;
        info.model = firefly.MODEL.inPainting;
      }
      const created = doc.layers.filter((l) => !before.has(l.id));
      info.seconds = Math.round((Date.now() - t0) / 100) / 10;
      info.newLayer = created.length > 0; // 결과가 새 레이어로 나오는지 기록 (제거 버튼은 처음 확인하는 동작)
      if (created.length === 0) {
        if ((await layerSignature(doc, cleanBg)) === beforeSig) {
          // 5단계와 같은 "거짓 성공" 판정: 결과가 없으면 실패 (예외 → 누끼까지 모두 되돌림)
          throw new Error(
            `${label}가 실패했습니다: 포토샵이 ${info.seconds}초 만에 끝냈지만 새 레이어도, 배경의 변화도 없습니다. 누끼도 함께 되돌렸습니다. ` +
              "가능한 원인: ① 크레딧 부족으로 구매 창이 뜸 ② 로그인 만료 ③ Firefly 거절. 먼저 포토샵 화면에 창이 떠 있는지 사용자에게 확인하세요. " +
              "다른 방식(backgroundFill 변경, refine 끄기)으로 다시 시도할 수 있습니다.",
          );
        }
        info.merged = "배경 레이어가 직접 바뀜";
        return info;
      }
      // 생성된 레이어(마스크 달린 Generative Layer)를 배경에 합쳐 한 장으로 만든다 (공식 DOM: Layer.merge = 아래 레이어와 병합)
      const gen = created[0];
      try {
        doc.activeLayers = [gen];
        cleanBg = await gen.merge();
        cleanBg.name = "배경 (피사체 제거)";
        info.merged = true;
      } catch (e) {
        // 합치지 못하면 따로 둔다 (결과는 같다: 배경 위에 채운 부분이 덮인다)
        gen.name = "배경 채움 (AI)";
        info.merged = false;
        info.mergeError = e.message;
        log(`AI 채움 레이어 병합 실패(따로 둠): ${e.message}`);
      }
      return info;
    };

    await core.executeAsModal(
      async (ctx) => {
        app.activeDocument = doc;
        // 여러 단계를 히스토리 1칸으로 묶는다 → 사용자가 Ctrl+Z 한 번으로 되돌릴 수 있다 (공식: hostControl.suspendHistory)
        // 중간에 예외가 나면 묶음이 취소되어 원래대로 돌아간다
        const historyId = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "PS Agent: 누끼" });
        doc.activeLayers = [layer]; // 녹화 명령은 "현재 레이어"에 적용되므로 대상 레이어를 선택해 둔다 (공식 DOM, 26.9+)
        if (layer.isBackgroundLayer) await play([cutout.convertBackgroundToLayer()]); // 잠긴 배경엔 마스크를 못 단다
        original = doc.activeLayers[0];
        original.name = "원본";
        cleanBg = await original.duplicate(); // 공식 DOM: 복제본은 원래 레이어 바로 위에 생긴다
        cleanBg.name = "배경 (피사체 제거)";
        subject = await cleanBg.duplicate();
        subject.name = "피사체";
        doc.activeLayers = [subject];

        await play([cutout.selectSubject()]); // 현재 레이어(피사체 복제본)만 보고 찾는다
        const b = doc.selection.bounds;
        if (!b || b.right - b.left < 1 || b.bottom - b.top < 1) {
          throw new Error("피사체를 찾지 못했습니다(선택 영역이 비어 있음). 피사체가 뚜렷한 사진인지 확인해 주세요.");
        }
        subjectBounds = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
        await play([cutout.maskFromSelection()]);
        await doc.selection.deselect();

        // 성공 판정은 "오류 없음"이 아니라 "마스크가 실제로 생겼는지"로 한다 (공식 Imaging API: getLayerMask)
        // 실사용에서 발견(빌드 17): 모달 밖에서 부르면 실패한다 → 모달 안에서 확인
        try {
          const mask = await require("photoshop").imaging.getLayerMask({
            documentID: doc.id,
            layerID: subject.id,
            targetSize: { height: 64 }, // 확인용이라 작게
          });
          const data = await mask.imageData.getData();
          let shown = 0;
          for (const v of data) if (v > 127) shown++;
          coverage = Math.round((shown / data.length) * 100); // 마스크에서 "보이는" 부분의 비율
          mask.imageData.dispose();
        } catch (e) {
          throw new Error(`피사체 선택은 됐지만 레이어 마스크를 확인할 수 없어 되돌렸습니다: ${e.message}`);
        }

        // 배경 레이어에서 피사체 자리를 채운다
        if (backgroundFill !== "none") {
          doc.activeLayers = [cleanBg];
          await play([cutout.selectSubject()]); // 같은 픽셀이라 피사체 레이어와 같은 영역이 잡힌다
          // 선택을 넓혀서 채운다 — 공식 DOM: Selection.expand
          // 실사용에서 발견(빌드 19): 0.5%(14px)로는 잔머리·벽에 진 그림자가 선택 밖에 남아 배경에 얼룩으로 남았다 → 기본 2%
          const grow = Math.max(4, Math.round((Math.max(doc.width, doc.height) * expandPercent) / 100));
          await doc.selection.expand(grow);
          fillInfo.expandedPx = grow;

          // 다듬기(2차 AI)에서 같은 영역을 다시 쓰려고 선택 영역을 보관한다 (1차 뒤엔 피사체가 지워져 다시 선택할 수 없다)
          // 공식 Imaging API: getSelection / putSelection
          let savedSelection = null;
          if (refine && backgroundFill !== "contentAware") {
            try {
              savedSelection = await require("photoshop").imaging.getSelection({ documentID: doc.id });
            } catch (e) {
              fillInfo.refineSkipped = `선택 영역을 보관하지 못함: ${e.message}`;
            }
          }

          if (backgroundFill === "contentAware") {
            await play([cutout.contentAwareFill()]); // 레이어 픽셀을 직접 채움 (크레딧 없음)
          } else {
            // 1차 AI:
            //  - "remove": 제거(Remove) 버튼 — 지우기 전용 AI. 주변에 맞춰 "없던 것처럼" 메운다 (gen-remove 녹화)
            //  - "generative": 생성형 채우기 — 1단계에서 검증. 빈 프롬프트면 주변에 맞춰 채우지만, 뭔가를 그려 넣는 경향이 있었다(빌드 19~20)
            fillInfo.pass1 = await aiPass(backgroundFill, backgroundPrompt);

            // 2차 AI (다듬기): 같은 영역을 생성형 채우기로 "주변과 이어지게" 다시 그린다 (사용자 요청)
            if (refine && savedSelection) {
              doc.activeLayers = [cleanBg];
              if (!doc.selection.bounds) {
                try {
                  await require("photoshop").imaging.putSelection({ documentID: doc.id, imageData: savedSelection.imageData });
                } catch (e) {
                  fillInfo.refineSkipped = `선택 영역을 되살리지 못함: ${e.message}`;
                }
              }
              if (doc.selection.bounds) fillInfo.pass2 = await aiPass("generative", refinePrompt);
            }
          }
          if (savedSelection) savedSelection.imageData.dispose();
          await doc.selection.deselect();
        }
        original.visible = false; // 원본은 보관용으로 숨긴다
        doc.activeLayers = [subject];
        await ctx.hostControl.resumeHistory(historyId);
      },
      { commandName: "PS Agent: 누끼" },
    );
    // AI 채움 레이어를 따로 둔 경우 그 레이어도 "배경" 쪽으로 본다
    const extraBgLayers = doc.layers.filter((l) => l.name === "배경 채움 (AI)").map((l) => l.id);
    return {
      documentId: doc.id,
      documentName: doc.name,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      subjectLayer: describeLayer(subject),
      backgroundLayer: describeLayer(cleanBg),
      originalLayer: describeLayer(original),
      extraBackgroundLayerIds: extraBgLayers,
      backgroundFill: fillInfo,
      subjectBounds,
      subjectCoveragePercent: coverage,
    };
  },

  // 보이는 모습 그대로 PNG 로 저장해서 내용을 서버로 보낸다. 실제 파일 저장 위치는 서버가 정한다.
  // hideLayerIds: 저장하는 동안만 숨길 레이어 (예: 누끼 결과에서 피사체만 저장하려고 배경을 숨김). 끝나면 원래대로.
  async exportPng({ documentId, hideLayerIds }) {
    const doc = requireDocument(documentId);
    const tmp = await storage.localFileSystem.getTemporaryFolder(); // 권한 없이 쓸 수 있는 플러그인 임시 폴더
    const file = await tmp.createFile("ps-agent-export.png", { overwrite: true });
    const toHide = (hideLayerIds || []).length ? doc.layers.filter((l) => hideLayerIds.includes(l.id) && l.visible) : [];
    await core.executeAsModal(
      async (ctx) => {
        // 숨겼다 켜는 것도 히스토리에 남으므로 1칸으로 묶는다
        const historyId = toHide.length ? await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "PS Agent: PNG 내보내기" }) : null;
        try {
          for (const l of toHide) l.visible = false;
          await doc.saveAs.png(file, undefined, true); // true = 사본으로 저장 (작업 문서는 그대로)
        } finally {
          for (const l of toHide) l.visible = true; // 실패해도 다시 보이게
        }
        if (historyId !== null) await ctx.hostControl.resumeHistory(historyId);
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
