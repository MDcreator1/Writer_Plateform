import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { packageId } = await params;

  try {
    const body = await request.json();
    const { name, coins, bonusCoins, priceCents, campaign, active } = body;

    const updatedPackage = await prisma.coinPackage.update({
      where: { id: packageId },
      data: {
        name: name !== undefined ? name : undefined,
        coins: coins !== undefined ? Number(coins) : undefined,
        bonusCoins: bonusCoins !== undefined ? Number(bonusCoins) : undefined,
        priceCents: priceCents !== undefined ? Number(priceCents) : undefined,
        campaign: campaign !== undefined ? campaign : undefined,
        active: active !== undefined ? active : undefined
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_COIN_PACKAGE",
        target: packageId,
        metadata: { name, coins, priceCents, active }
      }
    });

    return ok(updatedPackage);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to update package", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { packageId } = await params;

  try {
    await prisma.coinPackage.delete({
      where: { id: packageId }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "DELETE_COIN_PACKAGE",
        target: packageId,
        metadata: {}
      }
    });

    return ok({ message: "Package deleted successfully" });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to delete package", 500);
  }
}
