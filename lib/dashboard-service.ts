import "server-only";
import { PaymentStatus } from "@prisma/client";
import { getPublishedStoryCards } from "@/lib/content-service";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function formatStatus(status: PaymentStatus) {
  if (status === "PAID") return "success";
  if (status === "FAILED") return "failed";
  return status.toLowerCase();
}

export async function getReaderDashboardData(userId: string) {
  const [wallet, payments, transactions, purchases, bookmarkCount, stories] = await Promise.all([
    prisma.wallet.upsert({ where: { userId }, create: { userId, balance: 0 }, update: {} }),
    prisma.payment.findMany({
      where: { userId },
      include: { coinPackage: true },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.coinTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.purchase.findMany({
      where: { userId },
      include: { chapter: { include: { story: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.bookmark.count({ where: { userId } }),
    getPublishedStoryCards(3)
  ]);

  return {
    walletBalance: wallet.balance,
    accountStats: {
      purchasedChapters: purchases.length,
      favoriteStories: bookmarkCount,
      readingHours: Math.max(1, transactions.length * 2)
    },
    purchasedChapters: purchases.map((purchase) => ({
      id: purchase.id,
      story: purchase.chapter.story.title,
      chapter: purchase.chapter.title,
      coins: purchase.coinCost,
      date: formatDate(purchase.createdAt)
    })),
    paymentHistory: payments.map((payment) => ({
      id: payment.id,
      date: formatDate(payment.createdAt),
      packageName: payment.coinPackage?.name || "Coin package",
      paymentMethod: payment.paymentMethod || "Razorpay",
      amountPaid: payment.amountCents / 100,
      coinsReceived: payment.coinsAdded || ((payment.coinPackage?.coins || 0) + (payment.coinPackage?.bonusCoins || 0)),
      status: formatStatus(payment.status)
    })),
    coinEvents: transactions.map((transaction) => ({
      id: transaction.id,
      label: transaction.description,
      amount: transaction.amount,
      date: formatDate(transaction.createdAt)
    })),
    stories
  };
}