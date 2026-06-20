import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  paymentId: z.string(),
  reason: z.string().min(5)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const payment = await prisma.payment.update({
      where: { id: body.paymentId },
      data: { status: "REFUNDED" }
    });
    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "PAYMENT_REFUND",
        target: payment.id,
        metadata: { reason: body.reason }
      }
    });
    return ok({ paymentId: payment.id, status: payment.status });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to refund payment", 400);
  }
}
