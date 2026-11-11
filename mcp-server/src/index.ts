// MCP 서버 진입점: Claude(클라이언트)에게 도구 목록을 알려 주고, 호출되면 포토샵으로 전달한다
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { PhotoshopBridge, NOT_CONNECTED_MESSAGE, log } from "./bridge.js";
import { savePng } from "./output.js";
import { logCall } from "./logger.js";
import { GenerationBudget } from "./credits.js";

const config = loadConfig();
const bridge = new PhotoshopBridge(config.port, config.requestTimeoutMs);
const budget = new GenerationBudget(config.maxGenerationsPerRun); // 생성 횟수 상한 (크레딧 보호)

const server = new McpServer({ name: "photoshop-agent", version: "0.2.0" });

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
async function exportAndShow(name: string): Promise<{ path: string; content: Content[] }> {
  const r = (await bridge.send("exportPng")) as { pngBase64: string; documentName: string; width: number; height: number };
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
      "⚠️ Adobe 생성형 크레딧을 1회 사용한다. Photoshop 의 Generate Image(Firefly)로 현재 활성 문서 전체 크기의 이미지를 만들어 " +
      "맨 위에 새 레이어(프롬프트 이름의 Generative Layer)로 추가한다. 약 10~30초 걸린다. " +
      "결과를 output/ 에 PNG 로 저장하고 미리보기 이미지를 함께 돌려주므로, 결과를 보고 요청과 다르면 프롬프트를 고쳐 다시 호출할 수 있다. " +
      "이미지 크기는 활성 문서 크기를 따른다. 따라서 사용자가 새 그림을 요청했거나 크기(예: 1920x1080)를 지정했으면, " +
      "다른 문서가 열려 있더라도 먼저 ps_create_document 로 그 크기의 새 캔버스를 만든 뒤 호출한다. " +
      "방금 만든 그림을 다시 만들거나 고치라는 요청일 때만 기존 활성 문서를 그대로 쓴다. 그림의 일부만 바꾸려면 이 도구 대신 ps_generative_fill 을 쓴다. " +
      "Firefly 가 콘텐츠 정책(폭력·공포·실존 인물·상표·캐릭터 이름 등)으로 거절하면 '생성이 실패했습니다' 오류가 오므로, 표현을 순화해 다시 시도한다. " +
      "같은 프롬프트를 의미 없이 반복 호출하지 않는다. " +
      `서버 실행 1회당 생성(이 도구 + ps_generative_fill 합계)은 ${config.maxGenerationsPerRun}회로 제한되며, 결과의 generationCount 로 사용량을 알 수 있다.`,
    inputSchema: { prompt },
  },
  async ({ prompt }) =>
    guarded(async () => {
      const generationCount = budget.reserve(`이미지 생성 "${prompt}"`); // 상한을 넘으면 여기서 멈춘다
      const gen = await bridge.send("generateImage", { prompt });
      const shown = await exportAndShow(prompt);
      return [text({ generated: gen, generationCount, savedTo: shown.path }), ...shown.content];
    }),
);

register(
  "ps_generative_fill",
  {
    title: "영역을 프롬프트로 채우기 (크레딧 사용)",
    description:
      "⚠️ Adobe 생성형 크레딧을 1회 사용한다. 현재 활성 문서에서 사각형 영역(픽셀 좌표, 왼쪽 위가 0,0)을 Generative Fill 로 채워 " +
      "마스크가 달린 새 레이어로 추가한다. 약 20~40초 걸린다. 그림의 일부에 무언가를 추가하거나 바꿀 때 쓴다. " +
      "결과를 output/ 에 PNG 로 저장하고 미리보기 이미지를 함께 돌려준다. " +
      "그림 전체를 새로 만들 때는 ps_generate_image 를 쓴다. 좌표를 모르면 먼저 ps_status 나 ps_list_layers 로 캔버스 크기를 확인한다. " +
      `생성 횟수 상한(ps_generate_image 와 합계 ${config.maxGenerationsPerRun}회)에 포함된다.`,
    inputSchema: {
      prompt,
      left: z.number().int().min(0).describe("영역 왼쪽 x (픽셀)"),
      top: z.number().int().min(0).describe("영역 위쪽 y (픽셀)"),
      right: z.number().int().min(1).describe("영역 오른쪽 x (픽셀, left 보다 커야 함)"),
      bottom: z.number().int().min(1).describe("영역 아래쪽 y (픽셀, top 보다 커야 함)"),
    },
  },
  async (args) =>
    guarded(async () => {
      // 좌표 순서가 틀린 요청은 크레딧(횟수)을 쓰기 전에 거절한다
      if (args.left >= args.right || args.top >= args.bottom) {
        throw new Error(`영역이 잘못됐습니다: left(${args.left}) < right(${args.right}), top(${args.top}) < bottom(${args.bottom}) 이어야 합니다.`);
      }
      const generationCount = budget.reserve(
        `생성형 채우기 "${args.prompt}" @ ${args.left},${args.top},${args.right},${args.bottom}`,
      );
      const gen = await bridge.send("generativeFill", args);
      const shown = await exportAndShow(args.prompt);
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
    annotations: { readOnlyHint: true },
  },
  async () => guarded(async () => [text(await bridge.send("listLayers"))]),
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
    },
  },
  async ({ filename }) =>
    guarded(async () => {
      const shown = await exportAndShow(filename ?? "");
      return shown.content;
    }),
);

// Claude Desktop 과 stdio(표준 입출력)로 대화 시작
await server.connect(new StdioServerTransport());
log("MCP 서버 시작 (stdio)");
