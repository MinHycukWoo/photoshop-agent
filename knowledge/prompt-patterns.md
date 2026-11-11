# 실제로 쓰이는 프롬프트 패턴 (정보 수집관)

웹에서 사람들이 실제로 쓰는 이미지 프롬프트 요령을 모아 **패턴(구조·짧은 표현 조각)** 으로 정리한 문서.
남의 프롬프트 전문을 옮기지 않고, 자주 반복되는 표현과 원리만 짧게 적는다. 각 항목에 출처를 단다.

- 마지막 수집: 2026-11-12 2차 (Claude Code `prompt-collector` 스킬)
- 실명(감독·스튜디오·작가), 필름·카메라·잡지 등 **상품명**은 빼고 "어떻게 보이는지"(색·입자·대비·구도)로 바꿔 적었다
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

### 키워드 쌓기 대신 관계를 묘사
- 키워드: 키워드, 나열, 품질, 고화질, 8k, 디테일, 더 좋게, 퀄리티, quality, keywords
- 신뢰도: [커뮤니티]
- 요점: `8k, highly detailed, masterpiece` 처럼 **품질 단어를 쌓는 것**이 가장 흔한 실수로 꼽힌다. 대신 **무엇이 어디에 어떻게** 있는지를 쓴다.
  - 나쁜 예: `cinematic, teal and orange, 8k`
  - 나은 예: `warm orange on skin tones, cool teal in the shadows`
- 스타일 단서는 **3~6개** 정도. 서로 다른 하위 스타일을 섞으면 결과가 흔들린다.
- 출처: https://budgetpixel.com/blog/color-grading-secrets-how-to-mood-board-your-ai-renders-like-a-pro · https://crepal.ai/prompts/anime-art-style-prompts-for-ai

### 한 번에 하나씩 바꾸기 (반복 수정 요령)
- 키워드: 다시, 수정, 고쳐, 개선, 마음에 안 들어, 비슷하게, 반복, iterate, refine
- 신뢰도: [커뮤니티] + [공식] 일부
- 요점:
  - 결과가 마음에 안 들면 **조명·색·자세 중 하나만** 바꿔서 무엇이 효과 있었는지 알 수 있게 한다.
  - 결과가 거의 맞으면 처음부터 다시 쓰지 말고 **가장 나은 결과를 기준으로** 조금씩 고친다.
  - 연작을 만들 때는 스타일·매체 문구를 **매번 똑같이** 유지해야 톤이 맞는다.
  - Adobe 도 "간단히 시작 → 묘사를 더하며 다듬기" 를 권한다 [공식].
- 출처: https://modelia.ai/blog/editorial-fashion-content-with-ai · https://dupple.com/learn/how-to-illustrate-a-childrens-book-with-ai · https://www.adobe.com/uk/products/firefly/discover/ai-prompt-guide.html

### 길이 감각
- 키워드: 길이, 너무 길어, 짧게, 몇 단어, 몇 글자, 제한, length
- 신뢰도: [커뮤니티]
- 요점: Firefly 는 짧은 구절도 잘 알아듣는다(최소 3단어 이상 권장이 보고됨). Firefly 프롬프트에 **약 750자 제한**이 있다는 보고가 있다(공식 확인 전). 이 프로젝트 기준 400자 안팎이 무난.
- 출처: https://www.techradar.com/pro/software-services/how-to-master-ai-prompts-to-create-the-image-you-need-the-first-time · https://novoads.ai/en/blog/adobe-firefly-prompts

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

