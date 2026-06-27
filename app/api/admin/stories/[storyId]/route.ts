import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugifyStory } from "@/lib/story-slug";
import { StoryVisibility, PublicationStatus } from "@prisma/client";

/**
 * GET /api/admin/stories/[storyId]
 * Retrieve detailed story information.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    await requireAdmin();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          orderBy: { number: "asc" }
        }
      }
    });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    const [realReadsCount, ratingMetrics] = await Promise.all([
      prisma.readingHistory.count({ where: { storyId } }),
      prisma.rating.aggregate({
        where: { storyId },
        _avg: { value: true },
        _count: { _all: true }
      })
    ]);

    return ok({
      ...story,
      readsCount: realReadsCount,
      ratingAverage: ratingMetrics._avg.value ?? 0,
      ratingsCount: ratingMetrics._count._all
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to retrieve story.", 500);
  }
}

/**
 * PATCH /api/admin/stories/[storyId]
 * Updates story details, settings, metadata, cover, pricing, or publication status.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId } = await params;
    const body = await request.json();

    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    const {
      title,
      genre,
      genres,
      description,
      authorName,
      coverUrl,
      seoTitle,
      seoDescription,
      defaultChapterCoinPrice,
      freeChapterCap,
      visibility,
      publicationStatus,
      scheduledAt
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (genre !== undefined) {
      updateData.genre = genre;
      if (genres === undefined) updateData.genres = [genre];
    }
    if (genres !== undefined) updateData.genres = genres;
    if (description !== undefined) updateData.description = description;
    if (authorName !== undefined) updateData.authorName = authorName;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (defaultChapterCoinPrice !== undefined) updateData.defaultChapterCoinPrice = Number(defaultChapterCoinPrice) || 0;
    if (freeChapterCap !== undefined) updateData.freeChapterCap = Number(freeChapterCap) || 10;
    if (visibility !== undefined) updateData.visibility = visibility as StoryVisibility;
    
    if (publicationStatus !== undefined) {
      updateData.publicationStatus = publicationStatus as PublicationStatus;
      if (publicationStatus === PublicationStatus.PUBLISHED) {
        updateData.published = true;
        updateData.visibility = StoryVisibility.PUBLIC;
        updateData.scheduledAt = null;
      } else if (publicationStatus === PublicationStatus.DRAFT) {
        updateData.published = false;
        updateData.visibility = StoryVisibility.PRIVATE;
        updateData.scheduledAt = null;
      } else if (publicationStatus === PublicationStatus.SCHEDULED) {
        updateData.published = false;
        if (scheduledAt) {
          updateData.scheduledAt = new Date(scheduledAt);
        }
      }
    } else if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (body.slug !== undefined && body.slug.trim() !== "") {
      const newSlug = slugifyStory(body.slug);
      if (newSlug !== story.slug) {
        const existing = await prisma.story.findUnique({
          where: { slug: newSlug }
        });
        if (existing) {
          return fail("Slug is already in use by another story.", 400);
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.story.update({
        where: { id: storyId },
        data: updateData
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "STORY_UPDATE",
          target: storyId,
          metadata: { fields: Object.keys(updateData) }
        }
      });

      return res;
    });

    return ok(updated);
  } catch (error) {
    console.error("[edit-story-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to update story.", 500);
  }
}

/**
 * DELETE /api/admin/stories/[storyId]
 * Permanently removes a story and all its related data.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, title: true }
    });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    await prisma.$transaction(async (tx) => {
      await tx.story.delete({ where: { id: storyId } });
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "STORY_DELETE",
          target: storyId,
          metadata: { title: story.title }
        }
      });
    });

    return ok({ id: storyId, deleted: true, title: story.title });
  } catch (error) {
    console.error("[delete-story-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to delete story.", 500);
  }
}