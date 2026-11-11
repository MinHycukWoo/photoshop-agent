// 원본 기록: 포토샵 액션 패널 "Copy As JavaScript" 결과 (Photoshop 28.0.0, 2026-11-11)
// 액션: ps-agent / gen-test  (새 문서 → 이미지 생성 → 사각형 선택 → 생성형 채우기)
// ⚠️ 수정하지 말 것. batchPlay 형식의 "근거 자료"로 보관한다.
//    documentID / layerID 는 녹화 당시 번호라 그대로 다시 실행하면 안 맞는다.
//    실제로 다시 실행 가능한 버전은 01-gen-test.psjs

async function gentest() {
    let commands = [
        // Make
        {
            "_obj": "make",
            "documentID": 59,
            "new": {
                "_obj": "document",
                "artboard": false,
                "autoPromoteBackgroundLayer": false,
                "depth": 8,
                "fill": {
                    "_enum": "fill",
                    "_value": "white"
                },
                "guides": [],
                "height": {
                    "_unit": "distanceUnit",
                    "_value": 1024.0
                },
                "mode": {
                    "_class": "RGBColorMode"
                },
                "pixelScaleFactor": 1.0,
                "profile": "none",
                "resolution": {
                    "_unit": "densityUnit",
                    "_value": 72.0
                },
                "width": {
                    "_unit": "distanceUnit",
                    "_value": 1024.0
                }
            }
        },
        // Generate Image current document
        {
            "_obj": "syntheticTextToImage",
            "_target": [
                {
                    "_enum": "ordinal",
                    "_ref": "document",
                    "_value": "targetEnum"
                }
            ],
            "documentID": 59,
            "layerID": 2,
            "prompt": "a cat",
            "serviceID": "clio",
            "serviceOptionsList": {
                "clio": {
                    "_obj": "clio",
                    "dualCrop": true,
                    "gi_CONTENT_PRESERVE": 0,
                    "gi_CROP": false,
                    "gi_DILATE": false,
                    "gi_ENABLE_PROMPT_FILTER": true,
                    "gi_GUIDANCE": 6,
                    "gi_MODE": "ginp",
                    "gi_NUM_STEPS": -1,
                    "gi_PROMPT": "",
                    "gi_SEED": -1,
                    "gi_SIMILARITY": 0
                }
            },
            "serviceVersion": "firefly_image_5",
            "workflow": "text_to_image",
            "workflowType": {
                "_enum": "genWorkflow",
                "_value": "text_to_image"
            },
            "workflow_to_active_service_identifier_map": {
                "gen_harmonize": "gen_harmonize",
                "generate_background": "clio3",
                "generate_similar": "clio3",
                "generativeUpscale": "clio_f16_async",
                "in_painting": "me_md",
                "instruct_edit": "null",
                "out_painting": "me_md",
                "prompt_to_edit": "firefly_image_5",
                "text_to_image": "firefly_image_5"
            }
        },
        // Set Selection
        {
            "_obj": "set",
            "_target": [
                {
                    "_property": "selection",
                    "_ref": "channel"
                }
            ],
            "to": {
                "_obj": "rectangle",
                "bottom": {
                    "_unit": "pixelsUnit",
                    "_value": 958.0
                },
                "left": {
                    "_unit": "pixelsUnit",
                    "_value": 269.0
                },
                "right": {
                    "_unit": "pixelsUnit",
                    "_value": 941.0
                },
                "top": {
                    "_unit": "pixelsUnit",
                    "_value": 422.0
                }
            }
        },
        // Generative Fill current document
        {
            "_obj": "syntheticFill",
            "_target": [
                {
                    "_enum": "ordinal",
                    "_ref": "document",
                    "_value": "targetEnum"
                }
            ],
            "documentID": 59,
            "layerID": 3,
            "prompt": "red ball",
            "serviceID": "clio",
            "serviceOptionsList": {
                "clio": {
                    "_obj": "clio",
                    "dualCrop": true,
                    "gi_CONTENT_PRESERVE": 0,
                    "gi_CROP": false,
                    "gi_DILATE": false,
                    "gi_ENABLE_PROMPT_FILTER": true,
                    "gi_GUIDANCE": 6,
                    "gi_MODE": "tinp",
                    "gi_NUM_STEPS": -1,
                    "gi_PROMPT": "red ball",
                    "gi_SEED": -1,
                    "gi_SIMILARITY": 0
                }
            },
            "serviceVersion": "firefly_image_5",
            "workflowType": {
                "_enum": "genWorkflow",
                "_value": "in_painting"
            },
            "workflow_to_active_service_identifier_map": {
                "gen_harmonize": "gen_harmonize",
                "generate_background": "clio3",
                "generate_similar": "clio3",
                "generativeUpscale": "clio_f16_async",
                "in_painting": "me_md",
                "instruct_edit": "null",
                "out_painting": "me_md",
                "prompt_to_edit": "firefly_image_5",
                "text_to_image": "firefly_image_5"
            }
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}

console.log(
    await require("photoshop").core.executeAsModal(gentest, {"commandName": "Action Commands"})
);
