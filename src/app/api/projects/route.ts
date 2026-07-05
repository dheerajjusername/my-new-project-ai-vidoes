import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import type { VideoFormat } from "@/generated/prisma/enums";
import { isValidImageStyle, DEFAULT_IMAGE_STYLE } from "@/lib/image-styles";
import { normalizeScript } from "@/lib/text";

const FORMATS: VideoFormat[] = [
  "TALKING",
  "MOTION_STORYTELLING",
  "STATIC_STORYTELLING",
  "TALKING_MICRODRAMA",
  "UGC_PRODUCT_AD",
  "CUSTOM",
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      character: { select: { name: true } },
      shots: { select: { status: true } },
    },
  });
  return Response.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const brief = typeof body?.brief === "string" ? normalizeScript(body.brief) : "";
  const characterId =
    typeof body?.characterId === "string" ? body.characterId : "";
  const format = FORMATS.includes(body?.format) ? (body.format as VideoFormat) : null;
  const customFormat =
    typeof body?.customFormat === "string" ? body.customFormat.trim() : null;
  const aspectRatio = body?.aspectRatio === "9:16" ? "9:16" : "16:9";
  const imageStyle = isValidImageStyle(body?.imageStyle)
    ? (body.imageStyle as string)
    : DEFAULT_IMAGE_STYLE;
  const transition = ["fade", "fadewhite", "cut", "mix"].includes(body?.transition)
    ? (body.transition as string)
    : "fade";

  if (!title || !brief || !format) {
    return Response.json(
      { error: "title, brief and format are required" },
      { status: 400 },
    );
  }
  if (format === "CUSTOM" && !customFormat) {
    return Response.json(
      { error: "customFormat is required when format is CUSTOM" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Character is optional. If one was chosen, it must belong to the user and
  // be ready; otherwise the project has no character (text-to-image scenes).
  if (characterId) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId: user.id },
    });
    if (!character) {
      return Response.json({ error: "character not found" }, { status: 404 });
    }
    if (character.status !== "READY") {
      return Response.json(
        { error: "character's reference images are not ready yet" },
        { status: 400 },
      );
    }
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      characterId: characterId || null,
      title,
      brief,
      format,
      customFormat: format === "CUSTOM" ? customFormat : null,
      aspectRatio,
      imageStyle,
      transition,
    },
  });
  return Response.json({ project }, { status: 201 });
}
