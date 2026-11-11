import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 이 파일은 dist/config.js 로 빌드되므로, 한 단계 위(mcp-server/)가 서버 폴더다
export const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface Config {
  port: number; // 플러그인이 접속할 WebSocket 포트
  requestTimeoutMs: number; // 포토샵 응답을 기다리는 최대 시간 (생성형 채우기는 ~42초 걸림)
  maxGenerationsPerRun: number; // 서버 1회 실행당 생성형 AI 호출 상한 (크레딧 보호)
}

const DEFAULTS: Config = { port: 8765, requestTimeoutMs: 120_000, maxGenerationsPerRun: 10 };

// config.json 이 없거나 일부만 있어도 기본값으로 채운다
export function loadConfig(): Config {
  let fromFile: Partial<Config> = {};
  try {
    fromFile = JSON.parse(readFileSync(join(SERVER_DIR, "config.json"), "utf8"));
  } catch {
    // 파일이 없거나 형식이 틀리면 기본값만 쓴다
  }
  return withEnv({ ...DEFAULTS, ...fromFile });
}

// 환경 변수가 있으면 덮어쓴다 (자동 테스트가 실제 설정과 겹치지 않게)
//   PS_AGENT_PORT, PS_AGENT_MAX_GENERATIONS
function withEnv(config: Config): Config {
  const port = Number(process.env.PS_AGENT_PORT);
  const max = Number(process.env.PS_AGENT_MAX_GENERATIONS);
  return {
    ...config,
    ...(port ? { port } : {}),
    ...(Number.isInteger(max) && max >= 0 && process.env.PS_AGENT_MAX_GENERATIONS ? { maxGenerationsPerRun: max } : {}),
  };
}
