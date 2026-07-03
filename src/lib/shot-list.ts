import Anthropic from "@anthropic-ai/sdk";
import type { VideoFormat } from "@/generated/prisma/enums";

const anthropic = new Anthropic();

// What each format means for the shot structure Claude should produce.
const FORMAT_GUIDES: Record<VideoFormat, string> = {
  TALKING:
    "A single continuous scene: the character talks directly to the camera. Exactly 1 shot.",
  MOTION_STORYTELLING:
    "A short story told across 3-5 shots with the character moving through different scenes and actions.",
  STATIC_STORYTELLING:
    "A narrated story over 3-5 mostly still, cinematic shots. Minimal character movement, strong composition.",
  TALKING_MICRODRAMA:
    "A short dramatic mini-episode across 2-4 shots, dialogue-driven, with emotional beats.",
  UGC_PRODUCT_AD:
    "A casual creator-style product ad across 2-4 shots: hook, product demo, recommendation. Feels like a phone-shot testimonial.",
  CUSTOM: "Follow the user's custom format description.",
};

const SHOT_LIST_SCHEMA = {
  type: "object" as const,
  properties: {
    shots: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string" as const,
            description:
              "Complete Veo video-generation prompt for this shot: scene, camera, lighting, the character's action, and spoken dialogue in quotes if any.",
          },
          durationSec: {
            type: "integer" as const,
            enum: [8],
            description: "Shot duration in seconds (always 8 for now).",
          },
        },
        required: ["prompt", "durationSec"],
        additionalProperties: false,
      },
    },
  },
  required: ["shots"],
  additionalProperties: false,
};

export type PlannedShot = { prompt: string; durationSec: number };

/**
 * Turns a project brief into a scene-by-scene shot list using Claude.
 * The character description is woven into every shot prompt so Veo
 * (which also receives the reference images) keeps the person consistent.
 */
export async function generateShotList(input: {
  brief: string;
  format: VideoFormat;
  customFormat?: string | null;
  characterName: string;
  characterDescription: string;
}): Promise<PlannedShot[]> {
  const formatGuide =
    input.format === "CUSTOM" && input.customFormat
      ? `Custom format described by the user: ${input.customFormat}`
      : FORMAT_GUIDES[input.format];

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      "You write scene-by-scene shot lists for AI-generated video ads.",
      "Each shot is generated independently by a video model (Veo), so every shot prompt must fully describe the scene on its own — never reference other shots.",
      "The main character appears in every shot. Describe them consistently using the provided description; the video model also receives reference photos of them.",
      "Keep each shot to what can plausibly happen in 8 seconds. Put any spoken lines in double quotes inside the prompt.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Format: ${formatGuide}`,
          `Main character: ${input.characterName} — ${input.characterDescription}`,
          `What the ad is for (user's brief): ${input.brief}`,
          "Create the shot list.",
        ].join("\n\n"),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: SHOT_LIST_SCHEMA,
      },
    },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no shot list");
  }
  const parsed = JSON.parse(block.text) as { shots: PlannedShot[] };
  if (!parsed.shots?.length) throw new Error("Claude returned an empty shot list");
  return parsed.shots;
}
