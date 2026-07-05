import { razorpayConfigured } from "@/lib/razorpay";
import { emailConfigured } from "@/lib/email";

// Read env at request time, never cache this.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public health check — reports only whether integrations are configured
// (booleans, never any secret values). Useful for verifying env vars.
export function GET() {
  const k = process.env.ANTHROPIC_API_KEY ?? "";
  let bad = 0;
  for (let i = 0; i < k.length; i++) if (k.charCodeAt(i) > 255) bad++;
  return Response.json({
    razorpay: razorpayConfigured(),
    email: emailConfigured(),
    auth: Boolean(process.env.AUTH_SECRET),
    fal: Boolean(process.env.FAL_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    database: Boolean(process.env.DATABASE_URL),
    // temporary diagnostic — length + head/tail only, never the secret middle
    anthropicKey: { len: k.length, head: k.slice(0, 14), tail: k.slice(-6), badChars: bad },
  });
}
