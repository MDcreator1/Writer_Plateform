import { fail, ok } from "@/lib/api-response";
import { handleStripeWebhook } from "@/lib/stripe-payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature") || "";
    const rawBody = await request.text();
    const result = await handleStripeWebhook(rawBody, signature);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Stripe webhook";
    const status = message.includes("not configured") ? 503 : message.includes("signature") ? 401 : 400;
    return fail(message, status, "STRIPE_WEBHOOK_FAILED");
  }
}
