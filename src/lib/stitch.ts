import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { fal } from "@/lib/fal";

const run = promisify(execFile);
const FFMPEG = ffmpegInstaller.path;

// Every segment is normalized to identical params so we can concat losslessly.
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;

export type StitchShot = {
  url: string;
  type: "VIDEO" | "IMAGE";
  durationSec: number;
};

/**
 * Builds the final video from a project's shots. VIDEO shots are normalized;
 * IMAGE shots get a Ken Burns (slow zoom) motion. All segments are encoded
 * to the same format, concatenated, and the narration voiceover (if any) is
 * mixed under the audio. FFmpeg runs locally, so this step is free.
 */
export async function stitchProjectVideo(input: {
  shots: StitchShot[];
  voiceoverUrl?: string | null;
}): Promise<string> {
  if (input.shots.length === 0) throw new Error("no shots to stitch");

  const dir = await mkdtemp(path.join(tmpdir(), "stitch-"));
  try {
    const segPaths: string[] = [];

    for (const [i, shot] of input.shots.entries()) {
      const seg = path.join(dir, `seg-${i}.mp4`);
      const dur = [4, 6, 8].includes(shot.durationSec) ? shot.durationSec : 6;

      if (shot.type === "IMAGE") {
        // Still → Ken Burns clip with a silent audio track.
        const img = await download(shot.url, path.join(dir, `img-${i}`));
        const frames = dur * FPS;
        await run(FFMPEG, [
          "-y", "-v", "error",
          "-loop", "1", "-i", img,
          "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-filter_complex",
          `[0:v]scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase,` +
            `crop=${WIDTH * 2}:${HEIGHT * 2},` +
            `zoompan=z='min(zoom+0.0012,1.18)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},` +
            `setsar=1[v]`,
          "-map", "[v]", "-map", "1:a",
          "-t", String(dur),
          "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
          seg,
        ]);
      } else {
        // Video clip → re-encode to the normalized format (add silent audio
        // if the clip has none, so concat stays consistent).
        const clip = await download(shot.url, path.join(dir, `clip-${i}.mp4`));
        await run(FFMPEG, [
          "-y", "-v", "error",
          "-i", clip,
          "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-filter_complex",
          `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
            `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},setsar=1[v]`,
          "-map", "[v]",
          "-map", "0:a?",  // clip audio if present
          "-map", "1:a",   // fallback silent
          "-shortest",
          "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
          seg,
        ]).catch(async () => {
          // Some clips have no audio stream — retry without the 0:a map.
          await run(FFMPEG, [
            "-y", "-v", "error",
            "-i", clip,
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-filter_complex",
            `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
              `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},setsar=1[v]`,
            "-map", "[v]", "-map", "1:a", "-shortest",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            seg,
          ]);
        });
      }
      segPaths.push(seg);
    }

    // Concatenate all normalized segments losslessly.
    const listFile = path.join(dir, "list.txt");
    await writeFile(listFile, segPaths.map((p) => `file '${p}'`).join("\n"));
    const combined = path.join(dir, "combined.mp4");
    await run(FFMPEG, [
      "-y", "-v", "error",
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-c", "copy", "-movflags", "+faststart",
      combined,
    ]);

    let finalPath = combined;

    // Mix the narration voiceover under the combined audio, if provided.
    if (input.voiceoverUrl) {
      const vo = await download(input.voiceoverUrl, path.join(dir, "voiceover.mp3"));
      const mixed = path.join(dir, "final.mp4");
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-i", combined, "-i", vo,
        "-filter_complex",
        "[0:a]volume=0.5[bg];[1:a]volume=1.3[vo];[bg][vo]amix=inputs=2:duration=first:normalize=0[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        mixed,
      ]);
      finalPath = mixed;
    }

    const buffer = await readFile(finalPath);
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
