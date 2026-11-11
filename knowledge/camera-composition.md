# 카메라 · 구도 · 촬영 기법 가이드 (구도 RAG)

Firefly 는 구도를 지정받지 못하면 **"주인공이 화면 가운데에 정면으로 서 있는"** 무난한 그림을 만들기 쉽다.
사용자의 말에서 원하는 느낌을 찾아 아래 기법을 골라 프롬프트에 넣는다.

⚠️ 팬·틸트·오빗·트래킹·돌리·크레인·핸드헬드·돌리 줌·랙 포커스·롤은 **영상의 카메라 움직임**이다.
Firefly 는 정지 이미지를 만들기 때문에, **그 움직임이 사진에 남기는 흔적**(흐림, 시점, 원근 왜곡, 초점)으로 바꿔 표현한다.

각 항목의 "키워드"는 사용자가 이런 말을 하면 이 기법을 떠올리라는 뜻이다.

---

## A. 카메라 움직임 (영상 기법 → 정지 이미지로 옮기기)

### 고정 (Static / Locked-off)
- 키워드: 고정, 정적, 차분, 안정, 정면, 대칭, 기념사진, 포스터, static, locked
- 프롬프트: `locked-off static shot, tripod-steady framing, symmetrical composition, crisp details`
- 효과: 안정감·위엄. 움직임이 없어 정적인 느낌.
- 어울리는 장면: 웅장한 건축물, 의식, 초상, 정지된 긴장감.
- 주의: 이것이 Firefly 의 기본값에 가깝다. **역동적인 장면에는 피한다.**

### 팬 (Pan) — 패닝 샷
- 키워드: 팬, 패닝, 옆으로, 가로로, 질주, 스쳐 지나가는, 빠르게 지나가는, 속도감, pan, panning
- 프롬프트: `panning shot, subject sharp while the background streaks into horizontal motion blur, sense of speed`
- 효과: 주인공은 선명, 배경은 가로 잔상 → 빠른 이동.
- 어울리는 장면: 달리는 사람·동물·차, 말 타고 질주.

### 틸트 (Tilt)
- 키워드: 틸트, 위아래로, 발끝부터 머리까지, 올려다보는, 높이, 거대함, tilt
- 프롬프트: `tilted-up vertical view from the feet to the towering head, strong vertical perspective, converging lines`
- 효과: 세로 방향으로 훑는 시선 → 크기·높이 강조.
- 어울리는 장면: 거인, 고층 건물, 폭포. (세로 캔버스와 잘 맞음)

### 오빗 (Orbit / Arc)
- 키워드: 오빗, 아크, 빙글, 주위를 도는, 360, 돌면서, 둘러싼, orbit, arc
- 프롬프트: `dynamic three-quarter angle as if the camera is circling the subject, slightly rotated perspective, background parallax blur`
- 효과: 주인공을 축으로 회전하는 느낌, 결정적 순간의 긴장.
- 어울리는 장면: 결투 직전, 변신, 영웅의 등장.
- 주의: 회전 자체는 표현 불가 → **비스듬한 3/4 시점 + 배경 흐림**으로 암시.

### 트래킹 (Tracking / Follow)
- 키워드: 트래킹, 따라가는, 쫓아가는, 추격, 나란히, 함께 달리는, 뒤따르는, 팔로우, tracking, follow
- 프롬프트: `tracking shot running alongside the subject at the same speed, subject in sharp focus, motion-blurred ground and surroundings`
  (뒤에서 쫓는 느낌이면 `follow shot from behind, over the shoulder, chasing`)
- 효과: 관객이 함께 움직이는 몰입감.
- 어울리는 장면: 추격, 달리기, 비행, 골목 질주.

### 돌리 (Dolly in / out)
- 키워드: 돌리, 다가가는, 가까워지는, 밀고 들어가는, 멀어지는, 빨려 들어가는, dolly, push in
- 프롬프트: `dolly-in perspective with strong leading lines converging toward the subject, deep one-point perspective`
- 효과: 시선이 주인공에게 빨려 들어감.
- 어울리는 장면: 복도·골목 끝의 인물, 긴장 고조.

