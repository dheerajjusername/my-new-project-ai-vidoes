import Anthropic from "@anthropic-ai/sdk";
import type { VideoFormat } from "@/generated/prisma/enums";

const anthropic = new Anthropic();

// Per-format direction for the Creative Director. Each format is just a
// preset over the shared shot building blocks (type, dialogue, angle,
// duration) — the engine is the same, only these instructions differ.
type FormatDirective = {
  guide: string;
  allowImages: boolean; // may the format use IMAGE shots?
};

const FORMAT_DIRECTIVES: Record<VideoFormat, FormatDirective> = {
  TALKING: {
    allowImages: false,
    guide: [
      "TALKING format — a single continuous scene, character speaking straight to camera.",
      "Produce 1 shot (2 only if the message truly needs it). Every shot is type 'video' with dialogue.",
      "The background, framing and camera angle stay IDENTICAL across shots — no scene change, only speech.",
      "Use one consistent cameraAngle like 'medium close-up, front-facing, eye-level'.",
      "Write the dialogue as a tight ad script: a punchy hook, the main message, and a clear call-to-action — all spoken by the character.",
      "durationSec: 8.",
    ].join("\n"),
  },
  MOTION_STORYTELLING: {
    allowImages: false,
    guide: [
      "MOTION STORYTELLING — the character MOVES through different locations and actions but does NOT speak.",
      "Produce 3-5 shots, each type 'video' with NO dialogue (empty dialogue array).",
      "Give it a story arc: hook → tension/conflict → resolution. Each shot is a different location/action.",
      "In each shot's promptText, describe the character's action and the scene vividly (walking, sitting, gesturing, looking).",
      "Vary cameraAngle per shot (wide establishing, tracking, close-up, etc.). durationSec: 8.",
    ].join("\n"),
  },
  STATIC_STORYTELLING: {
    allowImages: true,
    guide: [
      "STATIC STORYTELLING — NO video at all. Only still IMAGES.",
      "Produce 6-10 shots, each type 'image', NO dialogue.",
      "Each image is a different cinematic scene featuring the same character, telling a story in sequence.",
      "Strong composition and lighting per shot; a slow pan/zoom (Ken Burns) will be added later, so compose with headroom.",
      "Vary cameraAngle per shot. durationSec: 6 (how long each image is shown).",
    ].join("\n"),
  },
  TALKING_MICRODRAMA: {
    allowImages: false,
    guide: [
      "TALKING MICRODRAMA — a mini film: the character SPEAKS and the scenes also CHANGE.",
      "Produce 3-5 shots, each type 'video' WITH dialogue, each in a different location.",
      "Build an emotional arc: problem → journey → resolution, one beat per shot.",
      "Each line of dialogue must be short enough to speak within 8 seconds (max ~20 words).",
      "Vary cameraAngle to match the emotion. durationSec: 8.",
    ].join("\n"),
  },
  UGC_PRODUCT_AD: {
    allowImages: false,
    guide: [
      "UGC PRODUCT AD — casual, authentic, phone-shot testimonial featuring the person WITH the product.",
      "Produce 3-4 shots, type 'video'. Structure: hook (talking to camera) → product reveal → use/demo → call-to-action.",
      "The hook and CTA shots have dialogue; the reveal/demo may have dialogue or not.",
      "Script style: casual and authentic like a real creator — NOT salesy or corporate.",
      "Every promptText MUST include phone-UGC cues: 'shot on phone front camera, handheld, natural lighting, authentic UGC style'.",
      "durationSec: 8.",
    ].join("\n"),
  },
  CUSTOM: {
    allowImages: true,
    guide: [
      "CUSTOM — follow the user's own description of what they want.",
      "You decide every shot's building blocks: whether each shot is 'video' or 'image', where there is dialogue, how many shots, the angles and durations.",
      "Make sensible choices that serve the user's stated idea. durationSec: 4, 6 or 8 per shot.",
    ].join("\n"),
  },
};

const SHOT_LIST_SCHEMA = {
  type: "object" as const,
  properties: {
    shots: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["video", "image"],
            description: "'video' = animated clip, 'image' = a still shown with a slow pan/zoom.",
          },
          cameraAngle: {
            type: "string" as const,
            description: "Camera framing, e.g. 'medium close-up, front-facing' or 'wide establishing shot'.",
          },
          promptText: {
            type: "string" as const,
            description:
              "Full visual prompt: scene, lighting, camera, and the character's appearance and action. Include the character's identity description so it stays consistent. Do NOT put spoken words here.",
          },
          dialogue: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "The exact words the character speaks in this shot, as a single-element array. Empty array if the character does not speak in this shot. Must be speakable within the duration (max ~20 words for 8s).",
          },
          dialogueLanguage: {
            type: "string" as const,
            enum: ["en", "hi"],
            description: "'hi' for Hindi/Hinglish, 'en' for English.",
          },
          durationSec: {
            type: "integer" as const,
            enum: [4, 6, 8],
            description: "Shot duration in seconds.",
          },
        },
        required: ["type", "cameraAngle", "promptText", "dialogue", "dialogueLanguage", "durationSec"],
        additionalProperties: false,
      },
    },
  },
  required: ["shots"],
  additionalProperties: false,
};

/**
 * Writes a spoken narration script for a static-storytelling ad from the
 * brief. Plain text (Hindi in Devanagari if the brief is Hindi/Hinglish).
 */
