import { fail, ok } from "@/lib/api-response";
import { requireWriter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugifyStory } from "@/lib/story-slug";
import { StoryVisibility, PublicationStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { chapters: { orderBy: { number: "asc" } } }
    });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to access this story.", 403, "FORBIDDEN");
    }

    const [realReadsCount, ratingMetrics] = await Promise.all([
      prisma.readingHistory.count({ where: { storyId } }),
      prisma.rating.aggregate({ where: { storyId }, _avg: { value: true }, _count: { _all: true } })
    ]);

    return ok({
      ...story,
      readsCount: realReadsCount,
      ratingAverage: ratingMetrics._avg.value ?? 0,
      ratingsCount: ratingMetrics._count._all
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to retrieve story.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;
    const body = await request.json();

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to update this story.", 403, "FORBIDDEN");
    }

    const {
      title, genre, genres, description, authorName, coverUrl,
      seoTitle, seoDescription, defaultChapterCoinPrice, freeChapterCap,
      visibility, publicationStatus, scheduledAt
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
        if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
      }
    } else if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (body.slug !== undefined && body.slug.trim() !== "") {
      const newSlug = slugifyStory(body.slug);
      if (newSlug !== story.slug) {
        const existing = await prisma.story.findUnique({ where: { slug: newSlug } });
        if (existing) {
          return fail("Slug is already in use by another story.", 400);
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.story.update({ where: { id: storyId }, data: updateData });
    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to update story.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true, title: true, authorId: true } });
    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to delete this story.", 403, "FORBIDDEN");
    }

    await prisma.story.delete({ where: { id: storyId } });
    return ok({ id: storyId, deleted: true, title: story.title });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to delete story.", 500);
  }
}
