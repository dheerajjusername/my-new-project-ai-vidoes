import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { generateShotVideo } from "@/lib/video";

// Generates the video clip for a single shot (~$0.40 per 8s at 720p).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getDemoUser();
  const shot = await prisma.shot.findFirst({
    where: { id, project: { userId: user.id } },
    include: { project: { include: { character: true } } },
  });
  if (!shot) {
    return Response.json({ error: "shot not found" }, { status: 404 });
  }
  if (shot.status === "GENERATING") {
    return Response.json({ error: "shot is already generating" }, { status: 409 });
  }

  await prisma.shot.update({
    where: { id: shot.id },
    data: { status: "GENERATING", lastError: null },
  });
  await prisma.project.update({
    where: { id: shot.projectId },
    data: { status: "GENERATING" },
  });

  try {
    const videoUrl = await generateShotVideo({
      prompt: shot.prompt,
      referenceImages: shot.project.character.referenceImages,
    });
    const updated = await prisma.shot.update({
      where: { id: shot.id },
      data: { status: "COMPLETED", videoUrl },
    });
    return Response.json({ shot: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "generation failed";
    await prisma.shot.update({
      where: { id: shot.id },
      data: { status: "FAILED", lastError: message },
    });
    return Response.json(
      { error: `Video generation failed: ${message}` },
      { status: 502 },
    );
  }
}
