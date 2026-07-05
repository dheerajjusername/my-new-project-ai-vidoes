export const maxDuration = 30;

import { getCurrentUser, unauthorized } from "@/lib/auth";

// Extracts plain text from an uploaded script file (.txt / .md, .docx, .pdf)
// so users can upload a script instead of typing it.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "File is too large (max 8 MB)" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";
    if (name.endsWith(".docx")) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } else if (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".rtf") ||
      (file.type || "").startsWith("text/")
    ) {
      text = buf.toString("utf8");
    } else if (name.endsWith(".doc")) {
      return Response.json(
        { error: "Old .doc files aren't supported — save as .docx or PDF, or paste the text." },
        { status: 415 },
      );
    } else {
      // Best effort: treat unknown files as UTF-8 text.
      text = buf.toString("utf8");
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) {
      return Response.json(
        { error: "Couldn't find any text in that file." },
        { status: 422 },
      );
    }
    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "extraction failed";
    return Response.json(
      { error: `Could not read that file: ${message}` },
      { status: 500 },
    );
  }
}
