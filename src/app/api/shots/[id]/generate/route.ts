// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateShotVideo, generateShotImage, generateTalkingClip } from "@/lib/video";
import { checkTalkingClip } from "@/lib/talking-qc";
import { resolveVideoModel } from "@/lib/video-models";
import { DEFAULT_VOICE } from "@/lib/voices";
import {
  reserveCreditsAmount,
  refundCreditsAmount,
  insufficientCreditsAmount,
  CREDIT_COSTS,
} from "@/lib/credits";

// Renders one shot. VIDEO shots animate a clip; IMAGE shots produce a still
// (Ken Burns motion is added later at stitch time).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const shot = await prisma.shot.findFirst({
    where: { id, project: { userId: user.id } },
    include: {
      project: {
        include: { character: true, shots: { select: { speaker: true } } },
      },
    },
  });
  if (!shot) {
    return Response.json({ error: "shot not found" }, { status: 404 });
  }
  if (shot.status === "GENERATING") {
    return Response.json({ error: "shot is already generating" }, { status: 409 });
  }

  const isImage = shot.type === "IMAGE";
  const model = resolveVideoModel(
    typeof body?.model === "string" ? body.model : shot.model,
  );
  const cost = isImage ? CREDIT_COSTS.shotImage : model.credits;

  if (!(await reserveCreditsAmount(user.id, cost))) {
    return insufficientCreditsAmount(cost);
  }

  await prisma.shot.update({
    where: { id: shot.id },
    data: {
      status: "GENERATING",
      model: isImage ? shot.model : model.key,
      lastError: null,
    },
  });
  await prisma.project.update({
    where: { id: shot.projectId },
    data: { status: "GENERATING" },
  });

  try {
    if (isImage) {
      const imageUrl = await generateShotImage({
        prompt: shot.prompt,
        referenceImages: shot.project.character?.referenceImages ?? [],
        aspectRatio: shot.project.aspectRatio,
        style: shot.project.imageStyle,
      });
      const updated = await prisma.shot.update({
        where: { id: shot.id },
        data: { status: "COMPLETED", videoUrl: imageUrl, audioUrl: null },
      });
      return Response.json({ shot: updated });
    }

    // Talking dialogue clip: animate the fixed scene so only this speaker
    // talks, with an auto-QC + one regenerate if the wrong person speaks.
    if (
      shot.project.format === "TALKING" &&
      shot.project.sceneImageUrl &&
      shot.speaker
    ) {
      const allSpeakers = [
        ...new Set(
          shot.project.shots.map((s) => s.speaker).filter((s): s is string => Boolean(s)),
        ),
      ];
      const others = allSpeakers.filter((s) => s !== shot.speaker);
      let videoUrl = "";
      let lastReason = "";
      for (let attempt = 1; attempt <= 2; attempt++) {
        videoUrl = await generateTalkingClip({
          sceneImageUrl: shot.project.sceneImageUrl,
          speaker: shot.speaker,
          others,
          bodyLanguage: shot.prompt,
          line: shot.dialogue ?? "",
          language: shot.dialogueLanguage ?? "the same language",
          durationSec: shot.durationSec ?? 6,
          aspectRatio: shot.project.aspectRatio,
          style: shot.project.imageStyle,
        });
        const qc = await checkTalkingClip({
          videoUrl,
          speaker: shot.speaker,
          others,
          durationSec: shot.durationSec ?? 6,
        });
        lastReason = qc.reason;
        if (qc.ok) break; // good clip — stop; otherwise regenerate once
      }
      const updated = await prisma.shot.update({
        where: { id: shot.id },
        data: { status: "COMPLETED", videoUrl, audioUrl: null, lastError: null },
      });
      return Response.json({ shot: updated, qc: lastReason });
    }

    const { videoUrl, audioUrl } = await generateShotVideo({
      prompt: shot.prompt,
      model: model.key,
      durationSec: shot.durationSec,
      dialogue: shot.dialogue,
      dialogueLanguage: shot.dialogueLanguage,
      voice: shot.project.character?.voice ?? DEFAULT_VOICE,
      referenceImages: shot.project.character?.referenceImages ?? [],
      style: shot.project.imageStyle,
      aspectRatio: shot.project.aspectRatio,
      // Motion clips get their audio from the narration voiceover, so don't
      // pay the model to generate audio we'd discard.
      muteVideo: shot.project.format === "MOTION_STORYTELLING",
    });
    const updated = await prisma.shot.update({
      where: { id: shot.id },
      data: { status: "COMPLETED", videoUrl, audioUrl },
    });
    return Response.json({ shot: updated });
  } catch (error) {
    await refundCreditsAmount(user.id, cost);
    const message = error instanceof Error ? error.message : "generation failed";
    await prisma.shot.update({
      where: { id: shot.id },
      data: { status: "FAILED", lastError: message },
    });
    return Response.json(
      { error: `Generation failed: ${message}` },
      { status: 502 },
    );
  }
}
