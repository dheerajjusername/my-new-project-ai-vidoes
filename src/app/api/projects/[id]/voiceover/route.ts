import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { generateVoiceover } from "@/lib/voiceover";

// Generates the project's voiceover from a user-provided script
// (~$0.10 per 1000 characters via ElevenLabs).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const voice = typeof body?.voice === "string" ? body.voice.trim() : undefined;

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 2500) {
    return Response.json(
      { error: "script is too long (max 2500 characters)" },
      { status: 400 },
    );
  }

  const user = await getDemoUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!project) {
    return Response.json({ error: "project not found" }, { status: 404 });
  }

  try {
    const voiceoverUrl = await generateVoiceover({ text, voice });
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { voiceoverUrl },
    });
    return Response.json({ project: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "tts failed";
    return Response.json(
      { error: `Voiceover generation failed: ${message}` },
      { status: 502 },
    );
  }
}
