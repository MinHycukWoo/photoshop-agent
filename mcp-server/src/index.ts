// MCP 서버 진입점: Claude(클라이언트)에게 도구 목록을 알려 주고, 호출되면 포토샵으로 전달한다
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { PhotoshopBridge, NOT_CONNECTED_MESSAGE, log } from "./bridge.js";
import { savePng } from "./output.js";
import { logCall } from "./logger.js";
import { GenerationBudget } from "./credits.js";
import {
  readGuide,
  loadCases,
  findRepairPairs,
  searchCases,
  riskyWords,
  formatCase,
  formatPair,
  loadCameraTechniques,
  loadPromptPatterns,
  searchCamera,
  DEFAULT_CAMERA_SUGGESTIONS,
} from "./knowledge.js";

const config = loadConfig();
const bridge = new PhotoshopBridge(config.port, config.requestTimeoutMs);
const budget = new GenerationBudget(config.maxGenerationsPerRun); // 생성 횟수 상한 (크레딧 보호)

// instructions: MCP 클라이언트(Claude)에게 주는 "작업 순서 안내문".
// 프롬프트 작가 · 사전 점검 · 실패 분석 역할을 Claude 가 이 순서대로 수행하게 한다.
const INSTRUCTIONS = `Photoshop 생성형 AI 작업 순서 (반드시 이 순서를 지킨다):
1) [프롬프트 작가] ps_prompt_guide(request=사용자 요청) 를 호출해 가이드·카메라 구도 추천·과거 사례를 읽고,
   사용자 요청(한국어여도)을 Firefly 용 영어 프롬프트로 작성한다.
   [구도] "카메라·구도 추천" 을 반드시 반영한다. "가운데에 정면으로 서 있는" 기본 구도는 피하고,
   동작(동사) + 카메라 기법 + 환경 반응을 함께 써서 역동성을 만든다.
2) [사전 점검] 완성한 영어 프롬프트를 ps_prompt_guide(request, draft=그 프롬프트) 로 다시 점검한다.
   점검받지 않은 프롬프트는 ps_generate_image / ps_generative_fill 이 거절한다.
   캐릭터·브랜드·실존 인물·유명 건축물 이름, 선정성·잔혹함 등 거절될 요소가 있으면 policy 규칙대로
   내용 자체를 허용되는 방향으로 정직하게 바꾼다(예: 특정 캐릭터 → 오리지널 캐릭터).
   거절될 내용을 철자·암시·우회 표현으로 숨겨 통과시키는 일은 하지 않는다. 사용자의 목적 자체가 그런 결과라면 만들지 않는다고 말하고 대안을 제안한다.
3) [사용자 확인] 생성(크레딧 사용) 전에 사용자에게 아래를 보여 주고 "이대로 만들까요?" 라고 묻는다:
   ① 영어 프롬프트 전문 ② 한국어 뜻 ③ 적용한 구도·촬영 기법과 이유 ④ 다른 구도 선택지 2개(한 줄씩) ⑤ 요청에서 바꾼 점(있으면)
   사용자가 처음부터 "확인 없이 바로 만들어" 라고 했을 때만 생략한다.
4) 새 그림이거나 크기를 지정받았으면 ps_create_document 로 캔버스를 만들고, 그 결과의 id 를 documentId 로 넘겨 생성한다.
   ps_create_document 가 실패하면 다른 문서에 대신 생성하지 말고 멈춘 뒤 사용자에게 원인과 해결 방법을 알린다.
5) [실패 분석] 생성이 실패하면 오류에 붙은 "실패 분석" 을 따른다. 먼저 포토샵 화면에 창이 떠 있는지 사용자에게 확인하고,
   콘텐츠 정책 거절로 보일 때만 2) 규칙으로 고친 프롬프트를 다시 점검·확인받아 재시도한다.
6) 결과 미리보기 이미지를 보고 요청(특히 구도·동작)과 비교해, 다른 점이 있으면 솔직하게 알린다.`;

