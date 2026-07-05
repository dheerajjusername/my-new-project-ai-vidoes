export const maxDuration = 120;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { parseTalkingScript } from "@/lib/shot-list";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";
import { normalizeScript } from "@/lib/text";

// Parses a talking script into ordered dialogue shots (one per line), keeping
// each line's language and an AI-chosen body language. Requires the scene image.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const script = typeof body?.script === "string" ? normalizeScript(body.script) : "";

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { shots: true },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  if (!project.sceneImageUrl) {
    return Response.json(
      { error: "Set the scene image first (Step 1)." },
      { status: 400 },
    );
  }
  if (!script) {
    return Response.json({ error: "Paste or upload the script first." }, { status: 400 });
  }
  if (project.shots.some((s) => s.status !== "PENDING")) {
    return Response.json(
      { error: "Some clips are already generated — delete them to re-plan." },
      { status: 409 },
    );
  }

  if (!(await reserveCredits(user.id, "shotList"))) {
    return insufficientCredits("shotList");
  }
  try {
    const turns = await parseTalkingScript({
      script,
      sceneDescription: project.brief,
    });
    if (turns.length === 0) throw new Error("no dialogue found in the script");

    await prisma.shot.deleteMany({ where: { projectId: project.id } });
    for (const [i, turn] of turns.entries()) {
      await prisma.shot.create({
        data: {
          projectId: project.id,
          orderIndex: i,
          type: "VIDEO",
          speaker: turn.speaker,
          prompt: turn.bodyLanguage,
          dialogue: turn.text,
          dialogueLanguage: turn.language,
          durationSec: turn.durationSec,
        },
      });
    }
    await prisma.project.update({
      where: { id: project.id },
      data: { narrationScript: script, status: "READY_TO_GENERATE" },
    });
    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: { shots: { orderBy: { orderIndex: "asc" } } },
    });
    return Response.json({ project: updated, count: turns.length });
  } catch (error) {
    await refundCredits(user.id, "shotList");
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: `Could not plan the dialogue: ${message}` },
      { status: 502 },
    );
  }
}
