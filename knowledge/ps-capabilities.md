# 포토샵 MCP 로 할 수 있는 것 (기능 정보 수집관)

Photoshop UXP API · batchPlay · 다른 공개 Photoshop MCP 서버를 조사해, **우리 MCP 가 할 수 있는 일 / 만들 수 있는 도구 후보**를 정리한 문서.
수집은 Claude Code 의 `ps-capability-collector` 스킬이 한다. 코드는 바꾸지 않고, 다음 도구를 고를 때 근거로 쓴다.

- 마지막 수집: 2026-11-15 1차 (범위: 공식 안내 · 생성형 AI · 다른 MCP 서버 · 사용 사례)
- 근거 등급: **[공식]** Adobe 문서 · **[다른 MCP]** 공개 MCP 서버 구현(동작 미확인) · **[커뮤니티]** 포럼·블로그 · **[검증됨]** 이 PC 에서 직접 확인
- batchPlay descriptor 는 추측해서 적지 않는다 — 출처가 없으면 "녹화 필요"
- 다른 저장소 코드는 옮기지 않았다. 도구 이름·하는 일·방식만 요약했다.

---

## 현재 우리 도구 (2026-11-15 기준, `mcp-server/src/index.ts`)

| 도구 | 하는 일 | 방식 | 크레딧 |
|---|---|---|---|
| `ps_status` | 연결 상태 · PS 버전 · 서버 역할(hub/relay) | UXP `host.version` | 없음 |
| `ps_prompt_guide` | 프롬프트 작성 가이드 · 사전 점검 (RAG) | 서버 내부 | 없음 |
| `ps_create_document` | 새 캔버스 만들기 | DOM | 없음 |
| `ps_generate_image` | 프롬프트로 이미지 생성 | batchPlay `syntheticTextToImage` [검증됨] | 소모 |
| `ps_generative_fill` | 영역을 프롬프트로 채우기 | batchPlay `syntheticFill` [검증됨] | 소모 |
| `ps_list_layers` | 레이어 목록 | DOM | 없음 |
| `ps_export_png` | PNG 로 저장하고 보기 | DOM | 없음 |

---

## 한눈에 보기 (1차 수집 요약)

- **Adobe 공식 MCP 는 두 갈래.**
  - ① 클라우드 커넥터 "Adobe for creativity" — 2026-04-28 출시, Claude 에서 바로 쓴다. **업로드한 사진**을 다루고, 열려 있는 PSD 레이어는 건드리지 않는다.
  - ② 데스크톱 앱용 **로컬 MCP** — 2026-11-10 Adobe MAX 에서 발표, "early 2027" 예정. 아직 설치할 수 없다.
  - → **로컬 포토샵을 레이어 단위로 조종하는 건 지금은 커뮤니티 MCP(우리 것 포함)만 가능.**
- **공식 개발자 설명서는 있다**: Photoshop UXP API 레퍼런스(DOM · batchPlay · executeAsModal · Imaging). 생성형 AI 는 공식 API 에 `generativeUpscale`(27.2) 하나뿐이다. 생성형 채우기·이미지 생성은 **문서화되지 않은 batchPlay**(녹화로 얻음)로만 된다 — 우리가 1단계에서 한 방법과 같다.
- **공개 MCP 서버는 크게 3가지 방식**: UXP 플러그인 + 소켓(우리 · adb-mcp · dcc-mcp), ExtendScript + COM/AppleScript(alisaitteke · loonghao · PSForge 등), 원격 클라우드(Adobe 공식).
- **사람들이 만든 것**: 레이어 이름 정리, 배경 일괄 제거, 인스타 게시물·캐러셀, 튜토리얼 자동 생성, 템플릿 PSD 대량 제작·번역, 참고 이미지를 레이어 PSD 로 재구성.
- **공통 교훈**: AI 가 **캔버스를 못 보면** 실수(글자 잘림)를 성공이라고 말한다 → 결과 이미지를 돌려주는 도구가 핵심. 여러 단계를 **한 번의 되돌리기**로 묶는 "레시피"가 인기.

---

## A. 공식 안내 · 설명서

