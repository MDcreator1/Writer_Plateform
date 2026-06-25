import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { capturePayPalOrder, capturePayPalSubscriptionOrder } from "@/lib/paypal-payments";

const schema = z.object({
  orderId: z.string().min(1),
  isSubscription: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = schema.parse(await request.json());

    const result = body.isSubscription
      ? await capturePayPalSubscriptionOrder(body.orderId)
      : await capturePayPalOrder(body.orderId);

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid request.", 400, "VALIDATION_ERROR");
    }
    const message = error instanceof Error ? error.message : "Unable to capture PayPal order";
    return fail(message, 400, "PAYPAL_CAPTURE_FAILED");
  }
}