### 재질 · 질감 어휘
- 키워드: 재질, 질감, 소재, 금속, 유리, 나무, 가죽, 천, 벨벳, 대리석, 녹슨, 낡은, 반짝이는, 투명한, material, texture
- 신뢰도: [커뮤니티]
- 요점: "metal" 처럼 재료 이름만 쓰지 말고 **마감·낡은 정도·빛 반응**까지 쓴다. 질감은 빛이 닿을 때 드러나므로 조명과 함께 쓴다.
- 조각 (금속): `brushed aluminum with soft stretched reflections` · `polished chrome` · `matte stainless steel` · `weathered iron with patina`
- 조각 (유리·투명): `visible light refraction` · `glass edges catching rim light` · `subsurface scattering` (반투명한 피부·왁스·잎)
- 조각 (천·나무·돌): `crushed velvet with directional sheen` · `weathered wood with deep grain` · `veined marble` · `coarse linen weave`
- 미세 디테일: `micro-scratches` · `fine dust` · `fingerprints on glossy surface` · `frayed edges`
- 출처: https://www.vizcom.ai/prompt-guide-online/surface-property-terminology · https://zsky.ai/blog/ai-texture-and-material-prompts · https://glennwilliams.beehiiv.com/p/164-images-later-part-1-the-language-of-materials

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

### 건축 · 인테리어
- 키워드: 건축, 건물, 인테리어, 실내, 거실, 방, 카페 내부, 집, 공간, 리빙룸, architecture, interior
- 신뢰도: [커뮤니티]
- 패턴: **공간 종류 → 양식 → 재질 → 색 → 조명(광원·방향) → 분위기 → 카메라**. 한두 문장이면 충분.
- 조각: `architectural interior photography` · `wide-angle, vertical lines kept straight` · `soft daylight from floor-to-ceiling windows` · `oak floor, limestone walls, linen textiles` · `warm evening lamps, quiet mood`
- 요령: 재질을 **이름 + 성질**로 (`honed travertine, matte and porous`). 디자인 사조 이름(미니멀, 미드센추리 모던, 북유럽)은 일관성에 도움.
- 출처: https://lumalabs.ai/news/ai-interior-design-prompts · https://spacely.ai/blog/architecture-ai-prompts · https://create.microsoft.com/en-us/learn/articles/create-show-stopping-interior-design-installations-image-creator · https://www.rundiffusion.com/architectural-lighting-prompts

### 동물 · 야생
- 키워드: 동물, 야생, 새, 사자, 여우, 사슴, 고양이, 강아지, 자연 다큐, wildlife, animal
- 신뢰도: [커뮤니티]
- 조각: `telephoto lens, animal isolated against soft blurred habitat` · `low golden side light with rim light on fur` · `natural behavior, mid-action` · `eye-level with the animal` · `wildlife documentary photography`
- 요령: 종(품종)과 **하고 있는 행동**을 구체적으로. 실제 야생 사진은 주인공이 가운데인 경우가 드물다 → 삼분할 + 여백.
- 주의: 특정 잡지·방송사 이름으로 스타일 지정하지 않는다 (상표).
- 출처: https://www.promptspace.in/blog/ai-nature-wildlife-photography-prompts-2026 · https://morphic.com/resources/images/wildlife-photography-images · https://www.revid.ai/make/dynamic-wildlife-portrait-photography

### 패션 화보
- 키워드: 패션, 화보, 룩북, 모델, 옷, 스타일링, 의상, 잡지, fashion, editorial, lookbook
- 신뢰도: [커뮤니티]
- 패턴: 인물 → **자세** → 표정 → 옷(**원단·실루엣**) → 장소 → 조명 → 톤 단어
- 자세 조각: `contrapposto stance` · `angular editorial pose with bent elbows and knees` · `power pose` · `leaning on a railing, relaxed`
- 조명 조각: `soft Rembrandt lighting` (삼각형 볼 하이라이트) · `side light for drama` · `flat even light for clean commercial look`
- 톤 단어: `high-fashion` · `minimalist` · `romantic` · `gritty` · `avant-garde`
- 출처: https://modelia.ai/blog/editorial-fashion-content-with-ai · https://promptpiece.pages.dev/posts/people/fashion-and-editorial-posing · https://invideo.io/faq/how-do-you-write-pose-directions-in-ai-prompts-to-get/

