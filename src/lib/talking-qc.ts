import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import Anthropic from "@anthropic-ai/sdk";

const run = promisify(execFile);
const FFMPEG = ffmpegInstaller.path;
const anthropic = new Anthropic();

// Checks a generated talking clip: is the intended speaker the one actually
// talking, and is nobody walking out of the frame? Uses a few sampled frames
// and a vision check. Best-effort — returns ok:true if it can't tell, so a QC
// hiccup never blocks generation.
export async function checkTalkingClip(input: {
  videoUrl: string;
  speaker: string;
  others: string[];
  durationSec: number;
}): Promise<{ ok: boolean; reason: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "tqc-"));
  try {
    const res = await fetch(input.videoUrl);
    if (!res.ok) return { ok: true, reason: "download failed" };
    const clip = path.join(dir, "clip.mp4");
    await writeFile(clip, Buffer.from(await res.arrayBuffer()));

    const d = input.durationSec || 6;
    const stamps = [0.6, d * 0.3, d * 0.5, d * 0.7, Math.max(0.6, d - 0.6)];
    const frames: string[] = [];
    for (const [i, t] of stamps.entries()) {
      const f = path.join(dir, `f-${i}.jpg`);
      try {
        await run(FFMPEG, ["-y", "-v", "error", "-ss", String(t), "-i", clip, "-vframes", "1", "-vf", "scale=340:-1", f]);
        frames.push((await readFile(f)).toString("base64"));
      } catch {
        // skip a frame we couldn't grab
      }
    }
    if (frames.length < 2) return { ok: true, reason: "not enough frames" };

    const others = input.others.length ? input.others.join(", ") : "the other people";
    const content: Anthropic.MessageParam["content"] = frames.map((data) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
    }));
    content.push({
      type: "text",
      text:
        `These frames are in time order from one dialogue clip. In it, ONLY "${input.speaker}" should be talking ` +
        `(mouth opening/closing across the frames) while ${others} stay silent (mouths closed) and nobody walks out of the frame. ` +
        `Judge across the frames: is "${input.speaker}" the one talking, are the others silent, and is everyone staying in frame? Reply JSON.`,
    });

    const r = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 200,
      messages: [{ role: "user", content }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              correctSpeaker: { type: "boolean" },
              othersSilent: { type: "boolean" },
              everyoneInFrame: { type: "boolean" },
              issue: { type: "string" },
            },
            required: ["correctSpeaker", "othersSilent", "everyoneInFrame", "issue"],
            additionalProperties: false,
          },
        },
      },
    });
    const block = r.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { ok: true, reason: "no verdict" };
    const v = JSON.parse(block.text) as {
      correctSpeaker: boolean;
      everyoneInFrame: boolean;
      issue: string;
    };
    // Only fail on clear problems: wrong speaker, or someone leaving the frame.
    const ok = v.correctSpeaker && v.everyoneInFrame;
    return { ok, reason: ok ? "pass" : v.issue || "wrong speaker / left frame" };
  } catch {
    return { ok: true, reason: "qc error" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
