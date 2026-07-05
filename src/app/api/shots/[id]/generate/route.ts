// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateShotVideo, generateShotImage } from "@/lib/video";
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
    include: { project: { include: { character: true } } },
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
