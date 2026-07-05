import { Resend } from "resend";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Sends a password-reset link. From address defaults to Resend's shared test
// sender until the owner verifies their own domain and sets RESEND_FROM.
export async function sendResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email is not configured");
  const from = process.env.RESEND_FROM || "Ad Champ <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your Ad Champ password",
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="margin:0 0 8px">Reset your password</h2>
        <p style="color:#444">Click the button below to set a new password. This link expires in 1 hour. If you didn't request it, you can ignore this email.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9999px;font-weight:600">Reset password</a></p>
        <p style="color:#888;font-size:12px">Or paste this link: ${resetUrl}</p>
      </div>`,
  });
  if (error) throw new Error(error.message || "email send failed");
}
