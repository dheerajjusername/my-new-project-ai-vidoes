// Pronunciation fixes for the voiceover. The user lists words the TTS says
// wrong and how they should be spelled to sound right (a "pronunciation
// dictionary"). We apply these substitutions to the text just before sending
// it to ElevenLabs, while the on-screen narration keeps its clean spelling.

export type PronunciationFix = { from: string; to: string };

// Parse the JSON we store on the project into a clean list.
export function parseFixes(raw: string | null | undefined): PronunciationFix[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (f): f is PronunciationFix =>
          f && typeof f.from === "string" && typeof f.to === "string",
      )
      .map((f) => ({ from: f.from.trim(), to: f.to.trim() }))
      .filter((f) => f.from.length > 0 && f.to.length > 0);
  } catch {
    return [];
  }
}

// Escape a string so it can be used literally inside a RegExp.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace every `from` with its `to` (all occurrences, case-insensitive).
// Longer words are replaced first so they aren't broken by shorter ones.
export function applyPronunciationFixes(
  text: string,
  fixes: PronunciationFix[],
): string {
  let out = text;
  for (const fix of [...fixes].sort((a, b) => b.from.length - a.from.length)) {
    out = out.replace(new RegExp(escapeRegExp(fix.from), "gi"), fix.to);
  }
  return out;
}
