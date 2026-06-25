import { Prisma } from "@prisma/client";
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

const publishSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(70),
  cover: z.string().max(8_000_000).optional().default(""),
  summary: z.string().trim().min(20).max(1200),
  genres: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  tags: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  slug: z.string().trim().max(100).optional().default(""),
  seoTitle: z.string().trim().max(70).optional().default(""),
  seoDescription: z.string().trim().max(170).optional().default(""),
  priceCents: z.number().int().min(0).max(100_000_000).default(0),
  defaultChapterCoinPrice: z.number().int().min(0).max(100000).default(0),
  authorName: z.string().trim().max(120).optional().default("Writing Studio"),
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
    const body = publishSchema.parse(await request.json());
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

    const slug = await uniqueSlug(body.slug, body.title);
    const result = await prisma.$transaction(async (tx) => {
      const story = await tx.story.create({
        data: {
          title: body.title,
          slug,
          genre: body.genres[0],
          genres: body.genres,
          description: body.summary,
          authorName: body.authorName || "Writing Studio",
          coverUrl: body.cover || null,
          tags: body.tags,
          seoTitle: body.seoTitle || null,
          seoDescription: body.seoDescription || null,
          priceCents: body.priceCents,
          defaultChapterCoinPrice: body.defaultChapterCoinPrice,
          visibility: "PUBLIC",
          publicationStatus: "PUBLISHED",
          origin: "STUDIO",
          published: true
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
      return studioJson(request, { code: "VALIDATION_ERROR", message: error.issues[0]?.message || "Invalid publishing metadata" }, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return studioJson(request, { code: "PUBLISH_CONFLICT", message: "This project or slug was published already" }, 409);
    }
    return studioJson(request, { code: "PUBLISH_FAILED", message: "Unable to publish the Studio project" }, 500);
  }
}