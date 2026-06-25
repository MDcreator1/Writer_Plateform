import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string(),
  progressPct: z.number().int().min(0).max(100),
  lastPosition: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());

    // Check if the history record already exists
    const existing = await prisma.readingHistory.findUnique({
      where: {
        userId_chapterId: {
          userId: user.id,
          chapterId: body.chapterId
        }
      }
    });

    const history = await prisma.$transaction(async (tx) => {
      const res = await tx.readingHistory.upsert({
        where: {
          userId_chapterId: {
            userId: user.id,
            chapterId: body.chapterId
          }
        },
        create: { userId: user.id, ...body },
        update: {
          progressPct: body.progressPct,
          lastPosition: body.lastPosition,
          lastReadAt: new Date()
        }
      });

      // If this is the user's first time reading this chapter, increment story readsCount
      if (!existing) {
        await tx.story.update({
          where: { id: body.storyId },
          data: { readsCount: { increment: 1 } }
        });
      }

      return res;
    });

    return ok(history);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to save reading history", 400);
  }
}
