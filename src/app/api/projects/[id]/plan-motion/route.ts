export const maxDuration = 120;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateMotionClips } from "@/lib/shot-list";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";

type Word = { text: string; start: number; end: number };

// Compute each clip's on-screen seconds from the voiceover word timestamps,
// so the Veo clip length (4/6/8) we ask for is long enough to cover it.
function clipDurations(
  clips: { narrationText: string }[],
  words: Word[] | null,
  audioDur: number,
): number[] {
  const n = clips.length;
  const weights = clips.map((c) => {
    const w = c.narrationText.trim().split(/\s+/).filter(Boolean).length;
    return w > 0 ? w : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0) || n;
  if (words && words.length > 0) {
    const W = words.length;
    const starts = [0];
    let cum = 0;
    for (let i = 0; i < n - 1; i++) {
      cum += weights[i];
      const idx = Math.min(W - 1, Math.max(1, Math.round((cum / total) * W)));
      starts.push(Math.max(starts[i] + 1, words[idx].start));
    }
    starts.push(audioDur);
    return starts.slice(1).map((end, i) => Math.max(1, end - starts[i]));
  }
  return weights.map((w) => Math.max(1, (audioDur * w) / total));
}

// Round a target length up to the nearest Veo clip length (4, 6 or 8 s), so
// we always generate at least as much footage as the clip needs.
function veoDuration(target: number): number {
  if (target <= 4) return 4;
  if (target <= 6) return 6;
  return 8;
}

function parseWords(raw: string | null): Word[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Word[]) : null;
  } catch {
    return null;
  }
}

// Plans the VIDEO clips for a motion story: the AI decides where to cut, and
// each clip is timed to the words it covers. Creates the VIDEO shots.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { character: true, shots: true },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }
  const narration = project.narrationScript?.trim();
  if (!narration) {
    return Response.json(
      { error: "Generate the voiceover / narration first." },
      { status: 400 },
    );
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
    const clips = await generateMotionClips({
      narration,
      brief: project.brief,
      characterName: project.character.name,
      characterDescription: project.character.description,
    });

    // Time each clip to its words → pick a Veo length that covers it.
    const words = parseWords(project.voiceoverWords);
    const audioDur =
      words && words.length > 0 ? words[words.length - 1].end : clips.length * 5;
    const targets = clipDurations(clips, words, audioDur);

    await prisma.shot.deleteMany({ where: { projectId: project.id } });
    for (const [i, clip] of clips.entries()) {
      await prisma.shot.create({
        data: {
          projectId: project.id,
          orderIndex: i,
          type: "VIDEO",
          cameraAngle: clip.cameraAngle,
          prompt: clip.prompt,
          narrationText: clip.narrationText || null,
          durationSec: veoDuration(targets[i]),
        },
      });
    }
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "READY_TO_GENERATE" },
    });
    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: { shots: { orderBy: { orderIndex: "asc" } } },
    });
    return Response.json({ project: updated, count: clips.length });
  } catch (error) {
    await refundCredits(user.id, "shotList");
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: `Could not plan the clips: ${message}` },
      { status: 502 },
    );
  }
}
