import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { createCashfreeSubscriptionOrder } from "@/lib/cashfree-payments";

const schema = z.object({
  planType: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  paymentMode: z.enum(["UPI", "CARD"]).default("UPI"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!user.phone || (!user.phoneVerifiedAt && !user.phoneVerified)) {
      return fail(
        "Subscription purchase के लिए mobile number verification ज़रूरी है।",
        403,
        "MOBILE_UNVERIFIED"
      );
    }

    const body = schema.parse(await request.json());

    const checkout = await createCashfreeSubscriptionOrder({
      userId: user.id,
      userEmail: user.email,
      username: user.displayName || user.username || "User",
      userPhone: user.phone || undefined,
      planType: body.planType,
      paymentMode: body.paymentMode,
    });

    return ok({ checkout, provider: "CASHFREE" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Select a valid subscription plan.", 400, "VALIDATION_ERROR");
    }
    const message = error instanceof Error ? error.message : "Unable to create subscription";
    const status = message.includes("not configured") ? 503 : 400;
    return fail(message, status, "SUBSCRIPTION_CHECKOUT_FAILED");
  }
}