### Adobe for creativity (공식 클라우드 커넥터)
- 키워드: 공식, 어도비, 커넥터, 클라우드, adobe for claude, adobe creativity, /adobe, 공식 MCP
- 근거: [공식]
- 하는 일: Claude(웹·데스크톱·Claude Code) 안에서 Adobe 도구 109개를 부른다. 포토샵 계열 기능 — 색·조명 조정, 배경 흐림·제거, 수평 맞추기, 확장·자르기, 일괄 편집, 플랫폼별 크기 바꾸기.
- 방식: 원격 MCP `https://adobe-creativity.adobe.io/mcp`. 설정은 Claude → Customize → Plugins → "Adobe" 설치 → Connectors 에서 Connect → 대화에 `/adobe`.
- 크레딧: Adobe 계정 없이도 시작 가능. 로그인하면 생성형 도구·저장공간 추가. "Some tools require an eligible paid Adobe plan." 크레딧 수치는 공개 안 됨.
- 위험·제약: **업로드한 파일 / Creative Cloud 자산**을 다룬다. 로컬에 열린 PSD·레이어 조작은 언급 없음. "It does not include every feature from each Adobe app."
- 우리 상태: 경쟁이 아니라 보완 — 간단한 사진 보정은 공식 커넥터, **레이어 단위 작업·Firefly 생성 결과를 PSD 로 남기기**는 우리 MCP.
- 출처: https://www.adobe.com/adobe-connectors/adobe-for-claude.html · https://claude.com/connectors/adobe-creativity

### Adobe 로컬 MCP (Adobe MAX 2026 발표)
- 키워드: 로컬 MCP, 공식 데스크톱, adobe max, 2027, 베타, 앞으로, 예정
- 근거: [공식 발표 — 기사 경유]
- 하는 일: ChatGPT·Claude·Gemini 같은 외부 AI 가 Photoshop·Illustrator·Premiere·After Effects 를 **로컬에서** 조종. "layers, vectors, bins, and sequences stay editable". 예로 로토스코핑·구멍 메우기(image hole filling)가 언급됐다. 클라우드 MCP(Firefly 포함)는 그 뒤에.
- 방식: 미공개. 도구 목록·버전 요구사항 없음.
- 크레딧: 미공개
- 위험·제약: 일정은 "early 2027", 정확한 날짜 없음.
- 우리 상태: **나오면 우리 batchPlay 방식을 대체할 수 있는 후보.** 2단계 계획 때 다시 확인할 것.
- 출처: https://techcrunch.com/2026/11/10/adobe-adds-more-ai-to-its-products-and-launches-an-mcp/ · https://nofilmschool.com/adobe-local-mcp-integrations · https://itbrief.co.uk/story/adobe-plans-mcp-access-for-ai-agents-to-desktop-apps

### Photoshop UXP API 레퍼런스 (공식 개발자 설명서)
- 키워드: 설명서, 문서, 매뉴얼, 공식 문서, API, DOM, uxp, 레퍼런스, 개발자
- 근거: [공식]
- 하는 일: 플러그인에서 `require('photoshop').app` 으로 문서·레이어를 다루는 공식 API. 영역 — Document(crop · resizeImage · resizeCanvas · rotateCanvas · trim · flatten · createLayer · createTextLayer · sampleColor), Layer(이동·회전·크기·복제·삭제·불투명도, 필터 `applyAddNoise`~`applyShear` 등 23.5+), Selection(사각·타원·다각형 선택, 확장·축소·페더·반전·저장, 23.0+), TextItem(글꼴·문자/단락 스타일 24.2+), Channels, PathItems, LayerComps, ColorSamplers, Guides, HistoryStates, Actions(`play()` 만 — "no current way to create an action").
- 방식: DOM. 속성 읽기·쓰기는 동기, 메서드는 비동기.
- 크레딧: 없음
- 위험·제약: 문서를 바꾸는 모든 일은 `executeAsModal` 안에서(아래). 레퍼런스 최신 항목은 27.4(2026-02) — **우리 PS 28.0.0 의 신규 API 는 아직 문서에 없음.** `selectSubject` 는 DOM 에 없다(batchPlay 필요).
- 우리 상태: `ps_create_document` · `ps_list_layers` · `ps_export_png` 가 이 API 사용.
- 출처: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/ · https://developer.adobe.com/photoshop/uxp/2022/ps_reference/changelog/

