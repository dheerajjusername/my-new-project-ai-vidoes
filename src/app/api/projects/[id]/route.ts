import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getDemoUser();
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
