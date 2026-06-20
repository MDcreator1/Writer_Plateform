import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  storyId: z.string(),
  chapterId: z.string(),
  note: z.string().max(500).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_chapterId: {
          userId: user.id,
          chapterId: body.chapterId
        }
      },
      create: { userId: user.id, ...body },
      update: { note: body.note }
    });
    return ok(bookmark);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to save bookmark", 400);
  }
}
