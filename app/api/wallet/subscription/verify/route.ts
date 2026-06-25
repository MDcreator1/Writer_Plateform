import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { verifyAndCreditRazorpaySubscription } from "@/lib/payments";

const verifySchema = z.object({
  paymentId: z.string().min(1),
  subscriptionId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = verifySchema.parse(await request.json());
    const result = await verifyAndCreditRazorpaySubscription({
      paymentId: body.paymentId,
      subscriptionId: body.subscriptionId,
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payment verification payload is invalid.", 400, "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Unable to verify subscription";
    return fail(message, 400, "SUBSCRIPTION_VERIFICATION_FAILED");
  }
}
