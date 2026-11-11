// 생성형 AI batchPlay 명령 모음.
// ⚠️ 형식은 액션 녹화(Copy As JavaScript)로 확인한 것 그대로다. 추측해서 바꾸지 않는다.
//    - 표준 모델 (지금 사용): experiments/02-recorded-gen-std.js  (5단계에서 다시 녹화)
//    - 프리미엄 모델 (예전):  experiments/00-recorded-gen-test.js (1단계)
//    바꾼 것은 prompt 값과, 녹화 당시 번호였던 documentID / layerID 를 뺀 것뿐.
//
// 5단계에서 발견: 1단계 녹화 때 기본 모델이 👑 프리미엄 "Firefly Image 5" 라서,
//   생성이 표준 크레딧이 아니라 프리미엄 "무료 체험" 횟수에서 빠졌고, 바닥나자 크레딧 구매 창이 떠서 막혔다.
//   → 표준 크레딧으로 쓰는 모델로 바꿨다. (Photoshop 28.0.0 기준)
//      이미지 생성: "clio3" (Firefly Image 3) / 생성형 채우기: "me_md"

const MODEL = {
  textToImage: "clio3", // Firefly Image 3 (표준). 프리미엄은 "firefly_image_5"
  inPainting: "me_md", // 생성형 채우기 표준 모델. 프리미엄은 "firefly_image_5"
};

const SERVICE_MAP = {
  gen_harmonize: "gen_harmonize",
  generate_background: "clio3",
  generate_similar: "clio3",
  generativeUpscale: "clio_f16_async",
  in_painting: MODEL.inPainting,
  instruct_edit: "null",
  out_painting: "me_md",
  prompt_to_edit: "firefly_image_5",
  text_to_image: MODEL.textToImage,
};

// 녹화본에 함께 들어 있던 파트너 모델 칸 (비어 있는 기본값 그대로)
const PARTNER_OPTIONS = {
  custom_model: { _obj: "custom_model", gi_PROMPT: "", gi_SEED: -1 },
  fluxkontext: { _obj: "fluxkontext" },
  gemini: { _obj: "gemini" },
  gpt: {
    _obj: "gpt",
    dualCrop: true,
    gi_CONTENT_PRESERVE: 0,
    gi_CROP: false,
    gi_DILATE: false,
    gi_ENABLE_PROMPT_FILTER: true,
    gi_GUIDANCE: 6,
    gi_MODE: "ginp",
    gi_NUM_STEPS: -1,
    gi_PROMPT: "",
    gi_SEED: -1,
    gi_SIMILARITY: 0,
  },
};

const CLIO_COMMON = {
  _obj: "clio",
  dualCrop: true,
  gi_CONTENT_PRESERVE: 0,
  gi_CROP: false,
  gi_DILATE: false,
  gi_ENABLE_PROMPT_FILTER: true,
  gi_GUIDANCE: 6,
  gi_NUM_STEPS: -1,
  gi_SEED: -1,
  gi_SIMILARITY: 0,
};

const CURRENT_DOCUMENT = [{ _enum: "ordinal", _ref: "document", _value: "targetEnum" }];

// 현재 문서 전체에 프롬프트로 이미지 생성 → 새 Generative Layer
function generateImage(prompt) {
  return {
    _obj: "syntheticTextToImage",
    _target: CURRENT_DOCUMENT,
    prompt,
    serviceID: "clio",
    serviceOptionsList: {
      clio: {
        ...CLIO_COMMON,
        apply_markup_instruction: false, // 표준 모델 녹화본에 있던 필드
        gen_use_object_stitch: false,
        gentech_workflow_name: "text_to_image",
        gi_MODE: "ginp",
        // 녹화본에는 입력창에 남아 있던 이전 프롬프트가 들어가 있었다. 실제 프롬프트는 바깥 prompt 이므로
        // 1단계에서 검증된 대로 빈 값으로 둔다.
        gi_PROMPT: "",
      },
      ...PARTNER_OPTIONS,
    },
    serviceVersion: MODEL.textToImage,
    workflow: "text_to_image",
    workflowType: { _enum: "genWorkflow", _value: "text_to_image" },
    workflow_to_active_service_identifier_map: SERVICE_MAP,
  };
}

// 사각형 선택 (녹화본 형식, 단위는 픽셀)
function selectRectangle({ left, top, right, bottom }) {
  const px = (v) => ({ _unit: "pixelsUnit", _value: v });
  return {
    _obj: "set",
    _target: [{ _property: "selection", _ref: "channel" }],
    to: { _obj: "rectangle", top: px(top), left: px(left), bottom: px(bottom), right: px(right) },
  };
}

// 현재 선택 영역을 프롬프트로 채우기 → 마스크 달린 새 Generative Layer
function generativeFill(prompt) {
  return {
    _obj: "syntheticFill",
    _target: CURRENT_DOCUMENT,
    prompt,
    serviceID: "clio",
    serviceOptionsList: {
      clio: { ...CLIO_COMMON, gi_MODE: "tinp", gi_PROMPT: prompt }, // 채우기는 gi_PROMPT 에도 프롬프트 (녹화값)
      ...PARTNER_OPTIONS,
    },
    serviceVersion: MODEL.inPainting,
    workflowType: { _enum: "genWorkflow", _value: "in_painting" },
    workflow_to_active_service_identifier_map: SERVICE_MAP,
  };
}

// 새 문서 (녹화본 "Make" 형식, documentID 만 뺐다). documents.add 가 실패할 때 대체용
function makeDocument({ width, height }) {
  return {
    _obj: "make",
    new: {
      _obj: "document",
      artboard: false,
      autoPromoteBackgroundLayer: false,
      depth: 8,
      fill: { _enum: "fill", _value: "white" },
      guides: [],
      height: { _unit: "distanceUnit", _value: height },
      mode: { _class: "RGBColorMode" },
      pixelScaleFactor: 1.0,
      profile: "none",
      resolution: { _unit: "densityUnit", _value: 72.0 },
      width: { _unit: "distanceUnit", _value: width },
    },
  };
}

module.exports = { MODEL, generateImage, selectRectangle, generativeFill, makeDocument };
