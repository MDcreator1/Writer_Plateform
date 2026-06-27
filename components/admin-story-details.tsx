"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Coins,
  CreditCard,
  Edit3,
  ExternalLink,
  Star,
  Trash,
  ChevronUp,
  ChevronDown,
  Settings,
  Plus,
  Save,
  X,
  Calendar,
  CheckSquare,
  Square
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CustomSelect } from "@/components/custom-select";
import { useToast } from "@/components/toast-context";

type AdminStoryDetailsProps = {
  data: {
    story: {
      id: string;
      title: string;
      slug: string;
      genre: string;
      description: string;
      authorName: string;
      coverUrl: string | null;
      storyType: string;
      ratingAverage: number;
      readsCount: number;
      defaultChapterCoinPrice: number;
      freeChapterCap: number;
      origin: string;
      createdAt: string;
      visibility: string;
      publicationStatus: string;
      scheduledAt?: string | null;
      bookmarksCount: number;
      commentsCount: number;
      ratingsCount: number;
    };
    chapters: Array<{
      id: string;
      number: number;
      title: string;
      status: string;
      coinPrice: number;
      isFree: boolean;
      studioDocumentId: string | null;
      purchaseCount: number;
      totalRevenueCoins: number;
      publishedAt?: string | null;
    }>;
    studioProject: {
      projectId: string;
      projectTitle: string;
      source: string;
      workspaceMaterializedAt: string | null;
      _count: { files: number };
    } | null;
    stats: {
      totalChapters: number;
      publishedChapters: number;
      draftChapters: number;
      trashChapters: number;
      totalPurchases: number;
      totalRevenueCoins: number;
    };
  };
};

