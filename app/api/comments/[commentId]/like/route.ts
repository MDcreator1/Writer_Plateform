import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const like = await prisma.commentLike.upsert({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId
        }
      },
      create: {
        userId: user.id,
        commentId
      },
      update: {}
    });

    const likesCount = await prisma.commentLike.count({
      where: { commentId }
    });

    return ok({ liked: true, likesCount });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to like comment", 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await requireUser();
    const { commentId } = await params;

    await prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId
        }
      }
    });

    const likesCount = await prisma.commentLike.count({
      where: { commentId }
    });

    return ok({ liked: false, likesCount });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to unlike comment", 400);
  }
}
