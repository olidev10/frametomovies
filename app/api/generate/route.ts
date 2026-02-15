import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildScenePrompt } from "@/services/prompt";
import { runPrediction } from "@/services/replicate";
import { concatVideos, downloadFile, ensureDir, extractLastFrame, fileToDataUrl } from "@/services/video";

export const runtime = "nodejs";

type GenerateBody = {
  scenario: string;
  scenes: number;
  aspectRatio: "16:9" | "9:16";
};

function asVideoOutput(output: unknown) {
  if (Array.isArray(output) && typeof output[0] === "string") {
    return output[0];
  }

  if (typeof output === "string") {
    return output;
  }

  throw new Error("Unexpected video output format from Replicate.");
}

function asDescription(output: unknown) {
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output) && typeof output[0] === "string") {
    return output[0];
  }

  return "An image with cinematic detail.";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const scenario = String(formData.get("scenario") || "").slice(0, 1000).trim();
    const scenesRaw = Number(formData.get("scenes") || 1);
    const aspectRatio = formData.get("aspectRatio") === "9:16" ? "9:16" : "16:9";
    const image = formData.get("image");

    const body: GenerateBody = {
      scenario,
      scenes: Math.max(1, Math.min(8, Number.isFinite(scenesRaw) ? scenesRaw : 1)),
      aspectRatio,
    };

    if (!body.scenario) {
      return NextResponse.json({ error: "Scenario is required." }, { status: 400 });
    }

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "A frame-0 image upload is required." }, { status: 400 });
    }

    const runId = randomUUID();
    const tempDir = path.join(process.cwd(), ".tmp", runId);
    const generatedDir = path.join(process.cwd(), "public", "generated");
    await ensureDir(tempDir);
    await ensureDir(generatedDir);

    const uploadedPath = path.join(tempDir, `frame-0-${image.name || "upload"}`);
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    await fs.writeFile(uploadedPath, imageBuffer);

    const mimeType = image.type || "image/png";
    let currentFrameUrl = await fileToDataUrl(uploadedPath, mimeType);

    const sceneVideos: string[] = [];
    const prompts: string[] = [];

    for (let sceneIndex = 0; sceneIndex < body.scenes; sceneIndex += 1) {
      const descPrediction = await runPrediction("/predictions", {
        version: "andreasjansson/blip-2:f677695e5e89f8b236e52ecd1d3f01beb44c34606419bcc19345e046d8f786f9",
        input: {
          image: currentFrameUrl,
          caption: false,
          question: "describe this image",
          temperature: 1,
          use_nucleus_sampling: false,
        },
      });
      console.log("descPrediction", descPrediction);

      const frameDescription = asDescription(descPrediction.output);
      const scenePrompt = buildScenePrompt({
        scenario: body.scenario,
        frameDescription,
        sceneIndex,
        totalScenes: body.scenes,
        previousPrompt: prompts[sceneIndex - 1],
      });
      console.log("scenePrompt", scenePrompt);
      prompts.push(scenePrompt);

      const videoPrediction = await runPrediction("/models/google/veo-3.1/predictions", {
        input: {
          prompt: scenePrompt,
          image: currentFrameUrl,
          duration: 4,
          resolution: "720p",
          aspect_ratio: body.aspectRatio,
          generate_audio: true,
        },
      });
      console.log("videoPrediction", videoPrediction.id);
      const videoUrl = asVideoOutput(videoPrediction.output);
      const scenePath = path.join(tempDir, `scene-${sceneIndex}.mp4`);
      await downloadFile(videoUrl, scenePath);
      console.log("videoUrl", videoUrl);
      console.log("scenePath", scenePath);
      sceneVideos.push(scenePath);

      if (sceneIndex < body.scenes - 1) {
        const lastFramePath = path.join(tempDir, `scene-${sceneIndex}-last-frame.jpg`);
        await extractLastFrame(scenePath, lastFramePath);
        currentFrameUrl = await fileToDataUrl(lastFramePath, "image/jpeg");
      }
    }
    console.log("all scenes generated");
    const finalName = `movie-${runId}.mp4`;
    const finalOutputPath = path.join(generatedDir, finalName);
    await concatVideos(sceneVideos, finalOutputPath, tempDir);

    console.log("final movie generated", finalOutputPath);
    await fs.rm(tempDir, { recursive: true, force: true }); // Clean up temporary directory

    return NextResponse.json({
      movieUrl: `/generated/${finalName}`,
      prompts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown generation error." },
      { status: 500 },
    );
  }
}
