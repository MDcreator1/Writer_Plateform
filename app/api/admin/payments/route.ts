import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";

    const where: Prisma.PaymentWhereInput = {};

    if (query) {
      where.OR = [
        { providerOrderId: { contains: query, mode: "insensitive" } },
        { providerPaymentId: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { username: { contains: query, mode: "insensitive" } } },
        { user: { displayName: { contains: query, mode: "insensitive" } } }
      ];
    }

    if (status) {
      where.status = status as any;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      user: p.user.displayName || p.user.username,
      email: p.user.email,
      userId: p.userId,
      orderId: p.providerOrderId || "-",
      paymentId: p.providerPaymentId || "-",
      packageName: p.coinPackage?.name || "Coin package",
      amountPaid: p.amountCents / 100,
      coinsReceived: p.coinsAdded || ((p.coinPackage?.coins || 0) + (p.coinPackage?.bonusCoins || 0)),
      method: p.paymentMethod || "Razorpay",
      status: p.status.toLowerCase(),
      date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(p.createdAt),
      rawPayload: p.rawPayload
    }));

    return ok(formattedPayments);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to list payments.", 500);
  }
}
