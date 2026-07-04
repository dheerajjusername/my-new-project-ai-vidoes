// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { generateCharacterReferenceImages } from "@/lib/character-images";
import { getCurrentUser, unauthorized } from "@/lib/auth";

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

  if (!name || !description) {
    return Response.json(
      { error: "name and description are required" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const character = await prisma.character.create({
    data: { userId: user.id, name, description, status: "GENERATING" },
  });

  try {
    const referenceImages = await generateCharacterReferenceImages(description);
    const ready = await prisma.character.update({
      where: { id: character.id },
      data: { referenceImages, status: "READY" },
    });
    return Response.json({ character: ready }, { status: 201 });
  } catch (error) {
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
