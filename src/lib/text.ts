// Normalises "smart" punctuation that copy-pasted scripts (from Word, GPT,
// phones) often contain — curly quotes, ellipsis, bullets, en/em dashes,
// non-breaking / zero-width spaces. These characters are harmless in normal
// text but can trip up strict HTTP header handling on some runtimes, and they
// make TTS read oddly. Real scripts in Hindi/Kannada/etc. are left untouched.
export function normalizeScript(input: string): string {
  return input
    .replace(/[‘’‚‛]/g, "'") // ' ' ‚ ‛ → '
    .replace(/[“”„‟]/g, '"') // " " „ ‟ → "
    .replace(/…/g, "...") // … → ...
    .replace(/[•‣◦⁃∙]/g, "-") // bullets → -
    .replace(/[–—―]/g, "-") // – — ― → -
    .replace(/[   ]/g, " ") // non-breaking spaces → space
    .replace(/[​-‍﻿]/g, "") // zero-width chars → removed
    .replace(/\r\n/g, "\n")
    .trim();
}
