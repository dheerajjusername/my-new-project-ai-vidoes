// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { stitchProjectVideo, stitchStaticVideo, stitchMotionVideo, stitchTalkingVideo, type WordTime } from "@/lib/stitch";

// Parse the saved voiceover word timestamps (JSON) back into an array.
function parseWords(raw: string | null): WordTime[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as WordTime[]) : null;
  } catch {
    return null;
  }
}

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

  // Static storytelling needs the narration to time the images.
  const isStatic =
    project.format === "STATIC_STORYTELLING" &&
    project.shots.every((s) => s.type === "IMAGE");
  // Motion storytelling times VIDEO clips to the narration too.
  const isMotion =
    project.format === "MOTION_STORYTELLING" &&
    project.shots.every((s) => s.type === "VIDEO");
  // Talking concatenates the dialogue clips (each carries its own speech).
  const isTalking =
    project.format === "TALKING" && project.shots.every((s) => s.type === "VIDEO");
  if ((isStatic || isMotion) && !project.voiceoverUrl) {
    return Response.json(
      { error: "Generate the voiceover first — it sets the video's length." },
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
    const finalVideoUrl = isStatic
      ? await stitchStaticVideo({
          images: project.shots.map((s) => ({
            url: s.videoUrl!,
            narrationText: s.narrationText,
          })),
          voiceoverUrl: project.voiceoverUrl!,
          aspectRatio: project.aspectRatio,
          transition: project.transition,
          voiceoverWords: parseWords(project.voiceoverWords),
        })
      : isTalking
      ? await stitchTalkingVideo({
          clipUrls: project.shots.map((s) => s.videoUrl!),
          aspectRatio: project.aspectRatio,
        })
      : isMotion
      ? await stitchMotionVideo({
          clips: project.shots.map((s) => ({
            url: s.videoUrl!,
            narrationText: s.narrationText,
          })),
          voiceoverUrl: project.voiceoverUrl!,
          aspectRatio: project.aspectRatio,
          transition: project.transition,
          voiceoverWords: parseWords(project.voiceoverWords),
        })
      : await stitchProjectVideo({
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
