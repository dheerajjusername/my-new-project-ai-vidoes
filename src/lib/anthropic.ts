import Anthropic from "@anthropic-ai/sdk";

// API keys are printable ASCII (sk-ant-api03-...). Pasting into a dashboard can
// sneak in stray characters — a bullet (•), non-breaking space, newline, etc.
// Those would crash the SDK ("Cannot convert argument to a ByteString") when it
// puts the key in a header. Strip anything that isn't a printable ASCII key
// character so a copy-paste artifact can't take the whole app down.
export function cleanApiKey(raw?: string | null): string {
  return (raw ?? "").replace(/[^\x21-\x7E]/g, "").trim();
}

// Shared Anthropic client using a sanitized key.
export const anthropic = new Anthropic({
  apiKey: cleanApiKey(process.env.ANTHROPIC_API_KEY),
});
