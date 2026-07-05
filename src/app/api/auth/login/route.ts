import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  // Slow down brute-force: 10 attempts per IP per 15 min.
  if (!(await rateLimit(`login:${ip}`, 10, 15 * 60))) return tooManyRequests();

  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;
  const valid =
    user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) {
    return Response.json({ error: "Wrong email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
