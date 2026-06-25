"use client";

import { useState, useCallback } from "react";
import { BookOpen, Globe, Loader2, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Story } from "@/lib/content";
import { StoryDeleteModal, type DeleteModalStory } from "@/components/story-delete-modal";

const DEFAULT_STUDIO_URL = "http://localhost:5500/story-novel-project-editor.html";

function buildStudioUrl(
  studioBaseUrl: string,
  platformUrl: string,
  input: { storyId?: string; storyTitle?: string; projectId?: string }
) {
  try {
    const url = new URL(studioBaseUrl || DEFAULT_STUDIO_URL);
    url.searchParams.set("platformAction", input.storyId ? "manage-chapters" : "open-studio");
    url.searchParams.set("platformUrl", platformUrl || "http://localhost:3000");
    if (input.storyId) url.searchParams.set("platformStoryId", input.storyId);
    if (input.storyTitle) url.searchParams.set("platformStoryTitle", input.storyTitle);
    if (input.projectId) url.searchParams.set("platformProjectId", input.projectId);
    return url.toString();
  } catch {
    return studioBaseUrl || DEFAULT_STUDIO_URL;
  }
}

type Props = {
  stories: Story[];
  studioBaseUrl: string;
  platformUrl: string;
  studioProjects: Array<{ storyId: string; projectId: string }>;
};

export function UnpublishedStoriesSection({ stories, studioBaseUrl, platformUrl, studioProjects }: Props) {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalStory, setModalStory] = useState<DeleteModalStory | null>(null);

  const handlePublish = useCallback(async (storyId: string) => {
    setPublishingId(storyId);
    setErrors((prev) => ({ ...prev, [storyId]: "" }));

    try {
      const res = await fetch(`/api/admin/stories/${storyId}/publish`, { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || "Publish failed.");
      }

      setPublishedIds((prev) => new Set([...prev, storyId]));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [storyId]: err instanceof Error ? err.message : "Publish failed."
      }));
    } finally {
      setPublishingId(null);
    }
  }, []);

  const openDeleteModal = useCallback((story: Story) => {
    setModalStory({
      id: story.id,
      title: story.title,
      isPublished: false
    });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]));
  }, []);

  const visible = stories.filter(
    (s) => !publishedIds.has(s.id) && !removedIds.has(s.id)
  );

  if (visible.length === 0) return null;

  return (
    <>
      <section className="admin-unpublished-stories lm-card mt-8 p-5 border-l-4 border-l-warning/60">
        <div className="admin-card-header flex items-center justify-between mb-5">
          <div>
            <h2 className="admin-card-heading font-display text-3xl font-semibold text-ink flex items-center gap-2">
              <FileText className="h-6 w-6 text-warning" />
              Unpublished Stories
            </h2>
            <p className="mt-1 text-sm text-muted">
              {visible.length} draft {visible.length === 1 ? "story" : "stories"} waiting to go live.
            </p>
          </div>
        </div>

        <div className="admin-unpublished-list divide-y divide-border">
          {visible.map((story) => {
            const isPublishing = publishingId === story.id;
            const errMsg = errors[story.id];
            const linkedProject = studioProjects.find((p) => p.storyId === story.id);
            const studioHref = buildStudioUrl(studioBaseUrl, platformUrl, {
              storyId: story.id,
              storyTitle: story.title,
              projectId: linkedProject?.projectId
            });

            return (
              <div
                key={story.id}
                className="admin-unpublished-item grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <Link href={`/admin/stories/${story.id}`}>
                    <h3 className="admin-story-title font-semibold text-ink hover:text-accent cursor-pointer transition">
                      {story.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {story.genre}
                    {story.storyType ? ` \u00b7 ${story.storyType}` : ""}
                    {" \u00b7 "}
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 border border-warning/30 px-2 py-0.5 text-xs font-semibold text-warning">
                      Draft
                    </span>
                  </p>
                  {errMsg ? (
                    <p className="mt-1 text-xs font-semibold text-danger">{errMsg}</p>
                  ) : null}
                </div>

                <div className="admin-unpublished-actions flex flex-wrap gap-2 items-center">
                  <a
                    className="lm-btn-secondary admin-story-chapters-btn py-2 text-sm"
                    href={studioHref}
                    target="writer_studio"
                    rel="noreferrer"
                  >
                    <BookOpen className="h-4 w-4" />
                    Open in Studio
                  </a>

                  <button
                    className="admin-publish-btn inline-flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-sm font-semibold text-success transition hover:bg-success hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isPublishing}
                    onClick={() => handlePublish(story.id)}
                    id={`publish-story-${story.id}`}
                    aria-label={`Publish ${story.title}`}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {isPublishing ? "Publishing..." : "Publish"}
                  </button>

                  <button
                    id={`delete-draft-${story.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white"
                    onClick={() => openDeleteModal(story)}
                    aria-label={`Delete ${story.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <StoryDeleteModal
        story={modalStory}
        onClose={() => setModalStory(null)}
        onDeleted={handleDeleted}
      />
    </>
  );
}