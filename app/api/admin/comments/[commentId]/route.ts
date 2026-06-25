import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { commentId } = await params;
    const body = await request.json();
    const { action } = body;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return fail("Comment not found.", 404);
    }

    if (action === "hide") {
      await prisma.$transaction(async (tx) => {
        await tx.comment.update({
          where: { id: commentId },
          data: { hidden: true }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "COMMENT_HIDE",
            target: commentId,
            metadata: { bodyExcerpt: comment.body.slice(0, 50) }
          }
        });
      });
      return ok({ message: "Comment hidden successfully." });
    } else if (action === "restore") {
      await prisma.$transaction(async (tx) => {
        await tx.comment.update({
          where: { id: commentId },
          data: { hidden: false }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "COMMENT_RESTORE",
            target: commentId,
            metadata: { bodyExcerpt: comment.body.slice(0, 50) }
          }
        });
      });
      return ok({ message: "Comment restored successfully." });
    }

    return fail("Invalid action.", 400);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to perform action.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { commentId } = await params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return fail("Comment not found.", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "COMMENT_DELETE",
          target: commentId,
          metadata: { bodyExcerpt: comment.body.slice(0, 50) }
        }
      });
    });

    return ok({ message: "Comment permanently deleted." });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to delete comment.", 500);
  }
}
