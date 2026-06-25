import { PublicationStatus, StoryVisibility } from "@prisma/client";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStudioWorkspaceForStory } from "@/lib/studio-workspace-service";

/**
 * POST /api/admin/stories/[storyId]/unpublish
 * Moves a live story back to draft/unpublished status.
 * Only accessible by admins.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    await requireAdmin();
    const { storyId } = await params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });

    if (!story) {
      return fail("Story not found.", 404, "NOT_FOUND");
    }

    if (!story.published && story.publicationStatus === PublicationStatus.DRAFT) {
      return ok({ id: story.id, published: false, alreadyUnpublished: true });
    }

    const updated = await prisma.story.update({
      where: { id: storyId },
      data: {
        published: false,
        publicationStatus: PublicationStatus.DRAFT,
        visibility: StoryVisibility.PRIVATE,
        updatedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        publicationStatus: true,
        visibility: true
      }
    });

    await ensureStudioWorkspaceForStory(storyId);
    return ok(updated);
  } catch (error) {
    console.error("[unpublish-story]", error);
    return fail("Unable to unpublish story.", 500);
  }
}