// 원본 기록: 포토샵 액션 패널 "Copy As JavaScript" 결과 (Photoshop 28.0.0, 2026-11-15, Pro Editor 모드)
// 액션: ps-agent / cutout-a (선택 → 피사체 → 레이어 마스크 추가 버튼)
//       ps-agent / cutout-b (속성 패널 → 빠른 작업 → 배경 제거)
// ⚠️ 수정하지 말 것. batchPlay 형식의 "근거 자료"로 보관한다.
//    layerID 는 녹화 당시 번호라 그대로 다시 실행하면 안 맞는다.

async function cutouta() {
    let commands = [
        // Select Subject
        {
            "_obj": "autoCutout",
            "sampleAllLayers": false
        },
        // Make
        {
            "_obj": "make",
            "at": {
                "_enum": "channel",
                "_ref": "channel",
                "_value": "mask"
            },
            "new": {
                "_class": "channel"
            },
            "using": {
                "_enum": "userMaskEnabled",
                "_value": "revealSelection"
            }
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}

console.log(
    await require("photoshop").core.executeAsModal(cutouta, {"commandName": "Action Commands"})
);

async function cutoutb() {
    let commands = [
        // Set Background
        {
            "_obj": "set",
            "_target": [
                {
                    "_property": "background",
                    "_ref": "layer"
                }
            ],
            "layerID": 3,
            "to": {
                "_obj": "layer",
                "mode": {
                    "_enum": "blendMode",
                    "_value": "normal"
                },
                "opacity": {
                    "_unit": "percentUnit",
                    "_value": 100.0
                }
            }
        },
        // Remove Background
        {
            "_obj": "removeBackground"
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}

console.log(
    await require("photoshop").core.executeAsModal(cutoutb, {"commandName": "Action Commands"})
);

// 액션: ps-agent / fill-ca (선택 → 피사체 → 편집 → 칠(Fill) → 내용: 내용 인식) — 2026-11-15 추가 녹화
async function fillca() {
    let commands = [
        // Select Subject
        {
            "_obj": "autoCutout",
            "sampleAllLayers": false
        },
        // Fill
        {
            "_obj": "fill",
            "contentAwareColorAdaptationFill": true,
            "contentAwareMirrorFill": false,
            "contentAwareRotateFill": false,
            "contentAwareScaleFill": false,
            "mode": {
                "_enum": "blendMode",
                "_value": "normal"
            },
            "opacity": {
                "_unit": "percentUnit",
                "_value": 100.0
            },
            "using": {
                "_enum": "fillContents",
                "_value": "contentAware"
            }
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}

console.log(
    await require("photoshop").core.executeAsModal(fillca, {"commandName": "Action Commands"})
);

// 액션: ps-agent / gen-remove (레이어 선택 → 피사체 선택 → 선택 확장 50px → 제거(Remove) 버튼) — 2026-11-15 추가 녹화
//   레이어 선택 2개는 녹화 준비 과정에서 들어간 것. 실제로 쓰는 것은 마지막 "removeButton" 하나.
async function genremove() {
    let commands = [
        // Select layer “배경 (피사체 제거)”
        {
            "_obj": "select",
            "_target": [
                {
                    "_name": "배경 (피사체 제거)",
                    "_ref": "layer"
                }
            ],
            "layerID": [
                3
            ],
            "makeVisible": false
        },
        // Select layer “원본”
        {
            "_obj": "select",
            "_target": [
                {
                    "_name": "원본",
                    "_ref": "layer"
                }
            ],
            "layerID": [
                2
            ],
            "makeVisible": false
        },
        // Select Subject
        {
            "_obj": "autoCutout",
            "sampleAllLayers": false
        },
        // Expand
        {
            "_obj": "expand",
            "by": {
                "_unit": "pixelsUnit",
                "_value": 50.0
            },
            "selectionModifyEffectAtCanvasBounds": false
        },
        // Remove
        {
            "_obj": "removeButton"
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}

console.log(
    await require("photoshop").core.executeAsModal(genremove, {"commandName": "Action Commands"})
);
