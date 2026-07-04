// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import {
  generateCharacterReferenceImages,
  generateCharacterReferenceImagesFromPhoto,
} from "@/lib/character-images";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";
import { isValidVoice, DEFAULT_VOICE } from "@/lib/voices";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const characters = await prisma.character.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ characters });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const photoUrl =
    typeof body?.photoUrl === "string" && body.photoUrl ? body.photoUrl : null;
  const voice = isValidVoice(body?.voice) ? body.voice : DEFAULT_VOICE;

  // Either a text description or an uploaded photo is required.
  if (!name || (!description && !photoUrl)) {
    return Response.json(
      { error: "name and either a description or a photo are required" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  if (!(await reserveCredits(user.id, "character"))) {
    return insufficientCredits("character");
  }

  const character = await prisma.character.create({
    data: {
      userId: user.id,
      name,
      description: description || "Character from an uploaded photo",
      voice,
      status: "GENERATING",
    },
  });

  try {
    const referenceImages = photoUrl
      ? await generateCharacterReferenceImagesFromPhoto(photoUrl, description)
      : await generateCharacterReferenceImages(description);
    const ready = await prisma.character.update({
      where: { id: character.id },
      data: { referenceImages, status: "READY" },
    });
    return Response.json({ character: ready }, { status: 201 });
  } catch (error) {
    await refundCredits(user.id, "character");
    await prisma.character.update({
      where: { id: character.id },
      data: { status: "FAILED" },
    });
    const message = error instanceof Error ? error.message : "generation failed";
    return Response.json(
      { error: `Image generation failed: ${message}` },
      { status: 502 },
    );
  }
}
