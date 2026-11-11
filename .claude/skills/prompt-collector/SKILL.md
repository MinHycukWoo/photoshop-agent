---
name: prompt-collector
description: 포토샵 에이전트의 "프롬프트 정보 수집관". 웹에서 사람들이 실제로 쓰는 이미지 생성 프롬프트 요령(구조·조명·렌즈·역동성·장르별 표현)을 조사해 knowledge/prompt-patterns.md 를 출처와 함께 갱신한다. "프롬프트 패턴 업데이트해줘", "프롬프트 정보 수집해줘", "OO 장르 프롬프트 패턴 모아줘", "요즘 사람들은 어떤 프롬프트 써?", /prompt-collector 호출 시 사용. 남의 프롬프트 전문을 복사해 쌓지 않고, 짧은 패턴·표현 조각과 원리만 자기 말로 정리한다.
---

# 프롬프트 정보 수집관

Claude Desktop 은 웹을 검색하지 않는다. 그래서 수집은 Claude Code 가 이 스킬로 하고,
결과(`knowledge/prompt-patterns.md`)를 MCP 서버의 `ps_prompt_guide` 가 RAG 로 읽어 Claude Desktop 에 전달한다.

## 1. 범위 정하기
- 사용자가 장르·주제를 말했으면 그것만 (예: "음식 사진 패턴", "SF 일러스트").
- 말이 없으면 `knowledge/prompt-patterns.md` 의 "수집 기록" 표와 `logs/*.jsonl` 의 최근 요청을 보고 **비어 있는 장르**나 **실패가 잦은 요청**을 고른다.
- 이번 수집 범위를 사용자에게 한 줄로 알리고 진행한다.

## 2. 조사
- 출처 우선순위: ① Adobe 공식(Firefly 프롬프트 가이드, Photoshop 도움말) ② 사진·영화 촬영 용어 자료 ③ 업체 블로그·공개 갤러리 (여러 곳에서 **반복되는** 요령만 채택)
- WebSearch 는 `standard` 로 여러 개를 한 번에, 핵심 페이지는 web-fetch 로 직접 읽는다. 사이트가 자동 접근을 막으면(403 등) 다시 시도하지 말고 기록에 남긴다.
- 프롬프트 판매 사이트의 유료 프롬프트는 수집하지 않는다.

## 3. 정리 규칙 (중요)
- **전문 복사 금지.** 남의 프롬프트를 통째로 옮기지 않는다. 원리는 자기 말로, 예시는 **10단어 안팎의 표현 조각**으로만.
- **수집하지 않는 것:** 실존 작가 이름으로 화풍 지정("in the style of 작가명"), 캐릭터·브랜드·실존 인물 이름, 필터 우회 요령. (`knowledge/policy-rewrite.md` 원칙)
- 모든 항목에 **출처 URL** 과 **신뢰도**: `[공식]` Adobe 자료 / `[커뮤니티]` 반복 관행·미검증.
- Firefly·Photoshop 에 해당하지 않는 요령(예: 다른 모델 전용 문법 `--ar`, 가중치 `(word:1.3)`)은 빼거나 "다른 모델 전용"이라고 표시한다.

## 4. 문서 형식 (RAG 가 읽는 형식 — 지킬 것)
`mcp-server/src/knowledge.ts` 의 `loadSections` 가 아래 형식으로 쪼개고, 키워드가 사용자 요청에 "포함"되는지로 찾는다.

```markdown
## D. 묶음 이름

### 패턴 이름
- 키워드: 한국어 표현 여러 개, 영어 표현 (사용자가 실제로 쓸 말 · 어미 다양하게)
- 신뢰도: [공식] 또는 [커뮤니티]
- 요점 / 패턴 / 조각: …
- 주의: … (있으면)
- 출처: URL · URL
```
- 기존 항목과 겹치면 새로 만들지 말고 **기존 항목에 조각·출처를 보탠다.**
- 맨 아래 "수집 기록" 표에 날짜·범위·비고(막힌 출처 등)를 한 줄 추가하고, 맨 위 "마지막 수집" 날짜를 갱신한다.

## 5. 확인
```
cd mcp-server
npm run build
node --input-type=module -e "import { loadPromptPatterns, searchCamera } from './dist/knowledge.js'; const p = await loadPromptPatterns(); console.log(p.length); console.log(searchCamera(p, '<이번 범위의 한국어 요청 예시>', 3).map(x => x.title))"
node scripts/selftest.mjs
```
- 새 항목이 예시 요청으로 검색되는지 확인한다. 안 걸리면 키워드를 보강한다.

## 6. 마무리
- 사용자에게: 추가·보강한 패턴 목록, 출처 링크, 막힌 출처를 한국어로 보고한다.
- 사용자가 원하면 커밋한다 (README 진행 상황은 바꾸지 않는다. 수집 기록은 문서 안에 남는다).
