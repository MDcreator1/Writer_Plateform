import "server-only";
import crypto from "crypto";
import { Prisma, PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMonetizationSettings } from "@/lib/monetization-service";
import { getActiveScheduledDiscount } from "@/lib/discount-campaigns";

// ─────────────────────────────────────────────────────────────
// Config & Helpers
// ─────────────────────────────────────────────────────────────

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const environment = process.env.CASHFREE_ENVIRONMENT || "sandbox";

  if (!appId || !secretKey) {
    throw new Error("Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY.");
  }

  const baseUrl =
    environment === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return { appId, secretKey, baseUrl };
}

export function getPublicCashfreeAppId() {
  return process.env.NEXT_PUBLIC_CASHFREE_APP_ID || process.env.CASHFREE_APP_ID || "";
}

export function getCashfreeEnvironment() {
  return process.env.CASHFREE_ENVIRONMENT || "sandbox";
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function cashfreeRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const { appId, secretKey, baseUrl } = getCashfreeConfig();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "x-api-version": "2023-08-01",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.message || data?.error || "Cashfree API error";
    throw new Error(msg);
  }

  return data as T;
}

// ─────────────────────────────────────────────────────────────
// Webhook Signature Verification
// ─────────────────────────────────────────────────────────────

/**
 * Cashfree webhook signature: HMAC-SHA256 over (timestamp + rawBody)
 * Header: x-webhook-signature (base64)
 * Header: x-webhook-timestamp (unix seconds)
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const { secretKey } = getCashfreeConfig();
  const message = timestamp + rawBody;
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  try {
    const expBuf = Buffer.from(expected);
    const recBuf = Buffer.from(signature);
    return expBuf.length === recBuf.length && crypto.timingSafeEqual(expBuf, recBuf);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Coin Purchase — Create Order
// ─────────────────────────────────────────────────────────────

export async function createCashfreeCoinOrder(input: {
  userId: string;
  userEmail: string;
  username: string;
  userPhone?: string | null;
  coinPackageId: string;
  paymentMode: "UPI" | "CARD";
}) {
  const coinPackage = await prisma.coinPackage.findUnique({
    where: { id: input.coinPackageId },
  });

  if (!coinPackage || !coinPackage.active) {
    throw new Error("Coin package is not available.");
  }

  // Server-side discount calculation (same as Razorpay)
  const settings = await getMonetizationSettings();
  const activeScheduledDiscount = getActiveScheduledDiscount(settings);
  const campaignParts = (coinPackage.campaign || "").split("|");
  const manual = Number(campaignParts[1]) || 0;
  const combined = Number(campaignParts[2]) || 0;
  const scheduled = activeScheduledDiscount?.campaign.percent ?? 0;
  const totalDiscount = manual + combined + scheduled;
  const finalPriceCents = Math.max(
    0,
    Math.round(coinPackage.priceCents * (1 - totalDiscount / 100))
  );

  // Create internal payment record
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      coinPackageId: coinPackage.id,
      provider: PaymentProvider.CASHFREE,
      status: PaymentStatus.CREATED,
      amountCents: finalPriceCents,
      currency: coinPackage.currency,
      coinsAdded: coinPackage.coins + coinPackage.bonusCoins,
    },
  });

  // Create Cashfree order
  const cfOrder = await cashfreeRequest<{
    cf_order_id: string;
    order_id: string;
    payment_session_id: string;
    order_status: string;
  }>("POST", "/orders", {
    order_id: `cf_${payment.id}`,
    order_amount: finalPriceCents / 100, // Cashfree uses rupees (float)
    order_currency: coinPackage.currency,
    customer_details: {
      customer_id: input.userId,
      customer_email: input.userEmail,
      customer_name: input.username,
      customer_phone: input.userPhone || "9999999999",
    },
    order_meta: {
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/cashfree/webhook`,
      payment_methods: input.paymentMode === "UPI" ? "upi" : "cc,dc,nb",
    },
    order_note: `${coinPackage.name} — ${coinPackage.coins + coinPackage.bonusCoins} coins`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: cfOrder.order_id,
      status: PaymentStatus.PENDING,
      rawPayload: toJson({ cfOrder, paymentMode: input.paymentMode }),
    },
  });

  return {
    paymentId: payment.id,
    cfOrderId: cfOrder.order_id,
    paymentSessionId: cfOrder.payment_session_id,
    amount: finalPriceCents / 100,
    currency: coinPackage.currency,
    paymentMode: input.paymentMode,
    appId: getPublicCashfreeAppId(),
    environment: getCashfreeEnvironment(),
    package: {
      id: coinPackage.id,
      name: coinPackage.name,
      coins: coinPackage.coins,
      bonusCoins: coinPackage.bonusCoins,
      price: finalPriceCents / 100,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Subscription — Create Order
// ─────────────────────────────────────────────────────────────

export async function createCashfreeSubscriptionOrder(input: {
  userId: string;
  userEmail: string;
  username: string;
  userPhone?: string | null;
  planType: "WEEKLY" | "MONTHLY" | "YEARLY";
  paymentMode: "UPI" | "CARD";
}) {
  const { getSubscriptionPlanDetails, createSubscriptionRecord } = await import(
    "@/lib/subscription-service"
  );
  const details = await getSubscriptionPlanDetails(input.planType);

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: PaymentProvider.CASHFREE,
      status: PaymentStatus.CREATED,
      amountCents: details.discountedPriceCents,
      currency: details.currency,
      coinsAdded: details.totalCoins,
    },
  });

  const cfOrder = await cashfreeRequest<{
    cf_order_id: string;
    order_id: string;
    payment_session_id: string;
    order_status: string;
  }>("POST", "/orders", {
    order_id: `cfsub_${payment.id}`,
    order_amount: details.discountedPriceCents / 100,
    order_currency: details.currency,
    customer_details: {
      customer_id: input.userId,
      customer_email: input.userEmail,
      customer_name: input.username,
      customer_phone: input.userPhone || "9999999999",
    },
    order_meta: {
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/cashfree/webhook`,
      payment_methods: input.paymentMode === "UPI" ? "upi" : "cc,dc,nb",
    },
    order_note: `${input.planType} Subscription — ${details.periodDays} days, ${details.totalCoins} coins`,
  });

  const subscription = await createSubscriptionRecord({
    userId: input.userId,
    planType: input.planType,
    details,
    provider: PaymentProvider.CASHFREE,
    providerOrderId: cfOrder.order_id,
    amountCents: details.discountedPriceCents,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: cfOrder.order_id,
      status: PaymentStatus.PENDING,
      subscriptionId: subscription.id,
      rawPayload: toJson({ cfOrder, subscriptionId: subscription.id, paymentMode: input.paymentMode }),
    },
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { rawPayload: toJson({ cfOrder, paymentId: payment.id }) },
  });

  return {
    paymentId: payment.id,
    subscriptionId: subscription.id,
    cfOrderId: cfOrder.order_id,
    paymentSessionId: cfOrder.payment_session_id,
    amount: details.discountedPriceCents / 100,
    currency: details.currency,
    paymentMode: input.paymentMode,
    appId: getPublicCashfreeAppId(),
    environment: getCashfreeEnvironment(),
    plan: {
      type: input.planType,
      dailyCoins: details.dailyCoins,
      periodDays: details.periodDays,
      totalCoins: details.totalCoins,
      price: details.discountedPriceCents / 100,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Payment Verification & Coin Credit
// ─────────────────────────────────────────────────────────────

type CashfreeOrderDetail = {
  order_id: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED";
  cf_order_id: string;
  order_amount: number;
  order_currency: string;
};

export async function verifyCashfreePayment(input: {
  paymentId: string;
  cfOrderId: string;
}) {
  // Fetch order status from Cashfree
  const cfOrder = await cashfreeRequest<CashfreeOrderDetail>(
    "GET",
    `/orders/${input.cfOrderId}`
  );

  if (cfOrder.order_status !== "PAID") {
    throw new Error(`Payment not completed. Status: ${cfOrder.order_status}`);
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      provider: PaymentProvider.CASHFREE,
    },
    include: { coinPackage: true },
  });

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  if (payment.status === PaymentStatus.PAID) {
    const wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
    return {
      status: "already_processed" as const,
      paymentId: payment.id,
      coinsAdded: payment.coinsAdded || 0,
      walletBalance: wallet?.balance ?? null,
    };
  }

  const coinsAdded = payment.coinsAdded || (payment.coinPackage
    ? payment.coinPackage.coins + payment.coinPackage.bonusCoins
    : 0);

  if (payment.subscriptionId) {
    // Subscription payment — activate subscription
    const { activateSubscription } = await import("@/lib/subscription-service");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: cfOrder.cf_order_id,
        processedAt: new Date(),
        rawPayload: toJson({ cfOrder, source: "cashfree_verify" }),
      },
    });
    return activateSubscription({
      subscriptionId: payment.subscriptionId,
      providerPaymentId: cfOrder.cf_order_id,
      rawPayload: { cfOrder, source: "cashfree_verify" },
    });
  }

  // Coin purchase — credit coins
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: PaymentStatus.PAID } },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: cfOrder.cf_order_id,
        coinsAdded,
        processedAt: new Date(),
        rawPayload: toJson({ cfOrder, source: "cashfree_verify" }),
      },
    });

    if (updated.count === 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId: payment.userId } });
      return {
        status: "already_processed" as const,
        paymentId: payment.id,
        coinsAdded: payment.coinsAdded || coinsAdded,
        walletBalance: wallet?.balance ?? null,
      };
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: payment.userId },
      create: { userId: payment.userId, balance: coinsAdded },
      update: { balance: { increment: coinsAdded } },
    });

    await tx.coinTransaction.create({
      data: {
        userId: payment.userId,
        walletId: wallet.id,
        type: "PURCHASE",
        amount: coinsAdded,
        balanceAfter: wallet.balance,
        description: `Purchased ${payment.coinPackage?.name || "coin package"}`,
        referenceId: payment.id,
        metadata: toJson({
          provider: "CASHFREE",
          orderId: cfOrder.order_id,
          paymentId: cfOrder.cf_order_id,
          paymentMode: payment.paymentMethod,
          amountCents: payment.amountCents,
        }),
      },
    });

    return {
      status: "credited" as const,
      paymentId: payment.id,
      coinsAdded,
      walletBalance: wallet.balance,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────

export async function handleCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string
) {
  // Signature verification
  if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
    throw new Error("Invalid Cashfree webhook signature.");
  }

  const payload = JSON.parse(rawBody);
  const eventType: string = payload?.type || payload?.event_type || "";
  const orderData = payload?.data?.order || payload?.order || {};
  const cfOrderId: string = orderData?.order_id || "";
  const orderStatus: string = orderData?.order_status || payload?.order_status || "";

  if (!cfOrderId) {
    return { status: "ignored", reason: "no order_id" };
  }

  // Find payment by cfOrderId (stored as providerOrderId)
  const payment = await prisma.payment.findFirst({
    where: { provider: PaymentProvider.CASHFREE, providerOrderId: cfOrderId },
    include: { coinPackage: true },
  });

  if (!payment) {
    return { status: "ignored", reason: "payment not found" };
  }

  if (
    eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
    orderStatus === "PAID"
  ) {
    if (payment.status === PaymentStatus.PAID) {
      return { status: "duplicate", paymentId: payment.id };
    }

    const coinsAdded =
      payment.coinsAdded ||
      (payment.coinPackage
        ? payment.coinPackage.coins + payment.coinPackage.bonusCoins
        : 0);

    if (payment.subscriptionId) {
      const { activateSubscription } = await import("@/lib/subscription-service");
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          processedAt: new Date(),
          rawPayload: toJson({ payload, source: "cashfree_webhook" }),
        },
      });
      return activateSubscription({
        subscriptionId: payment.subscriptionId,
        rawPayload: { payload, source: "cashfree_webhook" },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.PAID } },
        data: {
          status: PaymentStatus.PAID,
          coinsAdded,
          processedAt: new Date(),
          rawPayload: toJson({ payload, source: "cashfree_webhook" }),
        },
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: coinsAdded },
        update: { balance: { increment: coinsAdded } },
      });

      await tx.coinTransaction.create({
        data: {
          userId: payment.userId,
          walletId: wallet.id,
          type: "PURCHASE",
          amount: coinsAdded,
          balanceAfter: wallet.balance,
          description: `Purchased ${payment.coinPackage?.name || "coin package"}`,
          referenceId: payment.id,
          metadata: toJson({
            provider: "CASHFREE",
            orderId: cfOrderId,
            source: "webhook",
          }),
        },
      });
    });

    return { status: "credited", paymentId: payment.id };
  }

  if (
    eventType === "PAYMENT_FAILED_WEBHOOK" ||
    orderStatus === "EXPIRED"
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: payload?.data?.payment?.payment_message || "Payment failed",
        rawPayload: toJson({ payload, source: "cashfree_webhook" }),
      },
    });
    return { status: "failed", paymentId: payment.id };
  }

  return { status: "ignored", eventType };
}
