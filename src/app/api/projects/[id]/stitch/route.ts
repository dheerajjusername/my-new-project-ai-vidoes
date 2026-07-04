import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { stitchProjectVideo } from "@/lib/stitch";

// Joins all completed shots (plus optional voiceover) into the final video.
// FFmpeg runs locally, so this step itself costs nothing.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getDemoUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { shots: { orderBy: { orderIndex: "asc" } } },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  if (project.shots.length === 0) {
    return Response.json({ error: "project has no shots" }, { status: 400 });
  }
  const notReady = project.shots.filter((s) => s.status !== "COMPLETED");
  if (notReady.length > 0) {
    return Response.json(
      { error: `${notReady.length} shot(s) are not generated yet` },
      { status: 400 },
    );
  }

  const previousStatus = project.status;
  await prisma.project.update({
    where: { id: project.id },
    data: { status: "STITCHING" },
  });

  try {
    const finalVideoUrl = await stitchProjectVideo({
      clipUrls: project.shots.map((s) => s.videoUrl!),
      voiceoverUrl: project.voiceoverUrl,
    });
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { finalVideoUrl, status: "COMPLETED" },
    });
    return Response.json({ project: updated });
  } catch (error) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: previousStatus },
    });
    const message = error instanceof Error ? error.message : "stitch failed";
    return Response.json(
      { error: `Stitching failed: ${message}` },
      { status: 500 },
    );
  }
}
