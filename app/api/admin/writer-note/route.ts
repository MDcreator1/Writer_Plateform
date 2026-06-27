import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const socialLinkSchema = z.string().max(500, "Social link is too long").nullable().optional();
const socialLinkFields = ["twitter", "instagram", "facebook", "youtube", "linkedin"] as const;

const schema = z
  .object({
    content: z.string().max(1000, "Note content cannot be longer than 1000 characters").optional(),
    twitter: socialLinkSchema,
    instagram: socialLinkSchema,
    facebook: socialLinkSchema,
    youtube: socialLinkSchema,
    linkedin: socialLinkSchema
  })
  .superRefine((body, ctx) => {
    if (!Object.values(body).some((value) => value !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a writer note field to update"
      });
    }

    if (body.content !== undefined && !body.content.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Note content cannot be empty",
        path: ["content"]
      });
    }
  });

type WriterNotePayload = z.infer<typeof schema>;
type SocialLinkField = (typeof socialLinkFields)[number];

function buildWriterNoteUpdateData(body: WriterNotePayload) {
  const data: Partial<Record<SocialLinkField, string | null>> & { content?: string } = {};

  if (body.content !== undefined) {
    data.content = body.content;
  }

  for (const field of socialLinkFields) {
    if (body[field] !== undefined) {
      const value = body[field];
      data[field] = value?.trim() ? value.trim() : null;
    }
  }

  return data;
}

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
    const data = buildWriterNoteUpdateData(body);

    // We keep a single active writer note by updating the first one or creating it
    const existing = await prisma.writerNote.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    let note;
    if (existing) {
      note = await prisma.writerNote.update({
        where: { id: existing.id },
        data
      });
    } else {
      note = await prisma.writerNote.create({
        data: {
          content: body.content ?? "",
          ...data
        }
      });
    }

    return ok(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "Invalid writer note update", 400);
    }

    return fail(error instanceof Error ? error.message : "Unable to save writer note", 500);
  }
}
