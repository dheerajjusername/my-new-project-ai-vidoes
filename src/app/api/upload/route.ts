export const maxDuration = 60;

import { fal } from "@/lib/fal";
import { getCurrentUser, unauthorized } from "@/lib/auth";

// Uploads an image file to fal storage and returns its public URL.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no file uploaded" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "please upload an image" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "image too large (max 10MB)" }, { status: 400 });
  }

  try {
    const url = await fal.storage.upload(file);
    return Response.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return Response.json({ error: `Upload failed: ${message}` }, { status: 502 });
  }
}