### batchPlay (DOM 에 없는 기능의 통로)
- 키워드: batchplay, 녹화, 액션, descriptor, actionJSON, copy as javascript, 숨은 기능
- 근거: [공식]
- 하는 일: 포토샵 내부 명령(actionJSON)을 그대로 실행. DOM 에 없는 기능(생성형 AI, 피사체 선택 등)은 이것으로.
- 방식: `action.batchPlay(descriptors, options)`. 얻는 법(공식) — 개발자 모드에서 **Plugins > Development > Record Action Commands...**, 액션 패널 **Copy As JavaScript**, `addNotificationListener`. 옵션 `dialogOptions: "silent"`(기본) / `"display"`.
- 크레딧: 명령에 따라
- 위험·제약: Adobe 도 "DOM 을 먼저 쓰라"고 권장. 대상은 index 대신 **ID 로 지정** 권장. 실패해도 promise 는 성공하고 결과에 `_obj: "error"` 가 들어온다(-128 = 사용자 취소) → 결과를 꼭 확인해야 한다.
- 우리 상태: 생성 도구 2개가 사용 [검증됨, PS 28.0.0, `experiments/00`·`02`].
- 출처: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/batchplay/

### executeAsModal (모달 상태 · 되돌리기 묶기)
- 키워드: 모달, modal, 막힘, 실행 중, 되돌리기, 히스토리, undo, 한 번에 취소, 취소
- 근거: [공식]
- 하는 일: 문서를 바꾸는 작업은 이 안에서 해야 한다. 한 번에 한 플러그인만 모달.
- 방식: `core.executeAsModal(fn, { commandName, timeOut })`. `hostControl.suspendHistory` / `resumeHistory` 로 **여러 단계를 히스토리 1칸**으로 묶을 수 있다.
- 크레딧: 없음
- 위험·제약: 다른 모달이 있으면 `timeOut`(25.10+, 기본 1초) 뒤 오류 — 5단계에서 겪은 "modal state" 와 같은 계열. 2초 넘으면 진행 막대, Esc 로 사용자 취소 가능.
- 우리 상태: 사용 중(`commandName: "PS Agent: …"`). **히스토리 묶기는 아직 안 씀 → 후보.**
- 출처: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/executeasmodal/

### Imaging API (픽셀 직접 읽기·쓰기)
- 키워드: 픽셀, 미리보기, 썸네일, 화면 보기, 캔버스 보기, 이미지 데이터, getPixels, base64
- 근거: [공식]
- 하는 일: 레이어·문서 픽셀 읽기/쓰기(`getPixels`, `putPixels`), 레이어 마스크·선택 영역을 이미지로(`getLayerMask`, `getSelection`, `putSelection`), `encodeImageData` 로 JPEG base64.
- 방식: `require("photoshop").imaging` (24.4+ 정식)
- 크레딧: 없음
- 위험·제약: 큰 문서는 무겁다 — `targetSize` 를 작게, 끝나면 `dispose()`.
- 우리 상태: 없음 — **후보.** 지금은 PNG 파일로 저장해서 보여 주는데, 이걸 쓰면 **파일 없이 작은 미리보기**를 AI 에게 바로 줄 수 있다(레이어 하나만 보기도 가능).
- 출처: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/imaging/

---

## B. 생성형 AI

### 텍스트로 이미지 생성 (Generate Image)
- 키워드: 이미지 생성, 만들어, 그려, 생성, generate image, text to image, firefly
- 근거: [검증됨] + [다른 MCP]
- 하는 일: 프롬프트로 새 레이어에 이미지 생성.
- 방식: batchPlay `syntheticTextToImage` (녹화로 얻음, 공식 문서 없음). adb-mcp 는 UXP, alisaitteke 는 ExtendScript `executeAction` 으로 같은 기능 제공.
- 크레딧: 소모
- 위험·제약: 프리미엄 모델 체험 소진 시 구매 창 → 모달로 전부 막힘(5단계). 공식 API 가 아니라 PS 업데이트 때 바뀔 수 있다.
- 우리 상태: 있음(`ps_generate_image`)
- 출처: https://github.com/mikechambers/adb-mcp · https://github.com/alisaitteke/photoshop-mcp/blob/master/docs/generative-ai.md

