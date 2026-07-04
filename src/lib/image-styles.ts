// Art styles for generated images. Each style adds a directive to the image
// prompt so the whole video keeps one consistent look. The character's face
// still comes from the reference images — Nano Banana re-styles the likeness.

export type ImageStyle = {
  id: string;
  label: string;
  emoji: string;
  // Appended to the image prompt to steer the render.
  directive: string;
};

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "realistic",
    label: "Realistic (photo)",
    emoji: "📷",
    directive:
      "photorealistic real photograph, natural lighting, lifelike skin and textures, high detail",
  },
  {
    id: "cinematic",
    label: "Cinematic film",
    emoji: "🎬",
    directive:
      "cinematic film still, dramatic lighting, movie color grading, shallow depth of field, 35mm",
  },
  {
    id: "anime",
    label: "Anime",
    emoji: "🌸",
    directive:
      "anime style, cel-shaded, clean line art, vibrant colors, Japanese animation look",
  },
  {
    id: "cartoon",
    label: "Cartoon",
    emoji: "🎨",
    directive:
      "flat 2D cartoon illustration, bold outlines, bright flat colors, playful",
  },
  {
    id: "pixar",
    label: "Pixar / 3D",
    emoji: "🧸",
    directive:
      "Pixar-style 3D animated render, soft rounded shapes, subsurface skin lighting, cute and polished",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    emoji: "🖌️",
    directive:
      "soft watercolor painting, hand-painted, gentle color washes, paper texture",
  },
  {
    id: "comic",
    label: "Comic book",
    emoji: "💥",
    directive:
      "comic book art, bold ink outlines, halftone shading, dynamic pop-art colors",
  },
];

export const DEFAULT_IMAGE_STYLE = "realistic";

export function isValidImageStyle(id: string | null | undefined): boolean {
  return Boolean(id && IMAGE_STYLES.some((s) => s.id === id));
}

// Returns the prompt directive for a style id (falls back to realistic).
export function styleDirective(id: string | null | undefined): string {
  const style = IMAGE_STYLES.find((s) => s.id === id) ?? IMAGE_STYLES[0];
  return style.directive;
}
