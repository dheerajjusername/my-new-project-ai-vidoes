import { fal } from "@/lib/fal";
import { generateVoiceover } from "@/lib/voiceover";
import { resolveVideoModel } from "@/lib/video-models";

type VeoOutput = { video: { url: string } };
type NanoBananaOutput = { images: { url: string }[] };
type LipsyncOutput = { video: { url: string } };

/**
 * Generates one shot. Pipeline:
 *   1. Nano Banana 2 Edit composes the first frame from the character's
 *      reference images (keeps the face consistent).
 *   2. The chosen video model (Veo, Kling, …) animates that frame. With
 *      dialogue we animate silently — ElevenLabs + VEED replace the audio.
 *   3. (dialogue only) ElevenLabs speaks the line in the character's voice.
 *   4. (dialogue only) VEED lip-syncs the mouth to that audio.
 */
export async function generateShotVideo(input: {
  prompt: string;
  model?: string | null;
  dialogue?: string | null;
  dialogueLanguage?: string | null;
  voice?: string;
  referenceImages: string[];
}): Promise<{ videoUrl: string; audioUrl: string | null }> {
  const model = resolveVideoModel(input.model);

  // Step 1: first frame with the character composited into the scene.
  const frame = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: `Using the person from the reference images (same face, same look), create the opening frame of this video shot: ${input.prompt}. Cinematic film still, 16:9.`,
      image_urls: input.referenceImages,
      aspect_ratio: "16:9",
      num_images: 1,
    },
  });
  const frameUrl = (frame.data as NanoBananaOutput).images[0]?.url;
  if (!frameUrl) throw new Error("First-frame generation returned no image");

  const hasDialogue = Boolean(input.dialogue?.trim());

  // Step 2: animate the frame with the chosen model.
  const clip = await fal.subscribe(model.endpoint, {
    input: model.buildInput(frameUrl, input.prompt, !hasDialogue),
  });
  const rawVideoUrl = (clip.data as VeoOutput).video?.url;
  if (!rawVideoUrl) throw new Error(`${model.label} returned no video`);

  if (!hasDialogue) {
    return { videoUrl: rawVideoUrl, audioUrl: null };
  }

  // Step 3: speak the dialogue in the character's voice.
  const audioUrl = await generateVoiceover({
    text: input.dialogue!.trim(),
    voice: input.voice,
    languageCode: input.dialogueLanguage,
  });

  // Step 4: lip-sync the mouth to the audio.
  const synced = await fal.subscribe("veed/lipsync", {
    input: { video_url: rawVideoUrl, audio_url: audioUrl },
  });
  const videoUrl = (synced.data as LipsyncOutput).video?.url;
  if (!videoUrl) throw new Error("Lipsync returned no video");

  return { videoUrl, audioUrl };
}
