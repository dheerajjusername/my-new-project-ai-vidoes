export const maxDuration = 120;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateStaticImagePrompts } from "@/lib/shot-list";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";

// Plans the images for a static story. Count = words in the narration ÷ 6
// (so each image covers ~3 seconds of narration). Creates the IMAGE shots.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { character: true, shots: true },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  const narration = project.narrationScript?.trim();
  if (!narration) {
    return Response.json(
      { error: "Generate the voiceover / narration first." },
      { status: 400 },
    );
  }
  if (project.shots.some((s) => s.status !== "PENDING")) {
    return Response.json(
      { error: "Some images are already generated — delete them to re-plan." },
      { status: 409 },
    );
  }

  // words ÷ 6, clamped to a sensible range.
  const words = narration.split(/\s+/).filter(Boolean).length;
  const count = Math.min(20, Math.max(2, Math.round(words / 6)));

  if (!(await reserveCredits(user.id, "shotList"))) {
    return insufficientCredits("shotList");
  }
  try {
    const images = await generateStaticImagePrompts({
      narration,
      brief: project.brief,
      characterName: project.character.name,
      characterDescription: project.character.description,
      count,
    });

    await prisma.shot.deleteMany({ where: { projectId: project.id } });
    for (const [i, img] of images.entries()) {
      await prisma.shot.create({
        data: {
          projectId: project.id,
          orderIndex: i,
          type: "IMAGE",
          cameraAngle: img.cameraAngle,
          prompt: img.prompt,
          durationSec: 3,
        },
      });
    }
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "READY_TO_GENERATE" },
    });
    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: { shots: { orderBy: { orderIndex: "asc" } } },
    });
    return Response.json({ project: updated, words, count });
  } catch (error) {
    await refundCredits(user.id, "shotList");
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: `Could not plan the images: ${message}` },
      { status: 502 },
    );
  }
}
