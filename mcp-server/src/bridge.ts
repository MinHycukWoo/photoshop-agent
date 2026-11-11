// 포토샵 플러그인과의 WebSocket 통로.
// MCP 서버가 "서버", UXP 플러그인이 "클라이언트"로 접속한다. (UXP는 WebSocket 서버를 열 수 없음)
//
// 주고받는 메시지 형식 (JSON):
//   서버 → 플러그인: { id, command, params }
//   플러그인 → 서버: { id, ok: true, result }  또는  { id, ok: false, error }
import { WebSocketServer, WebSocket } from "ws";

// 플러그인이 연결 안 됐을 때 Claude가 읽고 사용자에게 안내할 수 있는 문장
export const NOT_CONNECTED_MESSAGE =
  "포토샵 플러그인이 연결되어 있지 않습니다. 포토샵에서 'PS Agent' 패널을 열고 '연결' 버튼을 눌러 주세요.";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class PhotoshopBridge {
  private wss: WebSocketServer;
  private plugin: WebSocket | null = null; // 지금 연결된 플러그인 (한 개만)
  private pending = new Map<number, Pending>(); // 응답을 기다리는 요청들 (id → 대기 정보)
  private nextId = 1;
  public listenError: string | null = null; // 포트를 못 열었을 때 이유
  public pluginOrigin: string | null = null; // 지금 연결된 플러그인이 보낸 Origin 헤더 (확인용)
  public rejectedCount = 0; // 거절한 접속 수

  constructor(port: number, private timeoutMs: number) {
    // 127.0.0.1 에서만 열어 다른 컴퓨터에서는 접속할 수 없게 한다
    this.wss = new WebSocketServer({
      host: "127.0.0.1",
      port,
      maxPayload: 64 * 1024 * 1024, // PNG 전송용으로 넉넉히, 그 이상은 거절
      // 허용 목록: UXP 플러그인은 Origin "file://" 을 보낸다 (4단계에서 확인).
      // Origin 이 없는 접속(Node 로 만든 테스트 도구)도 허용한다.
      // 웹 브라우저의 페이지는 항상 http(s):// 나 null 같은 Origin 을 붙이므로 여기서 걸러진다
      // → 악성 웹페이지가 플러그인 행세를 하며 명령을 가로채지 못한다.
      verifyClient: ({ origin }: { origin?: string }) => {
        const allowed = origin === undefined || origin === "file://";
        if (!allowed) {
          this.rejectedCount++;
          log(`접속 거절 (허용되지 않은 Origin: ${origin})`);
        }
        return allowed;
      },
    });

    this.wss.on("listening", () => log(`WebSocket 대기 중: ws://127.0.0.1:${port}`));
    this.wss.on("error", (err) => {
      // 흔한 원인: 같은 포트를 쓰는 서버가 이미 실행 중 (예: Inspector와 Claude Desktop 동시 실행)
      this.listenError = `WebSocket 포트 ${port}를 열 수 없습니다: ${err.message}`;
      log(this.listenError);
    });

    this.wss.on("connection", (socket, req) => {
      this.pluginOrigin = req.headers.origin ?? "(없음)";
      log(`플러그인 접속 (origin: ${this.pluginOrigin})`);
      // 새 플러그인이 붙으면 이전 연결은 닫는다 (항상 하나만 유지)
      if (this.plugin && this.plugin !== socket) this.plugin.close();
      this.plugin = socket;

      socket.on("message", (data) => this.handleMessage(data.toString()));
      socket.on("close", () => {
        if (this.plugin === socket) {
          this.plugin = null;
          log("플러그인 연결 끊김");
          // 응답을 기다리던 요청들은 더 이상 답이 올 수 없으므로 바로 실패 처리
          this.failAll("포토샵 플러그인 연결이 끊어졌습니다.");
        }
      });
    });
  }

  get isConnected(): boolean {
    return this.plugin?.readyState === WebSocket.OPEN;
  }

  // 플러그인에 명령을 보내고, 같은 id 의 응답이 올 때까지 기다린다
  send(command: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isConnected) return Promise.reject(new Error(NOT_CONNECTED_MESSAGE));

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      // 시간이 지나도 답이 없으면 실패로 처리 (포토샵이 멈췄거나 대화상자가 떠 있을 수 있음)
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`포토샵이 ${this.timeoutMs / 1000}초 안에 응답하지 않았습니다 (명령: ${command}). 포토샵에 대화상자가 열려 있는지 확인해 주세요.`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.plugin!.send(JSON.stringify({ id, command, params }));
    });
  }

  private handleMessage(text: string) {
    let msg: { id?: number; ok?: boolean; result?: unknown; error?: string };
    try {
      msg = JSON.parse(text);
    } catch {
      log(`해석할 수 없는 메시지: ${text.slice(0, 200)}`);
      return;
    }
    // id 로 "어떤 요청에 대한 응답인지" 찾는다
    const p = msg.id !== undefined ? this.pending.get(msg.id) : undefined;
    if (!p) return; // 이미 타임아웃됐거나 모르는 응답
    clearTimeout(p.timer);
    this.pending.delete(msg.id!);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error ?? "포토샵에서 알 수 없는 오류가 발생했습니다."));
  }

  private failAll(reason: string) {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
      this.pending.delete(id);
    }
  }
}

// ⚠️ stdio MCP 서버에서는 stdout(console.log)이 Claude와의 대화 통로라서,
//    로그는 반드시 stderr(console.error)로 써야 통신이 깨지지 않는다
export function log(message: string) {
  console.error(`[ps-agent] ${message}`);
}
