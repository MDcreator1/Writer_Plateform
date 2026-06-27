import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const editSchema = z.object({
  body: z.string().min(2).max(2000)
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireUser();
    const { commentId } = await params;
    const { body } = editSchema.parse(await request.json());

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return fail("Comment not found.", 404);
    }

    // Only owner can edit
    if (comment.userId !== user.id) {
      return fail("You can only edit your own comments.", 403);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { body }
    });

    return ok(updatedComment);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to edit comment", 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireUser();
    const { commentId } = await params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return fail("Comment not found.", 404);
    }

    // Owner OR Admin can delete
    const isOwner = comment.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return fail("You are not authorized to delete this comment.", 403);
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return ok({ message: "Comment deleted successfully." });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to delete comment", 400);
  }
}
