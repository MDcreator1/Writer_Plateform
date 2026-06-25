import "server-only";
import crypto from "crypto";
import { Prisma, PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMonetizationSettings } from "@/lib/monetization-service";
import { getActiveScheduledDiscount } from "@/lib/discount-campaigns";

function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const baseUrl =
    environment === "live"
      ? "https://api.paypal.com"
      : "https://api.sandbox.paypal.com";

  return { clientId, clientSecret, baseUrl };
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret, baseUrl } = getPayPalConfig();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token.");
  }

  const data = await response.json();
  return data.access_token as string;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createPayPalCoinOrder(input: {
  userId: string;
  coinPackageId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const coinPackage = await prisma.coinPackage.findUnique({
    where: { id: input.coinPackageId }
  });

  if (!coinPackage || !coinPackage.active) {
    throw new Error("Coin package is not available.");
  }

  // Apply same discount logic as Razorpay
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

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      coinPackageId: coinPackage.id,
      provider: PaymentProvider.PAYPAL,
      status: PaymentStatus.CREATED,
      amountCents: finalPriceCents,
      currency: coinPackage.currency,
      coinsAdded: coinPackage.coins + coinPackage.bonusCoins
    }
  });

  const token = await getPayPalAccessToken();
  const { baseUrl } = getPayPalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: coinPackage.currency,
            value: (finalPriceCents / 100).toFixed(2)
          },
          custom_id: payment.id
        }
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl
      }
    })
  });

  if (!response.ok) {
    throw new Error("Failed to create PayPal order.");
  }

  const order = await response.json();

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PENDING,
      providerOrderId: order.id,
      rawPayload: toJson({ order })
    }
  });

  const approveLink = order.links?.find((link: any) => link.rel === "approve");

  return {
    paymentId: payment.id,
    orderId: order.id,
    url: approveLink?.href || input.cancelUrl,
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

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getPayPalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to capture PayPal order.");
  }

  const capture = await response.json();

  const paymentId = capture.purchase_units?.[0]?.custom_id;
  if (!paymentId) {
    throw new Error("Payment ID not found in PayPal capture.");
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== PaymentProvider.PAYPAL) {
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

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: capture.id,
        paymentMethod: "paypal",
        processedAt: new Date(),
        rawPayload: toJson({ capture, source: "paypal_capture" })
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
        description: `Purchased via PayPal`,
        referenceId: payment.id,
        metadata: toJson({
          provider: "PAYPAL",
          orderId: capture.id,
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

export async function createPayPalSubscriptionCheckout(input: {
  userId: string;
  planType: "WEEKLY" | "MONTHLY" | "YEARLY";
  returnUrl: string;
  cancelUrl: string;
}) {
  const { getSubscriptionPlanDetails, createSubscriptionRecord } = await import("@/lib/subscription-service");
  const details = await getSubscriptionPlanDetails(input.planType);

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: PaymentProvider.PAYPAL,
      status: PaymentStatus.CREATED,
      amountCents: details.discountedPriceCents,
      currency: details.currency,
      coinsAdded: details.totalCoins
    }
  });

  const token = await getPayPalAccessToken();
  const { baseUrl } = getPayPalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: details.currency,
            value: (details.discountedPriceCents / 100).toFixed(2)
          },
          custom_id: payment.id,
          description: `${input.planType} Subscription — ${details.periodDays} days`
        }
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl
      }
    })
  });

  if (!response.ok) {
    throw new Error("Failed to create PayPal subscription order.");
  }

  const order = await response.json();

  const subscription = await createSubscriptionRecord({
    userId: input.userId,
    planType: input.planType,
    details,
    provider: PaymentProvider.PAYPAL,
    providerOrderId: order.id,
    amountCents: details.discountedPriceCents
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PENDING,
      providerOrderId: order.id,
      subscriptionId: subscription.id,
      rawPayload: toJson({ order, subscriptionId: subscription.id })
    }
  });

  const approveLink = order.links?.find((link: any) => link.rel === "approve");

  return {
    paymentId: payment.id,
    subscriptionId: subscription.id,
    orderId: order.id,
    url: approveLink?.href || input.cancelUrl,
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

export async function capturePayPalSubscriptionOrder(orderId: string) {
  const result = await capturePayPalOrder(orderId);

  if (result.status === "already_processed") {
    return result;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: result.paymentId }
  });

  if (payment?.subscriptionId) {
    const { activateSubscription } = await import("@/lib/subscription-service");
    return activateSubscription({
      subscriptionId: payment.subscriptionId,
      providerPaymentId: payment.providerPaymentId || undefined,
      rawPayload: { payment, source: "paypal_capture" }
    });
  }

  return result;
}

/**
 * PayPal Webhook Signature Verification
 * Uses PayPal's REST API to verify the webhook event signature.
 * Requires PAYPAL_WEBHOOK_ID env variable set in the PayPal dashboard.
 */
export async function verifyPayPalWebhookSignature(input: {
  transmissionId: string;
  timestamp: string;
  webhookId: string;
  certUrl: string;
  actualSig: string;
  rawBody: string;
}): Promise<boolean> {
  try {
    const token = await getPayPalAccessToken();
    const { baseUrl } = getPayPalConfig();

    const response = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: input.transmissionId,
          transmission_time: input.timestamp,
          cert_url: input.certUrl,
          auth_algo: "SHA256withRSA",
          transmission_sig: input.actualSig,
          webhook_id: input.webhookId,
          webhook_event: JSON.parse(input.rawBody),
        }),
      }
    );

    if (!response.ok) return false;
    const data = await response.json();
    return data?.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

export async function handlePayPalWebhook(payload: any) {
  const eventType = payload.event_type;

  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const orderId = payload.resource?.id;
    if (!orderId) return { status: "ignored" as const, eventType };

    try {
      return await capturePayPalOrder(orderId);
    } catch {
      return { status: "ignored" as const, eventType };
    }
  }

  return { status: "ignored" as const, eventType };
}

