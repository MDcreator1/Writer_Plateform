import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const verifications = await prisma.phoneVerification.findMany({
      include: {
        user: { select: { id: true, username: true, displayName: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formatted = verifications.map((v) => ({
      id: v.id,
      phoneNumber: v.phoneNumber,
      attempts: v.attempts,
      verified: v.verified,
      expiresAt: v.expiresAt.toISOString(),
      createdAt: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(v.createdAt),
      user: v.user ? (v.user.displayName || v.user.username) : "Anonymous",
      userId: v.userId || null,
      isAbusive: v.attempts >= 3
    }));

    return ok(formatted);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch phone verifications.", 500);
  }
}
