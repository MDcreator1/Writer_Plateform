import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { verifyCashfreePayment } from "@/lib/cashfree-payments";

const schema = z.object({
  paymentId: z.string().min(1),
  cfOrderId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = schema.parse(await request.json());

    const result = await verifyCashfreePayment({
      paymentId: body.paymentId,
      cfOrderId: body.cfOrderId,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payment verification payload is invalid.", 400, "VALIDATION_ERROR");
    }
    const message = error instanceof Error ? error.message : "Unable to verify payment";
    const status = message.includes("not configured") ? 503 : 400;
    return fail(message, status, "PAYMENT_VERIFICATION_FAILED");
  }
}
