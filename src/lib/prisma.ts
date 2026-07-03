import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

// Neon's HTTP driver works over HTTPS (port 443), which makes it usable both
// on serverless hosts and in sandboxed environments where raw Postgres
// connections (port 5432) are blocked.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL ?? "", {});
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
