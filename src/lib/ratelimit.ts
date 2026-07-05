import { prisma } from "@/lib/prisma";

// Best-effort fixed-window rate limiter backed by the DB (one atomic upsert).
// Returns true when the request is allowed, false when the limit is exceeded.
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds})
          THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds})
          THEN now() ELSE "RateLimit"."windowStart" END
      RETURNING "count"
    `;
    const count = rows[0]?.count ?? 1;
    return count <= limit;
  } catch {
    // If the limiter itself fails, don't lock users out.
    return true;
  }
}

// Best-effort client IP from proxy headers.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function tooManyRequests(message = "Too many attempts. Please wait a bit and try again.") {
  return Response.json({ error: message }, { status: 429 });
}
