import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { createRazorpaySubscriptionOrder } from "@/lib/payments";

const checkoutSchema = z.object({
  planType: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  provider: z.enum(["RAZORPAY", "CASHFREE", "PAYPAL"]).default("RAZORPAY"),
  paymentMode: z.enum(["UPI", "CARD"]).optional(), // only for CASHFREE
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!user.phone || (!user.phoneVerifiedAt && !user.phoneVerified)) {
      return fail("Subscription purchase के लिए mobile number verification ज़रूरी है।", 403, "MOBILE_UNVERIFIED");
    }

    const body = checkoutSchema.parse(await request.json());

    // ── CASHFREE: UPI App / Card ──────────────────────────────
    if (body.provider === "CASHFREE") {
      const { createCashfreeSubscriptionOrder } = await import("@/lib/cashfree-payments");
      const checkout = await createCashfreeSubscriptionOrder({
        userId: user.id,
        userEmail: user.email,
        username: user.displayName || user.username || "User",
        userPhone: user.phone || undefined,
        planType: body.planType,
        paymentMode: body.paymentMode || "UPI",
      });
      return ok({ checkout, provider: "CASHFREE" });
    }

    // ── PAYPAL: International ─────────────────────────────────
    if (body.provider === "PAYPAL") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const { createPayPalSubscriptionCheckout } = await import("@/lib/paypal-payments");
      const checkout = await createPayPalSubscriptionCheckout({
        userId: user.id,
        planType: body.planType,
        returnUrl: `${appUrl}/dashboard`,
        cancelUrl: `${appUrl}/`,
      });
      return ok({ checkout, provider: "PAYPAL" });
    }

    // ── RAZORPAY: QR Code (default) ───────────────────────────
    const checkout = await createRazorpaySubscriptionOrder({
      userId: user.id,
      userEmail: user.email,
      username: user.displayName || user.username || "User",
      planType: body.planType,
    });

    return ok({ checkout, provider: "RAZORPAY" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Select a valid subscription plan.", 400, "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Unable to create subscription";
    const status = message.includes("not configured") ? 503 : 400;
    return fail(message, status, "SUBSCRIPTION_CHECKOUT_FAILED");
  }
}
