import { fail, ok } from "@/lib/api-response";
import { handlePayPalWebhook, verifyPayPalWebhookSignature } from "@/lib/paypal-payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // PayPal webhook signature verification
    const transmissionId = request.headers.get("paypal-transmission-id") || "";
    const timestamp = request.headers.get("paypal-transmission-time") || "";
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";
    const certUrl = request.headers.get("paypal-cert-url") || "";
    const actualSig = request.headers.get("paypal-transmission-sig") || "";

    // Only verify if webhook ID is configured (graceful degradation in sandbox)
    if (webhookId) {
      const isValid = await verifyPayPalWebhookSignature({
        transmissionId,
        timestamp,
        webhookId,
        certUrl,
        actualSig,
        rawBody,
      });

      if (!isValid) {
        return fail("Invalid PayPal webhook signature.", 401, "UNAUTHORIZED");
      }
    }

    const payload = JSON.parse(rawBody);
    const result = await handlePayPalWebhook(payload);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process PayPal webhook";
    return fail(message, 400, "PAYPAL_WEBHOOK_FAILED");
  }
}
