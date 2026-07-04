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

// Given a base front portrait, generate the 4 consistent angle variations.
async function generateAngles(baseUrl: string): Promise<string[]> {
  return Promise.all(
    ANGLE_PROMPTS.map(async (prompt) => {
      const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: { prompt, image_urls: [baseUrl], aspect_ratio: "3:4", num_images: 1 },
      });
      const url = (result.data as NanoBananaOutput).images[0]?.url;
      if (!url) throw new Error("Angle generation returned no image");
      return url;
    }),
  );
}

/**
 * Generates 5 reference images from a TEXT description:
 * 1 front-facing base portrait + 4 consistent angle variations.
 */
export async function generateCharacterReferenceImages(
  description: string,
): Promise<string[]> {
  const base = await fal.subscribe("fal-ai/nano-banana-2", {
    input: {
      prompt: `Professional studio portrait photo, front-facing, head and shoulders, neutral background, even lighting. ${description}`,
      aspect_ratio: "3:4",
      num_images: 1,
    },
  });
  const baseUrl = (base.data as NanoBananaOutput).images[0]?.url;
  if (!baseUrl) throw new Error("Base portrait generation returned no image");
  return [baseUrl, ...(await generateAngles(baseUrl))];
}

/**
 * Generates 5 reference images from an UPLOADED PHOTO of a real person.
 * The photo is turned into a clean studio front portrait (same face), then
 * the 4 angles are generated from that — so the character looks like the
 * person in the photo across every video.
 */
export async function generateCharacterReferenceImagesFromPhoto(
  photoUrl: string,
  description?: string,
): Promise<string[]> {
  const extra = description ? ` ${description}` : "";
  const base = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt: `Keep this exact person's face and identity. Make a clean professional studio portrait: front-facing, head and shoulders, neutral background, even soft lighting.${extra}`,
      image_urls: [photoUrl],
      aspect_ratio: "3:4",
      num_images: 1,
    },
  });
  const baseUrl = (base.data as NanoBananaOutput).images[0]?.url;
  if (!baseUrl) throw new Error("Base portrait generation returned no image");
  return [baseUrl, ...(await generateAngles(baseUrl))];
}
