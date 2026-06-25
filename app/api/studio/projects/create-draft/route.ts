import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugifyStory } from "@/lib/story-slug";
import { materializeStudioWorkspace, saveStudioWorkspaceFiles } from "@/lib/studio-workspace-service";
import {
  requireStudioAccess,
  StudioAccessError,
  studioJson,
  studioOptions
} from "@/lib/studio-integration";

const workspaceFileSchema = z.object({
  path: z.string().trim().min(1).max(500),
  content: z.string().max(5_000_000)
});

const draftSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(70),
  author: z.string().trim().max(120).optional().default("Writing Studio"),
  type: z.string().trim().default("novel"),
  language: z.string().trim().default("english"),
  synopsis: z.string().trim().max(1200).default(""),
  workspaceFiles: z.array(workspaceFileSchema).max(30000).optional().default([])
});

async function uniqueSlug(requestedSlug: string, title: string) {
  const base = slugifyStory(requestedSlug || title);
  let candidate = base;
  let suffix = 2;
  while (await prisma.story.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function OPTIONS(request: Request) {
  return studioOptions(request);
}

export async function POST(request: Request) {
  try {
    await requireStudioAccess(request);
    const body = draftSchema.parse(await request.json());
    const existing = await prisma.studioProjectLink.findUnique({
      where: { projectId: body.projectId },
      include: { story: { select: { id: true, title: true } } }
    });
    if (existing) {
      if (body.workspaceFiles.length) await saveStudioWorkspaceFiles(existing.projectId, body.workspaceFiles);
      else await materializeStudioWorkspace(existing.projectId);
      return studioJson(request, {
        storyId: existing.story.id,
        storyTitle: existing.story.title,
        projectId: existing.projectId,
        idempotent: true
      });
    }

    const slug = await uniqueSlug("", body.title);
    const result = await prisma.$transaction(async (tx) => {
      const story = await tx.story.create({
        data: {
          title: body.title,
          slug,
          genre: "General",
          genres: ["General"],
          description: body.synopsis || "Draft story summary pending.",
          authorName: body.author || "Writing Studio",
          language: body.language === "hi" ? "hindi" : "english",
          storyType: body.type,
          visibility: "PRIVATE",
          publicationStatus: "DRAFT",
          origin: "STUDIO",
          published: false
        }
      });
      const link = await tx.studioProjectLink.create({
        data: {
          projectId: body.projectId,
          projectTitle: body.title,
          storyId: story.id,
          source: "STUDIO"
        }
      });
      return { story, link };
    });

    if (body.workspaceFiles.length) await saveStudioWorkspaceFiles(result.link.projectId, body.workspaceFiles);
    else await materializeStudioWorkspace(result.link.projectId);
    return studioJson(request, {
      storyId: result.story.id,
      storyTitle: result.story.title,
      projectId: result.link.projectId,
      idempotent: false
    }, 201);
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    if (error instanceof z.ZodError) {
      return studioJson(request, { code: "VALIDATION_ERROR", message: error.issues[0]?.message || "Invalid draft metadata" }, 400);
    }
    return studioJson(request, { code: "DRAFT_CREATION_FAILED", message: "Unable to create draft story" }, 500);
  }
}