### 매크로 (초접사)
- 키워드: 매크로, 접사, 초근접, 곤충, 벌, 이슬, 물방울, 꽃잎, 눈 확대, macro, close-up
- 신뢰도: [공식] + [커뮤니티]
- 요점: `macro`, `extreme close-up` 으로 **배율**을 정하고, 대상의 종과 질감을 구체적으로 [공식]. 무엇이 선명하고 무엇이 흐려지는지 쓴다.
- 조각: `extreme macro, 1:1 magnification` · `compound eye facets` · `dew droplets refracting backlight` · `shallow depth of field, soft bokeh` · `100mm macro lens look`
- 출처: https://www.adobe.com/products/firefly/features/text-to-image/macro-photography-nature.html · https://imageprompt-epb.pages.dev/looks/macro-photography · https://morphic.com/resources/images/macro-photography-images

### 야경 · 네온 · 블루아워
- 키워드: 야경, 밤, 네온, 도시의 밤, 블루아워, 해 질 녘 직후, 불빛, 빛 궤적, night, neon, blue hour
- 신뢰도: [커뮤니티]
- 요점: 밤 장면은 **색온도가 다른 빛을 섞을 때** 살아난다 (따뜻한 텅스텐 + 차가운 달빛 + 컬러 네온). 젖은 바닥 반사를 함께.
- 조각: `deep blue sky fading to a warm horizon, office lights switching on` · `pink and cyan neon mirrored in wet asphalt` · `steam drifting from a street vent` · `red and white light trails, long exposure` · `warm sodium streetlights`
- 주의: 간판 글자가 깨져 나오기 쉽다 → `signs without readable text` 를 고려.
- 출처: https://getimg.ai/ai-stock-generator/night-photography · https://carat.im/en/prompt-gallery/blue-hour-photo · https://ai-image-gallery.pages.dev/blog/ai-night-photography-prompts

### SF · 사이버펑크
- 키워드: SF, 사이버펑크, 미래, 미래 도시, 디스토피아, 홀로그램, 로봇, 우주, 공상과학, cyberpunk, sci-fi, futuristic
- 신뢰도: [공식] 일부 + [커뮤니티]
- 요점: 분위기가 핵심 → **조명과 대기를 층층이** (비·안개·연기 + 반사면). 그다음 구도.
- 조각: `rainy night, volumetric fog` · `holographic signage` · `wet reflective streets` · `dense layered megastructures` · `street-level perspective, atmospheric depth` · `gritty lived-in technology`
- 출처: https://www.adobe.com/products/firefly/features/ai-art-generator/cyberpunk-aesthetic.html · https://lumalabs.ai/news/cyberpunk-ai-prompts · https://www.apatero.com/blog/best-prompts-cyberpunk-art-neon-cities-2025

### 컨셉 아트 · 캐릭터 시트
- 키워드: 캐릭터, 캐릭터 디자인, 컨셉 아트, 설정화, 턴어라운드, 전신, 앞뒤옆, 시트, character design, turnaround, concept art
- 신뢰도: [커뮤니티]
- 요점: 여러 각도 시트는 **같은 인물·같은 비율**을 유지하는 게 어렵다. 먼저 **정면 전신 1장**을 잘 만들고 그걸 기준으로 확장.
- 조각: `full-body character design, neutral standing pose` · `front, three-quarter, side and back views` · `plain light background, even lighting` · `consistent proportions and outfit across views`
- 주의: 극적인 조명은 불일치를 숨기므로 설정화엔 **고른 조명**. 얼굴·흉터 같은 작은 디테일은 **따로 클로즈업**.
- 이 프로젝트에선: 전신 1장 → 생성형 채우기(ps_generative_fill)로 부분 수정이 현실적.
- 출처: https://www.kapwing.com/resources/how-to-create-a-character-reference-sheet-with-ai/ · https://diyai.io/ai-tools/image-generation/ai-character-sheet/ · https://vondy.com/learn/how-to-use-ai-for-character-design

