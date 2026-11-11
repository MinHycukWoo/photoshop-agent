// MCP 서버 진입점: Claude(클라이언트)에게 도구 목록을 알려 주고, 호출되면 포토샵으로 전달한다
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { PhotoshopBridge, NOT_CONNECTED_MESSAGE, log } from "./bridge.js";

const config = loadConfig();
const bridge = new PhotoshopBridge(config.port, config.requestTimeoutMs);

const server = new McpServer({ name: "photoshop-agent", version: "0.1.0" });

// 도구 결과를 JSON 텍스트로 돌려주는 도우미
const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

server.registerTool(
  "ps_status",
  {
    title: "포토샵 연결 상태",
    // description 은 Claude가 "언제 이 도구를 쓸지" 판단하는 글이다
    description:
      "Photoshop 플러그인 연결 여부, Photoshop 버전, 열린 문서 목록(이름·크기·레이어 수)과 현재 활성 문서를 확인한다. " +
      "포토샵 작업을 시작하기 전이나 다른 도구가 연결 오류를 냈을 때 먼저 호출한다. " +
      "생성형 크레딧을 쓰지 않고 문서를 바꾸지 않는 읽기 전용 도구다.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    if (bridge.listenError) {
      return { ...json({ connected: false, message: bridge.listenError }), isError: true };
    }
    if (!bridge.isConnected) {
      // 연결 안 된 것도 "상태"이므로 오류가 아니라 정상 결과로 알려 준다
      return json({ connected: false, message: NOT_CONNECTED_MESSAGE });
    }
    try {
      const info = await bridge.send("status");
      return json({ connected: true, ...(info as object) });
    } catch (err) {
      return { ...json({ connected: false, message: (err as Error).message }), isError: true };
    }
  },
);

// Claude Desktop 과 stdio(표준 입출력)로 대화 시작
await server.connect(new StdioServerTransport());
log("MCP 서버 시작 (stdio)");
