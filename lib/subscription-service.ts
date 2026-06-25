import "server-only";
import { Prisma, PaymentProvider, PaymentStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMonetizationSettings } from "@/lib/monetization-service";

export type SubscriptionPlanType = "WEEKLY" | "MONTHLY" | "YEARLY";

export type SubscriptionDetails = {
  planType: SubscriptionPlanType;
  dailyCoins: number;
  periodDays: number;
  totalCoins: number;
  basePriceCents: number;
  discountedPriceCents: number;
  currency: string;
};

const PLAN_DAYS: Record<SubscriptionPlanType, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  YEARLY: 365
};

export async function getSubscriptionPlanDetails(
  planType: SubscriptionPlanType
): Promise<SubscriptionDetails> {
  const settings = await getMonetizationSettings();
  const dailyCoins = settings.subCoinsPerDay ?? 10;

  const basePriceCents =
    planType === "WEEKLY"
      ? (settings.weeklyBasePrice ?? 150) * 100
      : planType === "MONTHLY"
      ? (settings.monthlyBasePrice ?? 450) * 100
      : (settings.yearlyBasePrice ?? 3600) * 100;

  const discountPercent =
    planType === "MONTHLY"
      ? (settings.monthlyUpgradeDiscount ?? 10)
      : planType === "YEARLY"
      ? (settings.yearlyUpgradeDiscount ?? 25)
      : 0;

  const discountedPriceCents = Math.max(
    0,
    Math.round(basePriceCents * (1 - discountPercent / 100))
  );

  const periodDays = PLAN_DAYS[planType];
  const totalCoins = dailyCoins * periodDays;

  return {
    planType,
    dailyCoins,
    periodDays,
    totalCoins,
    basePriceCents,
    discountedPriceCents,
    currency: "INR"
  };
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    },
    orderBy: { expiresAt: "desc" }
  });
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const count = await prisma.subscription.count({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    }
  });
  return count > 0;
}

export async function expireSubscriptions() {
  const now = new Date();
  const result = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now }
    },
    data: { status: "EXPIRED" }
  });
  return result.count;
}

export async function getSubscriptionStats() {
  const now = new Date();
  const [
    totalActive,
    totalExpired,
    weeklyActive,
    monthlyActive,
    yearlyActive,
    totalRevenue
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
    prisma.subscription.count({ where: { status: "EXPIRED" } }),
    prisma.subscription.count({ where: { status: "ACTIVE", planType: "WEEKLY", expiresAt: { gt: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", planType: "MONTHLY", expiresAt: { gt: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", planType: "YEARLY", expiresAt: { gt: now } } }),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { amountCents: true }
    })
  ]);

  return {
    totalActive,
    totalExpired,
    weeklyActive,
    monthlyActive,
    yearlyActive,
    totalRevenue: (totalRevenue._sum.amountCents ?? 0) / 100
  };
}

export async function createSubscriptionRecord(input: {
  userId: string;
  planType: SubscriptionPlanType;
  details: SubscriptionDetails;
  provider: PaymentProvider;
  providerOrderId: string;
  amountCents: number;
}) {
  return prisma.subscription.create({
    data: {
      userId: input.userId,
      planType: input.planType as SubscriptionPlan,
      status: "PENDING",
      dailyCoins: input.details.dailyCoins,
      periodDays: input.details.periodDays,
      provider: input.provider,
      providerOrderId: input.providerOrderId,
      amountCents: input.amountCents,
      currency: input.details.currency
    }
  });
}

export async function activateSubscription(input: {
  subscriptionId: string;
  providerPaymentId?: string;
  rawPayload?: unknown;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: input.subscriptionId }
  });

  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  if (subscription.status === "ACTIVE") {
    return { status: "already_active" as const, subscription };
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + subscription.periodDays);

  const totalCoins = subscription.dailyCoins * subscription.periodDays;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.updateMany({
      where: {
        id: subscription.id,
        status: { not: "ACTIVE" }
      },
      data: {
        status: "ACTIVE",
        providerPaymentId: input.providerPaymentId ?? subscription.providerPaymentId,
        startedAt: now,
        expiresAt,
        totalCoinsCredited: totalCoins,
        rawPayload: input.rawPayload
          ? (JSON.parse(JSON.stringify(input.rawPayload)) as Prisma.InputJsonValue)
          : (subscription.rawPayload as Prisma.InputJsonValue)
      }
    });

    if (updated.count === 0) {
      const existing = await tx.subscription.findUnique({ where: { id: subscription.id } });
      return { status: "already_active" as const, subscription: existing };
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: subscription.userId },
      create: {
        userId: subscription.userId,
        balance: totalCoins
      },
      update: {
        balance: { increment: totalCoins }
      }
    });

    await tx.coinTransaction.create({
      data: {
        userId: subscription.userId,
        walletId: wallet.id,
        type: "SUBSCRIPTION",
        amount: totalCoins,
        balanceAfter: wallet.balance,
        description: `${subscription.planType} subscription — ${subscription.periodDays} days, ${totalCoins} coins`,
        referenceId: subscription.id,
        metadata: JSON.parse(
          JSON.stringify({
            provider: subscription.provider,
            orderId: subscription.providerOrderId,
            paymentId: input.providerPaymentId,
            planType: subscription.planType,
            periodDays: subscription.periodDays,
            dailyCoins: subscription.dailyCoins
          })
        ) as Prisma.InputJsonValue
      }
    });

    return {
      status: "activated" as const,
      subscriptionId: subscription.id,
      coinsCredited: totalCoins,
      walletBalance: wallet.balance,
      expiresAt
    };
  });
}

export async function markSubscriptionFailed(subscriptionId: string, reason?: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "FAILED",
      rawPayload: { failureReason: reason ?? "Payment failed" } as Prisma.InputJsonValue
    }
  });
}

export async function getUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}
