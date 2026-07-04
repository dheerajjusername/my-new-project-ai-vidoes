import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { generateShotList } from "@/lib/shot-list";

// Generates the scene-by-scene shot list with Claude and stores it.
// Replaces any previously planned shots that haven't been generated.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getDemoUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { character: true, shots: true },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  if (project.shots.some((s) => s.status !== "PENDING")) {
    return Response.json(
      { error: "some shots are already generated; can't replace the shot list" },
      { status: 409 },
    );
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "PLANNING" },
  });

  try {
    const shots = await generateShotList({
      brief: project.brief,
      format: project.format,
      customFormat: project.customFormat,
      characterName: project.character.name,
      characterDescription: project.character.description,
    });

    await prisma.shot.deleteMany({ where: { projectId: project.id } });
    for (const [i, shot] of shots.entries()) {
      await prisma.shot.create({
        data: {
          projectId: project.id,
          orderIndex: i,
          prompt: shot.prompt,
          dialogue: shot.dialogue,
          dialogueLanguage: shot.dialogueLanguage,
          durationSec: shot.durationSec,
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
    return Response.json({ project: updated });
  } catch (error) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "DRAFT" },
    });
    const message = error instanceof Error ? error.message : "planning failed";
    return Response.json(
      { error: `Shot list generation failed: ${message}` },
      { status: 502 },
    );
  }
}
