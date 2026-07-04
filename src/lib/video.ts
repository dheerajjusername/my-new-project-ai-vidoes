import { fal } from "@/lib/fal";
import { generateVoiceover } from "@/lib/voiceover";
import { resolveVideoModel } from "@/lib/video-models";
import { styleDirective } from "@/lib/image-styles";

type VeoOutput = { video: { url: string } };
type NanoBananaOutput = { images: { url: string }[] };
type LipsyncOutput = { video: { url: string } };

// Generate the first frame of a shot from the character's reference images.
// This is what keeps the face consistent across every shot.
async function generateFirstFrame(
  prompt: string,
  referenceImages: string[],
  style?: string | null,
): Promise<string> {
  const frame = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: `Using the person from the reference images (same face, same look), create the opening frame of this video shot: ${prompt}. ${styleDirective(style)}, 16:9.`,
      image_urls: referenceImages,
      aspect_ratio: "16:9",
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
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: `Using the person from the reference images (same face, same look), create this scene: ${input.prompt}. ${styleDirective(input.style)}, ${ar}, strong composition.`,
      image_urls: input.referenceImages,
      aspect_ratio: ar,
      num_images: 1,
    },
  });
  const url = (result.data as NanoBananaOutput).images[0]?.url;
  if (!url) throw new Error("Image generation returned no image");
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
}): Promise<{ videoUrl: string; audioUrl: string | null }> {
  const model = resolveVideoModel(input.model);
  const frameUrl = await generateFirstFrame(input.prompt, input.referenceImages, input.style);
  const hasDialogue = Boolean(input.dialogue?.trim());
  const duration = input.durationSec ?? 8;

  const clip = await fal.subscribe(model.endpoint, {
    input: model.buildInput(frameUrl, input.prompt, !hasDialogue, duration),
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
