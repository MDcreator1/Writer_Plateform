import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string().optional(),
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
      hidden: false
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
            displayName: true
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
    const body = schema.parse(await request.json());
    const comment = await prisma.comment.create({
      data: { userId: user.id, ...body }
    });
    return ok(comment, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to post comment", 400);
  }
}
