import { PublicationStatus, StoryOrigin, StoryVisibility } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stories as demoStories } from "@/lib/content";
import { ensureStudioWorkspaceForStory } from "@/lib/studio-workspace-service";

const storySchema = z.object({
  draftId: z.string().optional(),
  projectId: z.string().optional(),
  storyTitle: z.string().trim().min(1).max(70),
  genre: z.string().trim().min(1),
  language: z.string().trim().default("english"),
  storyType: z.string().trim().default("novel"),
  leadingGender: z.string().trim().optional(),
  synopsis: z.string().trim().max(600).default(""),
  tagCategory: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
  abbreviation: z.string().trim().max(15).optional(),
  length: z.string().trim().optional(),
  storyLength: z.string().trim().optional(),
  writingContest: z.string().trim().optional(),
  warningNotice: z.string().trim().optional(),
  invitationCode: z.string().trim().optional(),
  coverDataUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  published: z.boolean().default(true)
}).superRefine((value, context) => {
  if (!value.published) {
    return;
  }

  if (value.synopsis.length < 20) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Summary should be at least 20 characters.",
      path: ["synopsis"]
    });
  }

  if (value.tags.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please add at least 2 tags.",
      path: ["tags"]
    });
  }
});

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `story-${Date.now()}`;
}

async function getUniqueSlug(title: string, currentStoryId?: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.story.findUnique({ where: { slug: candidate } });

    if (!existing || existing.id === currentStoryId) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function GET() {
  try {
    const stories = await prisma.story.findMany({
      where: { published: true },
      include: { chapters: { orderBy: { number: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });
    return ok(stories.length ? stories : demoStories);
  } catch {
    return ok(demoStories);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = storySchema.parse(await request.json());
    const existingDraft = body.draftId
      ? await prisma.story.findUnique({ where: { id: body.draftId } })
      : null;
    const slug = await getUniqueSlug(body.storyTitle, existingDraft?.id);
    const storyData = {
      title: body.storyTitle,
      slug,
      genre: body.genre,
      genres: [body.genre],
      description: body.synopsis || "Draft story summary pending.",
      authorName: admin.displayName || admin.username || admin.email || "Admin",
      coverUrl: body.coverDataUrl || body.coverUrl || null,
      language: body.language,
      storyType: body.storyType,
      leadingGender: body.leadingGender || null,
      tagCategory: body.tagCategory || null,
      tags: body.tags,
      abbreviation: body.abbreviation || null,
      storyLength: body.storyLength || body.length || null,
      writingContest: body.writingContest || null,
      warningNotice: body.warningNotice || null,
      invitationCode: body.invitationCode || null,
      visibility: body.published ? StoryVisibility.PUBLIC : StoryVisibility.PRIVATE,
      publicationStatus: body.published ? PublicationStatus.PUBLISHED : PublicationStatus.DRAFT,
      origin: existingDraft ? existingDraft.origin : (body.projectId ? StoryOrigin.STUDIO : StoryOrigin.PLATFORM),
      published: body.published
    };
    const story = existingDraft
      ? await prisma.story.update({ where: { id: existingDraft.id }, data: storyData })
      : await prisma.story.create({ data: storyData });

    if (body.projectId) {
      const existingLink = await prisma.studioProjectLink.findUnique({
        where: { projectId: body.projectId }
      });
      if (!existingLink) {
        await prisma.studioProjectLink.create({
          data: {
            projectId: body.projectId,
            projectTitle: story.title,
            storyId: story.id,
            source: "STUDIO"
          }
        });
      } else if (existingLink.storyId !== story.id) {
        await prisma.studioProjectLink.update({
          where: { projectId: body.projectId },
          data: { storyId: story.id }
        });
      }
    }

    await ensureStudioWorkspaceForStory(story.id);

    return ok(story, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message || "Please check the story information.", 400, "VALIDATION_ERROR");
    }

    return fail("Unable to create story", 400);
  }
}
