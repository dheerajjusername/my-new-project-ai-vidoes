import Razorpay from "razorpay";
import crypto from "node:crypto";

// Razorpay is only configured when the keys are present, so the app still runs
// (with payments disabled) before the owner adds their keys.
export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys are not configured");
  return new Razorpay({ key_id, key_secret });
}

// Verifies the checkout signature: HMAC_SHA256(order_id + "|" + payment_id).
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
