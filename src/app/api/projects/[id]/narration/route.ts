export const maxDuration = 60;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateNarrationScript } from "@/lib/shot-list";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";

// Suggests a voiceover narration script from the project's brief (Claude).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { character: true },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }

  if (!(await reserveCredits(user.id, "shotList"))) {
    return insufficientCredits("shotList");
  }
  try {
    const script = await generateNarrationScript({
      brief: project.brief,
      characterName: project.character.name,
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { narrationScript: script },
    });
    return Response.json({ script });
  } catch (error) {
    await refundCredits(user.id, "shotList");
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: `Could not write the narration: ${message}` },
      { status: 502 },
    );
  }
}
