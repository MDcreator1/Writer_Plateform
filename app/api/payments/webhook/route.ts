import { fail, ok } from "@/lib/api-response";
import { handleRazorpayWebhook } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature") || "";
    const rawBody = await request.text();
    const result = await handleRazorpayWebhook(rawBody, signature);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process payment webhook";
    const status = message.includes("not configured") ? 503 : message.includes("signature") ? 401 : 400;
    return fail(message, status, "WEBHOOK_FAILED");
  }
}