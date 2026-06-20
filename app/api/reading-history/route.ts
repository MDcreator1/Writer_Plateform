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
    const history = await prisma.readingHistory.upsert({
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
    return ok(history);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to save reading history", 400);
  }
}
