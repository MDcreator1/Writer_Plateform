import "server-only";
import { PaymentStatus } from "@prisma/client";
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
  const [wallet, payments, transactions, purchases, bookmarkCount, bookmarks, readingHistory, activeSubscription] = await Promise.all([
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
    prisma.bookmark.findMany({
      where: { userId },
      include: { story: true, chapter: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.readingHistory.findMany({
      where: { userId },
      include: { story: true, chapter: true },
      orderBy: { lastReadAt: "desc" },
      take: 3
    }),
    prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() }
      },
      orderBy: { expiresAt: "desc" }
    })
  ]);

  const allSubscriptions = await prisma.subscription.findMany({
    where: { userId }
  });
  const subscriptionMap = new Map(allSubscriptions.map((s) => [s.id, s.planType]));

  return {
    walletBalance: wallet.balance,
    accountStats: {
      purchasedChapters: purchases.length,
      favoriteStories: bookmarkCount
    },
    purchasedChapters: purchases.map((purchase) => ({
      id: purchase.id,
      slug: purchase.chapter.story.slug,
      story: purchase.chapter.story.title,
      cover: purchase.chapter.story.coverUrl,
      chapter: purchase.chapter.title,
      chapterNumber: purchase.chapter.number,
      coins: purchase.coinCost,
      date: formatDate(purchase.createdAt)
    })),
    paymentHistory: payments.map((payment) => {
      let packageName = payment.coinPackage?.name || "Coin package";
      if (payment.subscriptionId) {
        const plan = subscriptionMap.get(payment.subscriptionId);
        if (plan) {
          packageName = `${plan.charAt(0) + plan.slice(1).toLowerCase()} Pass`;
        } else {
          packageName = "Subscription Pass";
        }
      }

      return {
        id: payment.id,
        date: formatDate(payment.createdAt),
        packageName,
        provider: payment.provider,
        paymentMethod: payment.paymentMethod,
        amountPaid: payment.amountCents / 100,
        coinsReceived: payment.coinsAdded || ((payment.coinPackage?.coins || 0) + (payment.coinPackage?.bonusCoins || 0)),
        status: formatStatus(payment.status)
      };
    }),
    coinEvents: transactions.map((transaction) => ({
      id: transaction.id,
      label: transaction.description,
      amount: transaction.amount,
      date: formatDate(transaction.createdAt)
    })),
    favorites: bookmarks.map((b) => ({
      id: b.id,
      slug: b.story.slug,
      title: b.story.title,
      cover: b.story.coverUrl,
      genre: b.story.genre,
      rating: b.story.ratingAverage,
      chapterNumber: b.chapter.number,
      chapterTitle: b.chapter.title,
      date: formatDate(b.createdAt)
    })),
    readingHistory: readingHistory.map((history) => ({
      id: history.id,
      slug: history.story.slug,
      title: history.story.title,
      cover: history.story.coverUrl,
      chapterNumber: history.chapter.number,
      chapterTitle: history.chapter.title,
      progress: history.progressPct
    })),
    activeSubscription: activeSubscription ? {
      planType: activeSubscription.planType,
      expiresAt: formatDate(activeSubscription.expiresAt!),
      dailyCoins: activeSubscription.dailyCoins
    } : null
  };
}