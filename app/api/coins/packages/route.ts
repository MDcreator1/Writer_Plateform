import { z } from "zod";
import { coinPackages as demoPackages } from "@/lib/content";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const packageSchema = z.object({
  name: z.string().min(2),
  coins: z.number().int().positive(),
  bonusCoins: z.number().int().min(0).default(0),
  priceCents: z.number().int().positive(),
  currency: z.string().default("INR"),
  campaign: z.string().optional()
});

export async function GET() {
  try {
    const packages = await prisma.coinPackage.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" }
    });
    return ok(packages.length ? packages : demoPackages);
  } catch {
    return ok(demoPackages);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = packageSchema.parse(await request.json());
    const coinPackage = await prisma.coinPackage.create({ data: body });
    return ok(coinPackage, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create coin package", 400);
  }
}
