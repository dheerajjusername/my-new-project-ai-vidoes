import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

// Completes a password reset: validates the one-time token and sets the new
// password. Tokens expire after 1 hour and can only be used once.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!(await rateLimit(`reset:${ip}`, 10, 15 * 60))) return tooManyRequests();

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || password.length < 6) {
    return Response.json(
      { error: "A valid link and a password of at least 6 characters are required" },
      { status: 400 },
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return Response.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: reset.userId },
    data: { passwordHash },
  });
  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  return Response.json({ ok: true });
}
