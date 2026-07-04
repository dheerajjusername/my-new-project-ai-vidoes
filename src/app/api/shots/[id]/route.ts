import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";

// Deletes a single shot (e.g. an unwanted image in a static story).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const shot = await prisma.shot.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!shot) {
    return Response.json({ error: "shot not found" }, { status: 404 });
  }
  await prisma.shot.delete({ where: { id } });
  return Response.json({ ok: true });
}
