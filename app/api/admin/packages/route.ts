import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonetizationSettings, saveMonetizationSettings } from "@/lib/monetization-service";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  try {
    const packages = await prisma.coinPackage.findMany({
      orderBy: { priceCents: "asc" }
    });
    const settings = await getMonetizationSettings();

    return ok({
      packages,
      settings
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to fetch packages", 500);
  }
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  try {
    const body = await request.json();
    const { name, coins, bonusCoins, priceCents, campaign, active } = body;

    if (!name || coins === undefined || priceCents === undefined) {
      return fail("Missing required fields", 400);
    }

    const newPackage = await prisma.coinPackage.create({
      data: {
        name,
        coins: Number(coins),
        bonusCoins: Number(bonusCoins || 0),
        priceCents: Number(priceCents),
        campaign: campaign || null,
        active: active !== false
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "CREATE_COIN_PACKAGE",
        target: newPackage.id,
        metadata: { name, coins, priceCents }
      }
    });

    return ok(newPackage);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to create package", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  try {
    const body = await request.json();
    const currentSettings = await getMonetizationSettings();
    const updatedSettings = {
      ...currentSettings,
      ...body
    };

    await saveMonetizationSettings(updatedSettings);

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_MONETIZATION_SETTINGS",
        target: "SYSTEM",
        metadata: updatedSettings
      }
    });

    return ok({ message: "Monetization settings updated successfully", settings: updatedSettings });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to update settings", 500);
  }
}
