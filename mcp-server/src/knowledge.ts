// 지식 창고 (RAG): 프롬프트를 쓰거나 실패를 분석할 때 "관련 자료를 찾아서" 함께 보여 준다.
//  ① knowledge/*.md : 우리가 정리한 가이드 (프롬프트 작성, 정직한 재작성 규칙, 실패 원인)
//  ② logs/*.jsonl   : 실제 생성 기록 → 비슷한 과거 사례, "실패 → 고쳐서 성공" 짝
// 검색은 단어 겹침 점수(간단한 방식). 2단계에서 의미 기반 검색(임베딩)으로 바꿀 수 있다.
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SERVER_DIR } from "./config.js";
import { LOGS_DIR } from "./logger.js";

export const KNOWLEDGE_DIR = process.env.PS_AGENT_KNOWLEDGE_DIR || resolve(SERVER_DIR, "..", "knowledge");

const GEN_TOOLS = new Set(["ps_generate_image", "ps_generative_fill"]);

export interface Case {
  time: string;
  tool: string;
  prompt: string;
  ok: boolean;
  seconds?: number;
  model?: string; // 생성 결과에 모델이 기록된 경우 (빌드 13 부터)
  error?: string;
}

export interface RepairPair {
  failed: Case;
  fixed: Case;
  removedWords: string[]; // 실패한 프롬프트에만 있던 단어
  addedWords: string[]; // 고친 프롬프트에 새로 생긴 단어
  causeCertain: boolean; // 실패 원인이 확실한지 (모델 기록이 없던 시기는 크레딧 한도와 겹쳐 불확실)
}

// ── 문서 ──────────────────────────────────────────────
export async function readGuide(
  file: "prompt-guide.md" | "policy-rewrite.md" | "failure-causes.md" | "camera-composition.md" | "prompt-patterns.md",
): Promise<string> {
  try {
    return await readFile(join(KNOWLEDGE_DIR, file), "utf8");
  } catch {
    return `(${file} 을 찾을 수 없습니다: ${KNOWLEDGE_DIR})`;
  }
}

// ── 기록에서 사례 읽기 ────────────────────────────────
export async function loadCases(): Promise<Case[]> {
  let files: string[] = [];
  try {
    files = (await readdir(LOGS_DIR)).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
  const cases: Case[] = [];
  for (const f of files) {
    const lines = (await readFile(join(LOGS_DIR, f), "utf8")).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if (!GEN_TOOLS.has(j.tool) || !j.args?.prompt) continue;
        const text: string = (j.text ?? []).join("\n");
        cases.push({
          time: j.time,
          tool: j.tool,
          prompt: j.args.prompt,
          ok: !j.isError,
          seconds: Number(text.match(/"seconds": ([\d.]+)/)?.[1]) || undefined,
          model: text.match(/"model": "([^"]+)"/)?.[1],
          error: j.isError ? text.slice(0, 160) : undefined,
        });
      } catch {
        // 깨진 줄은 건너뛴다
      }
    }
  }
  return cases.sort((a, b) => a.time.localeCompare(b.time));
}

// 실패 직후 15분 안에 같은 도구로 성공한 시도 = "고쳐서 성공한 짝"
export function findRepairPairs(cases: Case[]): RepairPair[] {
  const pairs: RepairPair[] = [];
  cases.forEach((c, i) => {
    if (c.ok) return;
    const fixed = cases
      .slice(i + 1)
      .find((n) => n.tool === c.tool && n.ok && Date.parse(n.time) - Date.parse(c.time) < 15 * 60_000);
    if (!fixed) return;
    const before = new Set(words(c.prompt));
    const after = new Set(words(fixed.prompt));
    pairs.push({
      failed: c,
      fixed,
      removedWords: [...before].filter((w) => !after.has(w)),
      addedWords: [...after].filter((w) => !before.has(w)),
      causeCertain: !!c.model, // 모델이 기록된 실패만 "크레딧 한도가 아닌" 실패로 볼 수 있다
    });
  });
  // 같은 성공에 여러 실패가 묶이면 가장 가까운(마지막) 실패만 남긴다
  return pairs.filter((p, i) => !pairs.slice(i + 1).some((q) => q.fixed === p.fixed));
}

// ── 검색 ──────────────────────────────────────────────
// 어디에나 나오는 단어는 검색에 도움이 안 돼서 뺀다
const STOP = new Set(
  ("the and with from into onto that this its their for are was were has have "
    + "photo photorealistic cinematic detailed ultra realistic textures lighting shot film look style "
    + "image picture background").split(" "),
);