### 생성형 채우기 (Generative Fill)
- 키워드: 채우기, 생성형 채우기, 영역, 선택 영역에, 바꿔, 넣어, generative fill
- 근거: [검증됨] + [다른 MCP]
- 하는 일: 선택 영역을 프롬프트대로 채움. 다른 MCP 들은 "**선택 먼저 → 채우기**" 순서를 도구 설명에 못박아 둔다.
- 방식: batchPlay `syntheticFill` (녹화). 공식 포럼에도 "공식 문서 없음, 베타라 바뀔 수 있음" 보고.
- 크레딧: 소모
- 위험·제약: 선택 영역 없음·너무 작음·정책 거절이 흔한 실패.
- 우리 상태: 있음(`ps_generative_fill`, 사각 영역 좌표를 직접 받음)
- 출처: https://forums.creativeclouddeveloper.com/t/can-i-use-generative-fill-in-uxp-photoshop-plugin/11638 · https://github.com/alisaitteke/photoshop-mcp/blob/master/docs/generative-ai.md

### 생성형 제거 (Generative Remove)
- 키워드: 지워, 제거, 없애, 사람 지워, 물체 제거, remove, erase
- 근거: [다른 MCP]
- 하는 일: 선택 안의 물체를 지우고 배경을 다시 만든다(바꾸는 게 아니라 없애기).
- 방식: 녹화 필요
- 크레딧: 소모 (작은 물체·단순 배경이면 크레딧 없는 "내용 인식 채우기"가 대안)
- 우리 상태: 후보
- 출처: https://github.com/alisaitteke/photoshop-mcp/blob/master/docs/generative-ai.md

### 생성형 확장 (Generative Expand)
- 키워드: 확장, 늘려, 넓혀, 비율 바꿔, 가로로, 아웃페인팅, expand, outpaint
- 근거: [다른 MCP] + [공식 — 공식 커넥터 기능 목록에 "expand"]
- 하는 일: 캔버스 밖으로 그림을 이어 그려 비율을 바꾼다.
- 방식: 녹화 필요 (캔버스 크기 늘리기는 DOM `resizeCanvas` [공식] + 빈 곳 채우기)
- 크레딧: 소모
- 우리 상태: 후보 — 지금도 `resizeCanvas` + `ps_generative_fill` 조합으로 흉내 가능
- 출처: https://github.com/alisaitteke/photoshop-mcp/blob/master/docs/generative-ai.md · https://www.adobe.com/adobe-connectors/adobe-for-claude.html

### 생성형 업스케일 (Generative Upscale)
- 키워드: 업스케일, 해상도, 크게, 고화질로, 확대, upscale
- 근거: [공식]
- 하는 일: 새 문서에 2배·4배로 키우며 디테일 생성. "Currently limited to Firefly at a scale of 2 or 4."
- 방식: DOM `Document.generativeUpscale(model, options)` (27.2+) — **생성형 기능 중 유일하게 공식 API**
- 크레딧: 소모
- 우리 상태: 후보 — 공식 API 라 batchPlay 녹화 없이 만들 수 있다
- 출처: https://developer.adobe.com/photoshop/uxp/2022/ps_reference/changelog/

### 하모나이즈 (Harmonize)
- 키워드: 합성, 어울리게, 조명 맞춰, 자연스럽게, harmonize
- 근거: [다른 MCP]
- 하는 일: 붙여 넣은 레이어의 빛·색을 배경에 맞춘다(투명 영역이 있는 래스터 레이어).
- 방식: adb-mcp 는 UXP 쪽에서 처리, alisaitteke 는 Neural Filter 로 처리(UXP 보조 플러그인 필요). 녹화 필요.
- 크레딧: 소모 추정(미확인)
- 우리 상태: 후보 — "생성 → 합성" 흐름에 쓸모
- 출처: https://github.com/mikechambers/adb-mcp

