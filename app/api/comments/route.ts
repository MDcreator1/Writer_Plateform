import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  body: z.string().min(2).max(2000)
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");
    const chapterId = searchParams.get("chapterId");

    if (!storyId) {
      return fail("storyId is required.", 400);
    }

    const where: any = {
      storyId,
      hidden: false,
      parentId: null // Only load top-level comments
    };

    if (chapterId) {
      where.chapterId = chapterId;
    } else {
      where.chapterId = null;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarLetter: true,
            profileImage: true,
            image: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        replies: {
          where: { hidden: false },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarLetter: true,
                profileImage: true,
                image: true
              }
            },
            likes: {
              select: {
                userId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(comments);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to load comments", 400);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = rateLimit(`comment:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return fail("Too many comments. Please wait a minute.", 429, "RATE_LIMITED");
    }
    
    const parsedData = schema.parse(await request.json());
    let parentId = parsedData.parentId || null;

    if (parentId) {
      // Find parent comment
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });
      if (!parentComment) {
        return fail("Parent comment not found", 404);
      }
      // If the parent comment is itself a reply (i.e. has a parentId),
      // we flatten it by setting this reply's parentId to the parent's parentId.
      if (parentComment.parentId) {
        parentId = parentComment.parentId;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId: user.id,
        storyId: parsedData.storyId,
        chapterId: parsedData.chapterId || null,
        parentId: parentId,
        body: parsedData.body
      }
    });

    return ok(comment, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to post comment", 400);
  }
}
