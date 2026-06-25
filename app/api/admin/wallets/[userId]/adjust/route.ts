import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { action, amount, description = "" } = body;

    if (!action || amount === undefined || isNaN(Number(amount))) {
      return fail("Action (credit, debit, set) and amount (number) are required.", 400);
    }

    const changeAmount = Number(amount);
    if (changeAmount < 0 && (action === "credit" || action === "debit")) {
      return fail("Amount must be positive.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user) {
      return fail("User not found.", 404);
    }

    let wallet = user.wallet;
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let balanceDelta = 0;
      let newBalance = wallet.balance;

      if (action === "credit") {
        balanceDelta = changeAmount;
        newBalance = wallet.balance + changeAmount;
      } else if (action === "debit") {
        balanceDelta = -changeAmount;
        newBalance = Math.max(0, wallet.balance - changeAmount);
      } else if (action === "set") {
        newBalance = Math.max(0, changeAmount);
        balanceDelta = newBalance - wallet.balance;
      } else {
        throw new Error("INVALID_ACTION");
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance }
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: "ADJUSTMENT",
          amount: balanceDelta,
          balanceAfter: newBalance,
          description: description || `Admin wallet adjustment: ${action}`,
          metadata: { adminId: admin.id, action }
        }
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "WALLET_ADJUST",
          target: userId,
          metadata: { action, amount: changeAmount, balanceDelta, previousBalance: wallet.balance, newBalance }
        }
      });

      return updatedWallet;
    });

    return ok({ message: "Wallet balance adjusted successfully.", balance: result.balance });
  } catch (error) {
    console.error("[wallet-adjust-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to adjust wallet.", 500);
  }
}
