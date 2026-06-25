import "server-only";
import crypto from "crypto";
import { Prisma, PaymentProvider, PaymentStatus } from "@prisma/client";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { getActiveScheduledDiscount } from "@/lib/discount-campaigns";
import { getMonetizationSettings } from "@/lib/monetization-service";
import { activateSubscription, markSubscriptionFailed } from "@/lib/subscription-service";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status?: string;
  receipt?: string;
};

type RazorpayPayment = {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status?: string;
  method?: string;
  captured?: boolean;
};

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: RazorpayOrder };
  };
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return { keyId, keySecret };
}

export function getPublicRazorpayKey() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

export function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = getRazorpayConfig();
  const digest = crypto
    .createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  const expected = Buffer.from(digest);
  const received = Buffer.from(input.signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Razorpay webhook secret is not configured. Add RAZORPAY_WEBHOOK_SECRET.");
  }

  const digest = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest);
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function createRazorpayCoinOrder(input: {
  userId: string;
  userEmail: string;
  username: string;
  coinPackageId: string;
}) {
  const coinPackage = await prisma.coinPackage.findUnique({ where: { id: input.coinPackageId } });

  if (!coinPackage || !coinPackage.active) {
    throw new Error("Coin package is not available.");
  }

  // Server-side Discount Pricing Calculation
  const settings = await getMonetizationSettings();
  const activeScheduledDiscount = getActiveScheduledDiscount(settings);

  const campaignParts = (coinPackage.campaign || "").split("|");
  const manual = Number(campaignParts[1]) || 0;
  const combined = Number(campaignParts[2]) || 0;
  const scheduled = activeScheduledDiscount?.campaign.percent ?? 0;
  const totalDiscount = manual + combined + scheduled;
  const finalPriceCents = Math.max(0, Math.round(coinPackage.priceCents * (1 - totalDiscount / 100)));

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      coinPackageId: coinPackage.id,
      provider: PaymentProvider.RAZORPAY,
      status: PaymentStatus.CREATED,
      amountCents: finalPriceCents,
      currency: coinPackage.currency,
      coinsAdded: coinPackage.coins + coinPackage.bonusCoins
    }
  });

  const razorpay = getRazorpayClient();
  const order = (await razorpay.orders.create({
    amount: finalPriceCents,
    currency: coinPackage.currency,
    receipt: payment.id.slice(0, 40),
    notes: {
      paymentId: payment.id,
      userId: input.userId,
      packageId: coinPackage.id,
      coins: String(coinPackage.coins + coinPackage.bonusCoins)
    }
  })) as RazorpayOrder;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: order.id,
      status: PaymentStatus.PENDING,
      rawPayload: toJson({ order })
    }
  });

  return {
    paymentId: payment.id,
    keyId: getPublicRazorpayKey(),
    orderId: order.id,
    amount: finalPriceCents,
    currency: coinPackage.currency,
    package: {
      id: coinPackage.id,
      name: coinPackage.name,
      coins: coinPackage.coins,
      bonusCoins: coinPackage.bonusCoins,
      price: finalPriceCents / 100
    },
    prefill: {
      email: input.userEmail,
      name: input.username
    }
  };
}

export async function findPaymentForProcessing(input: { paymentId?: string; orderId?: string; providerPaymentId?: string }) {
  return prisma.payment.findFirst({
    where: {
      provider: PaymentProvider.RAZORPAY,
      OR: [
        input.paymentId ? { id: input.paymentId } : undefined,
        input.orderId ? { providerOrderId: input.orderId } : undefined,
        input.providerPaymentId ? { providerPaymentId: input.providerPaymentId } : undefined
      ].filter(Boolean) as Prisma.PaymentWhereInput[]
    },
    include: { coinPackage: true }
  });
}

