import { fail } from "@/lib/api-response";

/**
 * Stripe payments are disabled. Use:
 * - Razorpay for QR Code payments (India)
 * - Cashfree for UPI App / Card payments (India)
 * - PayPal for international payments
 */
export async function POST() {
  return fail(
    "Stripe payments are currently disabled. Please use UPI, Card, or PayPal.",
    503,
    "PROVIDER_DISABLED"
  );
}

export async function GET() {
  return fail(
    "Stripe payments are currently disabled.",
    503,
    "PROVIDER_DISABLED"
  );
}
