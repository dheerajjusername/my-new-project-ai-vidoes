import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
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
