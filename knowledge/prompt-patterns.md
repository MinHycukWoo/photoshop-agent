# 실제로 쓰이는 프롬프트 패턴 (정보 수집관)

웹에서 사람들이 실제로 쓰는 이미지 프롬프트 요령을 모아 **패턴(구조·짧은 표현 조각)** 으로 정리한 문서.
남의 프롬프트 전문을 옮기지 않고, 자주 반복되는 표현과 원리만 짧게 적는다. 각 항목에 출처를 단다.

- 마지막 수집: 2026-11-12 (Claude Code `prompt-collector` 스킬)
- 신뢰도 표시: **[공식]** Adobe 공식 자료 · **[커뮤니티]** 업체 블로그·갤러리에서 반복되는 관행 (검증된 벤치마크 아님)
- 실존 작가 이름으로 화풍을 지정하는 패턴, 캐릭터·브랜드 이름 패턴은 **수집하지 않는다** (`policy-rewrite.md`)

---

## A. 기본 원칙

### Adobe 공식 작성 원칙
- 키워드: 기본, 원칙, 공식, 어도비, firefly, 처음, 간단, 길이, 문장
- 신뢰도: [공식]
- 요점:
  - 먼저 **간단하게** 쓰고, 결과를 보며 **묘사를 더해 가는** 방식을 권한다.
  - **구체적으로**: 주인공의 종류·색·하는 일을 명시한다 (예: 그냥 "dog" 보다 품종·색·동작).
  - **화풍·매체를 밝힌다** (photo, illustration, oil painting 등) — 결과가 크게 달라진다.
  - **조명과 시간대**(sunrise, golden hour, evening), **색 구성**(vibrant / muted), **분위기 형용사**(dark, happy, sad)를 넣는다.
  - **배경·장소**를 적는다 (`in a kitchen`, `in the woods`).
  - 완전한 문장이 아니어도 된다. 일상적인 말과 짧은 구절로 충분하다.
  - "generate", "create" 같은 명령어는 빼고 장면만 묘사한다. ([커뮤니티] 에서 Adobe 권고로 인용됨, 공식 원문 미확인)
- Firefly 가 예시에서 나눠 보여 주는 요소: **주인공 · 배경 · 이미지 종류 · 스타일 · 색 · 조명 · 동작**
- 출처: https://www.adobe.com/uk/products/firefly/discover/ai-prompt-guide.html

### 레이어 공식 (가장 많이 반복되는 구조)
- 키워드: 구조, 순서, 공식, 템플릿, 어떻게 써, structure, formula
- 신뢰도: [커뮤니티]
- 패턴: **주인공 → 스타일(매체) → 구도 → 조명 → 수식어(분위기·질감·색)**
  - 사진 계열 변형: 주인공 → 장면 → 조명 → 카메라·렌즈 → 앵글 → 분위기
- 요령: 품질 형용사(`best quality`, `masterpiece`)를 늘어놓기보다 **사진가가 장면을 설명하듯** 쓰는 편이 낫다는 의견이 많다.
- 출처: https://dupple.com/learn/how-to-write-ai-image-prompts · https://apiframe.ai/blog/how-prompt-engineering-affects-photorealistic-output

---

## B. 사실감 (실사풍)

### 조명은 한 가지 레시피로
- 키워드: 조명, 빛, 실사, 사실적, 리얼, lighting, realistic, photorealistic
- 신뢰도: [커뮤니티]
- 요점: 조명이 사실감에 가장 큰 영향을 준다는 의견이 일관된다. **이름 있는 조명 한 가지**를 정해 쓴다. "good lighting" 같은 막연한 말은 효과가 약하다.
- 조각: `golden hour backlight` · `soft overcast daylight` · `soft studio light` · `single window light from the left` · `neon signs as the main light source` · `rim light`
- 출처: https://zsky.ai/blog/ai-prompt-for-realistic-photos · https://lumalabs.ai/news/realistic-ai-image-prompts

### 렌즈·심도로 원근 만들기
- 키워드: 렌즈, 심도, 아웃포커스, 배경 흐림, 보케, 인물, lens, bokeh, depth of field
- 신뢰도: [커뮤니티]
- 요점: "blurry background" 만 쓰면 뭉개지기 쉽다 → **렌즈 길이·조리개·초점 위치**를 함께 쓴다.
- 조각: `85mm lens, f/1.8, sharp focus on the eyes` (인물) · `35mm documentary look` (거리) · `24mm wide angle` (공간감) · `200mm telephoto` (압축)
- 출처: https://picsart.com/tutorials/generate-photorealistic-images-with-ai-models/ · https://lumalabs.ai/news/ai-image-prompts

