// Allow up to 5 minutes on Vercel — AI generation is slow.
export const maxDuration = 300;

import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { generateVoiceoverWithTimestamps } from "@/lib/voiceover";
import { reserveCredits, refundCredits, insufficientCredits } from "@/lib/credits";
import { parseFixes, applyPronunciationFixes, type PronunciationFix } from "@/lib/pronounce";
import { normalizeScript } from "@/lib/text";

// Generates the project's voiceover from a user-provided script
// (~$0.10 per 1000 characters via ElevenLabs).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? normalizeScript(body.text) : "";
  const voice = typeof body?.voice === "string" ? body.voice.trim() : undefined;
  const languageCode =
    typeof body?.languageCode === "string" && body.languageCode
      ? body.languageCode
      : null;
  // Pronunciation fixes: [{ from, to }] — respell tricky words for the TTS.
  const fixes: PronunciationFix[] = Array.isArray(body?.pronunciationFixes)
    ? parseFixes(JSON.stringify(body.pronunciationFixes))
    : [];

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 2500) {
    return Response.json(
      { error: "script is too long (max 2500 characters)" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }

  if (!(await reserveCredits(user.id, "voiceover"))) {
    return insufficientCredits("voiceover");
  }

  try {
    // Send the respelled text to the TTS, but keep the clean text on screen.
    const spoken = applyPronunciationFixes(text, fixes);
    // Ask for word timestamps so static images can be timed to their words.
    const { url: voiceoverUrl, words } = await generateVoiceoverWithTimestamps({
      text: spoken,
      voice,
      languageCode,
      timestamps: true,
    });
    // Keep the spoken text as the narration script — it drives how many
    // images a static story needs (words ÷ 6).
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        voiceoverUrl,
        narrationScript: text,
        voiceoverWords: words.length > 0 ? JSON.stringify(words) : null,
        pronunciationFixes: fixes.length > 0 ? JSON.stringify(fixes) : null,
      },
    });
    return Response.json({ project: updated });
  } catch (error) {
    await refundCredits(user.id, "voiceover");
    const message = error instanceof Error ? error.message : "tts failed";
    return Response.json(
      { error: `Voiceover generation failed: ${message}` },
      { status: 502 },
    );
  }
}