export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+|[가-힣]+/g) ?? []).filter(
    (w) => (/[가-힣]/.test(w) ? w.length >= 2 : w.length >= 3) && !STOP.has(w),
  );
}

function similarity(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const common = [...A].filter((w) => B.has(w)).length;
  return common === 0 ? 0 : common / Math.sqrt(A.size * B.size);
}

export function searchCases(cases: Case[], query: string, k = 5): Array<Case & { score: number }> {
  const q = words(query);
  return cases
    .map((c) => ({ ...c, score: similarity(q, words(c.prompt)) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// 초안에 "과거에 실패한 프롬프트에서 빼자 성공했던 단어" 가 들어 있는지
export function riskyWords(draft: string, pairs: RepairPair[]) {
  const d = new Set(words(draft));
  return pairs.flatMap((p) =>
    p.removedWords.filter((w) => d.has(w)).map((w) => ({ word: w, replacedWith: p.addedWords.slice(0, 6), certain: p.causeCertain, when: p.failed.time })),
  );
}

// ── 카메라·구도 검색 (camera-composition.md 를 기법별로 쪼개서 찾는다) ──
export interface CameraTechnique {
  group: string; // A. 카메라 움직임 등
  title: string; // "팬 (Pan) — 패닝 샷"
  keywords: string[];
  body: string; // 섹션 전체 (프롬프트·효과·주의)
}

// 카메라 구도 문서와 정보 수집관 패턴 문서는 같은 형식("### 제목" + "- 키워드: …")이라 같은 방식으로 쪼갠다
export async function loadCameraTechniques(): Promise<CameraTechnique[]> {
  return loadSections("camera-composition.md");
}

export async function loadPromptPatterns(): Promise<CameraTechnique[]> {
  return loadSections("prompt-patterns.md");
}

async function loadSections(file: "camera-composition.md" | "prompt-patterns.md"): Promise<CameraTechnique[]> {
  const doc = await readGuide(file);
  const techniques: CameraTechnique[] = [];
  let group = "";
  // "## " = 묶음 제목, "### " = 기법 하나
  for (const block of doc.split(/\n(?=##+ )/)) {
    const heading = block.match(/^(##+) (.+)/);
    if (!heading) continue;
    if (heading[1] === "##") {
      group = heading[2].trim();
      continue;
    }
    const kw = block.match(/- 키워드: (.+)/)?.[1] ?? "";
    techniques.push({
      group,
      title: heading[2].trim(),
      keywords: kw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
      body: block.replace(/^### .+\n/, "").replace(/\n---\s*$/, "").trim(),
    });
  }
  return techniques;
}

// 요청 문장에 키워드가 "들어 있는지" 로 점수를 매긴다 (한국어는 어미가 바뀌므로 포함 여부로 비교)
export function searchCamera(techniques: CameraTechnique[], request: string, k = 4) {
  const q = request.toLowerCase();
  return techniques
    .map((t) => {
      // 한국어는 어미가 바뀌므로(따라가는/따라가며) 3글자 이상이면 마지막 글자를 뗀 어간으로도 비교한다
      const stem = (kw: string) => (/[가-힣]$/.test(kw) && kw.length >= 3 ? kw.slice(0, -1) : kw);
      const hits = t.keywords.filter((kw) => kw.length >= 2 && (q.includes(kw) || q.includes(stem(kw))));
      return { ...t, hits, score: hits.length };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// 구도 언급이 없을 때 제안할 기본 선택지 (가운데 정면 탈출용, 서로 성격이 다른 3개)
export const DEFAULT_CAMERA_SUGGESTIONS = ["트래킹 (Tracking / Follow)", "로우 앵글 (Low angle) / 웜즈아이", "롤 / 더치 앵글 (Roll / Dutch angle)"];

// ── 사람이 읽기 좋은 형태로 ──────────────────────────
export function formatCase(c: Case & { score?: number }): string {
  const status = c.ok ? `✅ 성공${c.seconds ? ` ${c.seconds}초` : ""}` : "❌ 실패";
  const model = c.model ? ` · 모델 ${c.model}` : "";
  return `- ${status}${model} · ${c.time.slice(0, 16).replace("T", " ")}\n  "${c.prompt.slice(0, 220)}${c.prompt.length > 220 ? "…" : ""}"`;
}

export function formatPair(p: RepairPair): string {
  return (
    `- ❌→✅ ${p.failed.time.slice(0, 16).replace("T", " ")}${p.causeCertain ? "" : " (실패 원인 불확실: 크레딧 한도 시기와 겹침)"}\n` +
    `  뺀 단어: ${p.removedWords.join(", ") || "(없음)"}\n  더한 단어: ${p.addedWords.join(", ") || "(없음)"}`
  );
}
