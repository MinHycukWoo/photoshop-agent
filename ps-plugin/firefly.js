// 생성형 AI batchPlay 명령 모음.
// ⚠️ 형식은 1단계에서 액션 녹화(Copy As JavaScript)로 확인한 것 그대로다. (experiments/00-recorded-gen-test.js)
//    바꾼 것은 prompt 값과, 녹화 당시 번호였던 documentID / layerID 를 뺀 것뿐.
//    포토샵 업데이트 후 생성이 안 되면 다시 녹화해서 아래 ENGINE 값을 비교한다. (Photoshop 28.0.0 기준)

const ENGINE = {
  serviceID: "clio",
  serviceVersion: "firefly_image_5",
  workflow_to_active_service_identifier_map: {
    gen_harmonize: "gen_harmonize",
    generate_background: "clio3",
    generate_similar: "clio3",
    generativeUpscale: "clio_f16_async",
    in_painting: "me_md",
    instruct_edit: "null",
    out_painting: "me_md",
    prompt_to_edit: "firefly_image_5",
    text_to_image: "firefly_image_5",
  },
};

function clioOptions(mode, giPrompt) {
  return {
    clio: {
      _obj: "clio",
      dualCrop: true,
      gi_CONTENT_PRESERVE: 0,
      gi_CROP: false,
      gi_DILATE: false,
      gi_ENABLE_PROMPT_FILTER: true,
      gi_GUIDANCE: 6,
      gi_MODE: mode, // 이미지 생성 "ginp", 채우기 "tinp" (녹화값)
      gi_NUM_STEPS: -1,
      gi_PROMPT: giPrompt,
      gi_SEED: -1,
      gi_SIMILARITY: 0,
    },
  };
}

const CURRENT_DOCUMENT = [{ _enum: "ordinal", _ref: "document", _value: "targetEnum" }];

// 현재 문서 전체에 프롬프트로 이미지 생성 → 새 Generative Layer
function generateImage(prompt) {
  return {
    _obj: "syntheticTextToImage",
    _target: CURRENT_DOCUMENT,
    prompt,
    serviceID: ENGINE.serviceID,
    serviceOptionsList: clioOptions("ginp", ""), // 녹화본에서 gi_PROMPT 는 빈 값
    serviceVersion: ENGINE.serviceVersion,
    workflow: "text_to_image",
    workflowType: { _enum: "genWorkflow", _value: "text_to_image" },
    workflow_to_active_service_identifier_map: ENGINE.workflow_to_active_service_identifier_map,
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
    serviceID: ENGINE.serviceID,
    serviceOptionsList: clioOptions("tinp", prompt), // 녹화본에서 채우기는 gi_PROMPT 에도 프롬프트
    serviceVersion: ENGINE.serviceVersion,
    workflowType: { _enum: "genWorkflow", _value: "in_painting" },
    workflow_to_active_service_identifier_map: ENGINE.workflow_to_active_service_identifier_map,
  };
}

module.exports = { generateImage, selectRectangle, generativeFill };