export async function generateNarrationScript(input: {
  brief: string;
  characterName: string;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system:
      "You write short spoken voiceover scripts for narrated video ads. " +
      "Return ONLY the narration text — no headings, no stage directions, no quotes. " +
      "Keep it natural to speak, 40-90 words. If the brief is Hindi or Hinglish, " +
      "write the narration in Hindi using Devanagari script.",
    messages: [
      {
        role: "user",
        content: `Write the voiceover narration for this ad. Main character: ${input.characterName}.\n\nBrief: ${input.brief}`,
      },
    ],
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no narration returned");
  return block.text.trim();
}

const IMAGE_PROMPTS_SCHEMA = {
  type: "object" as const,
  properties: {
    images: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          cameraAngle: { type: "string" as const },
          promptText: {
            type: "string" as const,
            description:
              "Full visual prompt for one cinematic still: scene, lighting, composition, and the character's appearance/action. Include the character's identity so it stays consistent.",
          },
          narrationText: {
            type: "string" as const,
            description:
              "The exact consecutive words of the narration that THIS image illustrates. Every image's narrationText, joined in order, must reproduce the full narration exactly once — no gaps, no overlaps, no reordering. Keep each span roughly 6-10 words so no image is on screen more than ~5 seconds.",
          },
        },
        required: ["cameraAngle", "promptText", "narrationText"],
        additionalProperties: false,
      },
    },
  },
  required: ["images"],
  additionalProperties: false,
};

/**
 * Plans exactly `count` cinematic still images that visually tell the
 * narration's story in order, all featuring the same character.
 */
export async function generateStaticImagePrompts(input: {
  narration: string;
  brief: string;
  characterName: string;
  characterDescription: string;
  count: number;
}): Promise<{ cameraAngle: string; prompt: string; narrationText: string }[]> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: [
      "You are a Creative Director planning still images for a narrated video ad.",
      `Produce EXACTLY ${input.count} images that tell the story of the narration in sequence — one visual beat per image.`,
      "Every image features the same character; repeat the character's identity description in each promptText so the face never drifts (the image model also gets reference photos).",
      "Vary the camera angle and composition across images. Strong cinematic lighting.",
      "For each image, set narrationText to the exact consecutive words of the narration it illustrates. Split the narration across the images in order with NO gaps or overlaps — joining every narrationText back must reproduce the narration exactly. Aim for ~6-10 words per image.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Character: ${input.characterName} — ${input.characterDescription}`,
          `Brief: ${input.brief}`,
          `Narration being illustrated: ${input.narration}`,
          `Plan exactly ${input.count} images.`,
        ].join("\n\n"),
      },
    ],
    output_config: { format: { type: "json_schema", schema: IMAGE_PROMPTS_SCHEMA } },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no image plan returned");
  const parsed = JSON.parse(block.text) as {
    images: { cameraAngle: string; promptText: string; narrationText?: string }[];
  };
  return parsed.images.map((i) => ({
    cameraAngle: i.cameraAngle,
    prompt: i.promptText,
    narrationText: i.narrationText ?? "",
  }));
}

export type PlannedShot = {
  type: "VIDEO" | "IMAGE";
  cameraAngle: string;
  prompt: string;
  dialogue: string | null;
  dialogueLanguage: string | null;
  durationSec: number;
};

/**
 * The AI Creative Director: turns a brief into a building-blocks shot list
 * for the chosen format. Every shot carries its own type/dialogue/angle/
 * duration so the same render engine can produce any format.
 */
export async function generateShotList(input: {
  brief: string;
  format: VideoFormat;
  customFormat?: string | null;
  characterName: string;
  characterDescription: string;
}): Promise<PlannedShot[]> {
  const directive = FORMAT_DIRECTIVES[input.format];
  const formatGuide =
    input.format === "CUSTOM" && input.customFormat
      ? `${directive.guide}\n\nThe user's custom request: ${input.customFormat}`
      : directive.guide;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      "You are the Creative Director for an AI video ad studio.",
      "You turn a brief into a scene-by-scene shot list. Every shot is an independent building block generated on its own, so each shot's promptText must fully describe its scene — never reference other shots.",
      "IDENTITY RULE: the same character appears in every shot. Repeat the character's full identity description inside every shot's promptText so the face and look never drift (the video model also gets reference photos).",
      "Keep the VISUAL promptText and the spoken DIALOGUE separate: promptText is what we SEE, dialogue is only what we HEAR.",
      "If the brief is in Hindi or Hinglish, write dialogue in Hindi (Devanagari) and set dialogueLanguage to 'hi'.",
      directive.allowImages
        ? "This format MAY use 'image' shots."
        : "This format uses ONLY 'video' shots — never set type to 'image'.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `FORMAT DIRECTIVE:\n${formatGuide}`,
          `MAIN CHARACTER: ${input.characterName} — ${input.characterDescription}`,
          `BRIEF (what the ad is for): ${input.brief}`,
          "Create the shot list now.",
        ].join("\n\n"),
      },
    ],
    output_config: { format: { type: "json_schema", schema: SHOT_LIST_SCHEMA } },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no shot list");
  }
  const parsed = JSON.parse(block.text) as {
    shots: {
      type: "video" | "image";
      cameraAngle: string;
      promptText: string;
      dialogue: string[];
      dialogueLanguage: string;
      durationSec: number;
    }[];
  };
  if (!parsed.shots?.length) throw new Error("Claude returned an empty shot list");

  return parsed.shots.map((s) => {
    const dialogue = s.dialogue.join(" ").trim() || null;
    return {
      type: s.type === "image" ? "IMAGE" : "VIDEO",
      cameraAngle: s.cameraAngle,
      prompt: s.promptText,
      dialogue,
      dialogueLanguage: dialogue ? s.dialogueLanguage : null,
      durationSec: s.durationSec,
    };
  });
}
