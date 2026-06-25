import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { paymentId } = await params;
    const body = await request.json();
    const { action } = body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { include: { wallet: true } } }
    });

    if (!payment) {
      return fail("Payment not found.", 404);
    }

    if (action === "approve") {
      if (payment.status !== "PAID") {
        return fail("Only paid payments can be refunded.", 400);
      }

      const coinsToDeduct = payment.coinsAdded;
      const wallet = payment.user.wallet;

      if (!wallet) {
        return fail("User does not have a wallet.", 400);
      }

      await prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "REFUNDED",
            rawPayload: {
              ...(typeof payment.rawPayload === "object" ? payment.rawPayload : {}),
              refundStatus: "APPROVED",
              refundedAt: new Date().toISOString()
            }
          }
        });

        // Deduct coins from user's wallet
        const updatedWallet = await tx.wallet.update({
          where: { userId: payment.userId },
          data: {
            balance: { decrement: coinsToDeduct }
          }
        });

        // Create transaction ledger record
        await tx.coinTransaction.create({
          data: {
            userId: payment.userId,
            walletId: wallet.id,
            type: "REFUND",
            amount: -coinsToDeduct,
            balanceAfter: updatedWallet.balance,
            description: `Refunded payment for package`,
            referenceId: payment.id
          }
        });

        // Log admin audit trail
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "PAYMENT_REFUND_APPROVE",
            target: paymentId,
            metadata: { userId: payment.userId, coinsRefunded: coinsToDeduct }
          }
        });
      });

      return ok({ message: "Refund approved and coins deducted successfully." });
    } else if (action === "reject") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            rawPayload: {
              ...(typeof payment.rawPayload === "object" ? payment.rawPayload : {}),
              refundRequested: false,
              refundStatus: "REJECTED"
            }
          }
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "PAYMENT_REFUND_REJECT",
            target: paymentId,
            metadata: { userId: payment.userId }
          }
        });
      });

      return ok({ message: "Refund request rejected successfully." });
    }

    return fail("Invalid action.", 400);
  } catch (error) {
    console.error("[refund-payment-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to process refund.", 500);
  }
}
