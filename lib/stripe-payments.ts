import "server-only";
import { Prisma, PaymentProvider, PaymentStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY.");
  }
  return { secretKey };
}

export function getPublicStripeKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}

function getStripeClient() {
  const { secretKey } = getStripeConfig();
  return new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createStripeCoinCheckout(input: {
  userId: string;
  coinPackageId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const coinPackage = await prisma.coinPackage.findUnique({
    where: { id: input.coinPackageId }
  });

  if (!coinPackage || !coinPackage.active) {
    throw new Error("Coin package is not available.");
  }

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.CREATED,
      amountCents: coinPackage.priceCents,
      currency: coinPackage.currency,
      coinsAdded: coinPackage.coins + coinPackage.bonusCoins
    }
  });

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: coinPackage.currency.toLowerCase(),
          product_data: {
            name: coinPackage.name,
            description: `${coinPackage.coins} coins${coinPackage.bonusCoins > 0 ? ` + ${coinPackage.bonusCoins} bonus` : ""}`
          },
          unit_amount: coinPackage.priceCents
        },
        quantity: 1
      }
    ],
    mode: "payment",
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    metadata: {
      paymentId: payment.id,
      userId: input.userId,
      packageId: coinPackage.id
    }
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PENDING,
      providerOrderId: session.id,
      rawPayload: toJson({ session })
    }
  });

  return {
    paymentId: payment.id,
    url: session.url,
    amount: coinPackage.priceCents,
    currency: coinPackage.currency,
    package: {
      id: coinPackage.id,
      name: coinPackage.name,
      coins: coinPackage.coins,
      bonusCoins: coinPackage.bonusCoins,
      price: coinPackage.priceCents / 100
    }
  };
}

export async function createStripeSubscriptionCheckout(input: {
  userId: string;
  planType: "WEEKLY" | "MONTHLY" | "YEARLY";
  successUrl: string;
  cancelUrl: string;
}) {
  const { getSubscriptionPlanDetails, createSubscriptionRecord } = await import("@/lib/subscription-service");
  const details = await getSubscriptionPlanDetails(input.planType);

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.CREATED,
      amountCents: details.discountedPriceCents,
      currency: details.currency,
      coinsAdded: details.totalCoins
    }
  });

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: details.currency.toLowerCase(),
          product_data: {
            name: `${input.planType} Subscription`,
            description: `${details.periodDays} days · ${details.dailyCoins} coins/day · ${details.totalCoins} total coins`
          },
          unit_amount: details.discountedPriceCents
        },
        quantity: 1
      }
    ],
    mode: "payment",
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    metadata: {
      paymentId: payment.id,
      userId: input.userId,
      planType: input.planType
    }
  });

  const subscription = await createSubscriptionRecord({
    userId: input.userId,
    planType: input.planType,
    details,
    provider: PaymentProvider.STRIPE,
    providerOrderId: session.id,
    amountCents: details.discountedPriceCents
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PENDING,
      providerOrderId: session.id,
      subscriptionId: subscription.id,
      rawPayload: toJson({ session, subscriptionId: subscription.id })
    }
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      rawPayload: toJson({ session, paymentId: payment.id })
    }
  });

  return {
    paymentId: payment.id,
    subscriptionId: subscription.id,
    url: session.url,
    amount: details.discountedPriceCents,
    currency: details.currency,
    plan: {
      type: input.planType,
      dailyCoins: details.dailyCoins,
      periodDays: details.periodDays,
      totalCoins: details.totalCoins,
      price: details.discountedPriceCents / 100
    }
  };
}

