export const maxDuration = 120;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateCompositeAnchor } from "@/lib/ugc";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";
import { isValidVoice, DEFAULT_VOICE } from "@/lib/voices";

// Creates a UGC Product Ad project: composites the person + product into an
// anchor image, makes a character from it, and creates the project.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  const personPhotoUrl =
    typeof body?.personPhotoUrl === "string" ? body.personPhotoUrl : "";
  const productPhotoUrl =
    typeof body?.productPhotoUrl === "string" ? body.productPhotoUrl : "";
  const voice = isValidVoice(body?.voice) ? body.voice : DEFAULT_VOICE;
  const consent = body?.consent === true;

  if (!title || !brief || !personPhotoUrl || !productPhotoUrl) {
    return Response.json(
      { error: "title, brief, a person photo and a product photo are required" },
      { status: 400 },
    );
  }
  if (!consent) {
    return Response.json(
      { error: "Please confirm you have the right to use this person's photo." },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // The composite anchor is one image generation — charge the character rate.
  if (!(await reserveCredits(user.id, "character"))) {
    return insufficientCredits("character");
  }

  try {
    const anchor = await generateCompositeAnchor({
      personPhotoUrl,
      productPhotoUrl,
      description: brief,
    });

    // Create a character whose reference IS the anchor, so every shot keeps
    // the same person AND product.
    const character = await prisma.character.create({
      data: {
        userId: user.id,
        name: `${title} — UGC`,
        description: "UGC creator holding the product",
        referenceImages: [anchor],
        compositeAnchor: anchor,
        voice,
        status: "READY",
      },
    });

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        characterId: character.id,
        title,
        brief,
        format: "UGC_PRODUCT_AD",
      },
    });

    return Response.json({ project, anchor }, { status: 201 });
  } catch (error) {
    await refundCredits(user.id, "character");
    const message = error instanceof Error ? error.message : "compositing failed";
    return Response.json(
      { error: `Could not build the UGC ad: ${message}` },
      { status: 502 },
    );
  }
}