### 일부러 넣는 불완전함
- 키워드: 자연스러운, 진짜 사진 같은, 필름, 질감, 피부, 사진 느낌, film, grain, texture
- 신뢰도: [커뮤니티]
- 요점: 너무 매끈하면 CG 같다. 실제 카메라의 흔적을 조금 넣는다.
- 조각: `subtle film grain` · `slight lens flare` · `natural skin texture with pores` · `slight lens distortion` · `imperfect handheld framing`
- 출처: https://apiframe.ai/blog/how-prompt-engineering-affects-photorealistic-output

### 사진 장르 이름 붙이기
- 키워드: 다큐, 영화, 시네마틱, 스틸컷, 보도 사진, documentary, cinematic still, editorial
- 신뢰도: [커뮤니티]
- 요점: `documentary photography`, `cinematic film still`, `editorial photo` 같은 장르 이름이 일러스트 쪽으로 새는 것을 막는다. **2~3개까지만**.
- 출처: https://zsky.ai/blog/ai-prompt-for-realistic-photos

---

## C. 역동성 (움직임 표현)

### 멈춘 순간 vs 흐르는 속도
- 키워드: 역동적, 액션, 움직임, 속도, 질주, 순간, 점프, 공중, dynamic, action, speed, frozen
- 신뢰도: [커뮤니티]
- 두 가지 방향 중 하나를 고른다:
  - **멈춘 순간**: `high-speed photography, frozen mid-air, droplets suspended` — 힘·긴장
  - **흐르는 속도**: `motion blur, slow shutter, streaked background` — 속도감
- 주의: 빠른 장면을 완전히 멈춰 버리면 오히려 느려 보일 수 있다는 지적이 있다. 속도가 핵심이면 흐림 쪽을 고른다.
- 출처: https://budgetpixel.com/blog/the-temporal-engine-mastering-dynamic-motion-blur-and-shutter-imperfection · https://pixlr.com/blog/motion-effects-prompts/

### 패닝 공식 (선명한 주인공 + 흐르는 배경)
- 키워드: 패닝, 따라가며, 달리는, 질주, 선명한, 흐르는 배경, panning, tracking
- 신뢰도: [커뮤니티]
- 패턴: `panning shot` + `subject in sharp focus` + `background streaked with horizontal motion blur` + (속도선·물보라 등 환경 반응)
- 출처: https://budgetpixel.com/blog/shifting-gears-how-to-inject-dynamic-motion-and-action-into-your-ai-art

### 동작은 몸의 자세로 구체적으로
- 키워드: 자세, 포즈, 동작, 뛰는, 달리는, 싸우는, 차렷, 서 있는, pose, posture
- 신뢰도: [커뮤니티]
- 요점: `running`, `jumping` 같은 일반 동사는 뻔한 결과가 나온다 → **몸의 위치**를 묘사한다.
- 조각: `mid-stride with the front foot just touching the ground` · `torso leaning forward` · `arms pumping` · `body twisting to look back over the shoulder` · `knees bent, about to leap`
- 함께 쓰기 좋은 앵글: 로우 앵글, 트래킹, 더치 앵글 (`camera-composition.md`)
- 출처: https://budgetpixel.com/blog/kinetic-aura-how-to-prompt-high-speed-action-mechanics-without-generating-extra-limbs · https://selfielabstudio.com/blog/ai-image-prompts-mastering-dynamic-action-poses-and-movement-20260206

---

## D. 장르별 패턴

### 제품 사진
- 키워드: 제품, 상품, 광고, 쇼핑몰, 화장품, 병, 패키지, product, packshot
- 신뢰도: [커뮤니티]
- 패턴: 제품 + **재질** + 조명 + 카메라 각도 + 주변 소품·배경
- 조각: `studio lighting, clean seamless background` · `soft reflections on glossy glass` · `minimalist set with a single prop` · `45-degree angle, sharp focus`
- 출처: https://www.kimi.ai/resources/prompts-for-ai-image-generators · https://www.photoroom.com/it/blog/image-prompting

