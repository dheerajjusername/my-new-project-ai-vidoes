import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";

// Deletes a character. Blocked if any project still uses it.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const character = await prisma.character.findFirst({
    where: { id, userId: user.id },
  });
  if (!character) {
    return Response.json({ error: "character not found" }, { status: 404 });
  }

  const usedBy = await prisma.project.count({ where: { characterId: id } });
  if (usedBy > 0) {
    return Response.json(
      { error: `This character is used by ${usedBy} project(s). Delete those first.` },
      { status: 409 },
    );
  }

  await prisma.character.delete({ where: { id } });
  return Response.json({ ok: true });
}
