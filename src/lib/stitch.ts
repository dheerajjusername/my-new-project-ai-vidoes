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

export type StaticImage = { url: string; narrationText?: string | null };
export type WordTime = { text: string; start: number; end: number };

const MIN_SEG = 1.0; // never flash an image faster than this

// Decides how long each image stays on screen. When we have the voiceover's
// word timestamps, each image is anchored to the exact words it illustrates
// (real sync). Otherwise it falls back to splitting time by word count, and
// finally to an equal split. The durations always sum to the audio length, so
// the video is never longer or shorter than the narration.
function computeDurations(
  images: StaticImage[],
  audioDur: number,
  words: WordTime[] | null,
): number[] {
  const n = images.length;
  const weights = images.map((im) => {
    const c = (im.narrationText ?? "").trim().split(/\s+/).filter(Boolean).length;
    return c > 0 ? c : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0) || n;

  // Real word-timestamp sync: place each image boundary at the start time of
  // the word where its narration share begins.
  if (words && words.length > 0) {
    const W = words.length;
    const starts: number[] = [0];
    let cum = 0;
    for (let i = 0; i < n - 1; i++) {
      cum += weights[i];
      const idx = Math.min(W - 1, Math.max(1, Math.round((cum / total) * W)));
      // keep boundaries strictly increasing and at least MIN_SEG apart
      starts.push(Math.max(starts[i] + MIN_SEG, words[idx].start));
    }
    starts.push(audioDur);
    return starts.slice(1).map((end, i) => Math.max(MIN_SEG, end - starts[i]));
  }

  // No timestamps: split the audio in proportion to each image's word count.
  return weights.map((wt) => Math.max(MIN_SEG, (audioDur * wt) / total));
}

/**
 * Static-storytelling stitch. Times a set of still images to the narration
 * voiceover — with word timestamps each image lands on the exact words it
 * illustrates. Each image gets a slow Ken Burns move and the chosen transition
 * (fade to black, fade to white, or a hard cut). Output uses the chosen aspect
 * ratio and the voiceover as the soundtrack.
 */
export async function stitchStaticVideo(input: {
  images: StaticImage[];
  voiceoverUrl: string;
  aspectRatio?: string;
  transition?: string;
  voiceoverWords?: WordTime[] | null;
}): Promise<string> {
  const n = input.images.length;
  if (n === 0) throw new Error("no images to stitch");

  const { w, h } = DIMS[input.aspectRatio === "9:16" ? "9:16" : "16:9"];
  // "mix" cycles through every transition across the images; otherwise every
  // image uses the one chosen type.
  const MIX = ["fade", "fadewhite", "cut"] as const;
  const kindFor = (i: number): string => {
    if (input.transition === "mix") return MIX[i % MIX.length];
    if (input.transition === "cut" || input.transition === "fadewhite") return input.transition;
    return "fade";
  };
  const dir = await mkdtemp(path.join(tmpdir(), "static-"));
  try {
    // 1. Voiceover + its duration → drives all timing.
    const vo = await download(input.voiceoverUrl, path.join(dir, "vo.mp3"));
    const audioDur = (await mediaDuration(vo)) || n * 3;

    // 2. Per-image durations (word-synced when timestamps are available).
    const durations = computeDurations(input.images, audioDur, input.voiceoverWords ?? null);

    // 3. Build a Ken Burns segment per image, applying the chosen transition
    //    (a soft fade dip between images — works on old ffmpeg without xfade).
    const segFiles: string[] = [];
    for (const [i, im] of input.images.entries()) {
      const seg = durations[i];
      const kind = kindFor(i);
      const fadeColor = kind === "fadewhite" ? "white" : "black";
      const fade = kind === "cut" ? 0 : Math.min(0.35, seg / 4);
      const img = await download(im.url, path.join(dir, `img-${i}`));
      const out = path.join(dir, `seg-${i}.mp4`);
      const frames = Math.max(1, Math.round(seg * FPS));
      const fadeChain =
        fade > 0
          ? `fade=t=in:st=0:d=${fade}:color=${fadeColor},` +
            `fade=t=out:st=${(seg - fade).toFixed(3)}:d=${fade}:color=${fadeColor},`
          : "";
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-loop", "1", "-i", img,
        "-filter_complex",
        `[0:v]scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,` +
          `crop=${w * 2}:${h * 2},` +
          `zoompan=z='min(zoom+0.0010,1.15)':d=${frames}:s=${w}x${h}:fps=${FPS},` +
          fadeChain +
          `setsar=1,format=yuv420p[v]`,
        "-map", "[v]", "-t", seg.toFixed(3),
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

// Picks the transition for clip/image i. "mix" cycles through every type.
const MIX_ORDER = ["fade", "fadewhite", "cut"] as const;
function transitionKind(transition: string | undefined, i: number): string {
  if (transition === "mix") return MIX_ORDER[i % MIX_ORDER.length];
  if (transition === "cut" || transition === "fadewhite") return transition;
  return "fade";
}

/**
 * Talking stitch. Concatenates the dialogue clips in order, keeping each clip's
 * own audio (the characters' speech), normalised to the chosen aspect ratio.
 * No trimming — each clip is exactly as long as its spoken line.
 */
export async function stitchTalkingVideo(input: {
  clipUrls: string[];
  aspectRatio?: string;
}): Promise<string> {
  const n = input.clipUrls.length;
  if (n === 0) throw new Error("no clips to stitch");
  const { w, h } = DIMS[input.aspectRatio === "9:16" ? "9:16" : "16:9"];
  const dir = await mkdtemp(path.join(tmpdir(), "talk-"));
  try {
    const segFiles: string[] = [];
    for (const [i, url] of input.clipUrls.entries()) {
      const clip = await download(url, path.join(dir, `clip-${i}.mp4`));
      const out = path.join(dir, `seg-${i}.mp4`);
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-i", clip,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex",
        `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
          `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},setsar=1[v]`,
        "-map", "[v]",
        "-map", "0:a?", "-map", "1:a", "-shortest",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        out,
      ]).catch(async () => {
        await run(FFMPEG, [
          "-y", "-v", "error",
          "-i", clip,
          "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-filter_complex",
          `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
            `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},setsar=1[v]`,
          "-map", "[v]", "-map", "1:a", "-shortest",
          "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
          out,
        ]);
      });
      segFiles.push(out);
    }

    const listFile = path.join(dir, "list.txt");
    await writeFile(listFile, segFiles.map((p) => `file '${p}'`).join("\n"));
    const combined = path.join(dir, "combined.mp4");
    await run(FFMPEG, [
      "-y", "-v", "error",
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-c", "copy", "-movflags", "+faststart", combined,
    ]);

    const buffer = await readFile(combined);
    const file = new File([buffer], "final.mp4", { type: "video/mp4" });
    return await fal.storage.upload(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Motion-storytelling stitch. Each Veo clip is trimmed to exactly the words it
 * illustrates (Veo returns 4/6/8s, we keep only what the narration needs), so
 * the clips change in step with the voiceover and the video length matches the
 * narration. Applies the chosen transition and the voiceover as the audio.
 */
export async function stitchMotionVideo(input: {
  clips: StaticImage[];
  voiceoverUrl: string;
  aspectRatio?: string;
  transition?: string;
  voiceoverWords?: WordTime[] | null;
}): Promise<string> {
  const n = input.clips.length;
  if (n === 0) throw new Error("no clips to stitch");

  const { w, h } = DIMS[input.aspectRatio === "9:16" ? "9:16" : "16:9"];
  const dir = await mkdtemp(path.join(tmpdir(), "motion-"));
  try {
    const vo = await download(input.voiceoverUrl, path.join(dir, "vo.mp3"));
    const audioDur = (await mediaDuration(vo)) || n * 5;
    // Word-synced on-screen length for each clip (sums to the audio length).
    const durations = computeDurations(input.clips, audioDur, input.voiceoverWords ?? null);

    const segFiles: string[] = [];
    for (const [i, cl] of input.clips.entries()) {
      const clip = await download(cl.url, path.join(dir, `clip-${i}.mp4`));
      // Trim to the narration span, but never beyond the clip's real length.
      const clipLen = (await mediaDuration(clip)) || durations[i];
      const seg = Math.max(0.8, Math.min(durations[i], clipLen));
      const kind = transitionKind(input.transition, i);
      const fadeColor = kind === "fadewhite" ? "white" : "black";
      const fade = kind === "cut" ? 0 : Math.min(0.35, seg / 4);
      const fadeChain =
        fade > 0
          ? `fade=t=in:st=0:d=${fade}:color=${fadeColor},` +
            `fade=t=out:st=${(seg - fade).toFixed(3)}:d=${fade}:color=${fadeColor},`
          : "";
      const out = path.join(dir, `seg-${i}.mp4`);
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-i", clip,
        "-filter_complex",
        `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
          `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FPS},` +
          fadeChain +
          `setsar=1,format=yuv420p[v]`,
        "-map", "[v]", "-t", seg.toFixed(3),
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        out,
      ]);
      segFiles.push(out);
    }

    // Concatenate the trimmed clips, then attach the voiceover as the audio.
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