export async function creditCoinsForVerifiedPayment(input: {
  paymentId?: string;
  orderId?: string;
  providerPaymentId?: string;
  paymentMethod?: string | null;
  rawPayload: unknown;
}) {
  const payment = await findPaymentForProcessing(input);

  if (!payment) {
    throw new Error("Payment record was not found.");
  }

  if (!payment.coinPackage) {
    throw new Error("Payment is not linked to a coin package.");
  }

  const coinPackage = payment.coinPackage;
  const coinsAdded = coinPackage.coins + coinPackage.bonusCoins;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { not: PaymentStatus.PAID }
      },
      data: {
        status: PaymentStatus.PAID,
        providerOrderId: input.orderId ?? payment.providerOrderId,
        providerPaymentId: input.providerPaymentId ?? payment.providerPaymentId,
        paymentMethod: input.paymentMethod ?? payment.paymentMethod,
        amountCents: payment.amountCents,
        coinsAdded,
        failureReason: null,
        processedAt: new Date(),
        rawPayload: toJson(input.rawPayload)
      }
    });

    if (updated.count === 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId: payment.userId } });
      return {
        status: "already_processed" as const,
        paymentId: payment.id,
        coinsAdded: payment.coinsAdded || coinsAdded,
        walletBalance: wallet?.balance ?? null
      };
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        balance: coinsAdded
      },
      update: {
        balance: { increment: coinsAdded }
      }
    });

    await tx.coinTransaction.create({
      data: {
        userId: payment.userId,
        walletId: wallet.id,
        type: "PURCHASE",
        amount: coinsAdded,
        balanceAfter: wallet.balance,
        description: `Purchased ${coinPackage.name}`,
        referenceId: payment.id,
        metadata: toJson({
          provider: "RAZORPAY",
          orderId: input.orderId ?? payment.providerOrderId,
          paymentId: input.providerPaymentId ?? payment.providerPaymentId,
          paymentMethod: input.paymentMethod,
          packageName: coinPackage.name,
          amountCents: payment.amountCents
        })
      }
    });

    return {
      status: "credited" as const,
      paymentId: payment.id,
      coinsAdded,
      walletBalance: wallet.balance
    };
  });
}

export async function verifyAndCreditRazorpayPayment(input: {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  if (!verifyRazorpayPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature
  })) {
    throw new Error("Invalid Razorpay payment signature.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { coinPackage: true }
  });

  if (!payment || payment.provider !== PaymentProvider.RAZORPAY) {
    throw new Error("Payment record was not found.");
  }

  if (payment.providerOrderId !== input.razorpayOrderId) {
    throw new Error("Payment order mismatch.");
  }

  const razorpay = getRazorpayClient();
  const [order, providerPayment] = await Promise.all([
    razorpay.orders.fetch(input.razorpayOrderId) as Promise<RazorpayOrder>,
    razorpay.payments.fetch(input.razorpayPaymentId) as Promise<RazorpayPayment>
  ]);

  if (providerPayment.order_id !== input.razorpayOrderId) {
    throw new Error("Razorpay payment does not belong to this order.");
  }

  if (providerPayment.amount !== payment.amountCents || providerPayment.currency !== payment.currency) {
    throw new Error("Razorpay payment amount mismatch.");
  }

  const orderPaid = order.status === "paid";
  const paymentCaptured = providerPayment.status === "captured" || providerPayment.captured === true;

  if (!orderPaid && !paymentCaptured) {
    throw new Error("Payment has not been captured yet.");
  }

  return creditCoinsForVerifiedPayment({
    paymentId: payment.id,
    orderId: input.razorpayOrderId,
    providerPaymentId: input.razorpayPaymentId,
    paymentMethod: providerPayment.method ?? null,
    rawPayload: { order, payment: providerPayment, source: "frontend_verify" }
  });
}

export async function markRazorpayPaymentFailed(input: {
  orderId?: string;
  providerPaymentId?: string;
  reason?: string;
  rawPayload: unknown;
}) {
  const payment = await findPaymentForProcessing({
    orderId: input.orderId,
    providerPaymentId: input.providerPaymentId
  });

  if (!payment || payment.status === PaymentStatus.PAID) {
    return { status: "ignored" as const };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      providerPaymentId: input.providerPaymentId ?? payment.providerPaymentId,
      failureReason: input.reason ?? "Payment failed",
      rawPayload: toJson(input.rawPayload)
    }
  });

  return { status: "failed" as const, paymentId: payment.id };
}



function getWebhookEntity(payload: RazorpayWebhookPayload) {
  return payload.payload?.payment?.entity ?? payload.payload?.order?.entity ?? null;
}

function buildWebhookEventId(payload: RazorpayWebhookPayload, rawBody: string) {
  const entity = getWebhookEntity(payload) as { id?: string } | null;
  const base = [payload.event, entity?.id, payload.created_at].filter(Boolean).join(":");
  return base || crypto.createHash("sha256").update(rawBody).digest("hex");
}

