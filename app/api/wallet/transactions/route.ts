import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const [wallet, transactions, payments] = await Promise.all([
      prisma.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {}
      }),
      prisma.coinTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.payment.findMany({
        where: { userId: user.id },
        include: { coinPackage: true },
        orderBy: { createdAt: "desc" },
        take: 25
      })
    ]);

    return ok({ wallet, transactions, payments });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch transactions", 400);
  }
}