### 동화 · 그림책 일러스트
- 키워드: 동화, 그림책, 아동, 어린이, 귀여운, 따뜻한 그림, 스토리북, storybook, children's book
- 신뢰도: [커뮤니티]
- 조각: `soft watercolor storybook illustration` · `gentle brushstrokes on textured paper` · `gouache with muted pastel colors` · `warm cozy lighting` · `simple shapes, clean lines, solid colors` (단순 버전)
- 요령: 여러 장(페이지)을 만들 땐 매체·스타일 문구를 **글자 그대로 반복**해 톤을 맞춘다.
- 출처: https://dupple.com/learn/how-to-illustrate-a-childrens-book-with-ai · https://fluxnote.io/guides/childrens-book-art-prompts · https://zsky.ai/blog/ai-art-for-childrens-books

### 3D · 아이소메트릭 · 클레이 · 복셀
- 키워드: 3D, 아이소메트릭, 미니어처, 디오라마, 클레이, 점토, 복셀, 픽셀, 로우폴리, 아이콘, isometric, clay, voxel, pixel art, low poly
- 신뢰도: [커뮤니티]
- 패턴: 주인공 + **렌더 질감**(클레이·광택 플라스틱·복셀) + 조명 + 시점(아이소메트릭) + 배경
- 조각: `isometric 3D render, cutaway view` · `soft clay render, matte material` · `tiny miniature diorama` · `soft global illumination, ambient occlusion` · `pastel palette, plain white background` · `tilt-shift miniature look`
- 주의: 3D 프로그램·렌더 엔진 **상품명**은 쓰지 않는다 → `3D render` 로 충분.
- 출처: https://godofprompt.ai/blog/3d-prompts/ · https://fluxnote.io/guides/how-to-make-isometric-scene-with-ai · https://zsky.ai/blog/ai-3d-rendering-guide

### 애니메이션 · 만화풍
- 키워드: 애니, 애니메이션, 만화, 웹툰, 셀화, 일본풍, 2D, anime, manga, cel shading
- 신뢰도: [커뮤니티]
- 요점: "anime style" 만 쓰면 뻔한 얼굴·조명이 나온다 → **선 굵기, 음영 방식, 색감, 시대·장르**를 구체적으로. 3D·실사로 새지 않게 2D 고정 단서를 넣는다.
- 조각: `2D cel shading with flat shadow blocks` · `clean thin line art` · `flat color tones` · `black-and-white manga with screentone and speed lines` · `painterly light-novel cover look`
- 주의: 특정 스튜디오·작품 이름으로 스타일 지정하지 않는다. 하위 스타일은 하나만.
- 출처: https://crepal.ai/prompts/anime-art-style-prompts-for-ai · https://lumalabs.ai/news/anime-ai-prompts · https://picsart.com/blog/anime-prompts/

### 레트로 필름 · 흑백
- 키워드: 레트로, 빈티지, 옛날 사진, 필름 사진, 70년대, 80년대, 흑백, 아날로그, 누아르, retro, vintage, film, black and white
- 신뢰도: [커뮤니티]
- 요점: "vintage" 한 단어보다 **시대 + 필름의 특성 + 상황**을 쓴다. 디지털처럼 지나치게 선명하면 시대감이 깨진다.
- 조각 (컬러): `1970s film photo, warm faded colors` · `lifted blacks, soft low contrast` · `fine grain, occasional light leak` · `period clothing and cars`
- 조각 (흑백): `high-contrast black-and-white film, gritty grain` · `deep crushed blacks, glowing highlights` · `1940s noir chiaroscuro, hard shadows`
- 주의: 필름 **상품명**은 상표라 쓰지 않고, 위처럼 **입자·대비·색 바램**으로 표현한다.
- 출처: https://zsky.ai/blog/ai-vintage-photo-prompts · https://budgetpixel.com/blog/noir-shadows-prompting-1940s-film-noir-chiaroscuro · https://selfielabstudio.com/blog/creating-ai-art-with-vintage-film-grain-and-analog-aesthetics-20260128

