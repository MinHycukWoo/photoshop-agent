// 누끼 등에 쓸 사진은 프로젝트의 input/ 폴더에서만 읽는다.
// Claude Desktop 채팅에 첨부한 이미지는 MCP 도구로 넘어오지 않으므로, 사용자가 이 폴더에 파일을 넣고 이름으로 부른다.
// 폴더를 하나로 정해 두면 Claude 가 컴퓨터의 다른 파일을 함부로 읽을 수 없다 (output/ 과 같은 안전장치).
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
import { SERVER_DIR } from "./config.js";

export const INPUT_DIR = resolve(process.env.PS_AGENT_INPUT_DIR || join(SERVER_DIR, "..", "input"));

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".psd"];
const MAX_BYTES = 40 * 1024 * 1024; // base64 로 늘어나도 WebSocket 상한(64MB) 안에 들어가게

export async function listInputImages(): Promise<string[]> {
  await mkdir(INPUT_DIR, { recursive: true });
  const names = await readdir(INPUT_DIR);
  return names.filter((n) => IMAGE_EXTENSIONS.includes(extname(n).toLowerCase())).sort();
}

export interface InputImage {
  fileName: string;
  dataBase64: string;
  bytes: number;
}

export async function readInputImage(filename: string): Promise<InputImage> {
  // 폴더 이름이 섞인 값(../, C:\ 등)은 받지 않는다: 파일 이름만
  if (basename(filename) !== filename || filename.includes("/") || filename.includes("\\") || filename.startsWith(".")) {
    throw new Error(`파일 이름만 쓸 수 있습니다(폴더 경로 불가): "${filename}". 사진은 ${INPUT_DIR} 폴더에 넣어 주세요.`);
  }
  if (!IMAGE_EXTENSIONS.includes(extname(filename).toLowerCase())) {
    throw new Error(`지원하는 형식이 아닙니다: "${filename}" (가능: ${IMAGE_EXTENSIONS.join(" ")})`);
  }
  const path = resolve(INPUT_DIR, filename);
  // 이중 안전장치: 최종 경로가 정말 input/ 안인지
  if (!path.startsWith(INPUT_DIR + sep)) throw new Error(`input 폴더 밖의 파일은 읽을 수 없습니다: ${filename}`);

  let size: number;
  try {
    size = (await stat(path)).size;
  } catch {
    const files = await listInputImages();
    throw new Error(
      `input 폴더에 "${filename}" 이 없습니다. 폴더: ${INPUT_DIR}\n` +
        (files.length ? `지금 있는 사진: ${files.join(", ")}` : "지금 폴더가 비어 있습니다. 사용자에게 사진을 넣어 달라고 요청하세요."),
    );
  }
  if (size > MAX_BYTES) throw new Error(`파일이 너무 큽니다: ${Math.round(size / 1024 / 1024)}MB (최대 40MB)`);
  const data = await readFile(path);
  return { fileName: filename, dataBase64: data.toString("base64"), bytes: size };
}
