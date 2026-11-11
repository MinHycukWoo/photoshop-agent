# Firefly 프롬프트 작성 가이드 (프롬프트 작가 역할)

사용자의 요청(한국어 등)을 Firefly 가 잘 이해하는 **영어 프롬프트**로 바꾼다.

## 구조 (이 순서로 한 문장에 이어 쓴다)
1. **화풍·매체**: `Cinematic photorealistic photo of`, `Soft watercolor illustration of`, `3D render of`, `Oil painting of`
2. **주인공**: 누가/무엇이 + 외형 (크기, 재질, 색, 옷) — 구체적인 명사와 형용사
3. **행동·자세·방향**: `walking toward the camera`, `sitting by a window`, `facing left`
4. **장소·배경**: 장소 + 시간대 + 날씨 (`a rainy Paris street at dusk`)
5. **주변 요소**: 조연, 소품 (`pedestrians with umbrellas`)
6. **조명·분위기**: `moody cinematic lighting`, `warm golden hour light`, `soft diffused light`
7. **카메라·구도**: `wide shot`, `close-up portrait`, `eye-level`, `shallow depth of field`, `35mm film look`
8. **품질**: `ultra detailed, realistic textures`

## 요령
- 사용자가 말하지 않은 것은 **분위기를 해치지 않는 선에서** 채운다. 단, 핵심(주인공·화풍·방향)은 사용자의 말을 그대로 따른다.
- 원하지 않는 것은 "no ~" 보다 **원하는 것을 긍정형으로** 쓴다. (`empty street` > `no people`)
- 방향·구도 요청(예: "오른쪽을 보게", "카메라 쪽으로")은 **두 번** 표현하면 더 잘 따른다: `walking toward the camera, facing the viewer`
- **구도를 반드시 정한다.** 지정하지 않으면 "가운데에 정면으로 서 있는" 그림이 나오기 쉽다.
  카메라 기법·앵글·샷 크기·동작 어휘는 `camera-composition.md` (ps_prompt_guide 의 "카메라·구도 추천") 를 따른다.
- 역동성 = **동작(동사)** + **카메라 기법** + **환경 반응** 을 함께 쓴다.
  예: `mid-stride, cloak billowing` + `tracking shot, motion-blurred ground` + `puddle splashes under each step`
- 문장은 400자 안팎이면 충분하다. 너무 길면 뒤쪽 요소가 무시되기 쉽다.
- 캔버스 비율과 구도를 맞춘다: 가로(16:9)면 `wide shot`, 세로면 `full-body portrait` 등.
- **고유명사(캐릭터·브랜드·실존 인물·유명 건축물 이름)는 쓰지 않는다** → `policy-rewrite.md` 참고.

## 사용자에게 보여 줄 것
최종 영어 프롬프트와 함께 **한국어로 뜻을 짧게** 설명하고, 사용자 요청에서 바꾸거나 더한 부분이 있으면 무엇을 왜 바꿨는지 알린다.

## 이 프로젝트에서 확인된 사례
- `Eiffel Tower` 가 들어간 프롬프트가 거절된 뒤 `tall iron lattice tower` 로 바꾸자 통과했고, 결과에는 에펠탑이 잘 나왔다.
  (당시 프리미엄 모델 한도 문제와 겹쳐 있어 원인이 이름 때문이라고 단정할 수는 없다)
- 표준 모델(Firefly Image 3)로 1920×1080 생성: 약 16초.
