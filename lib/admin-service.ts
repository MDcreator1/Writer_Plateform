import "server-only";
import { Prisma } from "@prisma/client";
import { getActiveCoinPackageCards, getPublishedStoryCards } from "@/lib/content-service";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export async function getAdminDashboardData(searchQuery = "") {
  const query = searchQuery.trim();
  const searchWhere: Prisma.PaymentWhereInput = query
    ? {
        OR: [
          { providerOrderId: { contains: query, mode: "insensitive" } },
          { providerPaymentId: { contains: query, mode: "insensitive" } },
          { user: { email: { contains: query, mode: "insensitive" } } },
          { user: { username: { contains: query, mode: "insensitive" } } },
          { user: { displayName: { contains: query, mode: "insensitive" } } }
        ]
      }
    : {};

  const [usersCount, activeUsersCount, paidAggregate, successfulPayments, failedPayments, payments, stories, coinPackages] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true, coinsAdded: true } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.findMany({
      where: searchWhere,
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    getPublishedStoryCards(8),
    getActiveCoinPackageCards()
  ]);

  return {
    analytics: {
      totalUsers: usersCount,
      activeUsers: activeUsersCount,
      totalRevenue: (paidAggregate._sum.amountCents || 0) / 100,
      totalCoinSales: paidAggregate._sum.coinsAdded || 0,
      successfulPayments,
      failedPayments
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      user: payment.user.displayName || payment.user.username,
      email: payment.user.email,
      orderId: payment.providerOrderId || "-",
      paymentId: payment.providerPaymentId || "-",
      packageName: payment.coinPackage?.name || "Coin package",
      amountPaid: payment.amountCents / 100,
      coinsReceived: payment.coinsAdded || ((payment.coinPackage?.coins || 0) + (payment.coinPackage?.bonusCoins || 0)),
      method: payment.paymentMethod || "Razorpay",
      status: payment.status.toLowerCase(),
      date: formatDate(payment.createdAt)
    })),
    stories,
    coinPackages
  };
}