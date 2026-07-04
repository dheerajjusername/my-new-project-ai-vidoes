import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      character: true,
      shots: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  return Response.json({ project });
}

// Deletes a project and all of its shots.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }

  await prisma.shot.deleteMany({ where: { projectId: id } });
  await prisma.project.delete({ where: { id } });
  return Response.json({ ok: true });
}
