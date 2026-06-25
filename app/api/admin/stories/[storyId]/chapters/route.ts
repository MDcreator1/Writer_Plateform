import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptChapterContent } from "@/lib/security";
import { ChapterStatus } from "@prisma/client";

/**
 * GET /api/admin/stories/[storyId]/chapters
 * Lists all chapters belonging to a story.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    await requireAdmin();
    const { storyId } = await params;

    const chapters = await prisma.chapter.findMany({
      where: { storyId },
      orderBy: { number: "asc" }
    });

    return ok(chapters);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to retrieve chapters", 500);
  }
}

/**
 * POST /api/admin/stories/[storyId]/chapters
 * Creates a new chapter for a story.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId } = await params;
    const body = await request.json();

    const {
      title,
      content = "",
      isFree = false,
      coinPrice = 0,
      status = "DRAFT",
      publishedAt = null
    } = body;

    if (!title) {
      return fail("Chapter title is required.", 400);
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          select: { number: true }
        }
      }
    });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    // Determine the next chapter number
    const maxNumber = story.chapters.reduce((max, c) => (c.number > max ? c.number : max), 0);
    const nextNumber = maxNumber + 1;

    // Encrypt the chapter content
    const { encryptedContent, contentNonce, contentAuthTag } = encryptChapterContent(content || "");

    const chapter = await prisma.$transaction(async (tx) => {
      const created = await tx.chapter.create({
        data: {
          storyId,
          number: nextNumber,
          title,
          status: status as ChapterStatus,
          isFree: !!isFree,
          coinPrice: !!isFree ? 0 : Number(coinPrice) || 0,
          encryptedContent,
          contentNonce,
          contentAuthTag,
          publishedAt: publishedAt ? new Date(publishedAt) : (status === "PUBLISHED" ? new Date() : null)
        }
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "CHAPTER_CREATE",
          target: created.id,
          metadata: { storyId, number: created.number, title: created.title }
        }
      });

      return created;
    });

    return ok(chapter);
  } catch (error) {
    console.error("[create-chapter-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to create chapter.", 500);
  }
}
