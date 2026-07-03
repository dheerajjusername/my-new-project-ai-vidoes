import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import type { VideoFormat } from "@/generated/prisma/enums";

const FORMATS: VideoFormat[] = [
  "TALKING",
  "MOTION_STORYTELLING",
  "STATIC_STORYTELLING",
  "TALKING_MICRODRAMA",
  "UGC_PRODUCT_AD",
  "CUSTOM",
];

export async function GET() {
  const user = await getDemoUser();
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
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  const characterId =
    typeof body?.characterId === "string" ? body.characterId : "";
  const format = FORMATS.includes(body?.format) ? (body.format as VideoFormat) : null;
  const customFormat =
    typeof body?.customFormat === "string" ? body.customFormat.trim() : null;

  if (!title || !brief || !characterId || !format) {
    return Response.json(
      { error: "title, brief, characterId and format are required" },
      { status: 400 },
    );
  }
  if (format === "CUSTOM" && !customFormat) {
    return Response.json(
      { error: "customFormat is required when format is CUSTOM" },
      { status: 400 },
    );
  }

  const user = await getDemoUser();
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

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      characterId,
      title,
      brief,
      format,
      customFormat: format === "CUSTOM" ? customFormat : null,
    },
  });
  return Response.json({ project }, { status: 201 });
}
