import { prisma } from "@/lib/prisma";

// Credit cost of each paid action. Roughly proportional to the real API
// cost, with headroom so the platform can charge users above cost later.
export const CREDIT_COSTS = {
  character: 25, // 5 reference images (Nano Banana)
  shotList: 3, // Claude scene planning
  shotVideo: 25, // first frame + Veo clip + voice + lipsync
  voiceover: 3, // ElevenLabs narration
  stitch: 0, // FFmpeg — runs locally, free
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Atomically reserve an explicit number of credits (e.g. a model's cost). */
export async function reserveCreditsAmount(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return true;
  const affected = await prisma.$executeRaw`
    UPDATE "User" SET credits = credits - ${amount}
    WHERE id = ${userId} AND credits >= ${amount}
  `;
  return affected > 0;
}

/** Refund an explicit number of credits. */
export async function refundCreditsAmount(userId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
}

export function insufficientCreditsAmount(amount: number) {
  return Response.json(
    {
      error: `Not enough credits — this needs ${amount} credits. Top up to continue.`,
      code: "INSUFFICIENT_CREDITS",
    },
    { status: 402 },
  );
}

/**
 * Atomically reserves credits before a paid action. Returns true if the
 * user had enough (and the balance was decremented), false otherwise.
 * The conditional updateMany makes this safe without transactions.
 */
export async function reserveCredits(
  userId: string,
  action: CreditAction,
): Promise<boolean> {
  const cost = CREDIT_COSTS[action];
  if (cost === 0) return true;
  // Single conditional UPDATE — atomic, and works on Neon's HTTP driver
  // (which doesn't support the transaction Prisma's updateMany would use).
  const affected = await prisma.$executeRaw`
    UPDATE "User" SET credits = credits - ${cost}
    WHERE id = ${userId} AND credits >= ${cost}
  `;
  return affected > 0;
}

/** Refunds reserved credits when the paid action ultimately fails. */
export async function refundCredits(userId: string, action: CreditAction) {
  const cost = CREDIT_COSTS[action];
  if (cost === 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: cost } },
  });
}

/** Standard 402 response when the user is out of credits. */
export function insufficientCredits(action: CreditAction) {
  return Response.json(
    {
      error: `Not enough credits — this needs ${CREDIT_COSTS[action]} credits. Top up to continue.`,
      code: "INSUFFICIENT_CREDITS",
    },
    { status: 402 },
  );
}