### 광고 · 포스터 · 배너 (글자 넣을 여백)
- 키워드: 광고, 포스터, 배너, 썸네일, 표지, 문구, 글자 넣을, 여백, 카피, 홍보, poster, banner, copy space
- 신뢰도: [커뮤니티]
- 요점: 글자는 **나중에 포토샵에서** 넣고, 이미지는 **여백이 어디에 있는지** 명시해서 만든다. 주인공은 하나로 단순하게.
- 조각: `ample negative space on the left for headline text` · `single focal subject, uncluttered background` · `open sky above for copy` · `no text, no watermark`
- 주의: 모델이 여백 지시를 무시할 때가 있다 → 결과 확인 후 생성형 확장(Expand)이나 캔버스 크기로 여백을 늘리는 방법도 있다.
- 출처: https://www.lovart.ai/ko/blog/creating-negative-space-ai-leave-room-for-text · https://fluxnote.io/guides/poster-design-prompts · https://www.seeles.ai/features/image/categories/posters-and-campaigns

---

## E. Firefly · Photoshop 에서만 해당하는 것

### 화면 설정과 함께 쓰기
- 키워드: 비율, 참조 이미지, 레퍼런스, 콘텐츠 유형, 참고 이미지, 이 그림처럼, reference, aspect ratio
- 신뢰도: [공식] (Photoshop Generate Image 소개 기준)
- 요점:
  - Photoshop Generate Image 는 콘텐츠 유형(사진/아트)과 **참조 이미지**로 스타일·구도를 이끌 수 있다. 말로 길게 쓰기보다 참조 이미지가 나은 경우가 있다.
  - 최대 2048×2048 생성, 결과는 Generative Layer 로 생긴다.
  - 이 프로젝트의 도구는 지금 참조 이미지·콘텐츠 유형을 지원하지 않는다 (필요하면 녹화로 형식을 확인해 추가).
- 출처: https://www.adobe.com/ie/products/photoshop/generate-image.html

### 생성형 채우기 (Generative Fill) 프롬프트
- 키워드: 생성형 채우기, 채우기, 부분 수정, 추가해, 넣어, 지우기, 지워, 없애, 제거, 바꿔, 일부만, 여기에, generative fill, inpaint, remove
- 신뢰도: [공식] + [커뮤니티]
- 요점:
  - **지우기(제거)**: 프롬프트를 **비워 두면** 주변을 보고 채운다 [공식]. 이 프로젝트의 ps_generative_fill 은 지금 빈 프롬프트를 받지 않는다(최소 1글자).
  - **추가**: 장면 전체가 아니라 **그 영역에 들어갈 것만** 짧고 구체적으로 (`red ball`, `a small potted plant`). 스타일 문구는 원본과 어울리게 최소한으로.
  - 선택 영역은 **경계 바깥 픽셀을 조금 포함**해야 자연스럽게 섞인다 (포토샵이 사방 ~17px 넓혀 쓰는 것도 이 때문 — 3단계에서 관찰).
  - 한 번에 여러 물건을 넣기보다 **영역마다 따로** 채우는 편이 낫다.
  - 결과가 거의 맞으면 그 결과를 기준으로 다시 다듬는다.
- 조각: `extend empty wall, same paint texture, no new objects` (빈 공간 채우기) · `clear blue sky` · `grass and dirt path`
- 출처: https://www.adobe.com/cc-shared/fragments/products/photoshop/generative-fill/personalization/generative-fill-how-tos · https://digital-photography-school.com/generative-fill-in-photoshop/ · https://blog.pincel.app/generative-fill-tips/

### 생성형 확장 (Generative Expand)
- 키워드: 확장, 늘려, 캔버스 넓혀, 바깥으로, 잘린 부분, 여백 추가, 가로로 넓게, expand, outpaint
- 신뢰도: [공식] + [커뮤니티]
- 요점:
  - 대부분 **빈 프롬프트**가 가장 자연스럽다 (주변 픽셀을 이어서 생성). 프롬프트를 쓸 땐 **스타일이 아니라 내용·공간**을 쓴다 (`grassy field continuing to the horizon`).
  - 생성형 확장도 **표준 생성형 크레딧 1회**를 쓴다 [공식].
  - 이 프로젝트에는 아직 확장 도구가 없다 → 필요하면 녹화로 batchPlay 형식을 확인해 추가.
