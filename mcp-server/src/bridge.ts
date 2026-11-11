// 포토샵 플러그인과의 WebSocket 통로.
// MCP 서버가 "서버", UXP 플러그인이 "클라이언트"로 접속한다. (UXP는 WebSocket 서버를 열 수 없음)
//
// ⚠️ Claude Desktop 은 이 MCP 서버를 동시에 여러 개 띄울 수 있다 (5단계에서 2개 실행을 확인).
//    포트는 하나뿐이므로 역할을 나눈다:
//      - 중계소(hub): 포트를 먼저 잡은 서버. 플러그인과 직접 연결된다.
//      - 중계(relay): 포트를 못 잡은 서버. 중계소에 접속해서 명령을 대신 전달해 달라고 한다.
//    중계소가 꺼지면 relay 가 포트를 넘겨받아 새 중계소가 된다. (플러그인은 자동 재연결)
//
// 주고받는 메시지 형식 (JSON):
//   요청: { id, command, params }               (중계소 → 플러그인, relay → 중계소)
//   응답: { id, ok: true, result } | { id, ok: false, error }
//   알림: { event: "plugin", connected, origin } (중계소 → relay: 플러그인 연결 상태)
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "node:http";

// 플러그인이 연결 안 됐을 때 Claude가 읽고 사용자에게 안내할 수 있는 문장
export const NOT_CONNECTED_MESSAGE =
  "포토샵 플러그인이 연결되어 있지 않습니다. 포토샵에서 'PS Agent' 패널을 열고 '연결' 버튼을 눌러 주세요.";

const ROLE_HEADER = "x-ps-agent-role"; // relay 가 중계소에 접속할 때 붙이는 표시
const MAX_PAYLOAD = 64 * 1024 * 1024; // PNG 전송용으로 넉넉히, 그 이상은 거절

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

type Message = { id?: number; ok?: boolean; result?: unknown; error?: string; event?: string; connected?: boolean; origin?: string | null };

export class PhotoshopBridge {
  public role: "starting" | "hub" | "relay" = "starting";
  public listenError: string | null = null; // 포트도 못 열고 중계소에도 못 붙었을 때 이유
  public pluginOrigin: string | null = null; // 플러그인이 보낸 Origin 헤더 (확인용)
  public rejectedCount = 0; // 거절한 접속 수

  // 중계소(hub)일 때
  private plugin: WebSocket | null = null; // 연결된 플러그인 (한 개만)
  private relays = new Set<WebSocket>(); // 붙어 있는 relay 서버들
  // relay 일 때
  private hub: WebSocket | null = null; // 중계소로 가는 연결
  private hubPluginConnected = false; // 중계소가 알려 준 플러그인 연결 상태

  private pending = new Map<number, Pending>(); // 응답을 기다리는 요청들 (id → 대기 정보)
  private nextId = 1;

  constructor(
    private port: number,
    private timeoutMs: number,
  ) {
    this.start();
  }

  // ── 시작: 포트를 열어 보고, 이미 쓰고 있으면 relay 로 ─────────────
  private start() {
    this.role = "starting";
    // 127.0.0.1 에서만 열어 다른 컴퓨터에서는 접속할 수 없게 한다
    const wss = new WebSocketServer({
      host: "127.0.0.1",
      port: this.port,
      maxPayload: MAX_PAYLOAD,
      // 허용 목록: UXP 플러그인은 Origin "file://" 을 보낸다 (4단계에서 확인).
      // Origin 이 없는 접속(relay 서버, Node 테스트 도구)도 허용한다.
      // 웹 브라우저의 페이지는 항상 http(s):// 나 null 같은 Origin 을 붙이므로 여기서 걸러진다.
      verifyClient: ({ origin }: { origin?: string }) => {
        const allowed = origin === undefined || origin === "file://";
        if (!allowed) {
          this.rejectedCount++;
          log(`접속 거절 (허용되지 않은 Origin: ${origin})`);
        }
        return allowed;
      },
    });

    wss.on("listening", () => {
      this.role = "hub";
      this.listenError = null;
      log(`중계소(hub)로 시작: ws://127.0.0.1:${this.port}`);
    });
    wss.on("error", (err: NodeJS.ErrnoException) => {
      if (this.role !== "starting") return;
      wss.close();
      if (err.code === "EADDRINUSE") this.connectToHub(); // 다른 서버가 이미 중계소 → relay 로
      else this.listenError = `WebSocket 포트 ${this.port}를 열 수 없습니다: ${err.message}`;
    });
    wss.on("connection", (socket, req) => {
      if (req.headers[ROLE_HEADER] === "relay") this.acceptRelay(socket);
      else this.acceptPlugin(socket, req);
    });
  }