### 인물 사진
- 키워드: 인물, 초상, 프로필, 얼굴, 헤드샷, 화보, portrait, headshot
- 신뢰도: [커뮤니티]
- 조각: `natural light portrait` · `85mm lens look, shallow depth of field` · `editorial fashion portrait` · `soft flattering light`
- 주의: 실존 인물 이름은 쓰지 않는다 (가상의 인물로 특징을 일반적으로 묘사).
- 출처: https://lumalabs.ai/news/ai-image-prompts

### 풍경
- 키워드: 풍경, 산, 호수, 바다, 하늘, 노을, 자연, landscape, scenery
- 신뢰도: [커뮤니티]
- 조각: `golden hour` · `mirror-like reflections on the lake` · `layered mountains in morning mist` · `panoramic wide view` · `warm amber light`
- 출처: https://www.kimi.ai/resources/prompts-for-ai-image-generators

### 음식
- 키워드: 음식, 요리, 디저트, 메뉴, 카페, 레스토랑, food
- 신뢰도: [커뮤니티]
- 조각: `overhead top-down view` · `food styling with scattered fresh ingredients` · `dark moody background` · `macro close-up of textures` · `steam rising`
- 출처: https://www.kimi.ai/resources/prompts-for-ai-image-generators

### 수채화 일러스트
- 키워드: 수채화, 물감, 번지는, 손그림, watercolor
- 신뢰도: [커뮤니티]
- 조각: `watercolor paper texture` · `translucent color washes` · `soft bleeding edges` · `loose brushstrokes` · `muted palette`
- 출처: https://www.besthub.dev/articles/15-essential-photography-illustration-prompt-templates-for-consistent-ai-images-c36487e2c087

### 플랫 · 벡터 일러스트
- 키워드: 플랫, 벡터, 아이콘, 인포그래픽, 단순한, 깔끔한, flat, vector
- 신뢰도: [커뮤니티]
- 조각: `flat design illustration` · `simple geometric shapes` · `bold limited color palette` · `no gradients, no shadows`
- 출처: https://www.besthub.dev/articles/15-essential-photography-illustration-prompt-templates-for-consistent-ai-images-c36487e2c087

### 판타지 · 시네마틱 장면
- 키워드: 판타지, 영화, 시네마틱, 웅장한, 마법, 전설, fantasy, epic
- 신뢰도: [공식] 일부 + [커뮤니티]
- 조각: `cinematic depth of field` · `hyper-detailed textures` · `high fantasy editorial style` · `magical realism` · `vibrant color grading` · `volumetric light through mist`
- 출처: https://www.adobe.com/uk/products/firefly/discover/ai-prompt-guide.html (예시 표현) · https://aimagicx.com/blog/ai-image-generation-styles-mastering-aesthetics

### 미술 사조 · 재료로 스타일 지정
- 키워드: 스타일, 화풍, 사조, 유화, 팝아트, 인상주의, 종이접기, 뜨개, style, art style
- 신뢰도: [공식]
- 요점: 작가 이름 대신 **사조나 재료 이름**으로 스타일을 정한다.
- 조각: `impressionism` · `pop art` · `cubism` · `oil painting` · `steampunk` · `collage` · `origami` · `made of yarn` · `toon shading`
- 출처: https://www.adobe.com/uk/products/firefly/discover/ai-prompt-guide.html

---

## E. Firefly · Photoshop 에서만 해당하는 것

### 화면 설정과 함께 쓰기
- 키워드: 비율, 참조 이미지, 레퍼런스, 콘텐츠 유형, 사진, 아트, reference, aspect ratio
- 신뢰도: [공식] (Photoshop Generate Image 소개 기준)
- 요점:
  - Photoshop Generate Image 는 콘텐츠 유형(사진/아트)과 **참조 이미지**로 스타일·구도를 이끌 수 있다. 말로 길게 쓰기보다 참조 이미지가 나은 경우가 있다.
  - 최대 2048×2048 생성, 결과는 Generative Layer 로 생긴다.
  - 이 프로젝트의 도구는 지금 참조 이미지·콘텐츠 유형을 지원하지 않는다 (필요하면 녹화로 형식을 확인해 추가).
- 출처: https://www.adobe.com/ie/products/photoshop/generate-image.html

---

## 수집 기록
| 날짜 | 범위 | 비고 |
|---|---|---|
| 2026-11-12 | Adobe 공식 프롬프트 가이드, 실사·조명·렌즈, 역동성, 장르별 | Adobe 도움말 페이지(helpx tips-and-tricks)는 자동 접근 거부(403) → 검색 요약만 참고 |
