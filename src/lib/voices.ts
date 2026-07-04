// Curated ElevenLabs voices (all verified working, multilingual — good for
// Hindi and English). Used when a character speaks.

export type Voice = { id: string; label: string; gender: "female" | "male" };

export const VOICES: Voice[] = [
  { id: "Rachel", label: "Rachel — calm, warm", gender: "female" },
  { id: "Aria", label: "Aria — expressive", gender: "female" },
  { id: "Sarah", label: "Sarah — soft, friendly", gender: "female" },
  { id: "Charlotte", label: "Charlotte — youthful", gender: "female" },
  { id: "Alice", label: "Alice — clear, confident", gender: "female" },
  { id: "Lily", label: "Lily — gentle", gender: "female" },
  { id: "Brian", label: "Brian — deep, steady", gender: "male" },
  { id: "George", label: "George — warm, mature", gender: "male" },
  { id: "Liam", label: "Liam — energetic", gender: "male" },
  { id: "Daniel", label: "Daniel — news-anchor", gender: "male" },
  { id: "Callum", label: "Callum — characterful", gender: "male" },
  { id: "Bill", label: "Bill — friendly, older", gender: "male" },
];

export const DEFAULT_VOICE = "Rachel";

export function isValidVoice(id: string | null | undefined): boolean {
  return Boolean(id && VOICES.some((v) => v.id === id));
}