export function AdminStoryDetails({ data }: AdminStoryDetailsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteStoryOpen, setConfirmDeleteStoryOpen] = useState(false);
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null);
  const [confirmBulkStatus, setConfirmBulkStatus] = useState<"PUBLISHED" | "DRAFT" | null>(null);

  const { story, chapters, studioProject, stats } = data;

  // --- Reordering & Chapter list state ---
  const [chaptersList, setChaptersList] = useState(chapters);
  useEffect(() => {
    setChaptersList(chapters);
  }, [chapters]);

  // --- Story Edit Modal State ---
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyForm, setStoryForm] = useState({
    title: story.title,
    slug: story.slug,
    genre: story.genre,
    description: story.description,
    authorName: story.authorName,
    coverUrl: story.coverUrl || "",
    seoTitle: story.title,
    seoDescription: story.description.slice(0, 150),
    defaultChapterCoinPrice: story.defaultChapterCoinPrice,
    freeChapterCap: story.freeChapterCap,
    visibility: story.visibility,
    publicationStatus: story.publicationStatus,
    scheduledAt: story.scheduledAt ? story.scheduledAt.slice(0, 16) : ""
  });
  const [savingStory, setSavingStory] = useState(false);

  // --- Chapter Creation State ---
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    title: "",
    content: "",
    isFree: false,
    coinPrice: story.defaultChapterCoinPrice,
    status: "DRAFT",
    publishedAt: ""
  });
  const [savingChapter, setSavingChapter] = useState(false);

  // --- Chapter Editing State ---
  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [chapterContent, setChapterContent] = useState("");
  const [editingChapterLoading, setEditingChapterLoading] = useState(false);
  const [savingEditChapter, setSavingEditChapter] = useState(false);

  // --- Bulk Selection State ---
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  const chapterGroups = [
    {
      status: "PUBLISHED",
      title: "Published Chapters",
      description: "Live chapters currently available to readers.",
      empty: "No chapters are live yet.",
      chapters: chaptersList.filter((chapter) => chapter.status === "PUBLISHED")
    },
    {
      status: "DRAFT",
      title: "Draft Chapters",
      description: "Authoring drafts that are not live on the story.",
      empty: "No chapter drafts are waiting for publication.",
      chapters: chaptersList.filter((chapter) => chapter.status === "DRAFT")
    },
    {
      status: "TRASH",
      title: "Trash",
      description: "Documents currently kept in Writing Studio recycle bin.",
      empty: "Trash is empty.",
      chapters: chaptersList.filter((chapter) => chapter.status === "TRASH")
    }
  ] as const;

  function buildWritingStudioUrl(chapterId?: string) {
    const studioUrl = "/admin/studio";
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

    try {
      const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const url = new URL(studioUrl, base);
      url.searchParams.set("platformAction", "manage-chapters");
      url.searchParams.set("platformUrl", platformUrl || base);
      url.searchParams.set("platformStoryId", story.id);
      url.searchParams.set("platformStoryTitle", story.title);
      if (studioProject?.projectId) {
        url.searchParams.set("platformProjectId", studioProject.projectId);
      }
      if (chapterId) {
        url.searchParams.set("platformChapterId", chapterId);
      }
      return url.toString();
    } catch {
      return studioUrl;
    }
  }

  // --- Story Actions handlers ---
  async function handleSaveStorySettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingStory(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyForm)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed to save story settings.");

      setSuccessMessage("Story settings updated successfully!");
      setIsEditingStory(false);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update story.");
    } finally {
      setSavingStory(false);
    }
  }

  async function handleDeleteStory() {
    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, {
        method: "DELETE"
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed to delete story.");

      showToast(`Story "${story.title}" was permanently deleted.`, "success");
      router.push("/admin");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete story.", "error");
    }
  }

  // --- Chapter Actions handlers ---
  async function handleCreateChapter(e: React.FormEvent) {
    e.preventDefault();
    setSavingChapter(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/stories/${story.id}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterForm)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed to create chapter.");

      setSuccessMessage(`Chapter "${chapterForm.title}" created successfully.`);
      setIsAddingChapter(false);
      setChapterForm({
        title: "",
        content: "",
        isFree: false,
        coinPrice: story.defaultChapterCoinPrice,
        status: "DRAFT",
        publishedAt: ""
      });
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create chapter.");
    } finally {
      setSavingChapter(false);
    }
  }

  async function handleOpenEditChapterModal(chapter: any) {
    setEditingChapterLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/admin/stories/${story.id}/chapters/${chapter.id}`);
      const body = await res.json();
      if (res.ok) {
        setEditingChapter(body.data);
        setChapterContent(body.data.content || "");
      } else {
        showToast(body.error?.message || "Failed to fetch chapter details", "error");
      }
    } catch (err) {
      showToast("Error loading chapter details", "error");
    } finally {
      setEditingChapterLoading(false);
    }
  }

  async function handleSaveChapterEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEditChapter(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/stories/${story.id}/chapters/${editingChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingChapter.title,
          content: chapterContent,
          isFree: editingChapter.isFree,
          coinPrice: editingChapter.coinPrice,
          status: editingChapter.status,
          publishedAt: editingChapter.publishedAt ? editingChapter.publishedAt.slice(0, 16) : ""
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Failed to save chapter edits.");

      setSuccessMessage(`Chapter "${editingChapter.title}" updated successfully.`);
      setEditingChapter(null);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save chapter edits.");
    } finally {
      setSavingEditChapter(false);
    }
  }

  async function handleDeleteChapter(chapterId: string, chapterTitle: string) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/admin/stories/${encodeURIComponent(story.id)}/chapters/${encodeURIComponent(chapterId)}`, {
        method: "DELETE"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "Failed to delete chapter");
      
      setSuccessMessage(`Chapter "${chapterTitle}" deleted successfully.`);
      showToast(`Chapter "${chapterTitle}" deleted successfully.`, "success");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete chapter.");
      showToast(err instanceof Error ? err.message : "Failed to delete chapter.", "error");
    }
  }

  // --- Chapter Reordering ---
  async function moveChapter(index: number, direction: "up" | "down") {
    const newList = [...chaptersList];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    // Swap
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    // optimistic update
    setChaptersList(newList);

    try {
      const res = await fetch(`/api/admin/stories/${story.id}/chapters/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: newList.map((c) => c.id) })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save order on database.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reorder chapters", "error");
      setChaptersList(chapters); // reset
    }
  }

  // --- Chapter Selection & Bulk operations ---
  function toggleSelectChapter(id: string) {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }

  function handleSelectAll(groupIds: string[]) {
    const allSelected = groupIds.every((id) => selectedChapters.includes(id));
    if (allSelected) {
      setSelectedChapters((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedChapters((prev) => [...new Set([...prev, ...groupIds])]);
    }
  }

  async function handleBulkStatus(status: "PUBLISHED" | "DRAFT") {
    if (selectedChapters.length === 0) return;

    try {
      const res = await fetch(`/api/admin/stories/${story.id}/chapters/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: selectedChapters, status })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Bulk operation failed.");

      showToast(`Successfully updated ${selectedChapters.length} chapters to ${status.toLowerCase()}.`, "success");
      setSelectedChapters([]);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bulk operation failed.", "error");
    }
  }

  return (
    <main className="min-h-screen pb-20 bg-paper">
      <header className="lm-topbar admin-header bg-surface border-b border-border">
        <nav className="admin-nav mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin" className="admin-back-to-marketplace inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="admin-header-actions flex items-center gap-3">
            <span className="admin-mfa-badge rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              Story Admin Console
            </span>
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      <section className="admin-main-section mx-auto max-w-7xl px-5 py-10">
        {/* Story Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between bg-surface border border-border p-6 rounded-2xl">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent3">
                {story.genre}
              </span>
              <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {story.storyType}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                story.publicationStatus === "PUBLISHED" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}>
                {story.publicationStatus}
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold text-ink">{story.title}</h1>
            <p className="mt-1 text-muted">By {story.authorName} · Created on {new Date(story.createdAt).toLocaleDateString()}</p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-soft-ink">{story.description}</p>
            {story.scheduledAt && (
              <p className="mt-2 text-xs text-accent font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Scheduled for: {new Date(story.scheduledAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap shrink-0 gap-2">
            <button
              onClick={() => setIsEditingStory(true)}
              className="lm-btn-secondary inline-flex items-center gap-1.5 py-2 px-3 text-sm font-semibold"
            >
              <Settings className="h-4 w-4" /> Edit Story Settings
            </button>
            <button
              onClick={() => setIsAddingChapter(true)}
              className="lm-btn-primary inline-flex items-center gap-1.5 py-2 px-3 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Chapter
            </button>
            <a
              href={buildWritingStudioUrl()}
              className="lm-btn-secondary inline-flex items-center gap-2 py-2 px-3 text-sm"
            >
              <BookOpen className="h-4 w-4" />
              Open Studio
            </a>
          </div>
        </div>

        {/* Messaging status */}
        {errorMessage && (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger animate-in fade-in">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success animate-in fade-in">
            {successMessage}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="admin-analytics-card lm-card bg-surface border border-border p-5 rounded-xl">
            <BookOpen className="h-6 w-6 text-accent" />
            <strong className="admin-analytic-value mt-4 block font-display text-2xl text-ink font-semibold">
              {story.readsCount.toLocaleString()}
            </strong>
            <span className="admin-analytic-label text-sm text-muted">Total Reads</span>
          </div>

          <div className="admin-analytics-card lm-card bg-surface border border-border p-5 rounded-xl">
            <Star className="h-6 w-6 text-accent" />
            <strong className="admin-analytic-value mt-4 block font-display text-2xl text-ink font-semibold">
              {story.ratingAverage.toFixed(1)} / 5.0
            </strong>
            <span className="admin-analytic-label text-sm text-muted">Average Rating ({story.ratingsCount} reviews)</span>
          </div>

          <div className="admin-analytics-card lm-card bg-surface border border-border p-5 rounded-xl">
            <Coins className="h-6 w-6 text-accent" />
            <strong className="admin-analytic-value mt-4 block font-display text-2xl text-ink font-semibold">
              {stats.totalPurchases.toLocaleString()}
            </strong>
            <span className="admin-analytic-label text-sm text-muted">Total Chapter Unlocks</span>
          </div>

          <div className="admin-analytics-card lm-card bg-surface border border-border p-5 rounded-xl">
            <CreditCard className="h-6 w-6 text-accent" />
            <strong className="admin-analytic-value mt-4 block font-display text-2xl text-ink font-semibold">
              {stats.totalRevenueCoins.toLocaleString()} Coins
            </strong>
            <span className="admin-analytic-label text-sm text-muted">Estimated Revenue</span>
          </div>
        </div>

        {/* Floating Bulk Actions Bar */}
        {selectedChapters.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-border px-6 py-4 rounded-full shadow-luxury flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-200">
            <span className="text-sm font-semibold text-ink">{selectedChapters.length} chapters selected</span>
            <div className="flex gap-2 relative">
              <button
                type="button"
                onClick={() => setConfirmBulkStatus("PUBLISHED")}
                className="lm-btn-primary px-3 py-1.5 text-xs font-semibold"
              >
                Publish Selected
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkStatus("DRAFT")}
                className="lm-btn-secondary px-3 py-1.5 text-xs font-semibold text-warning"
              >
                Unpublish Selected
              </button>
              
              {confirmBulkStatus && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-surface border border-border p-4 rounded-xl shadow-luxury z-50 min-w-[280px] text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <p className="text-xs font-semibold text-ink leading-relaxed">
                    Bulk set status to <span className="font-bold text-accent">{confirmBulkStatus.toLowerCase()}</span> for the {selectedChapters.length} selected chapters?
                  </p>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmBulkStatus(null)}
                      className="px-2.5 py-1 text-[10px] font-semibold border border-border text-muted rounded-lg hover:bg-surface-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBulkStatus(confirmBulkStatus);
                        setConfirmBulkStatus(null);
                      }}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-accent text-paper rounded-lg hover:bg-accent/90"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedChapters([])}
                className="p-1.5 text-muted hover:text-ink hover:bg-surface-soft rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Chapters Section */}
        <div className="lm-card bg-surface mt-8 p-6 border border-border rounded-2xl">
          <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="admin-card-heading font-display text-2xl font-semibold text-ink">Chapter Status & Editing</h2>
              <p className="mt-1 text-sm text-muted">
                Toggle selections to bulk update. Click Up/Down arrows to change chapter numbers. Click Edit to adjust custom prices.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
              <span className="rounded-full bg-success/15 px-3 py-1 text-success">{stats.publishedChapters} published</span>
              <span className="rounded-full bg-warning/15 px-3 py-1 text-warning">{stats.draftChapters} drafts</span>
              <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">{stats.trashChapters} trash</span>
            </div>
          </div>

          <div className="mt-6 space-y-8">
            {chapterGroups.map((group) => {
              const groupIds = group.chapters.map((c) => c.id);
              const allSelected = groupIds.length > 0 && groupIds.every((id) => selectedChapters.includes(id));
              
              return (
                <section key={group.status} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="flex items-center justify-between bg-surface-soft px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      {group.chapters.length > 0 && (
                        <button
                          onClick={() => handleSelectAll(groupIds)}
                          className="text-muted hover:text-ink transition"
                          title="Select all chapters in group"
                        >
                          {allSelected ? <CheckSquare className="h-4.5 w-4.5 text-accent" /> : <Square className="h-4.5 w-4.5" />}
                        </button>
                      )}
                      <div>
                        <h3 className="font-semibold text-ink">{group.title}</h3>
                        <p className="text-xs text-muted">{group.description}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-surface border border-border px-2.5 py-1 text-xs font-semibold text-muted">{group.chapters.length}</span>
                  </div>
                  {group.chapters.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-muted">
                          <tr className="border-b border-border bg-surface-soft/20">
                            <th className="py-3 pl-4 pr-2 w-10">Select</th>
                            <th className="py-3 pr-2 w-16 text-center">No.</th>
                            <th className="py-3 pr-4">Title</th>
                            <th className="py-3 pr-4 w-32">Status</th>
                            <th className="py-3 pr-4 w-32">Pricing</th>
                            <th className="py-3 pr-4 w-28">Unlocks</th>
                            <th className="py-3 pl-4 pr-4 w-72 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.chapters.map((chapter) => {
                            const globalIndex = chaptersList.findIndex((c) => c.id === chapter.id);
                            
                            return (
                              <tr key={chapter.id} className="align-middle hover:bg-surface-soft/20 transition">
                                <td className="py-3 pl-4 pr-2">
                                  <button onClick={() => toggleSelectChapter(chapter.id)} className="text-muted hover:text-ink">
                                    {selectedChapters.includes(chapter.id) ? (
                                      <CheckSquare className="h-4 w-4 text-accent" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 pr-2 text-center font-semibold text-ink">{chapter.number}</td>
                                <td className="py-3 pr-4 font-semibold text-ink">
                                  {chapter.title}
                                  {chapter.studioDocumentId && (
                                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-muted">Doc ID: {chapter.studioDocumentId}</span>
                                  )}
                                  {chapter.publishedAt && (
                                    <span className="text-[10px] text-accent font-semibold block mt-0.5">
                                      Published: {new Date(chapter.publishedAt).toLocaleString()}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                                    chapter.status === "PUBLISHED"
                                      ? "bg-success/15 text-success"
                                      : chapter.status === "TRASH"
                                        ? "bg-danger/10 text-danger"
                                        : "bg-warning/15 text-warning"
                                  }`}>
                                    {chapter.status.toLowerCase()}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-ink font-semibold">
                                  {chapter.isFree ? (
                                    <span className="text-success">Free</span>
                                  ) : (
                                    <span>{chapter.coinPrice} Coins</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4 font-mono text-ink">{chapter.purchaseCount}</td>
                                <td className="py-3 pl-4 pr-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Reordering triggers */}
                                    <button
                                      disabled={globalIndex <= 0}
                                      onClick={() => moveChapter(globalIndex, "up")}
                                      className="p-1 rounded text-muted hover:text-ink hover:bg-surface-soft disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="Move Chapter Up"
                                    >
                                      <ChevronUp className="h-4.5 w-4.5" />
                                    </button>
                                    <button
                                      disabled={globalIndex >= chaptersList.length - 1}
                                      onClick={() => moveChapter(globalIndex, "down")}
                                      className="p-1 rounded text-muted hover:text-ink hover:bg-surface-soft disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="Move Chapter Down"
                                    >
                                      <ChevronDown className="h-4.5 w-4.5" />
                                    </button>

                                    {/* Edit & delete triggers */}
                                    <button
                                      disabled={editingChapterLoading}
                                      onClick={() => handleOpenEditChapterModal(chapter)}
                                      className="lm-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
                                      title="Edit chapter title/pricing/content"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" /> Quick Edit
                                    </button>

                                    <a
                                      href={buildWritingStudioUrl(chapter.studioDocumentId || chapter.id)}
                                      className="lm-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                                      title="Open chapter in Writing Studio"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" /> Open in Studio
                                    </a>

                                    <div className="relative inline-block">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteChapterId(chapter.id)}
                                        className="rounded-lg border border-danger/30 bg-danger/10 p-1.5 text-danger transition hover:bg-danger/25"
                                        title="Permanently delete chapter"
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </button>
                                      {confirmDeleteChapterId === chapter.id && (
                                        <div className="absolute bottom-full mb-2 right-0 bg-surface border border-border p-3 rounded-lg shadow-luxury z-50 min-w-[220px] text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                                          <p className="text-xs font-semibold text-ink leading-normal">
                                            Delete chapter "{chapter.title}"? This deletes all purchase histories.
                                          </p>
                                          <div className="flex gap-2 mt-2.5 justify-end">
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteChapterId(null)}
                                              className="px-2 py-0.5 text-[9px] font-semibold border border-border text-muted rounded hover:bg-surface-soft"
                                            >
                                              No
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmDeleteChapterId(null);
                                                handleDeleteChapter(chapter.id, chapter.title);
                                              }}
                                              className="px-2 py-0.5 text-[9px] font-semibold bg-danger text-white rounded hover:bg-danger/90"
                                            >
                                              Yes, Delete
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-4 py-7 text-center text-sm text-muted bg-surface">{group.empty}</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </section>

      {/* MODAL 1: EDIT STORY SETTINGS */}
      {isEditingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-luxury flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <h3 className="font-display text-xl font-semibold text-ink">Edit Story Details & Pricing</h3>
              <button onClick={() => setIsEditingStory(false)} className="text-muted hover:text-ink font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveStorySettings} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Story Title *</label>
                  <input
                    type="text"
                    required
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    className="lm-input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Custom URL Slug</label>
                  <input
                    type="text"
                    value={storyForm.slug}
                    onChange={(e) => setStoryForm({ ...storyForm, slug: e.target.value })}
                    placeholder="URL slug-format"
                    className="lm-input text-sm w-full"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Main Genre *</label>
                  <input
                    type="text"
                    required
                    value={storyForm.genre}
                    onChange={(e) => setStoryForm({ ...storyForm, genre: e.target.value })}
                    className="lm-input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Author name *</label>
                  <input
                    type="text"
                    required
                    value={storyForm.authorName}
                    onChange={(e) => setStoryForm({ ...storyForm, authorName: e.target.value })}
                    className="lm-input text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Story Description *</label>
                <textarea
                  rows={4}
                  required
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                  className="lm-input text-sm w-full resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Default Coin Price</label>
                  <input
                    type="number"
                    value={storyForm.defaultChapterCoinPrice}
                    onChange={(e) => setStoryForm({ ...storyForm, defaultChapterCoinPrice: Number(e.target.value) })}
                    className="lm-input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Free Chapters Cap</label>
                  <input
                    type="number"
                    value={storyForm.freeChapterCap}
                    onChange={(e) => setStoryForm({ ...storyForm, freeChapterCap: Number(e.target.value) })}
                    className="lm-input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={storyForm.coverUrl}
                    onChange={(e) => setStoryForm({ ...storyForm, coverUrl: e.target.value })}
                    placeholder="https://..."
                    className="lm-input text-sm w-full"
                  />
                </div>
              </div>

              <div className="p-3 border border-border rounded-xl bg-surface-soft/20 space-y-3">
                <h4 className="text-sm font-semibold text-ink">Publication Visibility</h4>
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <label className="block text-xs text-muted mb-1">Status</label>
                    <CustomSelect
                      value={storyForm.publicationStatus}
                      onChange={(val) => setStoryForm({ ...storyForm, publicationStatus: val })}
                      options={[
                        { value: "DRAFT", label: "Draft (Private)" },
                        { value: "PUBLISHED", label: "Published (Live)" },
                        { value: "SCHEDULED", label: "Scheduled" },
                        { value: "ARCHIVED", label: "Archived" }
                      ]}
                      size="sm"
                      triggerClassName="bg-surface border-border hover:border-accent text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Visibility Mode</label>
                    <CustomSelect
                      value={storyForm.visibility}
                      onChange={(val) => setStoryForm({ ...storyForm, visibility: val })}
                      options={[
                        { value: "PRIVATE", label: "Private" },
                        { value: "UNLISTED", label: "Unlisted" },
                        { value: "PUBLIC", label: "Public" }
                      ]}
                      size="sm"
                      triggerClassName="bg-surface border-border hover:border-accent text-xs w-full"
                    />
                  </div>
                  {storyForm.publicationStatus === "SCHEDULED" && (
                    <div>
                      <label className="block text-xs text-muted mb-1">Schedule date</label>
                      <input
                        type="datetime-local"
                        required
                        value={storyForm.scheduledAt}
                        onChange={(e) => setStoryForm({ ...storyForm, scheduledAt: e.target.value })}
                        className="lm-input text-sm w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStoryOpen(true)}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-danger border border-danger/30 hover:bg-danger/10 rounded-lg"
                  >
                    <Trash className="h-4 w-4" /> Delete Story
                  </button>
                  {confirmDeleteStoryOpen && (
                    <div className="absolute bottom-full mb-2 left-0 bg-surface border border-border p-4 rounded-xl shadow-luxury z-50 min-w-[280px] text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <p className="text-xs font-semibold text-ink leading-relaxed">
                        Are you sure you want to permanently delete "{story.title}"? This will delete all chapters, reading history, bookmarks, and purchases.
                      </p>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStoryOpen(false)}
                          className="px-2.5 py-1 text-[10px] font-semibold border border-border text-muted rounded-lg hover:bg-surface-soft"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteStoryOpen(false);
                            handleDeleteStory();
                          }}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-danger text-white rounded-lg hover:bg-danger/90"
                        >
                          Permanently Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingStory(false)}
                    className="lm-btn-secondary py-2 px-4 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStory}
                    className="lm-btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" /> {savingStory ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CHAPTER */}
      {isAddingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-luxury flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <h3 className="font-display text-xl font-semibold text-ink">Add New Chapter</h3>
              <button onClick={() => setIsAddingChapter(false)} className="text-muted hover:text-ink font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateChapter} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1: The New Horizon"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="lm-input text-sm w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Chapter Content (Text)</label>
                <textarea
                  rows={8}
                  placeholder="Paste or write chapter body copy here..."
                  value={chapterForm.content}
                  onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })}
                  className="lm-input text-sm w-full font-serif resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addIsFree"
                    checked={chapterForm.isFree}
                    onChange={(e) => setChapterForm({ ...chapterForm, isFree: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="addIsFree" className="text-sm font-semibold text-ink">Free Chapter</label>
                </div>

                {!chapterForm.isFree && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Coin Price</label>
                    <input
                      type="number"
                      required
                      value={chapterForm.coinPrice}
                      onChange={(e) => setChapterForm({ ...chapterForm, coinPrice: Number(e.target.value) })}
                      className="lm-input text-sm w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Status</label>
                  <CustomSelect
                    value={chapterForm.status}
                    onChange={(val) => setChapterForm({ ...chapterForm, status: val })}
                    options={[
                      { value: "DRAFT", label: "Draft" },
                      { value: "PUBLISHED", label: "Published" }
                    ]}
                    size="sm"
                    triggerClassName="bg-surface border-border hover:border-accent text-xs w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddingChapter(false)}
                  className="lm-btn-secondary py-2 px-4 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="lm-btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1"
                >
                  <Save className="h-4 w-4" /> {savingChapter ? "Creating..." : "Create Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT CHAPTER DETAILS */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-luxury flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <h3 className="font-display text-xl font-semibold text-ink">Edit Chapter #{editingChapter.number}</h3>
              <button onClick={() => setEditingChapter(null)} className="text-muted hover:text-ink font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveChapterEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={editingChapter.title}
                  onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                  className="lm-input text-sm w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Chapter Content (Text)</label>
                <textarea
                  rows={8}
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  className="lm-input text-sm w-full font-serif resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsFree"
                    checked={editingChapter.isFree}
                    onChange={(e) => setEditingChapter({ ...editingChapter, isFree: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="editIsFree" className="text-sm font-semibold text-ink">Free Chapter</label>
                </div>

                {!editingChapter.isFree && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Coin Price</label>
                    <input
                      type="number"
                      required
                      value={editingChapter.coinPrice}
                      onChange={(e) => setEditingChapter({ ...editingChapter, coinPrice: Number(e.target.value) })}
                      className="lm-input text-sm w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Status</label>
                  <CustomSelect
                    value={editingChapter.status}
                    onChange={(val) => setEditingChapter({ ...editingChapter, status: val })}
                    options={[
                      { value: "DRAFT", label: "Draft" },
                      { value: "PUBLISHED", label: "Published" },
                      { value: "TRASH", label: "Trash" }
                    ]}
                    size="sm"
                    triggerClassName="bg-surface border-border hover:border-accent text-xs w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="lm-btn-secondary py-2 px-4 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditChapter}
                  className="lm-btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1"
                >
                  <Save className="h-4 w-4" /> {savingEditChapter ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