- 출처: https://helpx.adobe.com/sg/photoshop/web/edit-images/retouch/expand-images-with-generative-ai.html · https://photofocus.com/photography/adobe-photoshop-generative-expand-extends-your-borders-easily/ · https://freeacademy.ai/lessons/photo-ai-generative-fill

---

## F. 분위기 · 색

### 날씨 · 대기
- 키워드: 날씨, 비, 눈, 안개, 폭풍, 흐린, 맑은, 아지랑이, 빛줄기, 대기, 분위기, weather, fog, mist, rain, snow, storm
- 신뢰도: [커뮤니티]
- 요점: 날씨는 **밀도 + 빛과의 상호작용 + 무엇을 가리는지**를 쓴다. 날씨가 표면에 남기는 흔적도 함께 (젖은 표면 반사, 눈의 푸른 그림자, 안개 속 먼 곳의 색 빠짐).
- 감정 짝: 따뜻함·로맨스 → 골든아워·가랑비+따뜻한 실내 / 신비·불안 → 짙은 안개·달밤 / 긴장·에너지 → 네온 빗속·뇌우·눈보라 / 고독 → 눈
- 조각: `volumetric fog with light rays` · `morning mist over the valley` · `fine drizzle, slick reflective pavement` · `fresh powder snow with cool blue shadows` · `gathering storm clouds` · `heat haze`
- 출처: https://zsky.ai/blog/ai-weather-atmosphere-prompts · https://selfielabstudio.com/blog/ai-image-prompts-weather-effects-for-character-storytelling-20260206 · https://www.promptshotai.com/blog/weather-atmosphere-ai-prompts

### 색감 · 컬러 그레이딩
- 키워드: 색감, 색, 톤, 컬러, 보정, 그레이딩, 파스텔, 채도, 따뜻한 색, 차가운 색, 영화 색감, 틸 오렌지, color, palette, grading, pastel, muted
- 신뢰도: [커뮤니티]
- 요점: "teal and orange" 처럼 이름만 쓰지 말고 **어느 색이 어디에** 오는지 쓴다. 구체적인 색 이름(cerulean, vermillion 등)도 잘 통한다는 보고.
- 조각: `warm orange skin tones, cool teal shadows` (블록버스터 톤) · `desaturated muted palette with one red accent` (무드) · `soft pastel palette, symmetrical framing, flat even light` (동화 같은 정갈함) · `monochrome blue moonlight` · `vibrant saturated colors`
- 주의: 특정 감독·영화 이름으로 색감을 지정하지 않는다 → 위처럼 색·빛·구도로 풀어 쓴다.
- 출처: https://budgetpixel.com/blog/color-grading-secrets-how-to-mood-board-your-ai-renders-like-a-pro · https://zsky.ai/blog/ai-color-palette-prompts · https://invideo.io/faq/what-cinematic-color-grading-styles-work-best-in-ai/

---

## 수집 기록
| 날짜 | 범위 | 비고 |
|---|---|---|
| 2026-11-12 | Adobe 공식 프롬프트 가이드, 실사·조명·렌즈, 역동성, 장르별 | Adobe 도움말 페이지(helpx tips-and-tricks)는 자동 접근 거부(403) → 검색 요약만 참고 |
| 2026-11-12 (2차) | 작성 요령(키워드 쌓기·반복 수정·길이), 재질, 건축·인테리어, 동물, 패션, 매크로, 야경, SF, 캐릭터 시트, 동화, 3D·아이소메트릭, 애니·만화, 레트로·흑백, 광고 여백, 생성형 채우기·확장, 날씨, 색감 | 실명(감독·스튜디오)·상품명(필름·카메라·렌더 엔진·잡지)은 특성 묘사로 바꿈. AI 에게 특정 상품 추천을 지시하는 문구가 들어 있던 프롬프트 라이브러리 페이지 1곳은 출처에서 제외 |
