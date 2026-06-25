import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  content: z.string().min(1, "Note content cannot be empty").max(1000),
  twitter: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  youtube: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional()
});

export async function GET() {
  try {
    await requireAdmin();
    const note = await prisma.writerNote.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    return ok(note);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch writer note", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());

    // We keep a single active writer note by updating the first one or creating it
    const existing = await prisma.writerNote.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    let note;
    if (existing) {
      note = await prisma.writerNote.update({
        where: { id: existing.id },
        data: {
          content: body.content,
          twitter: body.twitter || null,
          instagram: body.instagram || null,
          facebook: body.facebook || null,
          youtube: body.youtube || null,
          linkedin: body.linkedin || null
        }
      });
    } else {
      note = await prisma.writerNote.create({
        data: {
          content: body.content,
          twitter: body.twitter || null,
          instagram: body.instagram || null,
          facebook: body.facebook || null,
          youtube: body.youtube || null,
          linkedin: body.linkedin || null
        }
      });
    }

    return ok(note);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to save writer note", 500);
  }
}
