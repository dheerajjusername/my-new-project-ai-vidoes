import { fal } from "@/lib/fal";
import { generateVoiceover } from "@/lib/voiceover";
import { resolveVideoModel } from "@/lib/video-models";
import { styleDirective } from "@/lib/image-styles";

// Every generated face must have clear, open, natural eyes — a recurring fix
// for characters that came out looking blank / eyes-closed ("blind").
const EYES_DIRECTIVE =
  "Both eyes clearly open, sharp and natural with visible irises and a lively gaze — never closed, squinting, blank or blind-looking.";

type VeoOutput = { video: { url: string } };
type NanoBananaOutput = { images: { url: string }[] };
type LipsyncOutput = { video: { url: string } };

// Generate the first frame of a shot from the character's reference images.
// This is what keeps the face consistent across every shot.
async function generateFirstFrame(
  prompt: string,
  referenceImages: string[],
  style?: string | null,
  aspectRatio?: string | null,
): Promise<string> {
  const ar = aspectRatio === "9:16" ? "9:16" : "16:9";
  const hasRefs = referenceImages.length > 0;
  const frame = hasRefs
    ? await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: {
          prompt: `Using the person from the reference images (same face, same look), create the opening frame of this video shot: ${prompt}. ${styleDirective(style)}, ${ar}. ${EYES_DIRECTIVE}`,
          image_urls: referenceImages,
          aspect_ratio: ar,
          num_images: 1,
        },
      })
    : await fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: `Opening frame of this video shot: ${prompt}. ${styleDirective(style)}, ${ar}. ${EYES_DIRECTIVE}`,
          aspect_ratio: ar,
          num_images: 1,
        },
      });
  const url = (frame.data as NanoBananaOutput).images[0]?.url;
  if (!url) throw new Error("First-frame generation returned no image");
  return url;
}

/**
 * IMAGE building block: a single still scene featuring the character.
 * Used by static-storytelling and any image shot. Ken Burns motion is
 * added later at stitch time. Cost: ~$0.08 (one Nano Banana image).
 */
export async function generateShotImage(input: {
  prompt: string;
  referenceImages: string[];
  aspectRatio?: string;
  style?: string | null;
}): Promise<string> {
  const ar = input.aspectRatio === "9:16" ? "9:16" : "16:9";
  const hasRefs = input.referenceImages.length > 0;
  // With a character we keep the reference face; without one it's a plain
  // text-to-image scene described entirely by the prompt.
  const result = hasRefs
    ? await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: {
          prompt: `Using the person from the reference images (same face, same look), create this scene: ${input.prompt}. ${styleDirective(input.style)}, ${ar}, strong composition. ${EYES_DIRECTIVE}`,
          image_urls: input.referenceImages,
          aspect_ratio: ar,
          num_images: 1,
        },
      })
    : await fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: `${input.prompt}. ${styleDirective(input.style)}, ${ar}, strong composition. ${EYES_DIRECTIVE}`,
          aspect_ratio: ar,
          num_images: 1,
        },
      });
  const url = (result.data as NanoBananaOutput).images[0]?.url;
  if (!url) throw new Error("Image generation returned no image");
  return url;
}

/**
 * TALKING first-frame / scene image. Either made purely from a text prompt, or
 * from a reference image the user uploads ("make it like this") which biases
 * the look/composition. This is the single frame every dialogue clip animates
 * from. Cost: ~$0.04-0.08 (one Nano Banana image).
 */
export async function generateSceneImage(input: {
  prompt: string;
  referenceImageUrl?: string | null;
  aspectRatio?: string;
  style?: string | null;
}): Promise<string> {
  const ar = input.aspectRatio === "9:16" ? "9:16" : "16:9";
  const result = input.referenceImageUrl
    ? await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: {
          prompt: `Using this reference image as the guide for the look, style, framing and characters, create this scene: ${input.prompt}. Keep it close to the reference. ${styleDirective(input.style)}, ${ar}, cinematic. ${EYES_DIRECTIVE}`,
          image_urls: [input.referenceImageUrl],
          aspect_ratio: ar,
          num_images: 1,
        },
      })
    : await fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: `${input.prompt}. ${styleDirective(input.style)}, ${ar}, cinematic, strong composition. ${EYES_DIRECTIVE}`,
          aspect_ratio: ar,
          num_images: 1,
        },
      });
  const url = (result.data as NanoBananaOutput).images[0]?.url;
  if (!url) throw new Error("Scene image generation returned no image");
  return url;
}

