import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/stories/[storyId]/chapters/reorder
 * Reorders chapters sequentially.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId } = await params;
    const body = await request.json();

    const { chapterIds } = body;

    if (!Array.isArray(chapterIds)) {
      return fail("chapterIds must be an array of strings", 400);
    }

    const updatedChapters = await prisma.$transaction(async (tx) => {
      // Fetch all chapters to verify ownership
      const dbChapters = await tx.chapter.findMany({
        where: { storyId },
        select: { id: true }
      });

      const dbIds = new Set(dbChapters.map((c) => c.id));
      const validIds = chapterIds.filter((id) => dbIds.has(id));

      const updates = validIds.map((id, index) => {
        return tx.chapter.update({
          where: { id },
          data: { number: index + 1 }
        });
      });

      await Promise.all(updates);

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "CHAPTER_REORDER",
          target: storyId,
          metadata: { count: validIds.length }
        }
      });

      return { count: validIds.length };
    });

    return ok({ message: `Successfully reordered ${updatedChapters.count} chapters` });
  } catch (error) {
    console.error("[reorder-chapters-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to reorder chapters", 500);
  }
}
