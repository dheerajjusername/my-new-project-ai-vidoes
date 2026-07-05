import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { findPack } from "@/lib/credit-packs";
import { getRazorpay, razorpayConfigured } from "@/lib/razorpay";

// Creates a Razorpay order for a credit pack.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  if (!razorpayConfigured()) {
    return Response.json(
      { error: "Payments are not set up yet. Please try again later." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const pack = findPack(typeof body?.packId === "string" ? body.packId : "");
  if (!pack) {
    return Response.json({ error: "Unknown credit pack" }, { status: 400 });
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: pack.amountPaise,
      currency: "INR",
      receipt: `${user.id.slice(0, 18)}-${Date.now()}`,
      notes: { userId: user.id, packId: pack.id, credits: String(pack.credits) },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        credits: pack.credits,
        amountPaise: pack.amountPaise,
        status: "created",
      },
    });

    return Response.json({
      orderId: order.id,
      amount: pack.amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      credits: pack.credits,
      label: pack.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "order failed";
    return Response.json({ error: `Could not start payment: ${message}` }, { status: 502 });
  }
}
