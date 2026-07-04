// Curated ElevenLabs voices for characters. Indian voices (real Hindi accents,
// referenced by ElevenLabs voice_id) plus multilingual voices. All verified
// working on fal.ai's eleven-v3 endpoint for Hindi and English.

export type Voice = { id: string; label: string; gender: "female" | "male" };

export const VOICES: Voice[] = [
  // Indian voices — natural Hindi accent
  { id: "zT03pEAEi0VHKciJODfn", label: "Raju — Indian male, warm", gender: "male" },
  { id: "zgqefOY5FPQ3bB7OZTVR", label: "Niraj — Indian male, smooth", gender: "male" },
  { id: "d0grukerEzs069eKIauC", label: "Ranga — Indian male, deep", gender: "male" },
  { id: "VZyYADHcMi33m0wO9zD1", label: "Monika — Indian female, calm", gender: "female" },
  { id: "H6QPv2pQZDcGqLwDTIJQ", label: "Kanika — Indian female, bright", gender: "female" },
  { id: "MF4J4IDTRo0AxOO4dpFR", label: "Devi — Indian female, gentle", gender: "female" },
  { id: "xoV6iGVuOGYHLWjXhVC7", label: "Muskaan — Indian female, young", gender: "female" },
  { id: "4RloeZf2FRvGiu4uoKOf", label: "Riya — Indian female, friendly", gender: "female" },
  { id: "50YSQEDPA2vlOxhCseP4", label: "Saanu — Indian female, expressive", gender: "female" },
  // Multilingual voices (English-first, also speak Hindi)
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

// Default to an Indian female voice — the platform is India-first.
export const DEFAULT_VOICE = "H6QPv2pQZDcGqLwDTIJQ"; // Kanika

export function isValidVoice(id: string | null | undefined): boolean {
  return Boolean(id && VOICES.some((v) => v.id === id));
}
