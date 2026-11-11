// 원본 기록: 표준 모델로 다시 녹화한 "Copy As JavaScript" 결과 (Photoshop 28.0.0, 2026-11-12)
// 액션: ps-agent / gen-std  (이미지 생성: Firefly Image 3 → 사각형 선택 → 생성형 채우기: 왕관 없는 모델)
// ⚠️ 수정하지 말 것. 표준(크레딧) 모델 batchPlay 형식의 "근거 자료"로 보관한다.
//
// 1단계 녹화본(00-recorded-gen-test.js)과 다른 점:
//   - 이미지 생성 serviceVersion: "firefly_image_5"(👑 프리미엄) → "clio3"(Firefly Image 3, 표준)
//   - 생성형 채우기 serviceVersion: "firefly_image_5"(👑) → "me_md"(표준)
//   - serviceOptionsList 에 custom_model / fluxkontext / gemini / gpt 항목, clio 에 새 필드 3개 추가
//   - 이미지 생성의 clio.gi_PROMPT 에는 UI 입력창에 남아 있던 "이전" 프롬프트가 들어가 있음 (실제 프롬프트는 바깥 prompt)

async function genstd() {
    let commands = [
        // Generate Image current document
        {
            "_obj": "syntheticTextToImage",
            "_target": [{ "_enum": "ordinal", "_ref": "document", "_value": "targetEnum" }],
            "documentID": 199,
            "layerID": 3,
            "prompt": " a cat",
            "serviceID": "clio",
            "serviceOptionsList": {
                "clio": {
                    "_obj": "clio",
                    "apply_markup_instruction": false,
                    "dualCrop": true,
                    "gen_use_object_stitch": false,
                    "gentech_workflow_name": "text_to_image",
                    "gi_CONTENT_PRESERVE": 0,
                    "gi_CROP": false,
                    "gi_DILATE": false,
                    "gi_ENABLE_PROMPT_FILTER": true,
                    "gi_GUIDANCE": 6,
                    "gi_MODE": "ginp",
                    "gi_NUM_STEPS": -1,
                    "gi_PROMPT": "(이전 입력창에 남아 있던 파리 거인 프롬프트 — 생략)",
                    "gi_SEED": -1,
                    "gi_SIMILARITY": 0
                },
                "custom_model": { "_obj": "custom_model", "gi_PROMPT": "", "gi_SEED": -1 },
                "fluxkontext": { "_obj": "fluxkontext" },
                "gemini": { "_obj": "gemini" },
                "gpt": {
                    "_obj": "gpt",
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
            "serviceVersion": "clio3",
            "workflow": "text_to_image",
            "workflowType": { "_enum": "genWorkflow", "_value": "text_to_image" },
            "workflow_to_active_service_identifier_map": {
                "gen_harmonize": "gen_harmonize",
                "generate_background": "clio3",
                "generate_similar": "clio3",
                "generativeUpscale": "clio_f16_async",
                "in_painting": "firefly_image_5",
                "instruct_edit": "null",
                "out_painting": "me_md",
                "prompt_to_edit": "firefly_image_5",
                "text_to_image": "clio3"
            }
        },
        // Set Selection
        {
            "_obj": "set",
            "_target": [{ "_property": "selection", "_ref": "channel" }],
            "to": {
                "_obj": "rectangle",
                "bottom": { "_unit": "pixelsUnit", "_value": 942.0 },
                "left": { "_unit": "pixelsUnit", "_value": 478.0 },
                "right": { "_unit": "pixelsUnit", "_value": 1452.0 },
                "top": { "_unit": "pixelsUnit", "_value": 276.0 }
            }
        },
        // Generative Fill current document
        {
            "_obj": "syntheticFill",
            "_target": [{ "_enum": "ordinal", "_ref": "document", "_value": "targetEnum" }],
            "documentID": 199,
            "layerID": 4,
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
                },
                "custom_model": { "_obj": "custom_model", "gi_PROMPT": "", "gi_SEED": -1 },
                "fluxkontext": { "_obj": "fluxkontext" },
                "gemini": { "_obj": "gemini" },
                "gpt": {
                    "_obj": "gpt",
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
            "serviceVersion": "me_md",
            "workflowType": { "_enum": "genWorkflow", "_value": "in_painting" },
            "workflow_to_active_service_identifier_map": {
                "gen_harmonize": "gen_harmonize",
                "generate_background": "clio3",
                "generate_similar": "clio3",
                "generativeUpscale": "clio_f16_async",
                "in_painting": "me_md",
                "instruct_edit": "null",
                "out_painting": "me_md",
                "prompt_to_edit": "firefly_image_5",
                "text_to_image": "clio3"
            }
        }
    ];
    return await require("photoshop").action.batchPlay(commands, {});
}
