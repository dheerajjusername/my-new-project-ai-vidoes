import Anthropic from "@anthropic-ai/sdk";
import type { VideoFormat } from "@/generated/prisma/enums";

const anthropic = new Anthropic();

// What each format means for the shot structure Claude should produce.
const FORMAT_GUIDES: Record<VideoFormat, string> = {
  TALKING:
    "A single continuous scene: the character talks directly to the camera. Exactly 1 shot with dialogue.",
  MOTION_STORYTELLING:
    "A short story told across 3-5 shots with the character moving through different scenes and actions. Dialogue optional per shot.",
  STATIC_STORYTELLING:
    "A narrated story over 3-5 mostly still, cinematic shots. Minimal character movement, strong composition. Usually no on-camera dialogue.",
  TALKING_MICRODRAMA:
    "A short dramatic mini-episode across 2-4 shots, dialogue-driven, with emotional beats.",
  UGC_PRODUCT_AD:
    "A casual creator-style product ad across 2-4 shots: hook, product demo, recommendation. Feels like a phone-shot testimonial. Most shots have dialogue.",
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
              "Visual Veo prompt for this shot: scene, camera, lighting, the character's appearance and action. If the character speaks, describe them talking naturally to camera/other person, but do NOT include the spoken words here.",
          },
          dialogue: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "The exact words the character speaks in this shot, as a single-element array. Empty array if the character doesn't speak. Must be speakable within 8 seconds (max ~20 words). Match the language of the user's brief.",
          },
          dialogueLanguage: {
            type: "string" as const,
            enum: ["en", "hi"],
            description:
              "ISO 639-1 language of the dialogue: 'hi' for Hindi/Hinglish, 'en' for English.",
          },
          durationSec: {
            type: "integer" as const,
            enum: [8],
            description: "Shot duration in seconds (always 8 for now).",
          },
        },
        required: ["prompt", "dialogue", "dialogueLanguage", "durationSec"],
        additionalProperties: false,
      },
    },
  },
  required: ["shots"],
  additionalProperties: false,
};

export type PlannedShot = {
  prompt: string;
  dialogue: string | null;
  dialogueLanguage: string | null;
  durationSec: number;
};

/**
 * Turns a project brief into a scene-by-scene shot list using Claude.
 * Visual prompt and spoken dialogue are separated: the dialogue is voiced
 * by ElevenLabs and lip-synced onto the clip, so it must not be baked
 * into the Veo prompt.
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
      "Keep the visual prompt and the dialogue separate: the prompt describes what we SEE (including that the character is talking, their expression and energy), the dialogue field contains only what we HEAR.",
      "Dialogue must fit comfortably in 8 seconds (max ~20 words). If the brief is in Hindi or Hinglish, write dialogue in Hindi using Devanagari script and set dialogueLanguage to 'hi'.",
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
  const parsed = JSON.parse(block.text) as {
    shots: {
      prompt: string;
      dialogue: string[];
      dialogueLanguage: string;
      durationSec: number;
    }[];
  };
  if (!parsed.shots?.length) throw new Error("Claude returned an empty shot list");

  return parsed.shots.map((s) => {
    const dialogue = s.dialogue.join(" ").trim() || null;
    return {
      prompt: s.prompt,
      dialogue,
      dialogueLanguage: dialogue ? s.dialogueLanguage : null,
      durationSec: s.durationSec,
    };
  });
}
