import { fal } from "@/lib/fal";
import { generateVoiceover } from "@/lib/voiceover";

type VeoOutput = { video: { url: string } };
type NanoBananaOutput = { images: { url: string }[] };
type LipsyncOutput = { video: { url: string } };

/**
 * Generates one 8-second shot. Two pipelines:
 *
 * WITHOUT dialogue (~$0.48):
 *   1. Nano Banana 2 Edit composes the first frame from the character's
 *      reference images (keeps the face consistent).
 *   2. Veo 3.1 Lite image-to-video animates it with ambient audio.
 *
 * WITH dialogue (~$0.38 — and perfect lip-sync):
 *   1. Same first frame.
 *   2. Veo animates it WITHOUT audio (cheaper).
 *   3. ElevenLabs speaks the dialogue in the character's voice.
 *   4. VEED lipsync matches the mouth to that audio.
 */
export async function generateShotVideo(input: {
  prompt: string;
  dialogue?: string | null;
  dialogueLanguage?: string | null;
  voice?: string;
  referenceImages: string[];
}): Promise<{ videoUrl: string; audioUrl: string | null }> {
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

  // Step 2: animate the frame with Veo 3.1 Lite.
  // With dialogue we skip Veo's own audio — ElevenLabs + lipsync replace it.
  const veo = await fal.subscribe("fal-ai/veo3.1/lite/image-to-video", {
    input: {
      prompt: input.prompt,
      image_url: frameUrl,
      duration: "8s",
      resolution: "720p",
      generate_audio: !hasDialogue,
    },
  });
  const rawVideoUrl = (veo.data as VeoOutput).video?.url;
  if (!rawVideoUrl) throw new Error("Veo returned no video");

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
    input: {
      video_url: rawVideoUrl,
      audio_url: audioUrl,
    },
  });
  const videoUrl = (synced.data as LipsyncOutput).video?.url;
  if (!videoUrl) throw new Error("Lipsync returned no video");

  return { videoUrl, audioUrl };
}
