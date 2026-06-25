"use client";

import { useState, useCallback, useEffect } from "react";
import { BookOpen, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Story } from "@/lib/content";
import { StoryDeleteModal, type DeleteModalStory } from "@/components/story-delete-modal";
import { CustomSelect } from "@/components/custom-select";
import { useToast } from "@/components/toast-context";

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
  studioProjects: Array<{
    id: string;
    projectId: string;
    projectTitle: string;
    source: string;
    storyId: string;
    storyTitle: string;
    published: boolean;
    cloudFileCount: number;
    cloudUpdatedAt: string | null;
  }>;
};

export function PublishedStoriesSection({ stories, studioBaseUrl, platformUrl, studioProjects }: Props) {
  const { showToast } = useToast();
  const [modalStory, setModalStory] = useState<DeleteModalStory | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [localStories, setLocalStories] = useState<Story[]>(stories);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sync state with incoming props
  useEffect(() => {
    setLocalStories(stories);
  }, [stories]);

  // Bulk edit and select states
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pricing Modal states
  const [pricingStory, setPricingStory] = useState<Story | null>(null);
  const [coinPrice, setCoinPrice] = useState(0);
  const [freeCap, setFreeCap] = useState(10);
  const [savingPricing, setSavingPricing] = useState(false);

  // Bulk Edit Modal states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCoinPrice, setBulkCoinPrice] = useState("");
  const [bulkFreeCap, setBulkFreeCap] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const openDeleteModal = useCallback((story: Story) => {
    setModalStory({
      id: story.id,
      title: story.title,
      isPublished: story.published !== false
    });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]));
  }, []);

  const toggleSelectStory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = localStories.filter((s) => !removedIds.has(s.id));
    setSelectedIds((prev) => {
      if (prev.size === visible.length) {
        return new Set();
      } else {
        return new Set(visible.map((s) => s.id));
      }
    });
  };

  const handleOpenPricingModal = (story: Story) => {
    setPricingStory(story);
    setCoinPrice(story.defaultChapterCoinPrice ?? 0);
    setFreeCap(story.freeChapterCap ?? 10);
  };

  const handleSavePricing = async () => {
    if (!pricingStory) return;
    setSavingPricing(true);
    try {
      const res = await fetch(`/api/admin/stories/${pricingStory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultChapterCoinPrice: coinPrice,
          freeChapterCap: freeCap
        })
      });
      const body = await res.json();
      if (res.ok) {
        setLocalStories((prev) =>
          prev.map((s) =>
            s.id === pricingStory.id
              ? { ...s, defaultChapterCoinPrice: coinPrice, freeChapterCap: freeCap }
              : s
          )
        );
        setPricingStory(null);
        showToast("Pricing updated successfully!", "success");
      } else {
        showToast(body.error?.message || "Failed to update pricing", "error");
      }
    } catch (err) {
      showToast("Error updating pricing", "error");
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveBulkEdit = async () => {
    if (selectedIds.size === 0) return;
    setSavingBulk(true);
    try {
      const storyIds = Array.from(selectedIds);
      
      if (bulkCoinPrice !== "" || bulkFreeCap !== "") {
        const payload: any = {
          storyIds,
          action: "update-pricing"
        };
        if (bulkCoinPrice !== "") payload.defaultChapterCoinPrice = Number(bulkCoinPrice);
        if (bulkFreeCap !== "") payload.freeChapterCap = Number(bulkFreeCap);

        const res = await fetch("/api/admin/stories/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error?.message || "Failed to update bulk pricing");
        }
      }

      if (bulkStatus !== "") {
        const res = await fetch("/api/admin/stories/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyIds,
            action: "update-visibility",
            publicationStatus: bulkStatus
          })
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error?.message || "Failed to update bulk visibility");
        }
      }

      // Update local state stories
      setLocalStories((prev) =>
        prev.map((s) => {
          if (selectedIds.has(s.id)) {
            const updated = { ...s };
            if (bulkCoinPrice !== "") updated.defaultChapterCoinPrice = Number(bulkCoinPrice);
            if (bulkFreeCap !== "") updated.freeChapterCap = Number(bulkFreeCap);
            if (bulkStatus !== "") {
              updated.publicationStatus = bulkStatus;
              updated.published = bulkStatus === "PUBLISHED";
            }
            return updated;
          }
          return s;
        })
      );

      setSelectedIds(new Set());
      setIsBulkEditMode(false);
      setShowBulkModal(false);
      setBulkCoinPrice("");
      setBulkFreeCap("");
      setBulkStatus("");
      showToast("Bulk edit completed successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error performing bulk edit", "error");
    } finally {
      setSavingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const storyIds = Array.from(selectedIds);
      const res = await fetch("/api/admin/stories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyIds,
          action: "delete"
        })
      });
      const body = await res.json();
      if (res.ok) {
        setRemovedIds((prev) => {
          const next = new Set(prev);
          storyIds.forEach((id) => next.add(id));
          return next;
        });
        setSelectedIds(new Set());
        setIsBulkEditMode(false);
        showToast(`Successfully deleted ${storyIds.length} stories.`, "success");
      } else {
        showToast(body.error?.message || "Failed to delete stories in bulk.", "error");
      }
    } catch (err) {
      showToast("Error performing bulk deletion.", "error");
    }
  };

  const visible = localStories.filter((s) => !removedIds.has(s.id));

  return (
    <>
      <section className="admin-story-management lm-card p-5 w-full">
        <div className="admin-card-header flex items-center justify-between">
          <h2 className="admin-card-heading font-display text-3xl font-semibold text-ink">
            Published Stories
          </h2>
          <button
            onClick={() => {
              setIsBulkEditMode((prev) => !prev);
              setSelectedIds(new Set());
            }}
            className={`lm-btn-secondary admin-bulk-edit-btn py-2 text-sm ${isBulkEditMode ? "bg-accent/15 border-accent text-accent font-bold" : ""}`}
          >
            <Edit3 className="h-4 w-4" />
            {isBulkEditMode ? "Cancel Bulk Edit" : "Bulk edit"}
          </button>
        </div>

        {isBulkEditMode && visible.length > 0 && (
          <div className="flex items-center gap-2 py-2 border-b border-border bg-surface-soft/40 px-3 rounded-lg mt-3">
            <input
              type="checkbox"
              checked={selectedIds.size === visible.length && visible.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
            />
            <span className="text-xs font-semibold text-soft-ink">
              Select All ({selectedIds.size} / {visible.length} stories selected)
            </span>
          </div>
        )}

        <div className="admin-story-list mt-5 divide-y divide-border">
          {visible.length === 0 ? (
            <p className="py-4 text-sm text-muted">No published stories yet.</p>
          ) : (
            visible.map((story) => {
              const linkedProject = studioProjects.find((p) => p.storyId === story.id);
              const studioHref = buildStudioUrl(studioBaseUrl, platformUrl, {
                storyId: story.id,
                storyTitle: story.title,
                projectId: linkedProject?.projectId
              });
              return (
                <div
                  key={story.id}
                  className="admin-story-item grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="flex items-center">
                    {isBulkEditMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(story.id)}
                        onChange={() => toggleSelectStory(story.id)}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent mr-3 cursor-pointer"
                      />
                    )}
                    <div>
                      <Link href={`/admin/stories/${story.id}`}>
                        <h3 className="admin-story-title font-semibold text-ink hover:text-accent cursor-pointer transition">
                          {story.title}
                        </h3>
                      </Link>
                      <p className="admin-story-details mt-1 text-sm text-muted">
                        {story.genre} &middot; {story.chapters} chapters &middot; {story.freeChapters} free &middot; {story.paidChapters} paid &middot; Default pricing: {story.defaultChapterCoinPrice ?? 0} coins (free cap: {story.freeChapterCap ?? 10})
                      </p>
                    </div>
                  </div>

                  <div className="admin-story-actions flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOpenPricingModal(story)}
                      className="lm-btn-secondary admin-story-pricing-btn py-2 text-sm"
                    >
                      Set pricing
                    </button>
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
                      id={`delete-published-${story.id}`}
                      className="admin-story-delete-btn inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white"
                      onClick={() => openDeleteModal(story)}
                      aria-label={`Delete ${story.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Floating Bar for Bulk Actions */}
      {isBulkEditMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-xl shadow-luxury py-3 px-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-semibold text-soft-ink font-mono">
            {selectedIds.size} stories selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="lm-btn-primary py-1.5 px-3 text-xs"
            >
              Edit Selected
            </button>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger hover:text-white py-1.5 px-3 text-xs font-semibold transition"
              >
                Delete Selected
              </button>
              {confirmDeleteOpen && (
                <div className="absolute bottom-full mb-3 right-0 bg-surface border border-border p-4 rounded-xl shadow-luxury z-50 min-w-[260px] text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <p className="text-xs font-semibold text-ink leading-relaxed">
                    Are you sure you want to permanently delete the {selectedIds.size} selected stories?
                  </p>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      className="px-2.5 py-1 text-[10px] font-semibold border border-border text-muted rounded-lg hover:bg-surface-soft"
                    >
                      No, Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteOpen(false);
                        handleBulkDelete();
                      }}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-danger text-white rounded-lg hover:bg-danger/90"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {pricingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-luxury flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <h3 className="font-display text-lg font-semibold text-ink">Set Story Pricing</h3>
              <button onClick={() => setPricingStory(null)} className="text-muted hover:text-ink font-bold">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted mb-2 font-semibold">Story: {pricingStory.title}</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Default Chapter Coin Price</label>
                <input
                  type="number"
                  min="0"
                  value={coinPrice}
                  onChange={(e) => setCoinPrice(Number(e.target.value))}
                  className="lm-input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Free Chapters Cap</label>
                <input
                  type="number"
                  min="0"
                  value={freeCap}
                  onChange={(e) => setFreeCap(Number(e.target.value))}
                  className="lm-input text-sm w-full"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setPricingStory(null)}
                  className="lm-btn-secondary py-2 px-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={savingPricing}
                  onClick={handleSavePricing}
                  className="lm-btn-primary py-2 px-4 text-sm disabled:opacity-50"
                >
                  {savingPricing ? "Saving..." : "Save Pricing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-luxury flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <h3 className="font-display text-lg font-semibold text-ink">Bulk Edit Stories</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-muted hover:text-ink font-bold">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted mb-2 font-semibold">Editing {selectedIds.size} selected stories</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Bulk Default Coin Price (Leave blank to keep current)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unchanged"
                  value={bulkCoinPrice}
                  onChange={(e) => setBulkCoinPrice(e.target.value)}
                  className="lm-input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Bulk Free Chapters Cap (Leave blank to keep current)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unchanged"
                  value={bulkFreeCap}
                  onChange={(e) => setBulkFreeCap(e.target.value)}
                  className="lm-input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Bulk Visibility Status (Leave blank to keep current)</label>
                <CustomSelect
                  value={bulkStatus}
                  onChange={setBulkStatus}
                  options={[
                    { value: "", label: "Unchanged" },
                    { value: "DRAFT", label: "Draft (Private)" },
                    { value: "PUBLISHED", label: "Published (Live)" },
                    { value: "ARCHIVED", label: "Archived (Private)" }
                  ]}
                  size="sm"
                  triggerClassName="bg-surface border-border hover:border-accent text-xs w-full"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="lm-btn-secondary py-2 px-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={savingBulk}
                  onClick={handleSaveBulkEdit}
                  className="lm-btn-primary py-2 px-4 text-sm disabled:opacity-50"
                >
                  {savingBulk ? "Applying..." : "Apply Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StoryDeleteModal
        story={modalStory}
        onClose={() => setModalStory(null)}
        onDeleted={handleDeleted}
        onUnpublished={handleDeleted}
      />
    </>
  );
}