### 크레인 / 지브 (Crane / Jib)
- 키워드: 크레인, 지브, 높은 곳에서, 내려다보는, 전경, 웅장한, 하늘에서, 공중, crane, aerial
- 프롬프트: `high crane shot sweeping down over the scene, elevated overhead perspective, the whole street visible below`
- 효과: 장면 전체를 내려다보는 스케일감.
- 어울리는 장면: 군중 속 주인공, 도시 전경, 전투 전경.

### 핸드헬드 (Handheld)
- 키워드: 핸드헬드, 손으로 든, 흔들리는, 현장감, 다큐, 긴박한, 날것, 리얼한, 뉴스, handheld, documentary
- 프롬프트: `handheld camera feel, slightly tilted imperfect framing, subtle motion blur, documentary realism, caught in the moment`
- 효과: 긴박함, 현장에 있는 듯한 사실감.
- 어울리는 장면: 혼란, 재난, 추격, 거리 사진.

### 롤 / 더치 앵글 (Roll / Dutch angle)
- 키워드: 롤, 더치, 기울어진, 비스듬한, 불안한, 혼란, 어지러운, 뒤틀린, dutch, canted, roll
- 프롬프트: `dutch angle, horizon tilted about 20 degrees, unsettling diagonal composition`
- 효과: 불안·긴장·광기.
- 어울리는 장면: 스릴러, 악역 등장, 혼란스러운 순간.

### 돌리 줌 (Dolly zoom / Vertigo effect)
- 키워드: 돌리 줌, 버티고, 현기증, 충격, 깨닫는 순간, 공간이 늘어나는, vertigo, dolly zoom
- 프롬프트: `vertigo effect look, background perspective dramatically stretched and warped behind the subject, unsettling depth`
- 효과: 주인공은 그대로인데 배경이 늘어나 보이는 충격.
- 주의: **영상에서만 진짜로 보이는 효과**라 정지 이미지로는 "광각 원근 왜곡" 정도로만 비슷하게 나온다. 사용자에게 그렇게 설명한다.

### 랙 포커스 (Rack focus)
- 키워드: 랙 포커스, 초점 이동, 초점이 넘어가는, 앞은 선명, 뒤는 흐릿, 아웃포커스, rack focus, focus pull
- 프롬프트: `selective focus, sharp foreground subject with a softly blurred background (or the reverse), shallow depth of field, focus on <대상>`
- 효과: 시선을 한 곳에 고정.
- 주의: 초점이 "옮겨 가는" 과정은 정지 이미지로 표현할 수 없다 → **어디에 초점을 둘지 하나를 정한다.**

---

## B. 앵글 (카메라 높이·방향)

### 로우 앵글 (Low angle) / 웜즈아이
- 키워드: 로우 앵글, 아래에서, 올려다보는, 위압적인, 영웅적인, 웅장한, 바닥에서, low angle, worm's eye
- 프롬프트: `low-angle shot from near ground level looking up, imposing heroic presence, sky behind the subject`
- 주의: 위협적인 거대 존재 + 로우 앵글은 Firefly 가 거절할 수 있다(5단계 경험). 거절되면 `slightly low angle` 로 완화.

### 하이 앵글 / 버드아이 / 탑다운
- 키워드: 하이 앵글, 내려다보는, 위에서, 작아 보이는, 외로운, 탑다운, 부감, high angle, bird's eye, top-down
- 프롬프트: `high-angle shot looking down`, `bird's-eye view`, `top-down flat lay`
- 효과: 주인공이 작고 약해 보임, 패턴·배치 강조.

### 오버 더 숄더 (Over the shoulder)
- 키워드: 어깨 너머, 뒤에서, 바라보는 장면, 대치, 마주보는, over the shoulder
- 프롬프트: `over-the-shoulder shot from behind one character, looking at the scene ahead, blurred shoulder in the foreground`

### 시점 샷 (POV / 1인칭)
- 키워드: 1인칭, 내 시점, 눈으로 보는, POV, 손이 보이는
- 프롬프트: `first-person POV shot, the viewer's hands visible in the foreground`

