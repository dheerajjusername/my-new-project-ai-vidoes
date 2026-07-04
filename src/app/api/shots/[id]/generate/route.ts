// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateShotVideo } from "@/lib/video";
import { resolveVideoModel } from "@/lib/video-models";
import {
  reserveCreditsAmount,
  refundCreditsAmount,
  insufficientCreditsAmount,
} from "@/lib/credits";

// Generates the video clip for a single shot. Cost depends on the model.
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

  // Pick the model: request body overrides the shot's stored choice.
  const model = resolveVideoModel(
    typeof body?.model === "string" ? body.model : shot.model,
  );

  if (!(await reserveCreditsAmount(user.id, model.credits))) {
    return insufficientCreditsAmount(model.credits);
  }

  await prisma.shot.update({
    where: { id: shot.id },
    data: { status: "GENERATING", model: model.key, lastError: null },
  });
  await prisma.project.update({
    where: { id: shot.projectId },
    data: { status: "GENERATING" },
  });

  try {
    const { videoUrl, audioUrl } = await generateShotVideo({
      prompt: shot.prompt,
      model: model.key,
      dialogue: shot.dialogue,
      dialogueLanguage: shot.dialogueLanguage,
      voice: shot.project.character.voice,
      referenceImages: shot.project.character.referenceImages,
    });
    const updated = await prisma.shot.update({
      where: { id: shot.id },
      data: { status: "COMPLETED", videoUrl, audioUrl },
    });
    return Response.json({ shot: updated });
  } catch (error) {
    await refundCreditsAmount(user.id, model.credits);
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
