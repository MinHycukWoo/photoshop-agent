// 누끼(배경 제거) batchPlay 명령 모음.
// ⚠️ 형식은 액션 녹화(Copy As JavaScript)로 확인한 것 그대로다. 추측해서 바꾸지 않는다.
//    근거: experiments/03-recorded-cutout.js (Photoshop 28.0.0, 2026-11-15)
//    바꾼 것은 녹화 당시 번호였던 layerID 를 뺀 것뿐. (_target 이 이미 "현재 레이어"를 가리킨다)
//
// 두 가지를 녹화했고 cutout-a(피사체 선택 → 마스크)를 쓴다:
//   - 중간에 "선택 영역이 비었는지" 확인할 수 있어서, 피사체를 못 찾았을 때 거짓 성공을 막을 수 있다.
//   - cutout-b(removeBackground)는 한 번에 끝나지만 안에서 무슨 일이 있었는지 확인할 수 없다.
//   cutout-b 의 첫 단계(배경 레이어 → 일반 레이어)는 a 앞에 붙여 쓴다. 잠긴 "배경" 레이어에는 마스크를 달 수 없기 때문.

// 잠긴 "배경(Background)" 레이어를 일반 레이어로 바꾼다 (cutout-b 1단계)
function convertBackgroundToLayer() {
  return {
    _obj: "set",
    _target: [{ _property: "background", _ref: "layer" }],
    to: {
      _obj: "layer",
      mode: { _enum: "blendMode", _value: "normal" },
      opacity: { _unit: "percentUnit", _value: 100.0 },
    },
  };
}

// 선택 → 피사체 (cutout-a 1단계). 현재 레이어만 보고 찾는다.
function selectSubject() {
  return { _obj: "autoCutout", sampleAllLayers: false };
}

// 선택 영역으로 레이어 마스크 만들기: 선택 안은 보이고 밖은 가려진다 (cutout-a 2단계)
function maskFromSelection() {
  return {
    _obj: "make",
    at: { _enum: "channel", _ref: "channel", _value: "mask" },
    new: { _class: "channel" },
    using: { _enum: "userMaskEnabled", _value: "revealSelection" },
  };
}

// 편집 → 칠 → 내용 인식: 선택 영역을 주변 픽셀로 이어 채운다 (fill-ca 녹화 2단계, 크레딧 없음)
// 현재 레이어의 픽셀을 직접 바꾼다 (새 레이어를 만들지 않음)
function contentAwareFill() {
  return {
    _obj: "fill",
    contentAwareColorAdaptationFill: true,
    contentAwareMirrorFill: false,
    contentAwareRotateFill: false,
    contentAwareScaleFill: false,
    mode: { _enum: "blendMode", _value: "normal" },
    opacity: { _unit: "percentUnit", _value: 100.0 },
    using: { _enum: "fillContents", _value: "contentAware" },
  };
}

// 선택 영역에서 "제거(Remove)" 버튼: 지우기 전용 AI 로 주변에 맞춰 메운다 (gen-remove 녹화 마지막 단계)
// 녹화본에 옵션이 없다. 결과가 새 레이어인지 현재 레이어 수정인지는 녹화로 알 수 없어 main.js 에서 둘 다 확인한다.
function removeButton() {
  return { _obj: "removeButton" };
}

module.exports = { convertBackgroundToLayer, selectSubject, maskFromSelection, contentAwareFill, removeButton };
