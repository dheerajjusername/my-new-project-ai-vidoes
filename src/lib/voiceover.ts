import { fal } from "@/lib/fal";

// A single spoken word with its start/end time (seconds) in the audio.
export type WordTimestamp = { text: string; start: number; end: number };

type RawWord = {
  text?: string;
  word?: string;
  start?: number;
  end?: number;
  start_time?: number;
  end_time?: number;
};
type TtsOutput = { audio: { url: string }; timestamps?: RawWord[] };

// Normalize whatever shape the API returns into { text, start, end }.
function normalizeWords(raw: RawWord[] | undefined): WordTimestamp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => ({
      text: (w.text ?? w.word ?? "").trim(),
      start: w.start ?? w.start_time ?? 0,
      end: w.end ?? w.end_time ?? w.start ?? w.start_time ?? 0,
    }))
    .filter((w) => w.text.length > 0);
}

/**
 * Generates speech with ElevenLabs (via fal.ai), plus optional word-level
 * timestamps. Cost scales with text length (~$0.10 per 1000 characters).
 * Pass languageCode ("hi", "en", ...) so non-English text sounds natural.
 */
export async function generateVoiceoverWithTimestamps(input: {
  text: string;
  voice?: string;
  languageCode?: string | null;
  timestamps?: boolean;
}): Promise<{ url: string; words: WordTimestamp[] }> {
  const result = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
    input: {
      text: input.text,
      voice: input.voice ?? "Rachel",
      stability: 0.5,
      ...(input.timestamps ? { timestamps: true } : {}),
      ...(input.languageCode ? { language_code: input.languageCode } : {}),
    },
  });
  const data = result.data as TtsOutput;
  const url = data.audio?.url;
  if (!url) throw new Error("ElevenLabs returned no audio");
  return { url, words: normalizeWords(data.timestamps) };
}

// Backwards-compatible helper that just returns the audio URL.
export async function generateVoiceover(input: {
  text: string;
  voice?: string;
  languageCode?: string | null;
}): Promise<string> {
  const { url } = await generateVoiceoverWithTimestamps(input);
  return url;
}
