import { fal } from "@/lib/fal";

type NanoBananaOutput = { images: { url: string }[] };

/**
 * UGC compositing step: takes a photo of a person and a photo of a product
 * and produces a single "anchor" image where that same person naturally
 * holds/uses the product. This anchor becomes the character's reference so
 * the person AND the product stay consistent across every video shot.
 * Cost: ~$0.08 (one Nano Banana edit).
 */
export async function generateCompositeAnchor(input: {
  personPhotoUrl: string;
  productPhotoUrl: string;
  description?: string;
}): Promise<string> {
  const extra = input.description ? ` ${input.description}` : "";
  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt:
        "Combine the two reference images: keep the exact person (same face, " +
        "same identity) from the first image, and the exact product from the " +
        "second image. Create one natural photo where this person is holding " +
        "and showing the product to the camera, casual UGC selfie style, " +
        "natural lighting, authentic look." +
        extra,
      image_urls: [input.personPhotoUrl, input.productPhotoUrl],
      aspect_ratio: "16:9",
      num_images: 1,
    },
  });
  const url = (result.data as NanoBananaOutput).images[0]?.url;
  if (!url) throw new Error("Composite anchor generation returned no image");
  return url;
}
