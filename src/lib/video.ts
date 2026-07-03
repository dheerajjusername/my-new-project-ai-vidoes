import { fal } from "@/lib/fal";

type VeoOutput = { video: { url: string } };
type NanoBananaOutput = { images: { url: string }[] };

/**
 * Generates one 8-second shot with a two-step pipeline (~$0.48 per shot):
 *
 * 1. Nano Banana 2 Edit composes the shot's FIRST FRAME from the character's
 *    reference images — this is what keeps the face consistent. (Veo Lite's
 *    reference-to-video endpoint rejects photorealistic people, so we can't
 *    pass the reference images to Veo directly.)
 * 2. Veo 3.1 Lite image-to-video animates that frame, adding motion, speech
 *    and audio from the prompt.
 */
export async function generateShotVideo(input: {
  prompt: string;
  referenceImages: string[];
}): Promise<string> {
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

  // Step 2: animate the frame with Veo 3.1 Lite.
  const result = await fal.subscribe("fal-ai/veo3.1/lite/image-to-video", {
    input: {
      prompt: input.prompt,
      image_url: frameUrl,
      duration: "8s",
      resolution: "720p",
      generate_audio: true,
    },
  });

  const url = (result.data as VeoOutput).video?.url;
  if (!url) throw new Error("Veo returned no video");
  return url;
}