---

## C. 다른 MCP 서버 (2026-11-15 기준)

### alisaitteke/photoshop-mcp
- 키워드: alisaitteke, 레시피, 128개, 인기, extendscript
- 근거: [다른 MCP]
- 저장소: https://github.com/alisaitteke/photoshop-mcp · ⭐ 880 · 마지막 push 2026-11-14 · TypeScript · MIT
- 방식: **ExtendScript** 를 Windows COM / macOS AppleScript 로 실행. Neural Filter 만 선택 설치하는 UXP 보조 플러그인. PS 2012+ 지원.
- 도구: 128개(기본 111 + 레시피 17). 문서 관리·아트보드, 레이어 속성·순서·변형, 필터, 색 보정, 텍스트(글꼴 설치까지), 선택·마스크·피사체 선택, 생성형 5종(채우기·제거·확장·업스케일·이미지 생성), 하늘 교체, Neural Filter, 상태 확인 `photoshop_get_capabilities`.
- 참고할 점:
  - **레시피**: 여러 단계를 히스토리 1칸으로 — "every multi-step recipe is a single undo step".
  - **구조화된 오류**: `code` + `suggested_next_tool` 로 돌려줘 AI 가 스스로 복구.
  - 생성 전에 기능 확인 도구를 먼저 부르게 한다(버전·크레딧).
  - 자체 웹 채팅 UI·"Action Plan"(실행 전 계획 보여 주기).
- 출처: https://github.com/alisaitteke/photoshop-mcp · https://github.com/alisaitteke/photoshop-mcp/blob/master/docs/architecture.md