/**
 * TALKING dialogue clip. Animates the fixed scene image so that ONLY the
 * speaking character talks (lip-synced) while everyone else stays silent and
 * still. The trick that keeps the right person talking is a "primed" first
 * frame: we first make a still where the speaker's mouth is open mid-word and
 * the others are silent, then let Veo continue from there.
 */
export async function generateTalkingClip(input: {
  sceneImageUrl: string;
  speaker: string;
  others: string[];
  bodyLanguage: string;
  line: string;
  language: string;
  durationSec: number;
  aspectRatio?: string;
  style?: string | null;
}): Promise<string> {
  const ar = input.aspectRatio === "9:16" ? "9:16" : "16:9";
  const others = input.others.length > 0 ? input.others.join(" and ") : "everyone else";

  // 1. Primed first frame: speaker mid-speech, others silent.
  const primed = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt:
        `Using these exact people and this exact scene (same faces, same clothes, same background), ` +
        `create a photo where ${input.speaker} is speaking — mouth open mid-word, ${input.bodyLanguage} — ` +
        `while ${others} stay silent with mouths firmly closed, just listening. Keep everything else identical. ` +
        `${styleDirective(input.style)}, ${ar}. ${EYES_DIRECTIVE}`,
      image_urls: [input.sceneImageUrl],
      aspect_ratio: ar,
      num_images: 1,
    },
  });
  const framedUrl = (primed.data as NanoBananaOutput).images[0]?.url;
  if (!framedUrl) throw new Error("Primed frame generation returned no image");

  // 2. Veo animates it — only the speaker talks, others silent, locked camera.
  const duration = ([4, 6, 8].includes(input.durationSec) ? input.durationSec : 6) as 4 | 6 | 8;
  const prompt =
    `Cinematic dialogue scene, locked static camera, everyone stays in their exact positions the whole time, nobody walks or leaves the frame. ` +
    `ONLY ${input.speaker} speaks: ${input.bodyLanguage}, lips moving naturally in perfect sync, speaking in ${input.language}: "${input.line}". ` +
    `${others} stay COMPLETELY SILENT — mouths closed, not speaking, not moving their lips, just listening quietly with subtle natural blinking, staying still. ` +
    `Realistic faces, natural lip-sync only for the speaker.`;
  const clip = await fal.subscribe("fal-ai/veo3.1/lite/image-to-video", {
    input: {
      prompt,
      image_url: framedUrl,
      duration: `${duration}s` as "4s" | "6s" | "8s",
      resolution: "720p",
      generate_audio: true,
    },
  });
  const url = (clip.data as VeoOutput).video?.url;
  if (!url) throw new Error("Veo returned no talking clip");
  return url;
}

/**
 * VIDEO building block. Pipeline:
 *   1. Nano Banana first frame (consistent face).
 *   2. The chosen model animates it for the shot's duration.
 *   3. (dialogue only) ElevenLabs voice + VEED lip-sync.
 */
export async function generateShotVideo(input: {
  prompt: string;
  model?: string | null;
  durationSec?: number | null;
  dialogue?: string | null;
  dialogueLanguage?: string | null;
  voice?: string;
  referenceImages: string[];
  style?: string | null;
  aspectRatio?: string | null;
  // Force the model to NOT generate its own audio (cheaper). Used by Motion
  // Storytelling, where a separate narration voiceover is mixed in later —
  // Veo Lite 720p costs $0.03/s without audio vs $0.05/s with.
  muteVideo?: boolean;
}): Promise<{ videoUrl: string; audioUrl: string | null }> {
  const model = resolveVideoModel(input.model);
  const frameUrl = await generateFirstFrame(input.prompt, input.referenceImages, input.style, input.aspectRatio);
  const hasDialogue = Boolean(input.dialogue?.trim());
  const duration = input.durationSec ?? 8;
  const withAudio = input.muteVideo ? false : !hasDialogue;

  const clip = await fal.subscribe(model.endpoint, {
    input: model.buildInput(frameUrl, input.prompt, withAudio, duration),
  });
  const rawVideoUrl = (clip.data as VeoOutput).video?.url;
  if (!rawVideoUrl) throw new Error(`${model.label} returned no video`);

  if (!hasDialogue) {
    return { videoUrl: rawVideoUrl, audioUrl: null };
  }

  const audioUrl = await generateVoiceover({
    text: input.dialogue!.trim(),
    voice: input.voice,
    languageCode: input.dialogueLanguage,
  });

  const synced = await fal.subscribe("veed/lipsync", {
    input: { video_url: rawVideoUrl, audio_url: audioUrl },
  });
  const videoUrl = (synced.data as LipsyncOutput).video?.url;
  if (!videoUrl) throw new Error("Lipsync returned no video");

  return { videoUrl, audioUrl };
}
