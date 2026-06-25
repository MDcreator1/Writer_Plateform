import { fail, ok } from "@/lib/api-response";
import { handleCashfreeWebhook } from "@/lib/cashfree-payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-webhook-signature") || "";
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const rawBody = await request.text();

    if (!signature || !timestamp) {
      return fail("Missing webhook headers.", 401, "UNAUTHORIZED");
    }

    const result = await handleCashfreeWebhook(rawBody, signature, timestamp);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Cashfree webhook";
    const status =
      message.includes("not configured")
        ? 503
        : message.includes("Invalid") || message.includes("signature")
        ? 401
        : 400;
    return fail(message, status, "WEBHOOK_FAILED");
  }
}
