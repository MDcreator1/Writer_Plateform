import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireWriter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await requireWriter();
    const { storyId } = await params;
    const body = await request.json();
    const { chapterIds } = body;

    if (!Array.isArray(chapterIds)) {
      return fail("chapterIds must be an array of strings", 400);
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return fail("Story not found.", 404, "NOT_FOUND");
    if (user.role !== "ADMIN" && story.authorId !== user.id) {
      return fail("You do not have permission to reorder this story.", 403, "FORBIDDEN");
    }

    const updatedChapters = await prisma.$transaction(async (tx) => {
      const dbChapters = await tx.chapter.findMany({ where: { storyId }, select: { id: true } });
      const dbIds = new Set(dbChapters.map((c) => c.id));
      const validIds = chapterIds.filter((id) => dbIds.has(id));

      const updates = validIds.map((id, index) =>
        tx.chapter.update({ where: { id }, data: { number: index + 1 } })
      );
      await Promise.all(updates);
      return { count: validIds.length };
    });

    return ok({ message: `Successfully reordered ${updatedChapters.count} chapters` });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("Unauthorized", 401, "UNAUTHORIZED");
    }
    console.error("[writer-reorder-chapters]", error);
    return fail(error instanceof Error ? error.message : "Unable to reorder chapters", 500);
  }
}