export async function handleRazorpayWebhook(rawBody: string, signature: string) {
  if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const eventType = payload.event || "unknown";
  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;
  const orderId = paymentEntity?.order_id ?? orderEntity?.id;
  const providerPaymentId = paymentEntity?.id;
  const eventId = buildWebhookEventId(payload, rawBody);

  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.RAZORPAY,
        eventId,
        eventType,
        orderId,
        paymentId: providerPaymentId,
        rawPayload: toJson(payload)
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "duplicate" as const, eventId };
    }
    throw error;
  }

  let result: unknown = { status: "ignored" };

  if ((eventType === "payment.captured" || eventType === "order.paid") && orderId) {
    const payment = await findPaymentForProcessing({ orderId, providerPaymentId });
    if (payment) {
      if (payment.subscriptionId) {
        result = await activateSubscriptionForVerifiedPayment({
          orderId,
          providerPaymentId,
          paymentMethod: paymentEntity?.method ?? null,
          rawPayload: { ...payload, source: "webhook" }
        });
      } else {
        result = await creditCoinsForVerifiedPayment({
          orderId,
          providerPaymentId,
          paymentMethod: paymentEntity?.method ?? null,
          rawPayload: { ...payload, source: "webhook" }
        });
      }
    } else {
      const subscription = await findSubscriptionForProcessing({ orderId, providerPaymentId });
      if (subscription) {
        result = await activateSubscriptionForVerifiedPayment({
          orderId,
          providerPaymentId,
          paymentMethod: paymentEntity?.method ?? null,
          rawPayload: { ...payload, source: "webhook" }
        });
      }
    }
  }

  if (eventType === "payment.failed") {
    const payment = await findPaymentForProcessing({ orderId, providerPaymentId });
    if (payment) {
      if (payment.subscriptionId) {
        result = await markRazorpaySubscriptionFailed({
          orderId,
          providerPaymentId,
          reason: paymentEntity?.status || "Payment failed",
          rawPayload: { ...payload, source: "webhook" }
        });
      } else {
        result = await markRazorpayPaymentFailed({
          orderId,
          providerPaymentId,
          reason: paymentEntity?.status || "Payment failed",
          rawPayload: { ...payload, source: "webhook" }
        });
      }
    } else {
      const subscription = await findSubscriptionForProcessing({ orderId, providerPaymentId });
      if (subscription) {
        result = await markRazorpaySubscriptionFailed({
          orderId,
          providerPaymentId,
          reason: paymentEntity?.status || "Payment failed",
          rawPayload: { ...payload, source: "webhook" }
        });
      }
    }
  }

  await prisma.paymentWebhookEvent.update({
    where: { eventId },
    data: { processed: true }
  });

  return { status: "processed" as const, eventId, result };
}

// ─────────────────────────────────────────────────────────────
// Subscription helpers
// ─────────────────────────────────────────────────────────────

async function findSubscriptionForProcessing(input: { orderId?: string; providerPaymentId?: string }) {
  return prisma.subscription.findFirst({
    where: {
      provider: PaymentProvider.RAZORPAY,
      OR: [
        input.orderId ? { providerOrderId: input.orderId } : undefined,
        input.providerPaymentId ? { providerPaymentId: input.providerPaymentId } : undefined
      ].filter(Boolean) as Prisma.SubscriptionWhereInput[]
    }
  });
}

async function activateSubscriptionForVerifiedPayment(input: {
  orderId?: string;
  providerPaymentId?: string;
  paymentMethod?: string | null;
  rawPayload: unknown;
}) {
  const subscription = await findSubscriptionForProcessing(input);
  if (!subscription) {
    return { status: "ignored" as const };
  }
  const result = await activateSubscription({
    subscriptionId: subscription.id,
    providerPaymentId: input.providerPaymentId,
    rawPayload: input.rawPayload
  });

  await prisma.payment.updateMany({
    where: {
      subscriptionId: subscription.id,
      status: { not: PaymentStatus.PAID }
    },
    data: {
      status: PaymentStatus.PAID,
      providerPaymentId: input.providerPaymentId,
      paymentMethod: input.paymentMethod,
      processedAt: new Date(),
      rawPayload: toJson(input.rawPayload)
    }
  });

  return result;
}

