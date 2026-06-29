"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Trash2,
  Plus,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Square,
  Eye,
  EyeOff,
  PenTool,
  BarChart3,
  Star,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useToast } from "@/components/toast-context";

type Chapter = {
  id: string;
  number: number;
  title: string;
  status: string;
  isFree: boolean;
  coinPrice: number;
  publishedAt: string | null;
  content?: string;
};

type StudioProject = { projectId: string; projectTitle: string } | null;

type Story = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  description: string;
  authorName: string;
  coverUrl: string | null;
  publicationStatus: string;
  visibility: string;
  defaultChapterCoinPrice: number;
  freeChapterCap: number;
  ratingAverage: number;
  ratingsCount: number;
  readsCount: number;
  createdAt: string;
  chapters: Chapter[];
  studioProject: StudioProject;
};

const backdropStyle = {
  backgroundImage:
    "radial-gradient(circle at 18% 8%, var(--accent-soft), transparent 34%), radial-gradient(circle at 88% 12%, var(--accent-light), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, var(--accent-soft)) 0%, var(--paper) 52%, color-mix(in srgb, var(--paper) 94%, var(--muted-soft)) 100%)"
};

export function WriterStoryDetails({ story: initialStory }: { story: Story }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [story, setStory] = useState<Story>(initialStory);
  const [loading, setLoading] = useState(false);

  // Modals
  const [editStoryOpen, setEditStoryOpen] = useState(false);
  const [createChapterOpen, setCreateChapterOpen] = useState(false);
  const [editChapterOpen, setEditChapterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "story" | "chapter"; id?: string } | null>(null);

  // Forms
  const [storyForm, setStoryForm] = useState({
    title: story.title,
    genre: story.genre,
    description: story.description,
    authorName: story.authorName,
    coverUrl: story.coverUrl || "",
    defaultChapterCoinPrice: story.defaultChapterCoinPrice,
    freeChapterCap: story.freeChapterCap,
    visibility: story.visibility,
    publicationStatus: story.publicationStatus
  });

  const [chapterForm, setChapterForm] = useState({ title: "", content: "", isFree: false, coinPrice: 0, status: "DRAFT" });
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // Bulk selection
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());

  const refreshStory = useCallback(async () => {
    try {
      const res = await fetch(`/api/writer/stories/${story.id}`);
      const data = await res.json();
      if (data.ok) {
        setStory((prev) => ({ ...prev, ...data.data }));
      }
    } catch (e) {
      console.error("Refresh failed", e);
    }
  }, [story.id]);

  const handleUpdateStory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/writer/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyForm)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Story updated successfully", "success");
        setEditStoryOpen(false);
        await refreshStory();
      } else {
        showToast(data.error?.message || "Update failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChapter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/writer/stories/${story.id}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterForm)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Chapter created", "success");
        setCreateChapterOpen(false);
        setChapterForm({ title: "", content: "", isFree: false, coinPrice: 0, status: "DRAFT" });
        await refreshStory();
      } else {
        showToast(data.error?.message || "Create failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChapter = async () => {
    if (!editingChapter) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/writer/stories/${story.id}/chapters/${editingChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterForm)
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Chapter updated", "success");
        setEditChapterOpen(false);
        setEditingChapter(null);
        await refreshStory();
      } else {
        showToast(data.error?.message || "Update failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/writer/stories/${story.id}/chapters/${chapterId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        showToast("Chapter deleted", "success");
        await refreshStory();
      } else {
        showToast(data.error?.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleDeleteStory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/writer/stories/${story.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        showToast("Story deleted", "success");
        router.push("/writer");
      } else {
        showToast(data.error?.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleReorder = async (chapterId: string, direction: "up" | "down") => {
    const currentIndex = story.chapters.findIndex((c) => c.id === chapterId);
    if (currentIndex === -1) return;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= story.chapters.length) return;

    const newOrder = [...story.chapters];
    [newOrder[currentIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[currentIndex]];
    const chapterIds = newOrder.map((c) => c.id);

    try {
      const res = await fetch(`/api/writer/stories/${story.id}/chapters/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds })
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Reordered", "success");
        await refreshStory();
      } else {
        showToast(data.error?.message || "Reorder failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedChapterIds.size === 0) {
      showToast("Select chapters first", "warning");
      return;
    }
    try {
      const res = await fetch(`/api/writer/stories/${story.id}/chapters/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, chapterIds: Array.from(selectedChapterIds) })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.data?.message || "Updated", "success");
        setSelectedChapterIds(new Set());
        await refreshStory();
      } else {
        showToast(data.error?.message || "Bulk update failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterForm({
      title: chapter.title,
      content: chapter.content || "",
      isFree: chapter.isFree,
      coinPrice: chapter.coinPrice,
      status: chapter.status
    });
    setEditChapterOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedChapterIds.size === story.chapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(story.chapters.map((c) => c.id)));
    }
  };

  const studioLink = story.studioProject
    ? `/writer/studio?platformStoryId=${story.id}&platformStoryTitle=${encodeURIComponent(story.title)}&platformProjectId=${story.studioProject.projectId}`
    : null;

  const statusBadge = (status: string) => {
    if (status === "PUBLISHED")
      return <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-success">Published</span>;
    if (status === "DRAFT")
      return <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-warning">Draft</span>;
    return <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-danger">Trash</span>;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-90" style={backdropStyle} />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-raised backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/writer" className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-soft-ink transition hover:border-accent/45 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Writer Studio
          </Link>
          <div className="flex items-center gap-2">
            {studioLink && (
              <Link href={studioLink} className="inline-flex items-center gap-2 rounded-lg border border-accent2/30 bg-accent2/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent2 transition hover:bg-accent2/20">
                <PenTool className="h-4 w-4" />
                Open Studio
              </Link>
            )}
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-12">
        {/* Story Info */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-border/70 bg-surface/70 p-6 shadow-luxury backdrop-blur-2xl md:p-8"
        >
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0">
              {story.coverUrl ? (
                <img src={story.coverUrl} alt={story.title} className="h-48 w-32 rounded-lg object-cover shadow-soft" />
              ) : (
                <div className="grid h-48 w-32 place-items-center rounded-lg bg-gradient-to-br from-accent via-accent2 to-accent3 text-on-accent shadow-soft">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Story Details</p>
                  <h1 className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">{story.title}</h1>
                  <p className="mt-1 text-sm text-soft-ink">{story.genre} &middot; {story.authorName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditStoryOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-4 py-2.5 text-xs font-bold text-soft-ink transition hover:border-accent/45 hover:text-ink"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Story
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: "story" })}
                    className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs font-bold text-danger transition hover:bg-danger/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusBadge(story.publicationStatus)}
                <span className="rounded-full border border-border/70 bg-surface-soft/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-soft-ink">
                  {story.visibility}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Chapters</p>
                  <p className="mt-1 text-lg font-bold text-ink">{story.chapters.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Reads</p>
                  <p className="mt-1 text-lg font-bold text-ink">{story.readsCount}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Rating</p>
                  <p className="mt-1 text-lg font-bold text-ink">{story.ratingAverage.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Reviews</p>
                  <p className="mt-1 text-lg font-bold text-ink">{story.ratingsCount}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-soft-ink">{story.description}</p>
            </div>
          </div>
        </motion.section>

        {/* Chapters Section */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Chapters</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">Manage Chapters</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedChapterIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkStatus("PUBLISHED")}
                    className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success transition hover:bg-success/15"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Publish Selected
                  </button>
                  <button
                    onClick={() => handleBulkStatus("DRAFT")}
                    className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-bold text-warning transition hover:bg-warning/15"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Unpublish Selected
                  </button>
                </>
              )}
              <button
                onClick={() => setCreateChapterOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-soft transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                Add Chapter
              </button>
            </div>
          </div>

          {story.chapters.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-10 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted" />
              <p className="mt-4 font-display text-xl font-semibold text-ink">No chapters yet</p>
              <p className="mt-2 text-sm text-muted">Add your first chapter to get started.</p>
              <button
                onClick={() => setCreateChapterOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                Add First Chapter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    <th className="px-3 py-3">
                      <button onClick={selectAll} className="flex items-center gap-1">
                        {selectedChapterIds.size === story.chapters.length ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Free</th>
                    <th className="px-3 py-3">Coins</th>
                    <th className="px-3 py-3">Published</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {story.chapters.map((chapter) => (
                    <tr key={chapter.id} className="group transition hover:bg-surface-soft/40">
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(chapter.id)}>
                          {selectedChapterIds.has(chapter.id) ? <Check className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4 text-muted" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-ink">{chapter.number}</td>
                      <td className="px-3 py-3 font-semibold text-ink">{chapter.title}</td>
                      <td className="px-3 py-3">{statusBadge(chapter.status)}</td>
                      <td className="px-3 py-3 text-soft-ink">{chapter.isFree ? "Yes" : "No"}</td>
                      <td className="px-3 py-3 text-soft-ink">{chapter.coinPrice}</td>
                      <td className="px-3 py-3 text-soft-ink">
                        {chapter.publishedAt ? new Date(chapter.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReorder(chapter.id, "up")}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-soft/60 hover:text-ink"
                            title="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReorder(chapter.id, "down")}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-soft/60 hover:text-ink"
                            title="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditChapter(chapter)}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-soft/60 hover:text-ink"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: "chapter", id: chapter.id })}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </div>

      {/* Edit Story Modal */}
      <AnimatePresence>
        {editStoryOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setEditStoryOpen(false); }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-ink">Edit Story</h2>
                <button onClick={() => setEditStoryOpen(false)} className="rounded-lg p-2 text-muted transition hover:bg-surface-soft/60 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Title</label>
                  <input type="text" value={storyForm.title} onChange={(e) => setStoryForm((p) => ({ ...p, title: e.target.value }))} className="lm-input" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Genre</label>
                  <input type="text" value={storyForm.genre} onChange={(e) => setStoryForm((p) => ({ ...p, genre: e.target.value }))} className="lm-input" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Author Name</label>
                  <input type="text" value={storyForm.authorName} onChange={(e) => setStoryForm((p) => ({ ...p, authorName: e.target.value }))} className="lm-input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Description</label>
                  <textarea value={storyForm.description} onChange={(e) => setStoryForm((p) => ({ ...p, description: e.target.value }))} className="lm-input min-h-[120px]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Cover Image URL</label>
                  <input type="url" value={storyForm.coverUrl} onChange={(e) => setStoryForm((p) => ({ ...p, coverUrl: e.target.value }))} className="lm-input" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Default Chapter Coin Price</label>
                  <input type="number" value={storyForm.defaultChapterCoinPrice} onChange={(e) => setStoryForm((p) => ({ ...p, defaultChapterCoinPrice: Number(e.target.value) || 0 }))} className="lm-input" min={0} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Free Chapter Cap</label>
                  <input type="number" value={storyForm.freeChapterCap} onChange={(e) => setStoryForm((p) => ({ ...p, freeChapterCap: Number(e.target.value) || 0 }))} className="lm-input" min={0} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Visibility</label>
                  <select value={storyForm.visibility} onChange={(e) => setStoryForm((p) => ({ ...p, visibility: e.target.value }))} className="lm-input">
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Publication Status</label>
                  <select value={storyForm.publicationStatus} onChange={(e) => setStoryForm((p) => ({ ...p, publicationStatus: e.target.value }))} className="lm-input">
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SCHEDULED">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setEditStoryOpen(false)} className="rounded-lg border border-border/70 px-5 py-3 text-xs font-bold text-soft-ink transition hover:bg-surface-soft/60">Cancel</button>
                <button onClick={handleUpdateStory} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-xs font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Chapter Modal */}
      <AnimatePresence>
        {createChapterOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setCreateChapterOpen(false); }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-ink">Add Chapter</h2>
                <button onClick={() => setCreateChapterOpen(false)} className="rounded-lg p-2 text-muted transition hover:bg-surface-soft/60 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Title</label>
                  <input type="text" value={chapterForm.title} onChange={(e) => setChapterForm((p) => ({ ...p, title: e.target.value }))} className="lm-input" placeholder="Chapter title" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Content</label>
                  <textarea value={chapterForm.content} onChange={(e) => setChapterForm((p) => ({ ...p, content: e.target.value }))} className="lm-input min-h-[200px]" placeholder="Chapter content..." />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                    <input
                      id="ch-free"
                      type="checkbox"
                      checked={chapterForm.isFree}
                      onChange={(e) => setChapterForm((p) => ({ ...p, isFree: e.target.checked, coinPrice: e.target.checked ? 0 : p.coinPrice }))}
                      className="h-4 w-4 accent-accent"
                    />
                    <label htmlFor="ch-free" className="text-sm font-semibold text-ink">Free to read</label>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Coin Price</label>
                    <input type="number" value={chapterForm.coinPrice} onChange={(e) => setChapterForm((p) => ({ ...p, coinPrice: Number(e.target.value) || 0 }))} disabled={chapterForm.isFree} className="lm-input" min={0} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</label>
                    <select value={chapterForm.status} onChange={(e) => setChapterForm((p) => ({ ...p, status: e.target.value }))} className="lm-input">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="TRASH">Trash</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setCreateChapterOpen(false)} className="rounded-lg border border-border/70 px-5 py-3 text-xs font-bold text-soft-ink transition hover:bg-surface-soft/60">Cancel</button>
                <button onClick={handleCreateChapter} disabled={loading || !chapterForm.title} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-xs font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Chapter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Chapter Modal */}
      <AnimatePresence>
        {editChapterOpen && editingChapter && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setEditChapterOpen(false); setEditingChapter(null); } }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-ink">Edit Chapter</h2>
                <button onClick={() => { setEditChapterOpen(false); setEditingChapter(null); }} className="rounded-lg p-2 text-muted transition hover:bg-surface-soft/60 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Title</label>
                  <input type="text" value={chapterForm.title} onChange={(e) => setChapterForm((p) => ({ ...p, title: e.target.value }))} className="lm-input" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Content</label>
                  <textarea value={chapterForm.content} onChange={(e) => setChapterForm((p) => ({ ...p, content: e.target.value }))} className="lm-input min-h-[200px]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-soft/50 p-3">
                    <input
                      id="ech-free"
                      type="checkbox"
                      checked={chapterForm.isFree}
                      onChange={(e) => setChapterForm((p) => ({ ...p, isFree: e.target.checked, coinPrice: e.target.checked ? 0 : p.coinPrice }))}
                      className="h-4 w-4 accent-accent"
                    />
                    <label htmlFor="ech-free" className="text-sm font-semibold text-ink">Free to read</label>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Coin Price</label>
                    <input type="number" value={chapterForm.coinPrice} onChange={(e) => setChapterForm((p) => ({ ...p, coinPrice: Number(e.target.value) || 0 }))} disabled={chapterForm.isFree} className="lm-input" min={0} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</label>
                    <select value={chapterForm.status} onChange={(e) => setChapterForm((p) => ({ ...p, status: e.target.value }))} className="lm-input">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="TRASH">Trash</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setEditChapterOpen(false); setEditingChapter(null); }} className="rounded-lg border border-border/70 px-5 py-3 text-xs font-bold text-soft-ink transition hover:bg-surface-soft/60">Cancel</button>
                <button onClick={handleUpdateChapter} disabled={loading || !chapterForm.title} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-xs font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-md rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury"
            >
              <h2 className="font-display text-2xl font-semibold text-danger">Confirm Deletion</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {deleteConfirm.type === "story"
                  ? "Are you sure you want to delete this story? All chapters and data will be permanently removed. This action cannot be undone."
                  : "Are you sure you want to delete this chapter? This action cannot be undone."}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-border/70 px-5 py-3 text-xs font-bold text-soft-ink transition hover:bg-surface-soft/60">Cancel</button>
                <button
                  onClick={() => {
                    if (deleteConfirm.type === "story") handleDeleteStory();
                    else if (deleteConfirm.id) handleDeleteChapter(deleteConfirm.id);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-danger px-5 py-3 text-xs font-bold text-on-danger shadow-soft transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
