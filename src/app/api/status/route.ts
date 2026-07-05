import { razorpayConfigured } from "@/lib/razorpay";
import { emailConfigured } from "@/lib/email";

// Public health check — reports only whether integrations are configured
// (booleans, never any secret values). Useful for verifying env vars.
export function GET() {
  return Response.json({
    razorpay: razorpayConfigured(),
    email: emailConfigured(),
    auth: Boolean(process.env.AUTH_SECRET),
    fal: Boolean(process.env.FAL_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    database: Boolean(process.env.DATABASE_URL),
  });
}
