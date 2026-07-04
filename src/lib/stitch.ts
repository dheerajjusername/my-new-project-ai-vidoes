import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fal } from "@/lib/fal";

const run = promisify(execFile);

// All clips are normalized to the same size/framerate before joining,
// because Veo clips and lip-synced clips can differ slightly.
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;

/**
 * Joins a project's clips into one video with FFmpeg (runs locally — free),
 * optionally mixing the narration voiceover under the clip audio, then
 * uploads the result to fal storage and returns its URL.
 */
export async function stitchProjectVideo(input: {
  clipUrls: string[];
  voiceoverUrl?: string | null;
}): Promise<string> {
  if (input.clipUrls.length === 0) throw new Error("no clips to stitch");

  const dir = await mkdtemp(path.join(tmpdir(), "stitch-"));
  try {
    // 1. Download all clips (and the voiceover, if any).
    const clipPaths: string[] = [];
    for (const [i, url] of input.clipUrls.entries()) {
      clipPaths.push(await download(url, path.join(dir, `clip-${i}.mp4`)));
    }
    const voiceoverPath = input.voiceoverUrl
      ? await download(input.voiceoverUrl, path.join(dir, "voiceover.mp3"))
      : null;

    // 2. Build the FFmpeg filter graph: normalize every clip, concat them,
    //    then (optionally) mix the voiceover under the combined audio.
    const args: string[] = ["-y", "-v", "error"];
    for (const p of clipPaths) args.push("-i", p);
    if (voiceoverPath) args.push("-i", voiceoverPath);

    const n = clipPaths.length;
    const filters: string[] = [];
    for (let i = 0; i < n; i++) {
      filters.push(
        `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
          `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},setsar=1[v${i}]`,
        `[${i}:a]aresample=48000[a${i}]`,
      );
    }
    const pairs = Array.from({ length: n }, (_, i) => `[v${i}][a${i}]`).join("");
    filters.push(`${pairs}concat=n=${n}:v=1:a=1[v][ca]`);

    let audioLabel = "ca";
    if (voiceoverPath) {
      // Clip audio quieter, narration on top.
      filters.push(
        `[ca]volume=0.5[bg]`,
        `[${n}:a]volume=1.3[vo]`,
        `[bg][vo]amix=inputs=2:duration=first:normalize=0[mix]`,
      );
      audioLabel = "mix";
    }

    const outPath = path.join(dir, "final.mp4");
    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "[v]",
      "-map", `[${audioLabel}]`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      outPath,
    );
    await run("ffmpeg", args);

    // 3. Upload the final video to fal storage so it has a public URL.
    const buffer = await readFile(outPath);
    const file = new File([buffer], "final.mp4", { type: "video/mp4" });
    return await fal.storage.upload(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function download(url: string, to: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  await writeFile(to, Buffer.from(await res.arrayBuffer()));
  return to;
}
