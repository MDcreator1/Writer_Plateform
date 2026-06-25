import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PublicationStatus, StoryVisibility } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { storyIds, action, defaultChapterCoinPrice, freeChapterCap, publicationStatus } = body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return fail("storyIds must be a non-empty array.", 400);
    }

    if (!action) {
      return fail("action is required.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "update-pricing") {
        const updateData: any = {};
        if (defaultChapterCoinPrice !== undefined) {
          updateData.defaultChapterCoinPrice = Number(defaultChapterCoinPrice) || 0;
        }
        if (freeChapterCap !== undefined) {
          updateData.freeChapterCap = Number(freeChapterCap) || 10;
        }

        const count = await tx.story.updateMany({
          where: { id: { in: storyIds } },
          data: updateData
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "STORIES_BULK_PRICING",
            target: `${storyIds.length} stories`,
            metadata: { storyIds, updateData }
          }
        });

        return { count: count.count };
      } else if (action === "update-visibility") {
        if (!publicationStatus) {
          throw new Error("publicationStatus is required for update-visibility action.");
        }

        const updateData: any = {
          publicationStatus: publicationStatus as PublicationStatus
        };

        if (publicationStatus === PublicationStatus.PUBLISHED) {
          updateData.published = true;
          updateData.visibility = StoryVisibility.PUBLIC;
          updateData.scheduledAt = null;
        } else if (publicationStatus === PublicationStatus.DRAFT) {
          updateData.published = false;
          updateData.visibility = StoryVisibility.PRIVATE;
          updateData.scheduledAt = null;
        } else if (publicationStatus === PublicationStatus.ARCHIVED) {
          updateData.published = false;
          updateData.visibility = StoryVisibility.PRIVATE;
          updateData.scheduledAt = null;
        }

        const count = await tx.story.updateMany({
          where: { id: { in: storyIds } },
          data: updateData
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "STORIES_BULK_VISIBILITY",
            target: `${storyIds.length} stories`,
            metadata: { storyIds, publicationStatus }
          }
        });

        return { count: count.count };
      } else if (action === "delete") {
        const count = await tx.story.deleteMany({
          where: { id: { in: storyIds } }
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "STORIES_BULK_DELETE",
            target: `${storyIds.length} stories`,
            metadata: { storyIds }
          }
        });

        return { count: count.count };
      } else {
        throw new Error(`Unsupported bulk action: ${action}`);
      }
    });

    return ok({ message: `Successfully performed bulk ${action} on stories.`, ...result });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to execute bulk stories operation.", 500);
  }
}
