// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { stitchProjectVideo } from "@/lib/stitch";

// Joins all completed shots (plus optional voiceover) into the final video.
// FFmpeg runs locally, so this step itself costs nothing.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
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

  // If the character speaks in any shot, mixing a narration voiceover on top
  // would produce two competing voices — skip it in that case.
  const hasDialogue = project.shots.some((s) => s.dialogue);
  const voiceoverSkipped = Boolean(hasDialogue && project.voiceoverUrl);

  try {
    const finalVideoUrl = await stitchProjectVideo({
      shots: project.shots.map((s) => ({
        url: s.videoUrl!,
        type: s.type,
        durationSec: s.durationSec ?? (s.type === "IMAGE" ? 6 : 8),
      })),
      voiceoverUrl: voiceoverSkipped ? null : project.voiceoverUrl,
    });
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { finalVideoUrl, status: "COMPLETED" },
    });
    return Response.json({
      project: updated,
      ...(voiceoverSkipped
        ? {
            warning:
              "Narration voiceover was not mixed in because the character already speaks in the shots.",
          }
        : {}),
    });
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
