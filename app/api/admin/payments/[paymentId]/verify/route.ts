import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, creditCoinsForVerifiedPayment } from "@/lib/payments";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await requireAdmin();
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      return fail("Payment not found.", 404);
    }

    if (payment.status === "PAID") {
      return ok({ message: "Payment is already marked as PAID.", alreadyPaid: true });
    }

    if (!payment.providerOrderId) {
      return fail("No provider order ID associated with this payment.", 400);
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.fetch(payment.providerOrderId) as any;

    if (order.status === "paid") {
      const paymentsList = await razorpay.orders.fetchPayments(payment.providerOrderId) as any;
      const capturedPayment = paymentsList.items?.find((p: any) => p.status === "captured");
      
      if (capturedPayment) {
        const creditResult = await creditCoinsForVerifiedPayment({
          paymentId: payment.id,
          orderId: payment.providerOrderId,
          providerPaymentId: capturedPayment.id,
          paymentMethod: capturedPayment.method,
          rawPayload: { order, payment: capturedPayment, source: "admin_retry_verify" }
        });
        return ok({ message: "Payment verified and coins credited successfully.", result: creditResult });
      }
    }

    return fail(`Payment could not be verified. Razorpay order status is: ${order.status}`, 400);
  } catch (error) {
    console.error("[retry-verify-payment]", error);
    return fail(error instanceof Error ? error.message : "Unable to verify payment.", 500);
  }
}
