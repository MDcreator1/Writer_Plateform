import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string().optional(),
  value: z.number().int().min(1).max(5)
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");
    const chapterId = searchParams.get("chapterId");

    if (!storyId) {
      return fail("storyId is required.", 400);
    }

    const scope = chapterId ? `chapter:${chapterId}` : `story:${storyId}`;
    const rating = await prisma.rating.findUnique({
      where: {
        userId_scope: {
          userId: user.id,
          scope
        }
      }
    });

    return ok(rating);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch rating", 400);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    const scope = body.chapterId ? `chapter:${body.chapterId}` : `story:${body.storyId}`;

    const rating = await prisma.$transaction(async (tx) => {
      const res = await tx.rating.upsert({
        where: {
          userId_scope: {
            userId: user.id,
            scope
          }
        },
        create: { userId: user.id, scope, ...body },
        update: { value: body.value }
      });

      // Recalculate average rating for the story
      const aggregate = await tx.rating.aggregate({
        where: { storyId: body.storyId },
        _avg: { value: true }
      });
      const avg = aggregate._avg.value || 0;

      await tx.story.update({
        where: { id: body.storyId },
        data: { ratingAverage: avg }
      });

      return res;
    });

    return ok(rating);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to rate", 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");
    const chapterId = searchParams.get("chapterId");

    if (!storyId) {
      return fail("storyId is required.", 400);
    }

    const scope = chapterId ? `chapter:${chapterId}` : `story:${storyId}`;

    await prisma.$transaction(async (tx) => {
      await tx.rating.delete({
        where: {
          userId_scope: {
            userId: user.id,
            scope
          }
        }
      });

      // Recalculate average rating for the story
      const aggregate = await tx.rating.aggregate({
        where: { storyId },
        _avg: { value: true }
      });
      const avg = aggregate._avg.value || 0;

      await tx.story.update({
        where: { id: storyId },
        data: { ratingAverage: avg }
      });
    });

    return ok({ message: "Rating deleted successfully" });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to delete rating", 400);
  }
}
