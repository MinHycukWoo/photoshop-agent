// 생성형 크레딧 보호: 서버 1회 실행당 생성 횟수에 상한을 둔다
// (Claude 가 실수로 같은 생성을 반복해도 크레딧이 무한히 빠져나가지 않게)
import { log } from "./bridge.js";

export class GenerationBudget {
  private used = 0;

  constructor(private readonly limit: number) {}

  get status() {
    return { used: this.used, limit: this.limit, remaining: this.limit - this.used };
  }

  // 생성 "직전"에 호출한다. 상한을 넘으면 포토샵에 명령을 보내지 않고 오류를 던진다.
  // 실패한 생성도 1회로 센다: 포토샵 쪽에서 크레딧이 빠졌는지 알 수 없으므로 보수적으로.
  reserve(what: string): string {
    if (this.used >= this.limit) {
      throw new Error(
        `생성 횟수 상한(${this.limit}회)에 도달해 ${what}을(를) 실행하지 않았습니다. ` +
          `크레딧 보호용 제한입니다. 계속하려면 사용자가 mcp-server/config.json 의 maxGenerationsPerRun 을 늘리거나 MCP 서버(Claude Desktop)를 다시 시작해야 합니다.`,
      );
    }
    this.used++;
    log(`생성 ${this.used}/${this.limit}: ${what}`);
    return `${this.used}/${this.limit}`;
  }
}
