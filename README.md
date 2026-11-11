# photoshop-agent

Claude에게 **"창가에 앉은 고양이를 수채화 느낌으로 만들어 줘"** 라고 말하면,
내 PC의 **Adobe Photoshop 생성형 AI(Firefly)** 를 실행하고 결과 이미지를 Claude가 직접 보고 알려 주는 MCP 에이전트.

> 지금은 **1단계: "손" 만들기** — 판단하는 "두뇌"는 Claude Desktop을 그대로 쓰고, 포토샵을 조종하는 도구만 만든다.
> 도구는 어떤 MCP 클라이언트에서도 쓸 수 있게 만들어, 다음 단계에서 두뇌를 직접 만들 때 재사용한다.

## 구조

```
[Claude Desktop]  ← 두뇌: 무엇을 할지 판단
      │  MCP (stdio)
      ▼
[mcp-server  · TypeScript]  ← 손의 관절: 도구 목록 제공, 명령 전달
      │  WebSocket (ws://127.0.0.1:8765, localhost 전용)
      ▼
[ps-plugin   · UXP JavaScript]  ← 손가락: 포토샵 안에서 batchPlay 실행
      │
      ▼
[Photoshop 생성형 AI (Firefly)]
```

## 진행 상황

| 단계 | 내용 | 상태 | 작업 기록 |
|---|---|---|---|
| 0 | 환경 점검 · 폴더 구조 | ✅ 완료 | [00-환경점검](docs/progress/00-환경점검.md) |
| 1 | ★ 가능성 검증: 생성형 AI를 batchPlay로 호출 | ✅ 완료 | [01-가능성검증](docs/progress/01-가능성검증.md) |
| 2 | 연결 통로 (MCP 서버 ↔ 플러그인, `ps_status`) | ✅ 완료 | [02-연결통로](docs/progress/02-연결통로.md) |
| 3 | 핵심 도구 (문서 생성 · 이미지 생성 · 생성형 채우기 · 레이어 · PNG 내보내기) + 호출 기록 | ✅ 완료 | [03-핵심도구](docs/progress/03-핵심도구.md) |
| 4 | 안전장치 (생성 횟수 상한 · Origin 허용 목록 · 저장 경로 제한 · 기록) | ✅ 완료 | [04-안전장치](docs/progress/04-안전장치.md) |
| 5 | Claude Desktop 연결 · 시나리오 테스트 | ✅ 완료 | [05-클로드데스크톱연결](docs/progress/05-클로드데스크톱연결.md) |
| 5+ | 프롬프트 에이전트 3역할(작가 · 사전 점검 · 실패 분석) + 지식 창고(RAG) | ✅ 완료 | [05a-프롬프트에이전트와RAG](docs/progress/05a-프롬프트에이전트와RAG.md) |
| 6 | 문서화 (`docs/README.ko.md`) | ⏳ 다음 | |

### 단계별 요약

- **0단계 — 환경 점검:** Node.js 24, Photoshop 28.0.0, UXP Developer Tool, 개발자 모드 확인. `mcp-server` / `ps-plugin` / `output` / `logs` / `docs` 구조로 분리.
- **1단계 — 가능성 검증:** 액션 녹화 → *Copy As JavaScript* 로 실제 batchPlay 형식 확보
  (`syntheticTextToImage`, `syntheticFill`). 프롬프트만 바꿔 재실행 성공 — 이미지 생성 ~10초, 채우기 ~35초,
  결과는 프롬프트 이름의 새 Generative Layer 로 쌓임.
- **2단계 — 연결 통로:** MCP 서버(stdio + WebSocket 서버)와 UXP 패널(WebSocket 클라이언트)을 연결하고
  `ps_status` 로 실제 포토샵 정보 왕복 확인. 요청 `id` 매칭 · 120초 타임아웃 · 미연결 안내 메시지.
  manifest `network.domains` 는 `"all"` 에서만 연결됨, 버전은 `require("uxp").host.version`.
- **3단계 — 핵심 도구:** 도구 6개 완성. 생성 · 내보내기 결과를 `output/` 에 저장하고 **미리보기 이미지를 Claude 에게 반환** (에이전트 루프의 "관찰").
  PNG 는 플러그인 임시 폴더에 저장 → 서버가 `output/` 에 기록 (플러그인에 파일 권한 불필요).
  모든 도구 호출을 `logs/날짜.md` (이미지 포함) · `.jsonl` 로 기록. 채우기 ~42초.
- **4단계 — 안전장치:** 임의 코드 실행 도구 없음 · `127.0.0.1` 전용 · **Origin 허용 목록**(UXP 는 `file://`, 브라우저 접속 거절) ·
  `output/` 밖 저장 차단 · **생성 횟수 상한**(서버 실행당 10회, `config.json`, 실패도 1회로 셈, 남은 횟수를 Claude 에게 알림).
  manifest 주소 지정 형식은 재검증에서도 거부 → `"all"` 유지 (접속 주소 고정 · 서버 측 제한으로 보완).
