import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireWriter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChapterStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;
    const body = await request.json();

    const { chapterIds, status } = body;
    if (!Array.isArray(chapterIds) || !status) {
      return fail("chapterIds (array) and status (string) are required.", 400);
    }
    if (!Object.values(ChapterStatus).includes(status)) {
      return fail("Invalid status value.", 400);
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to update this story.", 403, "FORBIDDEN");
    }

    const chaptersToUpdate = await prisma.chapter.findMany({
      where: { id: { in: chapterIds }, storyId },
      select: { id: true }
    });
    const validIds = chaptersToUpdate.map((c) => c.id);

    const updateData: any = { status: status as ChapterStatus };
    if (status === "PUBLISHED") updateData.publishedAt = new Date();
    else if (status === "DRAFT") updateData.publishedAt = null;

    const res = await prisma.chapter.updateMany({
      where: { id: { in: validIds } },
      data: updateData
    });

    return ok({ message: `Successfully updated ${res.count} chapters to ${status.toLowerCase()}` });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    console.error("[writer-bulk-chapters]", error);
    return fail(error instanceof Error ? error.message : "Unable to bulk update chapters", 500);
  }
}