### 실루엣 / 역광
- 키워드: 실루엣, 역광, 그림자만, 노을 앞, backlit, silhouette
- 프롬프트: `strong backlight, subject in dark silhouette against a glowing sky, rim light`

---

## C. 샷 크기 (얼마나 크게 담나)

### 익스트림 와이드 / 와이드 (Establishing)
- 키워드: 전경, 넓게, 풍경 속, 작게, 배경 위주, 와이드, wide, establishing
- 프롬프트: `extreme wide shot, tiny subject in a vast environment` / `wide shot, full body with surroundings`

### 미디엄 / 카우보이 샷
- 키워드: 상반신, 허리까지, 무릎까지, medium shot, cowboy shot
- 프롬프트: `medium shot from the waist up` / `cowboy shot framed from mid-thigh up`

### 클로즈업 / 익스트림 클로즈업
- 키워드: 얼굴, 눈, 가까이, 디테일, 표정, 클로즈업, close-up, macro
- 프롬프트: `tight close-up on the face`, `extreme close-up of the eye, macro detail`

---

## D. 사진 기법 · 렌즈

### 광각 원근 왜곡
- 키워드: 광각, 왜곡, 과장된, 박력, 코앞, wide angle, fisheye
- 프롬프트: `ultra-wide 16mm lens, exaggerated perspective, subject's hand reaching toward the lens`

### 망원 압축
- 키워드: 망원, 압축, 멀리서, 배경이 가까워 보이는, 군중 속, telephoto
- 프롬프트: `telephoto 200mm lens compression, background stacked close behind the subject`

### 고속 셔터 (순간 정지)
- 키워드: 순간, 정지, 공중에 뜬, 튀는, 물방울, 점프, freeze, mid-air
- 프롬프트: `high shutter speed freezing the action mid-air, droplets and debris suspended`

### 장노출
- 키워드: 장노출, 빛 궤적, 흐르는, 밤 도로, long exposure, light trails
- 프롬프트: `long exposure, streaking light trails, smooth motion blur of moving crowds`

---

## E. 구도 규칙 (가운데 정면 탈출)

### 삼분할 · 비대칭 배치
- 키워드: 한쪽에, 옆에, 비켜서, 여백, 삼분할, off-center, rule of thirds
- 프롬프트: `subject placed on the left third of the frame, negative space on the right`

### 대각선 구도 · 리딩 라인
- 키워드: 대각선, 역동적, 선을 따라, 길이 뻗은, diagonal, leading lines
- 프롬프트: `strong diagonal composition, leading lines of the street guiding the eye to the subject`

### 전경 레이어 · 프레임 속 프레임
- 키워드: 앞에 무언가, 사이로, 문틀, 창문 너머, 깊이감, 엿보는, foreground, framing
- 프롬프트: `shot through a rain-streaked window`, `framed by a dark archway, blurred foreground elements for depth`

---

## F. 역동적인 동작 표현 (차렷 자세 탈출)

### 동작 어휘
- 키워드: 역동적, 움직이는, 액션, 달리는, 뛰는, 싸우는, 생동감, 동적인, dynamic, action
- 프롬프트 재료 (주인공 동작):
  `mid-stride`, `lunging forward`, `leaping`, `turning sharply to look back`, `bracing against the wind`,
  `reaching toward the camera`, `crouching low`, `cloak billowing behind`, `hair whipping in the wind`
- 프롬프트 재료 (환경 반응):
  `rain streaks`, `puddle splashes under each step`, `debris and leaves swirling`, `pigeons scattering`, `sparks flying`
- 원칙: 동작(동사) + 카메라 기법 + 환경 반응을 **함께** 쓰면 역동성이 확실히 올라간다.

---

## 고르는 법
1. 사용자가 기법을 말했으면 그대로 쓴다.
2. 감정·상황만 말했으면(예: "긴박한", "웅장한") 위 키워드로 1~2개를 고른다.
3. 아무 말이 없으면 **가운데 정면을 피하고**, 장면에 맞는 역동적 구도를 골라 적용한 뒤 **다른 선택지 2개를 한 줄씩** 알려 준다.
4. 기법은 2~3개까지만 섞는다. 너무 많으면 서로 충돌한다 (예: 로우 앵글 + 탑다운 ✗).
