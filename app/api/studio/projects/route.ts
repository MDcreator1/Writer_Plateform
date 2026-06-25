import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureStudioWorkspaceForStory, materializeStudioWorkspace } from "@/lib/studio-workspace-service";
import {
  requireStudioAccess,
  StudioAccessError,
  studioJson,
  studioOptions
} from "@/lib/studio-integration";

const linkSchema = z.object({
  storyId: z.string().trim().min(1),
  projectId: z.string().trim().min(1).max(200),
  projectTitle: z.string().trim().min(1).max(250)
});

export async function OPTIONS(request: Request) {
  return studioOptions(request);
}

export async function GET(request: Request) {
  try {
    await requireStudioAccess(request);
    const stories = await prisma.story.findMany({
      where: { publicationStatus: { not: "ARCHIVED" } },
      select: {
        id: true,
        title: true,
        published: true,
        publicationStatus: true,
        updatedAt: true,
        studioProject: {
          select: {
            projectId: true,
            workspaceMaterializedAt: true,
            _count: { select: { files: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return studioJson(request, stories.map((story) => ({
      storyId: story.id,
      storyTitle: story.title,
      published: story.published,
      publicationStatus: story.publicationStatus,
      linkedProjectId: story.studioProject?.projectId || null,
      projectId: story.studioProject?.projectId || null,
      cloudFileCount: story.studioProject?._count.files || 0,
      cloudUpdatedAt: story.studioProject?.workspaceMaterializedAt || story.updatedAt
    })));
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    return studioJson(request, { code: "PROJECT_LIST_FAILED", message: "Unable to load cloud stories" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireStudioAccess(request);
    const body = linkSchema.parse(await request.json());
    const story = await prisma.story.findUnique({ where: { id: body.storyId }, select: { id: true, title: true, published: true } });
    if (!story) {
      return studioJson(request, { code: "STORY_NOT_FOUND", message: "Platform story not found" }, 404);
    }

    const existingByProject = await prisma.studioProjectLink.findUnique({ where: { projectId: body.projectId } });
    if (existingByProject && existingByProject.storyId !== story.id) {
      return studioJson(request, { code: "PROJECT_ALREADY_LINKED", message: "This cloud project is linked to another story" }, 409);
    }

    const existingByStory = await prisma.studioProjectLink.findUnique({ where: { storyId: story.id } });
    if (existingByStory) {
      await ensureStudioWorkspaceForStory(story.id);
      return studioJson(request, {
        storyId: story.id,
        storyTitle: story.title,
        projectId: existingByStory.projectId,
        published: story.published,
        idempotent: true
      });
    }

    const link = await prisma.studioProjectLink.create({
      data: {
        projectId: body.projectId || `platform-${story.id}`,
        projectTitle: body.projectTitle || story.title,
        storyId: story.id,
        source: "PLATFORM"
      }
    });
    await materializeStudioWorkspace(link.projectId);

    return studioJson(request, {
      storyId: story.id,
      storyTitle: story.title,
      projectId: link.projectId,
      published: story.published,
      idempotent: false
    }, 201);
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    if (error instanceof z.ZodError) {
      return studioJson(request, { code: "VALIDATION_ERROR", message: error.issues[0]?.message || "Invalid cloud project request" }, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return studioJson(request, { code: "LINK_CONFLICT", message: "The story or cloud project is already linked" }, 409);
    }
    return studioJson(request, { code: "LINK_FAILED", message: "Unable to link the cloud project" }, 500);
  }
}
