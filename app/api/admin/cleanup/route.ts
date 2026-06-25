import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireSubscriptions } from "@/lib/subscription-service";

export async function POST() {
  try {
    await requireAdmin();

    const now = new Date();
    const expiryCutoff = new Date(now);
    expiryCutoff.setHours(expiryCutoff.getHours() - 24);

    // Expire old pending payments
    const expiredPayments = await prisma.payment.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lte: expiryCutoff }
      },
      data: {
        status: "FAILED",
        rawPayload: { failureReason: "Auto-expired after 24 hours of inactivity" }
      }
    });

    // Expire old pending subscriptions
    const expiredSubscriptions = await prisma.subscription.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lte: expiryCutoff }
      },
      data: {
        status: "FAILED",
        rawPayload: { failureReason: "Auto-expired after 24 hours of inactivity" }
      }
    });

    // Expire active subscriptions past their end date
    const expiredActiveSubs = await expireSubscriptions();

    return ok({
      expiredPayments: expiredPayments.count,
      expiredSubscriptions: expiredSubscriptions.count,
      expiredActiveSubscriptions: expiredActiveSubs,
      message: "Cleanup completed successfully."
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Cleanup failed", 500);
  }
}
