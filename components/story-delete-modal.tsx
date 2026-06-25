"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Loader2, Trash2, X, EyeOff } from "lucide-react";

export type DeleteModalStory = {
  id: string;
  title: string;
  isPublished: boolean;
};

type Props = {
  story: DeleteModalStory | null;
  onClose: () => void;
  onDeleted: (storyId: string) => void;
  onUnpublished?: (storyId: string) => void;
};

export function StoryDeleteModal({ story, onClose, onDeleted, onUnpublished }: Props) {
  const [action, setAction] = useState<"idle" | "deleting" | "unpublishing">("idle");
  const [error, setError] = useState("");

  // Reset state when story changes
  useEffect(() => {
    if (story) {
      setAction("idle");
      setError("");
    }
  }, [story?.id]);

  // Close on Escape key
  useEffect(() => {
    if (!story) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [story, onClose]);

  const handleDelete = useCallback(async () => {
    if (!story || action !== "idle") return;
    setAction("deleting");
    setError("");
    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Delete failed.");
      onDeleted(story.id);
      onClose();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setAction("idle");
    }
  }, [story, action, onDeleted, onClose]);

  const handleUnpublish = useCallback(async () => {
    if (!story || action !== "idle") return;
    setAction("unpublishing");
    setError("");
    try {
      const res = await fetch(`/api/admin/stories/${story.id}/unpublish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Unpublish failed.");
      onUnpublished?.(story.id);
      onClose();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed.");
      setAction("idle");
    }
  }, [story, action, onUnpublished, onClose]);

  if (!story) return null;

  const isBusy = action !== "idle";

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised shadow-luxury p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close X */}
        <button
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-ink"
          onClick={onClose}
          disabled={isBusy}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-danger/10 border border-danger/30">
            <Trash2 className="h-7 w-7 text-danger" />
          </div>
          <h2 id="delete-modal-title" className="font-display text-xl font-semibold text-ink">
            Delete Story
          </h2>
          <p className="text-sm text-muted leading-6 max-w-xs">
            <span className="font-semibold text-ink">&ldquo;{story.title}&rdquo;</span>
            {story.isPublished
              ? " is currently live. Choose an action below."
              : " is a draft. This action cannot be undone."}
          </p>
        </div>

        {/* Warning box */}
        {story.isPublished && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Deleting a live story will remove it for all readers. Consider making it unpublished first.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Delete Permanently — always shown */}
          <button
            id={`confirm-delete-${story.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isBusy}
            onClick={handleDelete}
          >
            {action === "deleting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {action === "deleting" ? "Deleting..." : "Delete Permanently"}
          </button>

          {/* Make Unpublished — only for published stories */}
          {story.isPublished && (
            <button
              id={`confirm-unpublish-${story.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning transition hover:bg-warning/20 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isBusy}
              onClick={handleUnpublish}
            >
              {action === "unpublishing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {action === "unpublishing" ? "Unpublishing..." : "Make Unpublished (Keep as Draft)"}
            </button>
          )}

          {/* Cancel */}
          <button
            id={`cancel-delete-${story.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-soft-ink transition hover:bg-surface-soft disabled:opacity-60"
            disabled={isBusy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}