async function markRazorpaySubscriptionFailed(input: {
  orderId?: string;
  providerPaymentId?: string;
  reason?: string;
  rawPayload: unknown;
}) {
  const subscription = await findSubscriptionForProcessing(input);
  if (!subscription || subscription.status === "ACTIVE") {
    return { status: "ignored" as const };
  }
  await markSubscriptionFailed(subscription.id, input.reason);

  await prisma.payment.updateMany({
    where: {
      subscriptionId: subscription.id,
      status: { not: PaymentStatus.PAID }
    },
    data: {
      status: PaymentStatus.FAILED,
      providerPaymentId: input.providerPaymentId,
      failureReason: input.reason ?? "Payment failed",
      rawPayload: toJson(input.rawPayload)
    }
  });

  return { status: "failed" as const, subscriptionId: subscription.id };
}

export async function createRazorpaySubscriptionOrder(input: {
  userId: string;
  userEmail: string;
  username: string;
  planType: "WEEKLY" | "MONTHLY" | "YEARLY";
}) {
  const { getSubscriptionPlanDetails, createSubscriptionRecord } = await import("@/lib/subscription-service");
  const details = await getSubscriptionPlanDetails(input.planType);

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: PaymentProvider.RAZORPAY,
      status: PaymentStatus.CREATED,
      amountCents: details.discountedPriceCents,
      currency: details.currency,
      coinsAdded: details.totalCoins
    }
  });

  const razorpay = getRazorpayClient();
  const order = (await razorpay.orders.create({
    amount: details.discountedPriceCents,
    currency: details.currency,
    receipt: payment.id.slice(0, 40),
    notes: {
      paymentId: payment.id,
      userId: input.userId,
      planType: input.planType,
      coins: String(details.totalCoins)
    }
  })) as RazorpayOrder;

  const subscription = await createSubscriptionRecord({
    userId: input.userId,
    planType: input.planType,
    details,
    provider: PaymentProvider.RAZORPAY,
    providerOrderId: order.id,
    amountCents: details.discountedPriceCents
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: order.id,
      status: PaymentStatus.PENDING,
      subscriptionId: subscription.id,
      rawPayload: toJson({ order, subscriptionId: subscription.id })
    }
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      rawPayload: toJson({ order, paymentId: payment.id })
    }
  });

  return {
    paymentId: payment.id,
    subscriptionId: subscription.id,
    keyId: getPublicRazorpayKey(),
    orderId: order.id,
    amount: details.discountedPriceCents,
    currency: details.currency,
    plan: {
      type: input.planType,
      dailyCoins: details.dailyCoins,
      periodDays: details.periodDays,
      totalCoins: details.totalCoins,
      price: details.discountedPriceCents / 100
    },
    prefill: {
      email: input.userEmail,
      name: input.username
    }
  };
}

export async function verifyAndCreditRazorpaySubscription(input: {
  paymentId: string;
  subscriptionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  if (!verifyRazorpayPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature
  })) {
    throw new Error("Invalid Razorpay payment signature.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId }
  });

  if (!payment || payment.provider !== PaymentProvider.RAZORPAY) {
    throw new Error("Payment record was not found.");
  }

  if (payment.providerOrderId !== input.razorpayOrderId) {
    throw new Error("Payment order mismatch.");
  }

  const razorpay = getRazorpayClient();
  const [order, providerPayment] = await Promise.all([
    razorpay.orders.fetch(input.razorpayOrderId) as Promise<RazorpayOrder>,
    razorpay.payments.fetch(input.razorpayPaymentId) as Promise<RazorpayPayment>
  ]);

  if (providerPayment.order_id !== input.razorpayOrderId) {
    throw new Error("Razorpay payment does not belong to this order.");
  }

  if (providerPayment.amount !== payment.amountCents || providerPayment.currency !== payment.currency) {
    throw new Error("Razorpay payment amount mismatch.");
  }

  const orderPaid = order.status === "paid";
  const paymentCaptured = providerPayment.status === "captured" || providerPayment.captured === true;

  if (!orderPaid && !paymentCaptured) {
    throw new Error("Payment has not been captured yet.");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      providerPaymentId: input.razorpayPaymentId,
      paymentMethod: providerPayment.method ?? null,
      processedAt: new Date(),
      rawPayload: toJson({ order, payment: providerPayment, source: "frontend_verify_subscription" })
    }
  });

  const { activateSubscription } = await import("@/lib/subscription-service");
  return activateSubscription({
    subscriptionId: input.subscriptionId,
    providerPaymentId: input.razorpayPaymentId,
    rawPayload: { order, payment: providerPayment, source: "frontend_verify" }
  });
}
