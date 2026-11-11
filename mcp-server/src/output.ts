// 플러그인이 보낸 PNG 를 output/ 폴더에 저장하고, Claude 에게 보여 줄 미리보기를 만든다
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import sharp from "sharp";
import { SERVER_DIR } from "./config.js";

export const OUTPUT_DIR = resolve(SERVER_DIR, "..", "output");

const PREVIEW_MAX_SIDE = 768; // Claude 가 보기에 충분하고, 대화 용량은 작게

// 파일 이름에 쓸 수 없는 글자(경로 구분자, .. 등)를 지워서 output/ 밖으로 나갈 수 없게 한다
function safeBaseName(name: string): string {
  const cleaned = name
    .replace(/\.[a-z0-9]{1,5}$/i, "") // 확장자(.png 등) 제거
    .replace(/[^\p{L}\p{N}_-]+/gu, "_") // 글자·숫자·_·- 외에는 _ 로
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return cleaned || "image";
}

function timestamp(): string {
  // 2026-11-12_013045 형식
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export interface SavedImage {
  path: string; // 저장된 PNG 전체 경로
  previewBase64: string; // Claude 에게 보낼 축소 JPEG
  previewSize: { width: number; height: number };
}

export async function savePng(pngBase64: string, name: string): Promise<SavedImage> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = resolve(join(OUTPUT_DIR, `${timestamp()}_${safeBaseName(name)}.png`));
  // 이중 안전장치: 최종 경로가 정말 output/ 안인지 한 번 더 확인
  if (!path.startsWith(OUTPUT_DIR + sep)) throw new Error(`output 폴더 밖으로는 저장할 수 없습니다: ${path}`);

  const png = Buffer.from(pngBase64, "base64");
  await writeFile(path, png);

  // 원본은 그대로 두고, 미리보기만 줄여서 JPEG 로 (대화에 넣기 가벼움)
  const { data, info } = await sharp(png)
    .resize(PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }) // 투명 부분은 흰색으로
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return { path, previewBase64: data.toString("base64"), previewSize: { width: info.width, height: info.height } };
}
