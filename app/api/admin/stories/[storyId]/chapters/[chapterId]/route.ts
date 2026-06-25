import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptChapterContent, decryptChapterContent } from "@/lib/security";
import { removeStudioChapterFromWorkspace } from "@/lib/studio-workspace-service";
import { ChapterStatus } from "@prisma/client";

/**
 * GET /api/admin/stories/[storyId]/chapters/[chapterId]
 * Retrieves details of a specific chapter, including decrypted content for admin editing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    await requireAdmin();
    const { storyId, chapterId } = await params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story.", 404, "NOT_FOUND");
    }

    let plainContent = "";
    try {
      if (chapter.encryptedContent && chapter.contentNonce && chapter.contentAuthTag) {
        plainContent = decryptChapterContent(
          chapter.encryptedContent,
          chapter.contentNonce,
          chapter.contentAuthTag
        );
      }
    } catch (e) {
      console.warn("Unable to decrypt chapter content:", e);
      plainContent = "[Decryption Failed]";
    }

    return ok({
      ...chapter,
      content: plainContent
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to retrieve chapter", 400);
  }
}

/**
 * PATCH /api/admin/stories/[storyId]/chapters/[chapterId]
 * Updates chapter title, encryption content, free/premium price, and publication state.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId, chapterId } = await params;
    const body = await request.json();

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story.", 404, "NOT_FOUND");
    }

    const {
      title,
      content,
      isFree,
      coinPrice,
      status,
      publishedAt
    } = body;

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
      if (isFree) {
        updateData.coinPrice = 0;
      } else if (coinPrice !== undefined) {
        updateData.coinPrice = Number(coinPrice) || 0;
      }
    } else if (coinPrice !== undefined) {
      updateData.coinPrice = chapter.isFree ? 0 : Number(coinPrice) || 0;
    }

    if (content !== undefined) {
      const { encryptedContent, contentNonce, contentAuthTag } = encryptChapterContent(content || "");
      updateData.encryptedContent = encryptedContent;
      updateData.contentNonce = contentNonce;
      updateData.contentAuthTag = contentAuthTag;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.chapter.update({
        where: { id: chapterId },
        data: updateData
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "CHAPTER_UPDATE",
          target: chapterId,
          metadata: { storyId, fields: Object.keys(updateData) }
        }
      });

      return res;
    });

    return ok(updated);
  } catch (error) {
    console.error("[edit-chapter-api]", error);
    return fail(error instanceof Error ? error.message : "Unable to update chapter", 400);
  }
}

/**
 * DELETE /api/admin/stories/[storyId]/chapters/[chapterId]
 * Permanently removes a chapter and all its related data.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { storyId, chapterId } = await params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter || chapter.storyId !== storyId) {
      return fail("Chapter not found or does not belong to this story", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.chapter.delete({
        where: { id: chapterId }
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "CHAPTER_DELETE",
          target: chapterId,
          metadata: { storyId, number: chapter.number, title: chapter.title }
        }
      });
    });

    try {
      if (chapter.studioDocumentId) {
        await removeStudioChapterFromWorkspace(storyId, chapter.studioDocumentId);
      }
    } catch (e) {
      console.warn("Could not remove studio chapter workspace file:", e);
    }

    return ok({ message: "Chapter deleted successfully" });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to delete chapter", 400);
  }
}