// 사전 점검(ps_prompt_guide 의 draft)을 거친 프롬프트만 생성할 수 있게 기록해 둔다
const checkedPrompts = new Set<string>();
const normalizePrompt = (p: string) => p.trim().replace(/\s+/g, " ").toLowerCase();
function requireChecked(p: string) {
  if (!checkedPrompts.has(normalizePrompt(p))) {
    throw new Error(
      "이 프롬프트는 아직 사전 점검을 받지 않아 생성하지 않았습니다(크레딧 사용 없음). " +
        "ps_prompt_guide 에 request(사용자 요청)와 draft(이 프롬프트 그대로)를 넣어 점검한 뒤, " +
        "사용자에게 영어 프롬프트·한국어 뜻·적용한 구도·다른 구도 2개를 보여 주고 확인받아 다시 호출하세요.",
    );
  }
}

const server = new McpServer({ name: "photoshop-agent", version: "0.3.0" }, { instructions: INSTRUCTIONS });

// 생성 도구가 실패하면, 원인 추정 + 실패 원인 가이드 + 비슷한 "실패→성공" 사례를 오류에 붙여 돌려준다 (실패 분석 역할)
async function withFailureHelp<T>(prompt: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    const message = (err as Error).message;
    const guess = /창이 열려|modal state/i.test(message)
      ? "포토샵에 창(크레딧 구매 창·경고 등)이 열려 있음 → 사용자에게 창을 닫아 달라고 요청"
      : /생성이 실패했습니다/.test(message)
        ? "거절 또는 크레딧·체험 한도 → 먼저 포토샵 화면 확인, 창이 없었다면 콘텐츠 정책 거절로 보고 정직하게 고쳐 1회 재시도"
        : /응답하지 않았습니다/.test(message)
          ? "시간 초과 → 포토샵 화면 확인"
          : "아래 표에서 신호가 맞는 원인을 찾을 것";
    const pairs = findRepairPairs(await loadCases());
    const similar = pairs
      .map((p) => ({ p, risky: riskyWords(prompt, [p]).length }))
      .filter((x) => x.risky > 0)
      .slice(-3)
      .map((x) => formatPair(x.p));
    throw new Error(
      `${message}\n\n[실패 분석]\n원인 추정: ${guess}\n\n${await readGuide("failure-causes.md")}` +
        (similar.length ? `\n\n[이 프롬프트와 겹치는 과거 "실패→성공" 사례]\n${similar.join("\n")}` : ""),
    );
  }
}

// server.registerTool 대신 이걸 쓰면, 모든 도구 호출이 logs/ 에 자동으로 기록된다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const register: typeof server.registerTool = (name: string, toolConfig: any, handler: any) =>
  server.registerTool(name, toolConfig, async (...cbArgs: any[]) => {
    // 입력이 없는 도구는 첫 인자가 입력값이 아니라 요청 정보라서 기록하지 않는다
    const args = toolConfig.inputSchema ? cbArgs[0] : {};
    const startedAt = new Date();
    const result = await handler(...cbArgs);
    await logCall({
      tool: name,
      args,
      startedAt,
      ms: Date.now() - startedAt.getTime(),
      isError: !!result.isError,
      content: result.content,
    });
    return result;
  });

// ── 결과 만들기 도우미 ────────────────────────────────
type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

const text = (value: unknown): Content => ({
  type: "text",
  text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
});

const fail = (message: string) => ({ content: [text(message)], isError: true });

// 도구 실행을 감싸서, 연결 안 됨·포토샵 오류를 Claude 가 읽을 수 있는 오류 결과로 바꾼다
async function guarded(work: () => Promise<Content[]>) {
  if (bridge.listenError) return fail(bridge.listenError);
  if (!bridge.isConnected) return fail(NOT_CONNECTED_MESSAGE);
  try {
    return { content: await work() };
  } catch (err) {
    return fail((err as Error).message);
  }
}

// 현재 문서를 PNG 로 받아 output/ 에 저장하고, [설명 텍스트, 미리보기 이미지] 를 만든다
async function exportAndShow(name: string, documentId?: number): Promise<{ path: string; content: Content[] }> {
  const r = (await bridge.send("exportPng", { documentId })) as { pngBase64: string; documentName: string; width: number; height: number };
  const saved = await savePng(r.pngBase64, name || r.documentName);
  return {
    path: saved.path,
    content: [
      {
        type: "image",
        data: saved.previewBase64,
        mimeType: "image/jpeg",
      },
      text(
        `저장: ${saved.path} (원본 ${r.width}x${r.height} PNG, 위 이미지는 ${saved.previewSize.width}x${saved.previewSize.height} 미리보기)`,
      ),
    ],
  };
}

