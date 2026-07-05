import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  // Limit fake-account creation: 5 signups per IP per hour.
  if (!(await rateLimit(`signup:${ip}`, 5, 60 * 60))) return tooManyRequests();

  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!email.includes("@") || password.length < 6) {
    return Response.json(
      { error: "Valid email and a password of at least 6 characters required" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "An account with this email already exists — log in instead" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash },
  });
  await createSession(user.id);
  return Response.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 },
  );
}
