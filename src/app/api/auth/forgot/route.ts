import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendResetEmail, emailConfigured } from "@/lib/email";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

// Requests a password-reset email. Always responds the same way whether or not
// the email exists, so it can't be used to discover which emails are registered.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!(await rateLimit(`forgot:${ip}`, 5, 15 * 60))) return tooManyRequests();

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    return Response.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (!emailConfigured()) {
    return Response.json(
      { error: "Password reset is not set up yet. Contact support." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    const origin = process.env.APP_URL || new URL(request.url).origin;
    const resetUrl = `${origin}/reset?token=${token}`;
    try {
      await sendResetEmail(email, resetUrl);
    } catch {
      // Swallow send errors so we don't reveal whether the email exists.
    }
  }

  return Response.json({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });
}
