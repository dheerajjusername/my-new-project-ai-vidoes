import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";

// Verifies a completed Razorpay payment and credits the user's account.
// Idempotent: credits are only added once, when the payment flips created→paid.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: "Missing payment details" }, { status: 400 });
  }
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return Response.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Atomically flip this user's matching pending payment to paid, once.
  const rows = await prisma.$queryRaw<{ credits: number }[]>`
    UPDATE "Payment"
    SET "status" = 'paid', "razorpayPaymentId" = ${paymentId}
    WHERE "razorpayOrderId" = ${orderId}
      AND "userId" = ${user.id}
      AND "status" = 'created'
    RETURNING "credits"
  `;

  if (rows.length === 0) {
    // Either already credited (idempotent success) or not this user's order.
    const existing = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (existing && existing.userId === user.id && existing.status === "paid") {
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      return Response.json({ ok: true, credits: fresh?.credits ?? null, alreadyCredited: true });
    }
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const added = rows[0].credits;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { credits: { increment: added } },
  });
  return Response.json({ ok: true, added, credits: updated.credits });
}
