export const maxDuration = 120;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateSceneImage } from "@/lib/video";
import {
  reserveCredits,
  refundCredits,
  insufficientCredits,
} from "@/lib/credits";

// TALKING first-frame / scene image. Three ways to set it:
//  - uploadedImageUrl: the user uploaded their own final image → save as is.
//  - referenceImageUrl + prompt: generate a scene "like this reference".
//  - prompt only: generate a scene from the text prompt.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const referenceImageUrl =
    typeof body?.referenceImageUrl === "string" ? body.referenceImageUrl : null;
  const uploadedImageUrl =
    typeof body?.uploadedImageUrl === "string" ? body.uploadedImageUrl : null;

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }

  // Using an already-uploaded image costs nothing — just save it.
  if (uploadedImageUrl) {
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { sceneImageUrl: uploadedImageUrl },
    });
    return Response.json({ project: updated });
  }

  if (!prompt) {
    return Response.json(
      { error: "Describe the scene (or upload an image / reference)." },
      { status: 400 },
    );
  }

  if (!(await reserveCredits(user.id, "shotImage"))) {
    return insufficientCredits("shotImage");
  }
  try {
    const sceneImageUrl = await generateSceneImage({
      prompt,
      referenceImageUrl,
      aspectRatio: project.aspectRatio,
      style: project.imageStyle,
    });
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { sceneImageUrl },
    });
    return Response.json({ project: updated });
  } catch (error) {
    await refundCredits(user.id, "shotImage");
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: `Could not create the scene image: ${message}` },
      { status: 502 },
    );
  }
}