- **5단계 — Claude Desktop 연결:** Claude 가 스스로 캔버스 생성 → 이미지 생성 → 실패 판단 → 프롬프트 수정 · 재시도. 해결한 문제:
  Claude Desktop 이 서버를 **2개 실행** → 중계소(hub)/relay 구조 + 플러그인 자동 재연결 ·
  생성 실패를 성공으로 보고 → **새 레이어가 있어야 성공** · 1단계 녹화 모델이 **👑 프리미엄(Image 5)** 이라 체험 횟수 소진 →
  표준 모델(`clio3` / `me_md`)로 **재녹화** · 크레딧 구매 창 등 모달 상태 안내. 설정 파일은 Store 버전에서 `Claude-Data` 폴더.

- **5+단계 — 프롬프트 에이전트 + RAG:** Claude Desktop 이 MCP 서버의 작업 순서(instructions)와 지식 창고를 따라
  ① 한국어 요청 → 영어 프롬프트 ② 캐릭터·브랜드·실존 인물 등 거절 요소를 **정직하게** 바꾸고 생성 전 확인 (필터 우회는 하지 않음)
  ③ 실패 시 원인 추정 + 비슷한 "실패→성공" 사례 제시. 지식 창고 = `knowledge/*.md` + `logs/` 실제 생성 기록.

## MCP 도구

| 도구 | 하는 일 | 상태 |
|---|---|---|
| `ps_status` | 연결 상태, 포토샵 버전, 열린 문서 정보 (읽기 전용) | ✅ |
| `ps_prompt_guide` | 프롬프트 작성 가이드 · 사전 점검 규칙 · 비슷한 과거 사례 검색(RAG) · 초안의 과거 실패 표현 경고 (읽기 전용) | ✅ |
| `ps_create_document` | 새 캔버스 생성 (64~4096px) | ✅ |
| `ps_generate_image` | 프롬프트로 이미지 생성 → 저장 + 미리보기 반환 (⚠️ 생성형 크레딧 사용) | ✅ |
| `ps_generative_fill` | 사각형 영역을 프롬프트로 채우기 → 저장 + 미리보기 반환 (⚠️ 생성형 크레딧 사용) | ✅ |
| `ps_list_layers` | 레이어 목록 (id · 이름 · 종류 · 영역) | ✅ |
| `ps_export_png` | `output/` 에 PNG 저장 + Claude가 볼 수 있게 이미지 반환 | ✅ |

## Claude Desktop 연결

Claude Desktop → 설정 → 개발자 → **[구성 편집]** 이 여는 `claude_desktop_config.json` 에 추가 (경로는 설치 형태마다 다르니 추측하지 말 것):

```json
"mcpServers": {
  "photoshop-agent": {
    "command": "C:/Program Files/nodejs/node.exe",
    "args": ["D:/photoshop-agent/mcp-server/dist/index.js"]
  }
}
```

저장 후 트레이 아이콘 → **종료** → 재실행 → 포토샵 PS Agent 패널에서 **연결**.

## 설정 (`mcp-server/config.json`)

| 키 | 기본값 | 뜻 |
|---|---|---|
| `port` | 8765 | 플러그인이 접속할 WebSocket 포트 (`ps-plugin/main.js` 의 `SERVER_URL` 과 같아야 함) |
| `requestTimeoutMs` | 120000 | 포토샵 응답 대기 최대 시간 |
| `maxGenerationsPerRun` | 10 | 서버 실행 1회당 생성형 AI 호출 상한 (크레딧 보호) |

## 실행 방법 (현재)

```bash
cd mcp-server
npm install
npm run build
npm run inspector   # MCP Inspector 로 도구 테스트
```

1. **UXP Developer Tool** → *Add Plugin* → `ps-plugin/manifest.json` → *Load*
2. 포토샵 **PS Agent** 패널에서 **연결** (● 초록)
3. Inspector → Tools → 도구 선택 → *Execute Tool*
4. 호출 기록: `logs/YYYY-MM-DD.md` (VS Code 에서 `Ctrl+Shift+V` 로 결과 이미지까지 보기)

포토샵 없이 서버만 점검: `node scripts/selftest.mjs` (가짜 플러그인 · 전용 포트 18765 · 크레딧 사용 없음 · 서버 2개 동시 실행 · RAG 포함 25개 항목)

## 폴더

```
mcp-server/    TypeScript MCP 서버 (index.ts 도구, bridge.ts 통로, output.ts 저장, logger.ts 기록, credits.ts 생성 상한, knowledge.ts RAG)
ps-plugin/     포토샵 UXP 플러그인 (main.js 명령 처리, firefly.js 생성형 AI batchPlay · 표준 모델)
knowledge/     지식 창고: 프롬프트 가이드 · 정직한 재작성 규칙 · 실패 원인 (RAG 문서)
experiments/   단계별 검증 스크립트 · 액션 녹화 원본
docs/progress/ 단계별 작업 기록
output/        생성 이미지 (git 제외)
logs/          요청/결과 로그 (git 제외)
```
