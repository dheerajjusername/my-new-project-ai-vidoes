import { prisma } from "@/lib/prisma";

// Until real authentication is added, all data belongs to a single demo user.
// (find-then-create instead of upsert: Neon's HTTP driver has no transactions)
export async function getDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: "demo@local" },
  });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: "demo@local", name: "Demo User" },
  });
}
