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
| 4 | 안전장치 (생성 횟수 상한 · 저장 경로 제한 · 접속 제한) | ⏳ 다음 | |
| 5 | Claude Desktop 연결 · 시나리오 테스트 | | |
| 6 | 문서화 (`docs/README.ko.md`) | | |

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

## MCP 도구

| 도구 | 하는 일 | 상태 |
|---|---|---|
| `ps_status` | 연결 상태, 포토샵 버전, 열린 문서 정보 (읽기 전용) | ✅ |
| `ps_create_document` | 새 캔버스 생성 (64~4096px) | ✅ |
| `ps_generate_image` | 프롬프트로 이미지 생성 → 저장 + 미리보기 반환 (⚠️ 생성형 크레딧 사용) | ✅ |
| `ps_generative_fill` | 사각형 영역을 프롬프트로 채우기 → 저장 + 미리보기 반환 (⚠️ 생성형 크레딧 사용) | ✅ |
| `ps_list_layers` | 레이어 목록 (id · 이름 · 종류 · 영역) | ✅ |
| `ps_export_png` | `output/` 에 PNG 저장 + Claude가 볼 수 있게 이미지 반환 | ✅ |

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

포토샵 없이 서버만 점검: `node scripts/selftest.mjs` (가짜 플러그인 · 전용 포트 18765 · 크레딧 사용 없음)

## 폴더

```
mcp-server/    TypeScript MCP 서버 (index.ts 도구, bridge.ts 통로, output.ts 저장, logger.ts 기록)
ps-plugin/     포토샵 UXP 플러그인 (main.js 명령 처리, firefly.js 생성형 AI batchPlay)
experiments/   단계별 검증 스크립트 · 액션 녹화 원본
docs/progress/ 단계별 작업 기록
output/        생성 이미지 (git 제외)
logs/          요청/결과 로그 (git 제외)
```
