import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { verifyAndCreditRazorpayPayment } from "@/lib/payments";

const verifySchema = z.object({
  paymentId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = verifySchema.parse(await request.json());
    const result = await verifyAndCreditRazorpayPayment({
      paymentId: body.paymentId,
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payment verification payload is invalid.", 400, "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Unable to verify payment";
    return fail(message, 400, "PAYMENT_VERIFICATION_FAILED");
  }
}