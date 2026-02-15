import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runFfmpeg(args: string[]) {
  try {
    return await execFileAsync("ffmpeg", args);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      throw new Error(
        "ffmpeg is not installed or not in PATH. Install FFmpeg from https://ffmpeg.org/download.html"
      );
    }
    throw err;
  }
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function downloadFile(url: string, outPath: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outPath, buffer);
}
// Extract the last frame from a video
export async function extractLastFrame(videoPath: string, outputImagePath: string) {
  await runFfmpeg([
    "-y",
    "-sseof",
    "-0.1",
    "-i",
    videoPath,
    "-update",
    "1",
    "-q:v",
    "2",
    outputImagePath,
  ]);
}

// Concatenate multiple videos into one
export async function concatVideos(videoPaths: string[], outputPath: string, workDir: string) {
  const listPath = path.join(workDir, "concat-list.txt");
  const content = videoPaths
    .map((videoPath) => `file '${videoPath.replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fs.writeFile(listPath, content, "utf8");

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

export async function fileToDataUrl(filePath: string, mimeType: string) {
  const file = await fs.readFile(filePath);
  return `data:${mimeType};base64,${file.toString("base64")}`;
}