  // ── 중계소: 플러그인 접속 ─────────────────────────────
  private acceptPlugin(socket: WebSocket, req: IncomingMessage) {
    this.pluginOrigin = req.headers.origin ?? "(없음)";
    log(`플러그인 접속 (origin: ${this.pluginOrigin})`);
    // 새 플러그인이 붙으면 이전 연결은 닫는다 (항상 하나만 유지)
    if (this.plugin && this.plugin !== socket) this.plugin.close();
    this.plugin = socket;
    this.broadcastPluginState();

    socket.on("message", (data) => this.handleResponse(parse(data)));
    socket.on("close", () => {
      if (this.plugin !== socket) return;
      this.plugin = null;
      log("플러그인 연결 끊김");
      this.broadcastPluginState();
      // 응답을 기다리던 요청들은 더 이상 답이 올 수 없으므로 바로 실패 처리
      this.failAll("포토샵 플러그인 연결이 끊어졌습니다.");
    });
  }

  // ── 중계소: relay 서버 접속 → 요청을 플러그인에 대신 전달 ─────────
  private acceptRelay(socket: WebSocket) {
    log("relay 서버 접속");
    this.relays.add(socket);
    this.sendPluginState(socket);
    socket.on("message", async (data) => {
      const msg = parse(data) as { id?: number; command?: string; params?: Record<string, unknown> };
      if (msg.id === undefined || !msg.command) return;
      try {
        const result = await this.send(msg.command, msg.params); // 중계소의 send = 플러그인으로
        socket.send(JSON.stringify({ id: msg.id, ok: true, result }));
      } catch (err) {
        socket.send(JSON.stringify({ id: msg.id, ok: false, error: (err as Error).message }));
      }
    });
    socket.on("close", () => this.relays.delete(socket));
  }

  private sendPluginState(socket: WebSocket) {
    socket.send(JSON.stringify({ event: "plugin", connected: this.isConnected, origin: this.pluginOrigin }));
  }

  private broadcastPluginState() {
    for (const r of this.relays) this.sendPluginState(r);
  }

  // ── relay: 중계소에 접속 ──────────────────────────────
  private connectToHub() {
    const ws = new WebSocket(`ws://127.0.0.1:${this.port}`, { headers: { [ROLE_HEADER]: "relay" }, maxPayload: MAX_PAYLOAD });
    ws.on("open", () => {
      this.hub = ws;
      this.role = "relay";
      this.listenError = null;
      log(`포트 ${this.port}는 다른 서버가 쓰는 중 → relay 로 시작 (그 서버를 거쳐 포토샵에 전달)`);
    });
    ws.on("message", (data) => {
      const msg = parse(data);
      if (msg.event === "plugin") {
        this.hubPluginConnected = !!msg.connected;
        this.pluginOrigin = msg.origin ?? null;
      } else {
        this.handleResponse(msg);
      }
    });
    ws.on("error", (err) => {
      // 포트를 잡은 게 우리 서버가 아니라 다른 프로그램인 경우
      if (!this.hub) this.listenError = `WebSocket 포트 ${this.port}를 다른 프로그램이 쓰고 있어 열 수 없습니다: ${err.message}`;
    });
    ws.on("close", () => {
      if (this.hub === ws) {
        this.hub = null;
        this.hubPluginConnected = false;
        log("중계소 연결 끊김 → 포트를 넘겨받아 볼게요");
        this.failAll("중계 서버 연결이 끊어졌습니다. 잠시 후 다시 시도해 주세요.");
      }
      // 중계소가 사라졌으면 내가 포트를 잡는다. 여러 relay 가 동시에 시도하지 않게 시간을 조금 흩뜨린다.
      setTimeout(() => this.start(), 300 + Math.random() * 700);
    });
  }

  // ── 공통 ──────────────────────────────────────────────
  get isConnected(): boolean {
    if (this.role === "hub") return this.plugin?.readyState === WebSocket.OPEN;
    if (this.role === "relay") return this.hub?.readyState === WebSocket.OPEN && this.hubPluginConnected;
    return false;
  }

  // 플러그인에 명령을 보내고(relay 면 중계소를 거쳐서), 같은 id 의 응답이 올 때까지 기다린다
  send(command: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isConnected) return Promise.reject(new Error(NOT_CONNECTED_MESSAGE));
    const target = this.role === "hub" ? this.plugin! : this.hub!;
    // relay 는 중계소의 타임아웃이 먼저 나도록 조금 더 기다린다
    const timeoutMs = this.role === "relay" ? this.timeoutMs + 5_000 : this.timeoutMs;

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      // 시간이 지나도 답이 없으면 실패로 처리 (포토샵이 멈췄거나 대화상자가 떠 있을 수 있음)
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`포토샵이 ${this.timeoutMs / 1000}초 안에 응답하지 않았습니다 (명령: ${command}). 포토샵에 대화상자가 열려 있는지 확인해 주세요.`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      target.send(JSON.stringify({ id, command, params }));
    });
  }

  private handleResponse(msg: Message) {
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

function parse(data: RawData): Message {
  try {
    return JSON.parse(data.toString());
  } catch {
    log(`해석할 수 없는 메시지: ${data.toString().slice(0, 200)}`);
    return {};
  }
}

// ⚠️ stdio MCP 서버에서는 stdout(console.log)이 Claude와의 대화 통로라서,
//    로그는 반드시 stderr(console.error)로 써야 통신이 깨지지 않는다
export function log(message: string) {
  console.error(`[ps-agent] ${message}`);
}