const prompt = z
  .string()
  .min(1)
  .max(1000)
  .describe("만들 내용을 묘사하는 프롬프트. 영어가 결과가 가장 안정적이다. 예: 'a cat sitting by a window, watercolor'");

// ── 도구 등록 ─────────────────────────────────────────
// description 은 Claude 가 "언제 이 도구를 쓸지" 판단하는 글이라, 언제 쓰고 언제 쓰지 않는지를 분명히 쓴다

register(
  "ps_status",
  {
    title: "포토샵 연결 상태",
    description:
      "Photoshop 플러그인 연결 여부, Photoshop 버전, 열린 문서 목록(이름·크기·레이어 수), 현재 활성 문서, " +
      "이번 실행에서 남은 생성 횟수(generations.remaining)를 확인한다. " +
      "포토샵 작업을 시작하기 전이나 다른 도구가 연결 오류를 냈을 때 먼저 호출한다. " +
      "생성형 크레딧을 쓰지 않고 문서를 바꾸지 않는 읽기 전용 도구다.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    if (bridge.listenError) return fail(bridge.listenError);
    const serverInfo = {
      serverRole: bridge.role, // hub = 플러그인과 직접 연결, relay = 다른 서버를 거쳐 연결
      generations: budget.status,
      pluginOrigin: bridge.pluginOrigin,
      rejectedConnections: bridge.rejectedCount,
    };
    if (!bridge.isConnected) {
      // 연결 안 된 것도 "상태"이므로 오류가 아니라 정상 결과로 알려 준다
      return { content: [text({ connected: false, message: NOT_CONNECTED_MESSAGE, ...serverInfo })] };
    }
    return guarded(async () => [text({ connected: true, ...((await bridge.send("status")) as object), ...serverInfo })]);
  },
);

