import { fail, ok } from "@/lib/api-response";
import { requireWriter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptChapterContent, decryptChapterContent } from "@/lib/security";
import { removeStudioChapterFromWorkspace } from "@/lib/studio-workspace-service";
import { ChapterStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId, chapterId } = await params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to access this story.", 403, "FORBIDDEN");
    }

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story.", 404, "NOT_FOUND");
    }

    let plainContent = "";
    try {
      if (chapter.encryptedContent && chapter.contentNonce && chapter.contentAuthTag) {
        plainContent = decryptChapterContent(chapter.encryptedContent, chapter.contentNonce, chapter.contentAuthTag);
      }
    } catch (e) {
      console.warn("Unable to decrypt chapter content:", e);
      plainContent = "[Decryption Failed]";
    }

    return ok({ ...chapter, content: plainContent });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to retrieve chapter", 400);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId, chapterId } = await params;
    const body = await request.json();

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to update this story.", 403, "FORBIDDEN");
    }

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story.", 404, "NOT_FOUND");
    }

    const { title, content, isFree, coinPrice, status, publishedAt } = body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status as ChapterStatus;
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    } else if (status === "PUBLISHED" && chapter.status !== "PUBLISHED") {
      updateData.publishedAt = new Date();
    }

    if (isFree !== undefined) {
      updateData.isFree = !!isFree;
      if (isFree) updateData.coinPrice = 0;
      else if (coinPrice !== undefined) updateData.coinPrice = Number(coinPrice) || 0;
    } else if (coinPrice !== undefined) {
      updateData.coinPrice = chapter.isFree ? 0 : Number(coinPrice) || 0;
    }

    if (content !== undefined) {
      const enc = encryptChapterContent(content || "");
      updateData.encryptedContent = enc.encryptedContent;
      updateData.contentNonce = enc.contentNonce;
      updateData.contentAuthTag = enc.contentAuthTag;
    }

    const updated = await prisma.chapter.update({ where: { id: chapterId }, data: updateData });
    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    console.error("[writer-edit-chapter]", error);
    return fail(error instanceof Error ? error.message : "Unable to update chapter", 400);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId, chapterId } = await params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to delete this chapter.", 403, "FORBIDDEN");
    }

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story", 404);
    }

    await prisma.chapter.delete({ where: { id: chapterId } });

    try {
      if (chapter.studioDocumentId) {
        await removeStudioChapterFromWorkspace(storyId, chapter.studioDocumentId);
      }
    } catch (e) {
      console.warn("Could not remove studio chapter workspace file:", e);
    }

    return ok({ message: "Chapter deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    return fail(error instanceof Error ? error.message : "Unable to delete chapter", 400);
  }
}
