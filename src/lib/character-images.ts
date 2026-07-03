import { fal } from "@/lib/fal";

type FalImage = { url: string };
type NanoBananaOutput = { images: FalImage[] };

// The 4 extra angles generated from the base portrait. Each one feeds the
// base image back into the edit model so the face stays identical.
const ANGLE_PROMPTS = [
  "Same person, same outfit, same lighting: left side profile view of the face and shoulders",
  "Same person, same outfit, same lighting: right side profile view of the face and shoulders",
  "Same person, same outfit, same lighting: three-quarter view of the face, looking slightly off camera",
  "Same person, same outfit, same lighting: full body shot, standing, facing the camera",
];

/**
 * Generates 5 reference images for a character from a text description:
 * 1 front-facing base portrait + 4 consistent angle variations.
 * Returns the image URLs in a stable order (base first).
 */
export async function generateCharacterReferenceImages(
  description: string,
): Promise<string[]> {
  // 1. Base portrait — this defines the character's look.
  const base = await fal.subscribe("fal-ai/nano-banana-2", {
    input: {
      prompt: `Professional studio portrait photo, front-facing, head and shoulders, neutral background, even lighting. ${description}`,
      aspect_ratio: "3:4",
      num_images: 1,
    },
  });
  const baseUrl = (base.data as NanoBananaOutput).images[0]?.url;
  if (!baseUrl) throw new Error("Base portrait generation returned no image");

  // 2. Four angle variations, generated in parallel from the base portrait.
  const angles = await Promise.all(
    ANGLE_PROMPTS.map(async (prompt) => {
      const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: {
          prompt,
          image_urls: [baseUrl],
          aspect_ratio: "3:4",
          num_images: 1,
        },
      });
      const url = (result.data as NanoBananaOutput).images[0]?.url;
      if (!url) throw new Error("Angle generation returned no image");
      return url;
    }),
  );

  return [baseUrl, ...angles];
}
