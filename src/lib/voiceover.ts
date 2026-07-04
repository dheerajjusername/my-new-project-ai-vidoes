import { fal } from "@/lib/fal";

// A single spoken word with its start/end time (seconds) in the audio.
export type WordTimestamp = { text: string; start: number; end: number };

// ElevenLabs (via fal) returns CHARACTER-level timing, in chunks:
//   [{ characters: ["E","k"," ",...],
//      character_start_times_seconds: [...],
//      character_end_times_seconds: [...] }, ...]
// Some variants may return word objects directly, so we handle both.
type CharChunk = {
  characters?: string[];
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
};
type WordObj = { text?: string; word?: string; start?: number; end?: number };
type TtsOutput = { audio: { url: string }; timestamps?: unknown };

// Turn whatever shape the API returns into word-level { text, start, end }.
function normalizeWords(raw: unknown): WordTimestamp[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Already word objects?
  if (typeof (raw[0] as WordObj)?.text === "string" || typeof (raw[0] as WordObj)?.word === "string") {
    return (raw as WordObj[])
      .map((w) => ({
        text: (w.text ?? w.word ?? "").trim(),
        start: w.start ?? 0,
        end: w.end ?? w.start ?? 0,
      }))
      .filter((w) => w.text.length > 0);
  }

  // Character chunks → flatten into one stream, then split on whitespace.
  const flat: { ch: string; start: number; end: number }[] = [];
  for (const chunk of raw as CharChunk[]) {
    const cs = chunk.characters ?? [];
    const st = chunk.character_start_times_seconds ?? [];
    const en = chunk.character_end_times_seconds ?? [];
    for (let i = 0; i < cs.length; i++) {
      flat.push({ ch: cs[i], start: st[i] ?? 0, end: en[i] ?? st[i] ?? 0 });
    }
  }
  const words: WordTimestamp[] = [];
  let cur: WordTimestamp | null = null;
  for (const c of flat) {
    if (/\s/.test(c.ch)) {
      if (cur) { words.push(cur); cur = null; }
    } else {
      if (!cur) cur = { text: "", start: c.start, end: c.end };
      cur.text += c.ch;
      cur.end = c.end;
    }
  }
  if (cur) words.push(cur);
  return words.filter((w) => w.text.trim().length > 0);
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
