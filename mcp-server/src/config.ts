import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 이 파일은 dist/config.js 로 빌드되므로, 한 단계 위(mcp-server/)가 서버 폴더다
export const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface Config {
  port: number; // 플러그인이 접속할 WebSocket 포트
  requestTimeoutMs: number; // 포토샵 응답을 기다리는 최대 시간 (생성형 AI는 ~35초 걸림)
}

const DEFAULTS: Config = { port: 8765, requestTimeoutMs: 120_000 };

// config.json 이 없거나 일부만 있어도 기본값으로 채운다
export function loadConfig(): Config {
  try {
    const raw = JSON.parse(readFileSync(join(SERVER_DIR, "config.json"), "utf8"));
    return { ...DEFAULTS, ...raw };
  } catch {
    return DEFAULTS;
  }
}
