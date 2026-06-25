import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().min(5).max(500)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());

    const payment = await prisma.payment.findUnique({
      where: { id: body.paymentId },
      include: { user: true, coinPackage: true }
    });

    if (!payment) {
      return fail("Payment not found.", 404);
    }

    if (payment.userId !== user.id) {
      return fail("You can only request refunds for your own payments.", 403);
    }

    // Check if already refunded
    if (payment.status === "REFUNDED") {
      return fail("This payment has already been refunded.", 400);
    }

    if (payment.status !== "PAID") {
      return fail("Only paid payments can be refunded.", 400);
    }

    const refundWindowHours = 48;
    const refundDeadline = new Date(payment.createdAt);
    refundDeadline.setHours(refundDeadline.getHours() + refundWindowHours);

    if (new Date() > refundDeadline) {
      return fail(`Refund window has expired. Refunds must be requested within ${refundWindowHours} hours of purchase.`, 400);
    }

    // Create refund request (mark as pending by updating rawPayload)
    await prisma.payment.update({
      where: { id: body.paymentId },
      data: {
        rawPayload: {
          ...(typeof payment.rawPayload === "object" ? payment.rawPayload : {}),
          refundRequested: true,
          refundReason: body.reason,
          refundRequestedAt: new Date().toISOString()
        }
      }
    });

    return ok({
      message: "Refund request submitted successfully. An admin will review your request.",
      paymentId: body.paymentId,
      status: "PENDING_REVIEW"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Please provide a valid payment ID and reason (5-500 characters).", 400, "VALIDATION_ERROR");
    }
    return fail(error instanceof Error ? error.message : "Unable to submit refund request", 400);
  }
}
