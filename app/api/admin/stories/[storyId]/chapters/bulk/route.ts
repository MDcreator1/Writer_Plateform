import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChapterStatus } from "@prisma/client";

/**
 * POST /api/admin/stories/[storyId]/chapters/bulk
 * Bulk updates the status of multiple chapters.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId } = await params;
    const body = await request.json();

    const { chapterIds, status } = body;

    if (!Array.isArray(chapterIds) || !status) {
      return fail("chapterIds (array) and status (string) are required.", 400);
    }

    if (!Object.values(ChapterStatus).includes(status)) {
      return fail("Invalid status value.", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Verify chapters belong to the story
      const chaptersToUpdate = await tx.chapter.findMany({
        where: { id: { in: chapterIds }, storyId },
        select: { id: true }
      });

      const validIds = chaptersToUpdate.map((c) => c.id);

      const updateData: any = { status: status as ChapterStatus };
      if (status === "PUBLISHED") {
        updateData.publishedAt = new Date();
      } else if (status === "DRAFT") {
        updateData.publishedAt = null;
      }

      const res = await tx.chapter.updateMany({
        where: { id: { in: validIds } },
        data: updateData
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "CHAPTER_BULK_UPDATE",
          target: storyId,
          metadata: { count: res.count, status }
        }
      });

      return res;
    });

    return ok({ message: `Successfully updated ${updated.count} chapters to ${status.toLowerCase()}` });
  } catch (error) {
    console.error("[bulk-update-chapters-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to bulk update chapters", 500);
  }
}
