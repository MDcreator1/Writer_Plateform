import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugifyStory } from "@/lib/story-slug";
import { StoryVisibility, PublicationStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    
    const {
      title,
      genre,
      genres = [],
      description,
      authorName,
      coverUrl = null,
      seoTitle = null,
      seoDescription = null,
      defaultChapterCoinPrice = 0,
      freeChapterCap = 10,
      storyType = "novel",
      language = "english"
    } = body;

    if (!title || !genre || !description || !authorName) {
      return fail("Title, Genre, Description, and Author Name are required.", 400);
    }

    const proposedSlug = body.slug?.trim() ? slugifyStory(body.slug) : slugifyStory(title);
    
    // Check if slug is unique
    const existing = await prisma.story.findUnique({
      where: { slug: proposedSlug }
    });
    const slug = existing ? `${proposedSlug}-${Date.now().toString().slice(-4)}` : proposedSlug;

    const story = await prisma.$transaction(async (tx) => {
      const created = await tx.story.create({
        data: {
          title,
          slug,
          genre,
          genres: Array.isArray(genres) ? genres : [genre],
          description,
          authorName,
          coverUrl,
          seoTitle: seoTitle || title,
          seoDescription: seoDescription || description.slice(0, 150),
          defaultChapterCoinPrice: Number(defaultChapterCoinPrice) || 0,
          freeChapterCap: Number(freeChapterCap) || 10,
          storyType,
          language,
          visibility: StoryVisibility.PRIVATE,
          publicationStatus: PublicationStatus.DRAFT,
          published: false
        }
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "STORY_CREATE",
          target: created.id,
          metadata: { title: created.title, slug: created.slug }
        }
      });

      return created;
    });

    return ok(story);
  } catch (error) {
    console.error("[create-story-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to create story.", 500);
  }
}