### mikechambers/adb-mcp
- 키워드: adb-mcp, mike chambers, 어도비 에반젤리스트, uxp, 프록시, 우리랑 비슷
- 근거: [다른 MCP]
- 저장소: https://github.com/mikechambers/adb-mcp · ⭐ 746 · 마지막 push 2026-07-08 · Python 서버 + JS 플러그인 · MIT
- 방식: **우리와 같은 구조** — MCP 서버 ↔ Node 프록시(ws://localhost:3001) ↔ UXP 플러그인. "UXP 플러그인은 소켓 서버가 될 수 없어 프록시가 필요"하다고 설명(우리 hub/relay 와 같은 이유). Premiere·InDesign(UXP), AE·Illustrator(CEP) 도 지원.
- 도구(약 60개): 문서 열기·저장·자르기·복제, 레이어 그룹·이동·크기·회전·뒤집기·마스크·래스터화, 텍스트 레이어 만들기·편집, 선택(사각·타원·다각형·피사체·하늘), 배경 제거, 조정 레이어(색 균형·밝기·활기·흑백), 레이어 스타일(그림자·획·그라데이션), 블러, **레이어/문서 이미지 가져오기**, 생성형 채우기·이미지 생성·하모나이즈.
- 참고할 점: 저자가 Adobe 직원(비공식 PoC). 생성 도구에 `content_type`(photo/art/none) 매개변수. 예제 영상 재생목록 있음.
- 출처: https://github.com/mikechambers/adb-mcp

### loonghao/photoshop-python-api-mcp-server
- 키워드: loonghao, 파이썬, python, com, 윈도우
- 근거: [다른 MCP]
- 저장소: https://github.com/loonghao/photoshop-python-api-mcp-server · ⭐ 352 · 마지막 push 2026-10-17 · Python · MIT
- 방식: Windows COM(`photoshop-python-api`). Windows 전용, CC2017~2024 테스트.
- 도구: 문서 생성·열기·저장, 텍스트·단색 레이어, 세션·문서 정보, 효과·보정.
- 참고할 점: `pip install` 한 줄로 설치. 생성형 AI 없음.
- 출처: https://github.com/loonghao/photoshop-python-api-mcp-server

### deermiya/PSForge
- 키워드: psforge, 스크립트, execute_script, 최소 도구, 참고 이미지 재구성
- 근거: [다른 MCP]
- 저장소: https://github.com/deermiya/PSForge · ⭐ 84 · 마지막 push 2026-06-07 · Python · MIT
- 방식: Windows COM + ExtendScript
- 도구: `execute_script`(임의 ExtendScript), `execute_batch`, `get_session_info`, `get_layers`, `capture_canvas`(캔버스를 PNG 로 돌려줌), `recreate_image_as_layered_psd`. 프롬프트 템플릿 `ps-image-analyzer`.
- 참고할 점: **도구 61개 → 몇 개로 줄였다.** "AI 가 거의 `execute_script` 만 썼다" — 스크립트 하나가 도구 10번 호출 몫. 다만 아무 스크립트나 실행하는 건 안전장치와 충돌한다(우리 원칙과 다름).
- 출처: https://github.com/deermiya/PSForge

### dcc-mcp/dcc-mcp-photoshop
- 키워드: dcc-mcp, 여러 프로그램, 생태계, 블렌더, 마야, uxp
- 근거: [다른 MCP]
- 저장소: https://github.com/dcc-mcp/dcc-mcp-photoshop · ⭐ 14 · 마지막 push 2026-11-03 · Python · 라이선스 표시 없음
- 방식: UXP 플러그인 브리지(adobepy). 48개 프로그램(DCC) 어댑터 공통 규칙의 일부. CLI(`dcc-mcp-cli search/describe/call`)로 필요한 도구만 꺼내 쓰는 "progressive skill".
- 참고할 점: 도구가 많아질 때 **필요한 것만 불러오는 구조** — 우리 2단계(두뇌)에서 참고.
- 출처: https://github.com/dcc-mcp/dcc-mcp-photoshop

### 그 밖의 서버 (작은 저장소)
- 키워드: 기타, 윈도우, c#, codex
- 근거: [다른 MCP]
- Vaxaxas/photoshop-mcp-windows-first (⭐ 5, 2026-03, TS) — 90+ 도구, 히스토리 되돌리기·액션 재생, **매 작업 뒤 문서 상태를 돌려줌**, Codex 스킬 동봉.
- airtaxi/PhotoshopMcpServer (⭐ 4, 2026-04, C#) — Windows COM.
- Chandrahas455/PsMCP (⭐ 10, 2025-07, Python) — win32com + Gemini Gradio 클라이언트.
- 출처: https://github.com/Vaxaxas/photoshop-mcp-windows-first · https://github.com/airtaxi/PhotoshopMcpServer · https://github.com/Chandrahas455/PsMCP-MCP-Server-for-Photoshop

---

## D. 사람들이 실제로 만든 것 · 쓰는 법

### 사용 사례 모음
- 키워드: 사례, 예시, 뭐 만들었어, 활용, 어떻게 써, use case, 아이디어
- 근거: [커뮤니티] (대부분 2025년 글 — 지금 도구와 다를 수 있음)
- 사례:
  - **레이어 이름 정리** — 이미지 인식 MCP 와 함께 실제 PSD 레이어를 내용대로 이름 바꾸기 (가장 많이 반복된 예)
  - **배경 일괄 제거**, 폴더 단위 워터마크
  - **인스타 게시물** — 폴라로이드 느낌 게시물(클리핑 마스크 사용), 사이버펑크 네온 레이아웃, 긴 배너를 캐러셀 여러 장으로 나누기
  - **튜토리얼 자동 생성** — 예제 파일을 만들고 따라 하는 단계를 써 줌 / 유튜브 자막을 보고 포토샵을 따라 조작
  - **템플릿 PSD 대량 제작·번역** — 같은 틀에 내용만 바꿔 여러 장
  - **디자인 접근성 점검·수정**
  - **참고 이미지를 레이어 PSD 로 재구성** (PSForge)
  - 사진 슬라이드쇼(포토샵 + 프리미어 연계)
- 출처: https://mikechambers.com/blog/post/2025-08-22-mcp-ai-and-adobe-creative-tool-experiments/ · https://www.mikechambers.com/blog/post/2025-06-06-exploring-ai-integration-with-adobe-photoshop-indesign-and-premiere-pro/ · https://github.com/alisaitteke/photoshop-mcp

### 잘 된 점 · 막힌 점 (사용 후기)
- 키워드: 후기, 문제, 한계, 실패, 잘 돼, 안 돼, 주의, 팁, limitation
- 근거: [커뮤니티]
- 잘 된 점: "the actual functionality and control works surprisingly well". 결과가 납작한 그림이 아니라 **수정 가능한 레이어 PSD**. 도구에 없는 효과(비네팅 등)를 선택·반전·채우기·블러 조합으로 스스로 만들어 냄.
- 막힌 점:
  - **AI 가 캔버스를 못 봄** — 글자가 캔버스 밖으로 나가도(2128px / 1920px) 모르고 "완성"이라고 함. 물어보면 경계를 재서 고침.
  - AI 가 시키지 않은 것까지 "창의적으로" 추가 → "하지 말 것"을 분명히.
  - API 빈틈 — 기존 문서의 색 모드(CMYK)·해상도 변경 불가였음(2025, adb-mcp 기준).
  - 도구 하나씩 부르면 느림 → 묶음 도구가 필요.
  - 무료 플랜은 문맥이 짧아 긴 작업이 끊김.
- 팁: 레이어 이름을 정확히 부르기, 캔버스 크기·"넘치지 말 것" 같은 조건을 명시, **결과를 눈으로 확인**, 앱 전용 안내문(instructions)을 먼저 읽히면 실수가 크게 준다.
- 출처: https://www.mikechambers.com/blog/post/2025-06-06-exploring-ai-integration-with-adobe-photoshop-indesign-and-premiere-pro/ · https://dev.classmethod.jp/articles/photoshop-automation-with-adb-mcp-claude-desktop/

---

## 도구 후보 순위

| 순위 | 기능 | 왜 쓸모 | 난이도 | 크레딧 | 근거 |
|---|---|---|---|---|---|
| 1 | **선택 영역 만들기 + 피사체 선택** | 생성형 채우기·제거·마스크 전부의 출발점. 지금은 사각 좌표만 받음 | 중 (사각·타원·다각형은 DOM, 피사체 선택은 녹화 필요) | 없음 | [공식] Selection · [다른 MCP] |
| 2 | **레이어 하나만 미리보기 (Imaging API)** | "AI 가 못 본다"가 공통 1위 문제. 파일 없이 작은 JPEG 를 바로 반환 | 하 | 없음 | [공식] Imaging |
| 3 | **텍스트 레이어 만들기·고치기** | 사례 대부분(게시물·배너·템플릿)이 글자 필요 | 하~중 | 없음 | [공식] `createTextLayer` · [다른 MCP] |
| 4 | 레이어 정리 (이름·순서·숨기기·삭제·그룹) | 가장 많이 반복된 사례 "레이어 이름 정리" | 하 | 없음 | [공식] Layer |
| 5 | 생성형 업스케일 | 생성형 중 유일한 공식 API — 녹화 없이 안정적 | 하 | 소모 | [공식] 27.2 |
| 6 | 생성형 제거 · 확장 | 생성 다음으로 많이 쓰는 생성형 기능 | 중 (녹화 필요) | 소모 | [다른 MCP] |
| 7 | 여러 단계를 되돌리기 1칸으로 (레시피) | 실수해도 한 번에 되돌림 — 안전장치 강화 | 중 | 없음 | [공식] suspendHistory · [다른 MCP] |
| 8 | 구조화된 오류 + 다음 도구 제안 | AI 스스로 복구 (예: "선택 영역 먼저") | 하 | 없음 | [다른 MCP] |

## 수집 기록

| 날짜 | 범위 | 비고 |
|---|---|---|
| 2026-11-15 | (뼈대만 생성) | 첫 수집 전 |
| 2026-11-15 | 1차: 공식 안내 · 생성형 AI · 다른 MCP 서버 8개 · 사용 사례 | helpx.adobe.com 2쪽 403, developer.adobe.com/adobe-for-creativity/getting-started 404(→ adobe.com 소개 쪽으로 대체), petapixel 403. 공식 커넥터 도구 109개 중 23개만 보임(포토샵 도구 이름 미확인). UXP 변경 기록은 27.4 까지라 PS 28 신규 API 미확인. `gh` 미설치 → GitHub 공개 API(curl)로 조회 |