export async function verifyStripeCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"]
  });

  if (session.status !== "complete") {
    throw new Error("Checkout session is not complete.");
  }

  if (session.payment_status !== "paid") {
    throw new Error("Payment has not been completed.");
  }

  const paymentId = session.metadata?.paymentId;
  if (!paymentId) {
    throw new Error("Payment ID not found in session metadata.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment || payment.provider !== PaymentProvider.STRIPE) {
    throw new Error("Payment record not found.");
  }

  if (payment.status === "PAID") {
    const wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
    return {
      status: "already_processed" as const,
      paymentId: payment.id,
      coinsAdded: payment.coinsAdded,
      walletBalance: wallet?.balance ?? null
    };
  }

  const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;

  // Check if this is a subscription payment
  if (payment.subscriptionId) {
    const { activateSubscription } = await import("@/lib/subscription-service");
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: paymentIntent?.id ?? session.payment_intent?.toString() ?? null,
        paymentMethod: paymentIntent?.payment_method_types?.[0] ?? null,
        processedAt: new Date(),
        rawPayload: toJson({ session, paymentIntent, source: "stripe_verify" })
      }
    });
    return activateSubscription({
      subscriptionId: payment.subscriptionId,
      providerPaymentId: paymentIntent?.id ?? undefined,
      rawPayload: { session, paymentIntent, source: "stripe_verify" }
    });
  }

  // Coin purchase
  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: paymentIntent?.id ?? session.payment_intent?.toString() ?? null,
        paymentMethod: paymentIntent?.payment_method_types?.[0] ?? null,
        processedAt: new Date(),
        rawPayload: toJson({ session, paymentIntent, source: "stripe_verify" })
      }
    });

    const wallet = await tx.wallet.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        balance: payment.coinsAdded
      },
      update: {
        balance: { increment: payment.coinsAdded }
      }
    });

    await tx.coinTransaction.create({
      data: {
        userId: payment.userId,
        walletId: wallet.id,
        type: "PURCHASE",
        amount: payment.coinsAdded,
        balanceAfter: wallet.balance,
        description: `Purchased via Stripe`,
        referenceId: payment.id,
        metadata: toJson({
          provider: "STRIPE",
          sessionId: session.id,
          paymentIntentId: paymentIntent?.id,
          amountCents: payment.amountCents
        })
      }
    });

    return {
      status: "credited" as const,
      paymentId: payment.id,
      coinsAdded: payment.coinsAdded,
      walletBalance: wallet.balance
    };
  });
}

export async function handleStripeWebhook(rawBody: string, signature: string) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Invalid Stripe webhook signature: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const paymentId = session.metadata?.paymentId;

  if (!paymentId) {
    return { status: "ignored" as const, eventType: event.type };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment || payment.provider !== PaymentProvider.STRIPE) {
    return { status: "ignored" as const, eventType: event.type };
  }

  if (event.type === "checkout.session.completed") {
    if (payment.status === "PAID") {
      return { status: "already_processed" as const, eventType: event.type, paymentId };
    }

    if (payment.subscriptionId) {
      const { activateSubscription } = await import("@/lib/subscription-service");
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId: session.payment_intent?.toString() ?? null,
          paymentMethod: session.payment_method_types?.[0] ?? null,
          processedAt: new Date(),
          rawPayload: toJson({ session, event, source: "stripe_webhook" })
        }
      });
      return activateSubscription({
        subscriptionId: payment.subscriptionId,
        providerPaymentId: session.payment_intent?.toString() ?? undefined,
        rawPayload: { session, event, source: "stripe_webhook" }
      });
    }

    // Coin purchase
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: session.payment_intent?.toString() ?? null,
        paymentMethod: session.payment_method_types?.[0] ?? null,
        processedAt: new Date(),
        rawPayload: toJson({ session, event, source: "stripe_webhook" })
      }
    });

    const wallet = await prisma.wallet.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        balance: payment.coinsAdded
      },
      update: {
        balance: { increment: payment.coinsAdded }
      }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: payment.userId,
        walletId: wallet.id,
        type: "PURCHASE",
        amount: payment.coinsAdded,
        balanceAfter: wallet.balance,
        description: `Purchased via Stripe`,
        referenceId: payment.id,
        metadata: toJson({
          provider: "STRIPE",
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amountCents: payment.amountCents
        })
      }
    });

    return { status: "credited" as const, eventType: event.type, paymentId, coinsAdded: payment.coinsAdded };
  }

  return { status: "ignored" as const, eventType: event.type };
}