register(
  "ps_prompt_guide",
  {
    title: "프롬프트 작성 가이드 · 사전 점검 (RAG)",
    description:
      "이미지를 생성하기 전에 호출한다. Firefly 영어 프롬프트 작성 가이드, 요청에 맞는 카메라·구도·촬영 기법 추천(팬·틸트·트래킹·로우 앵글 등), 거절될 요소를 정직하게 바꾸는 규칙, " +
      "그리고 이 PC 의 실제 생성 기록에서 찾은 비슷한 과거 성공·실패 사례와 '실패→고쳐서 성공' 사례를 돌려준다. " +
      "draft(영어 초안)를 주면 과거에 실패했던 표현이 들어 있는지도 점검한다. " +
      "사용자 요청이 한국어여도 이 결과를 참고해 영어 프롬프트를 쓴다. 포토샵을 건드리지 않고 크레딧을 쓰지 않는다.",
    inputSchema: {
      request: z.string().min(1).max(2000).describe("사용자의 요청 원문 (한국어 가능). 예: '비 오는 파리를 걷는 판타지 거인, 실사풍'"),
      draft: z.string().max(2000).optional().describe("작성한 영어 프롬프트 초안 (있으면 과거 실패 표현을 점검)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ request, draft }) => {
    if (draft) checkedPrompts.add(normalizePrompt(draft)); // 이 초안은 사전 점검을 거쳤다 → 생성 허용
    const cases = await loadCases();
    const pairs = findRepairPairs(cases);
    const similar = searchCases(cases, `${request} ${draft ?? ""}`, 5);
    const risky = draft ? riskyWords(draft, pairs) : [];

    // 구도 RAG: 사용자 말에서 원하는 촬영 기법을 찾는다. 없으면 성격이 다른 기본 선택지를 준다.
    const techniques = await loadCameraTechniques();
    const matched = searchCamera(techniques, request);
    const cameraSection = matched.length
      ? `요청에서 찾은 기법 (키워드 일치):\n\n` +
        matched.map((t) => `## ${t.title}  ← 일치: ${t.hits.join(", ")}\n${t.body}`).join("\n\n")
      : "요청에 구도·촬영 기법 언급이 없음 → 가운데 정면을 피하고, 장면에 맞는 것을 골라 적용한 뒤 다른 2개를 한 줄씩 제안할 것.\n\n" +
        techniques
          .filter((t) => DEFAULT_CAMERA_SUGGESTIONS.includes(t.title))
          .map((t) => `## ${t.title}\n${t.body}`)
          .join("\n\n");
    const dynamicTips = techniques.find((t) => t.title === "동작 어휘");

    // 정보 수집관 RAG: 웹에서 모은 실제 사용 패턴 중 요청·초안에 맞는 것 (영어 초안 단어로도 찾는다)
    const patterns = await loadPromptPatterns();
    const matchedPatterns = searchCamera(patterns, `${request} ${draft ?? ""}`, 3);
    const basics = patterns.find((p) => p.title === "Adobe 공식 작성 원칙");
    const patternSection =
      (matchedPatterns.length
        ? matchedPatterns.map((p) => `## ${p.title}  ← 일치: ${p.hits.join(", ")}\n${p.body}`).join("\n\n")
        : "(요청과 맞는 장르·기법 패턴 없음)") +
      (basics && !matchedPatterns.some((p) => p.title === basics.title) ? `\n\n## ${basics.title}\n${basics.body}` : "");

    const sections = [
      "# 1. 프롬프트 작성 가이드 [프롬프트 작가]",
      await readGuide("prompt-guide.md"),
      "# 1-1. 카메라·구도 추천 [구도 RAG]",
      cameraSection,
      ...(dynamicTips && !matched.some((t) => t.title === dynamicTips.title) ? [`## 역동성 재료 (차렷 자세 탈출)\n${dynamicTips.body}`] : []),
      "(기법 전체 목록이 필요하면 사용자가 말한 기법 이름을 request 에 넣어 다시 호출)",
      "# 1-2. 실제로 쓰이는 프롬프트 패턴 [정보 수집관 · 웹 수집, 출처 포함]",
      "([공식]=Adobe 자료, [커뮤니티]=반복되는 관행·미검증. 표현 조각을 참고하되 그대로 이어 붙이지 말고 장면에 맞게 고른다)",
      patternSection,
      "# 2. 사전 점검 · 정직한 재작성 규칙 [사전 점검]",
      await readGuide("policy-rewrite.md"),
      "# 3. 이 PC 의 비슷한 과거 생성 사례 (logs 검색)",
      similar.length ? similar.map(formatCase).join("\n") : "(비슷한 사례 없음)",
      "# 4. '실패 → 고쳐서 성공' 사례",
      pairs.length ? pairs.slice(-5).map(formatPair).join("\n") : "(아직 없음)",
    ];
    if (draft) {
      sections.push(
        "# 5. 초안 점검",
        risky.length
          ? risky
              .map((r) => `- ⚠️ "${r.word}": 과거 실패한 프롬프트에 있었고, 뺀 뒤 성공함${r.certain ? "" : " (원인 불확실)"} → 대신 쓰인 단어: ${r.replacedWith.join(", ")}`)
              .join("\n")
          : "- 과거 실패 기록과 겹치는 표현 없음 (그래도 2번 규칙으로 직접 점검할 것)",
      );
    }
    sections.push(
      "# 다음 순서",
      draft
        ? "이 초안은 점검을 거쳐 생성이 허용됐다(문구를 고치면 다시 점검해야 한다). 생성 전에 사용자에게 아래 형식으로 보여 주고 확인받는다:"
        : "영어 프롬프트를 완성한 뒤 ps_prompt_guide(request, draft=완성한 프롬프트) 로 다시 점검한다. 그다음 사용자에게 아래 형식으로 보여 주고 확인받는다:",
      [
        "## 사용자에게 보여 줄 형식",
        "**영어 프롬프트**",
        "```",
        "(프롬프트 전문)",
        "```",
        "- **한국어 뜻:** (2~3줄 요약)",
        "- **구도:** (적용한 촬영 기법·앵글과 고른 이유)",
        "- **다른 구도 선택지:** ① (기법 + 한 줄 느낌) ② (기법 + 한 줄 느낌)",
        "- **요청에서 바꾼 점:** (없으면 '없음', 있으면 무엇을 왜)",
        "이대로 만들까요? (다른 구도를 원하시면 번호로 말씀해 주세요)",
      ].join("\n"),
      "확인받은 뒤: (새 그림·크기 지정이면) ps_create_document → 그 id 를 documentId 로 ps_generate_image. 새 문서 만들기가 실패하면 다른 문서에 생성하지 말고 멈춘다.",
    );
    return { content: [text(sections.join("\n\n"))] };
  },
);

register(
  "ps_create_document",
  {
    title: "새 캔버스 만들기",
    description:
      "지정한 크기(픽셀)의 흰색 RGB 새 문서를 만들고 활성 문서로 만든다. " +
      "새 그림을 처음부터 만들 때, 또는 사용자가 크기를 지정했는데 활성 문서 크기가 다를 때 ps_generate_image 전에 호출한다 " +
      "(다른 문서가 열려 있어도 새로 만든다). 크기 지정이 없으면 1024x1024 를 쓴다. " +
      "방금 만든 그림을 고치거나 다시 생성할 때는 새 문서를 만들지 말고 기존 활성 문서를 쓴다. 크레딧을 쓰지 않는다.",
    inputSchema: {
      width: z.number().int().min(64).max(4096).describe("가로 픽셀 (64~4096)"),
      height: z.number().int().min(64).max(4096).describe("세로 픽셀 (64~4096)"),
      name: z.string().max(60).optional().describe("문서 이름 (선택)"),
    },
  },
  async ({ width, height, name }) =>
    guarded(async () => [text(await bridge.send("createDocument", { width, height, name: name || "PS Agent" }))]),
);

register(
  "ps_generate_image",
  {
    title: "프롬프트로 이미지 생성 (크레딧 사용)",
    description:
      "⚠️ Adobe 생성형 크레딧을 1회 사용한다. Photoshop 의 Generate Image(Firefly)로 documentId 문서 전체 크기의 이미지를 만들어 " +
      "새 레이어(프롬프트 이름의 Generative Layer)로 추가하고 맨 위로 옮긴다. 약 10~30초 걸린다. " +
      "prompt 는 ps_prompt_guide 의 draft 로 사전 점검을 받은 문구와 같아야 하며, 생성 전에 사용자에게 보여 주고 확인받는다. " +
      "결과를 output/ 에 PNG 로 저장하고 미리보기 이미지를 함께 돌려주므로, 결과를 보고 요청과 다르면 프롬프트를 고쳐 다시 호출할 수 있다. " +
      "이미지 크기는 활성 문서 크기를 따른다. 따라서 사용자가 새 그림을 요청했거나 크기(예: 1920x1080)를 지정했으면, " +
      "다른 문서가 열려 있더라도 먼저 ps_create_document 로 그 크기의 새 캔버스를 만든 뒤 호출한다. " +
      "방금 만든 그림을 다시 만들거나 고치라는 요청일 때만 기존 활성 문서를 그대로 쓴다. 그림의 일부만 바꾸려면 이 도구 대신 ps_generative_fill 을 쓴다. " +
      "Firefly 가 콘텐츠 정책(폭력·공포·실존 인물·상표·캐릭터 이름 등)으로 거절하면 '생성이 실패했습니다' 오류가 오므로, 표현을 순화해 다시 시도한다. " +
      "같은 프롬프트를 의미 없이 반복 호출하지 않는다. " +
      `서버 실행 1회당 생성(이 도구 + ps_generative_fill 합계)은 ${config.maxGenerationsPerRun}회로 제한되며, 결과의 generationCount 로 사용량을 알 수 있다.`,
    inputSchema: {
      prompt,
      documentId: z.number().int().describe("생성할 문서 id. ps_create_document 결과의 id, 또는 기존 그림을 다시 만들 때는 ps_status 의 해당 문서 id"),
    },
  },
  async ({ prompt, documentId }) =>
    guarded(async () => {
      requireChecked(prompt); // 사전 점검을 안 거친 프롬프트는 크레딧을 쓰기 전에 거절
      const generationCount = budget.reserve(`이미지 생성 "${prompt}"`); // 상한을 넘으면 여기서 멈춘다
      const gen = await withFailureHelp(prompt, () => bridge.send("generateImage", { prompt, documentId }));
      const shown = await exportAndShow(prompt, documentId);
      return [text({ generated: gen, generationCount, savedTo: shown.path }), ...shown.content];
    }),
);

register(
  "ps_generative_fill",
  {
    title: "영역을 프롬프트로 채우기 (크레딧 사용)",
    description:
      "⚠️ Adobe 생성형 크레딧을 1회 사용한다. documentId 문서에서 사각형 영역(픽셀 좌표, 왼쪽 위가 0,0)을 Generative Fill 로 채워 " +
      "마스크가 달린 새 레이어로 추가하고 맨 위로 옮긴다. 약 20~40초 걸린다. 그림의 일부에 무언가를 추가하거나 바꿀 때 쓴다. " +
      "prompt 는 ps_prompt_guide 의 draft 로 사전 점검을 받은 문구와 같아야 한다. " +
      "결과를 output/ 에 PNG 로 저장하고 미리보기 이미지를 함께 돌려준다. " +
      "그림 전체를 새로 만들 때는 ps_generate_image 를 쓴다. 좌표를 모르면 먼저 ps_status 나 ps_list_layers 로 캔버스 크기를 확인한다. " +
      `생성 횟수 상한(ps_generate_image 와 합계 ${config.maxGenerationsPerRun}회)에 포함된다.`,
    inputSchema: {
      prompt,
      left: z.number().int().min(0).describe("영역 왼쪽 x (픽셀)"),
      top: z.number().int().min(0).describe("영역 위쪽 y (픽셀)"),
      right: z.number().int().min(1).describe("영역 오른쪽 x (픽셀, left 보다 커야 함)"),
      bottom: z.number().int().min(1).describe("영역 아래쪽 y (픽셀, top 보다 커야 함)"),
      documentId: z.number().int().describe("채울 문서 id (ps_status 의 문서 id)"),
    },
  },
  async (args) =>
    guarded(async () => {
      requireChecked(args.prompt); // 사전 점검을 안 거친 프롬프트는 크레딧을 쓰기 전에 거절
      // 좌표 순서가 틀린 요청은 크레딧(횟수)을 쓰기 전에 거절한다
      if (args.left >= args.right || args.top >= args.bottom) {
        throw new Error(`영역이 잘못됐습니다: left(${args.left}) < right(${args.right}), top(${args.top}) < bottom(${args.bottom}) 이어야 합니다.`);
      }
      const generationCount = budget.reserve(
        `생성형 채우기 "${args.prompt}" @ ${args.left},${args.top},${args.right},${args.bottom}`,
      );
      const gen = await withFailureHelp(args.prompt, () => bridge.send("generativeFill", args));
      const shown = await exportAndShow(args.prompt, args.documentId);
      return [text({ generated: gen, generationCount, savedTo: shown.path }), ...shown.content];
    }),
);

register(
  "ps_list_layers",
  {
    title: "레이어 목록",
    description:
      "현재 활성 문서의 레이어 목록(위에서부터: id, 이름, 종류, 표시 여부, 불투명도, 영역)을 돌려준다. " +
      "생성 결과가 어떤 레이어로 생겼는지 확인하거나 문서 구성을 파악할 때 쓴다. 이미지는 돌려주지 않는다(그림을 보려면 ps_export_png). " +
      "읽기 전용이며 크레딧을 쓰지 않는다.",
    inputSchema: {
      documentId: z.number().int().optional().describe("문서 id (생략하면 활성 문서)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ documentId }) => guarded(async () => [text(await bridge.send("listLayers", { documentId }))]),
);

register(
  "ps_export_png",
  {
    title: "PNG 로 저장하고 보기",
    description:
      "현재 활성 문서를 보이는 모습 그대로 output/ 폴더에 PNG 로 저장하고, 저장 경로와 미리보기 이미지를 돌려준다. " +
      "사용자가 저장을 요청했거나, 지금 그림 상태를 눈으로 확인해야 할 때 쓴다. " +
      "ps_generate_image / ps_generative_fill 은 이미 결과를 저장하고 보여 주므로 그 직후에 다시 호출할 필요는 없다. 크레딧을 쓰지 않는다.",
    inputSchema: {
      filename: z.string().max(60).optional().describe("파일 이름 (선택, 확장자 없이). 앞에 날짜·시간이 자동으로 붙는다"),
      documentId: z.number().int().optional().describe("문서 id (생략하면 활성 문서)"),
    },
  },
  async ({ filename, documentId }) =>
    guarded(async () => {
      const shown = await exportAndShow(filename ?? "", documentId);
      return shown.content;
    }),
);

// Claude Desktop 과 stdio(표준 입출력)로 대화 시작
await server.connect(new StdioServerTransport());
log("MCP 서버 시작 (stdio)");
