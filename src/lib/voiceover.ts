import { fal } from "@/lib/fal";

type TtsOutput = { audio: { url: string } };

/**
 * Generates a voiceover with ElevenLabs (via fal.ai).
 * Cost scales with text length (roughly $0.10 per 1000 characters),
 * so keep scripts short.
 */
export async function generateVoiceover(input: {
  text: string;
  voice?: string;
}): Promise<string> {
  const result = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
    input: {
      text: input.text,
      voice: input.voice ?? "Rachel",
      stability: 0.5,
    },
  });
  const url = (result.data as TtsOutput).audio?.url;
  if (!url) throw new Error("ElevenLabs returned no audio");
  return url;
}
