import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string().optional(),
  value: z.number().int().min(1).max(5)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    const scope = body.chapterId ? `chapter:${body.chapterId}` : `story:${body.storyId}`;
    const rating = await prisma.rating.upsert({
      where: {
        userId_scope: {
          userId: user.id,
          scope
        }
      },
      create: { userId: user.id, scope, ...body },
      update: { value: body.value }
    });
    return ok(rating);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to rate", 400);
  }
}
