import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireWriter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptChapterContent } from "@/lib/security";
import { ChapterStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to access this story.", 403, "FORBIDDEN");
    }

    const chapters = await prisma.chapter.findMany({ where: { storyId }, orderBy: { number: "asc" } });
    return ok(chapters);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to retrieve chapters", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;
    const body = await request.json();

    const { title, content = "", isFree = false, coinPrice = 0, status = "DRAFT", publishedAt = null } = body;
    if (!title) return fail("Chapter title is required.", 400);

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { chapters: { select: { number: true } } }
    });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to add chapters to this story.", 403, "FORBIDDEN");
    }

    const maxNumber = story.chapters.reduce((max, c) => (c.number > max ? c.number : max), 0);
    const nextNumber = maxNumber + 1;
    const { encryptedContent, contentNonce, contentAuthTag } = encryptChapterContent(content || "");

    const chapter = await prisma.chapter.create({
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

    return ok(chapter);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    console.error("[writer-create-chapter]", error);
    return fail(error instanceof Error ? error.message : "Unable to create chapter.", 500);
  }
}
