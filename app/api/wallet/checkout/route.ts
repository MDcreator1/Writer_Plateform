import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { createRazorpayCoinOrder } from "@/lib/payments";

const checkoutSchema = z.object({
  coinPackageId: z.string().min(1),
  provider: z.literal("RAZORPAY").default("RAZORPAY")
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Guard: Ensure mobile number is verified for coin purchases
    if (!user.phone || (!user.phoneVerifiedAt && !user.phoneVerified)) {
      return fail("Coins purchasing के लिए mobile number verification जरूरी है।", 403, "MOBILE_UNVERIFIED");
    }

    const body = checkoutSchema.parse(await request.json());
    const checkout = await createRazorpayCoinOrder({
      userId: user.id,
      userEmail: user.email,
      username: user.displayName || user.username || "User",
      coinPackageId: body.coinPackageId
    });

    return ok({ checkout });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Select a valid coin package.", 400, "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Unable to create checkout";
    const status = message.includes("not configured") ? 503 : 400;
    return fail(message, status, "CHECKOUT_FAILED");
  }
}