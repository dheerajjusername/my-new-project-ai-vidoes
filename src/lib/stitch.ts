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
      // amix averages inputs (halves each), so pre-amplify to keep the
      // narration at full and the clip audio at about half. `normalize=0`
      // isn't supported on older ffmpeg builds, so we don't use it.
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-i", combined, "-i", vo,
        "-filter_complex",
        "[0:a]volume=1.0[bg];[1:a]volume=2.0[vo];[bg][vo]amix=inputs=2:duration=first[a]",
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

// Measure a media file's duration in seconds using ffmpeg (the bundled build
// has no ffprobe, so we parse the "Duration:" line ffmpeg prints to stderr).
async function mediaDuration(file: string): Promise<number> {
  try {
    await run(FFMPEG, ["-i", file]);
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? "";
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) {
      return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    }
  }
  return 0;
}

const DIMS = {
  "16:9": { w: 1280, h: 720 },
  "9:16": { w: 720, h: 1280 },
} as const;

/**
 * Static-storytelling stitch. Times a set of still images to exactly match the
 * narration voiceover's length (no mute tail, no cut-off audio), gives each
 * image a slow Ken Burns move, and crossfades between them. Output uses the
 * chosen aspect ratio and the voiceover as the soundtrack.
 */
export async function stitchStaticVideo(input: {
  imageUrls: string[];
  voiceoverUrl: string;
  aspectRatio?: string;
}): Promise<string> {
  const n = input.imageUrls.length;
  if (n === 0) throw new Error("no images to stitch");

  const { w, h } = DIMS[input.aspectRatio === "9:16" ? "9:16" : "16:9"];
  const dir = await mkdtemp(path.join(tmpdir(), "static-"));
  try {
    // 1. Voiceover + its duration → drives all timing.
    const vo = await download(input.voiceoverUrl, path.join(dir, "vo.mp3"));
    const audioDur = (await mediaDuration(vo)) || n * 3;

    // 2. Each image shows for an equal slice of the audio, so the video is
    //    exactly as long as the narration.
    const seg = Math.max(1.2, audioDur / n);
    const fade = Math.min(0.35, seg / 4); // gentle fade in/out per image

    // 3. Build a Ken Burns segment per image, with a fade-in and fade-out
    //    (a soft dip between images — works on old ffmpeg without xfade).
    const segFiles: string[] = [];
    for (const [i, url] of input.imageUrls.entries()) {
      const img = await download(url, path.join(dir, `img-${i}`));
      const out = path.join(dir, `seg-${i}.mp4`);
      const frames = Math.round(seg * FPS);
      const outStart = (seg - fade).toFixed(3);
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-loop", "1", "-i", img,
        "-filter_complex",
        `[0:v]scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,` +
          `crop=${w * 2}:${h * 2},` +
          `zoompan=z='min(zoom+0.0010,1.15)':d=${frames}:s=${w}x${h}:fps=${FPS},` +
          `fade=t=in:st=0:d=${fade},fade=t=out:st=${outStart}:d=${fade},` +
          `setsar=1,format=yuv420p[v]`,
        "-map", "[v]", "-t", String(seg.toFixed(3)),
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        out,
      ]);
      segFiles.push(out);
    }

    // 4. Concatenate the segments, then attach the voiceover as the audio.
    const listFile = path.join(dir, "list.txt");
    await writeFile(listFile, segFiles.map((p) => `file '${p}'`).join("\n"));
    const combined = path.join(dir, "combined.mp4");
    await run(FFMPEG, [
      "-y", "-v", "error",
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-c", "copy", combined,
    ]);

    const finalPath = path.join(dir, "final.mp4");
    await run(FFMPEG, [
      "-y", "-v", "error",
      "-i", combined, "-i", vo,
      "-map", "0:v", "-map", "1:a", "-shortest",
      "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
      finalPath,
    ]);

    const buffer = await readFile(finalPath);
    const file = new File([buffer], "final.mp4", { type: "video/mp4" });
    return await fal.storage.upload(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
