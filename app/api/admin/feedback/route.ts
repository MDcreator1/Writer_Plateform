import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return ok(feedbacks);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch feedbacks", 500);
  }
}
