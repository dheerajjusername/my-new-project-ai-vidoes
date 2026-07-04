import { fal } from "@/lib/fal";

type TtsOutput = { audio: { url: string } };

/**
 * Generates speech with ElevenLabs (via fal.ai).
 * Cost scales with text length (roughly $0.10 per 1000 characters).
 * Pass languageCode ("hi", "en", ...) so non-English text sounds natural.
 */
export async function generateVoiceover(input: {
  text: string;
  voice?: string;
  languageCode?: string | null;
}): Promise<string> {
  const result = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
    input: {
      text: input.text,
      voice: input.voice ?? "Rachel",
      stability: 0.5,
      ...(input.languageCode ? { language_code: input.languageCode } : {}),
    },
  });
  const url = (result.data as TtsOutput).audio?.url;
  if (!url) throw new Error("ElevenLabs returned no audio");
  return url;
}
