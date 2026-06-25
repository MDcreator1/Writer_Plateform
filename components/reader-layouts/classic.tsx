"use client";

import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Star,
  Unlock,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedReader } from "@/components/protected-reader";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CustomSelect } from "@/components/custom-select";
import { type Chapter, type Story } from "@/lib/content";
import { studioContentToReviewBlocks, type StudioReviewBlock } from "@/lib/studio-content-renderer";
import { useToast } from "@/components/toast-context";

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type ReaderUser = {
  id: string;
  username: string;
  emailHash: string;
  sessionId: string;
};

type ReaderPageProps = {
  story: Story;
  initialCoinBalance: number;
  currentUser: ReaderUser;
};

type SecureContentPayload = {
  chapter: {
    id: string;
    number: number;
    title: string;
    content: string;
  };
};

type UnlockPayload = {
  alreadyUnlocked: boolean;
  coinBalance: number | null;
};

function splitChapterContent(content: string) {
  return studioContentToReviewBlocks(content);
}

export const metadata = {
  name: "Classic Reader",
  description: "Traditional clean page layout with configurable fonts and side drawer navigation."
};

export default function ClassicLayout({ story, initialCoinBalance, currentUser }: ReaderPageProps) {
  const { showToast } = useToast();
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [unlockedIds, setUnlockedIds] = useState(
    () => new Set(story.chapterList.filter((chapter) => chapter.state !== "locked").map((chapter) => chapter.id))
  );
  const [activeChapterId, setActiveChapterId] = useState(story.chapterList[0]?.id);
  const [chapterContents, setChapterContents] = useState<Record<string, StudioReviewBlock[]>>({});
  const [contentLoadingId, setContentLoadingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [readerNotice, setReaderNotice] = useState("");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Georgia");
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [rating, setRating] = useState(5);

  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [showComments, setShowComments] = useState(false);

  const activeIndex = story.chapterList.findIndex((chapter) => chapter.id === activeChapterId);
  const activeChapter = story.chapterList[activeIndex] ?? story.chapterList[0];
  const isUnlocked = activeChapter ? unlockedIds.has(activeChapter.id) : false;
  const activeContent = activeChapter ? chapterContents[activeChapter.id] ?? [] : [];
  const contentLoading = activeChapter ? contentLoadingId === activeChapter.id : false;

  const pageStyle = useMemo(
    () => ({
      fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight: 1.8
    }),
    [fontFamily, fontSize]
  );

  const loadChapterContent = useCallback(async (chapterId: string) => {
    if (chapterContents[chapterId]?.length) {
      return;
    }

    setContentLoadingId(chapterId);
    setReaderNotice("");

    try {
      const response = await fetch(`/api/chapters/${chapterId}/secure-content`);
      const payload = (await response.json()) as ApiResponse<SecureContentPayload>;

      if (!payload.ok) {
        throw new Error(payload.error.message);
      }

      const paragraphs = splitChapterContent(payload.data.chapter.content);
      setChapterContents((current) => ({ ...current, [chapterId]: paragraphs }));
    } catch (error) {
      setReaderNotice(error instanceof Error ? error.message : "Unable to load secure chapter content.");
    } finally {
      setContentLoadingId((current) => (current === chapterId ? null : current));
    }
  }, [chapterContents]);

  async function unlockChapter(chapter: Chapter) {
    if (unlockedIds.has(chapter.id)) {
      setActiveChapterId(chapter.id);
      void loadChapterContent(chapter.id);
      return;
    }

    if (coinBalance < chapter.coinPrice) {
      setReaderNotice("Not enough coins. Buy coins from the home page wallet section.");
      return;
    }

    setUnlockingId(chapter.id);
    setReaderNotice("");

    try {
      const response = await fetch(`/api/chapters/${chapter.id}/unlock`, { method: "POST" });
      const payload = (await response.json()) as ApiResponse<UnlockPayload>;

      if (!payload.ok) {
        throw new Error(payload.error.message);
      }

      if (typeof payload.data.coinBalance === "number") {
        setCoinBalance(payload.data.coinBalance);
      }

      setUnlockedIds((current) => new Set([...current, chapter.id]));
      setActiveChapterId(chapter.id);
      await loadChapterContent(chapter.id);
    } catch (error) {
      setReaderNotice(error instanceof Error ? error.message : "Unable to unlock chapter.");
    } finally {
      setUnlockingId((current) => (current === chapter.id ? null : current));
    }
  }

  const fetchComments = useCallback(async (chapterId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?storyId=${story.id}&chapterId=${chapterId}`);
      const body = await res.json();
      if (res.ok) {
        setComments(body.data || []);
      }
    } catch (err) {
      console.error("Error fetching comments", err);
    } finally {
      setLoadingComments(false);
    }
  }, [story.id]);

  const handlePostComment = async () => {
    if (!commentText.trim() || !activeChapter) return;
    setPostingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          chapterId: activeChapter.id,
          body: commentText.trim()
        })
      });
      const body = await res.json();
      if (res.ok) {
        setCommentText("");
        fetchComments(activeChapter.id);
      } else {
        showToast(body.error?.message || "Failed to post comment", "error");
      }
    } catch (err) {
      showToast("Error posting comment", "error");
    } finally {
      setPostingComment(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!activeChapter) return;
    const nextState = !liked;
    setLiked(nextState);
    try {
      if (nextState) {
        await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId: story.id,
            chapterId: activeChapter.id,
            value: 5
          })
        });
      } else {
        await fetch(`/api/ratings?storyId=${story.id}&chapterId=${activeChapter.id}`, {
          method: "DELETE"
        });
      }
    } catch (err) {
      console.error("Error toggling like status", err);
      setLiked(!nextState);
    }
  };

  useEffect(() => {
    if (activeChapter) {
      fetchComments(activeChapter.id);

      const fetchLikedStatus = async () => {
        try {
          const res = await fetch(`/api/ratings?storyId=${story.id}&chapterId=${activeChapter.id}`);
          const body = await res.json();
          if (res.ok && body.data) {
            setLiked(true);
          } else {
            setLiked(false);
          }
        } catch {
          setLiked(false);
        }
      };

      fetchLikedStatus();

      const saveReadingHistory = async () => {
        try {
          await fetch("/api/reading-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storyId: story.id,
              chapterId: activeChapter.id,
              progressPct: 100
            })
          });
        } catch (err) {
          console.error("Error saving reading history", err);
        }
      };

      if (isUnlocked) {
        void loadChapterContent(activeChapter.id);
        saveReadingHistory();
      }
    }
  }, [activeChapter?.id, isUnlocked, fetchComments, loadChapterContent, story.id]);

  const searchChapterByNumber = () => {
    const chapterNumber = Number(chapterSearch);
    const chapter = story.chapterList.find((item) => item.number === chapterNumber);

    if (!chapter) return;
    const unlocked = unlockedIds.has(chapter.id);

    if (unlocked) {
      setActiveChapterId(chapter.id);
      void loadChapterContent(chapter.id);
    } else {
      void unlockChapter(chapter);
    }

    setShowChapterPanel(false);
    setChapterSearch("");
  };

  if (!story.chapterList.length || !activeChapter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface via-surface-raised to-surface-soft">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20" />
          <p className="text-lg font-semibold text-muted">No chapters available</p>
        </div>
      </div>
    );
  }

  const progress = Math.round(((activeIndex + 1) / story.chapterList.length) * 100);

  const goToChapter = (direction: "previous" | "next") => {
    const nextIndex = direction === "next" ? activeIndex + 1 : activeIndex - 1;
    const chapter = story.chapterList[nextIndex];
    if (chapter) {
      setActiveChapterId(chapter.id);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-surface via-surface to-surface-soft text-ink transition-colors duration-500">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-accent2/5 blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-border/50 bg-surface-raised/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-surface-soft to-surface border border-border/50 shadow-sm transition-all hover:scale-105 hover:border-accent/50 hover:shadow-accent/20 hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 text-ink transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-ink line-clamp-1 tracking-tight">{story.title}</h1>
              <p className="text-xs text-muted font-medium">Chapter {activeChapter.number} • {activeChapter.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChapterPanel(true)}
              className="group flex items-center gap-2 rounded-xl border border-border/60 bg-surface-soft/80 px-4 py-2 text-sm font-semibold text-ink transition-all hover:border-accent/60 hover:bg-accent/5 hover:text-accent hover:shadow-sm"
            >
              <BookOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">Chapters</span>
            </button>
            <span className="group flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-accent2/10 px-3.5 py-1.5 text-sm font-bold text-accent shadow-sm transition-all hover:shadow-accent/20 hover:shadow-md">
              <Coins className="h-4 w-4 transition-transform group-hover:rotate-12" />
              {coinBalance}
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed left-0 top-[61px] z-50 h-1 w-full bg-surface-soft/50">
        <div
          className="relative h-full bg-gradient-to-r from-accent via-accent2 to-accent transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent shadow-lg shadow-accent/50 ring-2 ring-surface" />
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-40 pt-24 sm:px-6">
        {/* Story Title + Rating Block */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              {story.genre}
            </p>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight text-ink md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-br from-ink via-ink to-muted bg-clip-text text-transparent">
              {story.title}
            </span>
          </h1>
          <div className="mt-5 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="group relative p-1 transition-all hover:scale-125 active:scale-95"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-6 w-6 transition-all ${star <= rating
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                    : "text-muted/50 group-hover:text-yellow-400/70"
                    }`}
                />
              </button>
            ))}
            <span className="ml-3 rounded-lg bg-surface-raised border border-border/50 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
              {rating}/5
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="flex items-center gap-2 rounded-full bg-surface-raised/80 border border-border/50 px-4 py-2 font-medium text-soft-ink backdrop-blur-sm shadow-sm">
              <BookOpen className="h-4 w-4 text-accent" />
              Chapter {activeChapter.number}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-surface-raised/80 border border-border/50 px-4 py-2 font-medium text-soft-ink backdrop-blur-sm shadow-sm">
              <Clock className="h-4 w-4 text-accent2" />
              {activeChapter.readTime}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-surface-raised/80 border border-border/50 px-4 py-2 font-medium text-soft-ink backdrop-blur-sm shadow-sm">
              <User className="h-4 w-4 text-accent" />
              {story.author}
            </span>
          </div>
        </div>

        {/* Chapter Title */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent/50" />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
              Chapter {activeChapter.number}
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent/50" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink md:text-3xl tracking-tight">
            {activeChapter.title}
          </h2>
        </div>

        {/* Notice */}
        {readerNotice ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning/20 ring-2 ring-warning/30">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-warning" />
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-warning mb-1">Notice</p>
                <p className="text-sm font-semibold text-ink leading-relaxed">{readerNotice}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Content Area */}
        {!isUnlocked ? (
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-raised via-surface-raised to-surface-soft p-10 text-center shadow-2xl md:p-16">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.1),transparent_50%)]" />
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent2/10 blur-3xl" />

            <div className="relative">
              <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent2 shadow-2xl shadow-accent/30 ring-4 ring-accent/20">
                <Lock className="h-11 w-11 text-paper" />
              </div>
              <h2 className="text-3xl font-black text-ink md:text-4xl tracking-tight">Premium Chapter</h2>
              <p className="mx-auto mt-4 max-w-md text-base text-soft-ink leading-relaxed">
                Unlock this chapter permanently for{" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 font-bold text-accent">
                  <Coins className="h-3.5 w-3.5" />
                  {activeChapter.coinPrice} coins
                </span>{" "}
                and continue your reading journey.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4">
                <button
                  disabled={unlockingId === activeChapter.id}
                  onClick={() => void unlockChapter(activeChapter)}
                  className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent2 px-10 py-4 font-bold text-paper shadow-xl shadow-accent/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-accent/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Unlock className="h-5 w-5 relative" />
                  <span className="relative">
                    {unlockingId === activeChapter.id ? "Unlocking..." : `Unlock for ${activeChapter.coinPrice} coins`}
                  </span>
                </button>
                {coinBalance < activeChapter.coinPrice ? (
                  <Link
                    href="/#coins"
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:text-accent2"
                  >
                    <Coins className="h-4 w-4" />
                    Buy more coins
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <ProtectedReader user={currentUser}>
              <article
                className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface-raised via-surface-raised to-surface p-8 shadow-xl md:p-14"
                style={pageStyle}
              >
                {/* Subtle top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent2 to-accent opacity-60" />

                {contentLoading ? (
                  <div className="space-y-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="space-y-2">
                        <div
                          className="h-4 animate-pulse rounded-lg bg-gradient-to-r from-surface-soft via-surface-soft/60 to-surface-soft"
                          style={{ width: `${70 + Math.random() * 30}%` }}
                        />
                        <div
                          className="h-4 animate-pulse rounded-lg bg-gradient-to-r from-surface-soft via-surface-soft/60 to-surface-soft"
                          style={{ width: `${60 + Math.random() * 30}%`, animationDelay: `${i * 100}ms` }}
                        />
                      </div>
                    ))}
                  </div>
                ) : activeContent.length ? (
                  <div className="text-ink/90">
                    {activeContent.map((block, index) => (
                      <p
                        key={`${activeChapter.id}-${index}`}
                        className="text-justify leading-[1.9] tracking-wide"
                        style={{
                          marginTop: index === 0 ? 0 : `${1.5 + block.extraGap * 1.25}rem`,
                          textIndent: "2em"
                        }}
                      >
                        {index === 0 && block.text ? (
                          <>
                            <span className="float-left mr-2 mt-1 font-display text-5xl font-black leading-none text-accent drop-shadow-sm">
                              {block.text.charAt(0)}
                            </span>
                            {block.text.slice(1)}
                          </>
                        ) : (
                          block.text
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 to-transparent p-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/20">
                      <BookOpen className="h-7 w-7 text-warning" />
                    </div>
                    <p className="text-base font-bold text-ink mb-4">
                      Secure content is not loaded yet.
                    </p>
                    <button
                      onClick={() => void loadChapterContent(activeChapter.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent to-accent2 px-6 py-2.5 text-sm font-bold text-paper shadow-lg shadow-accent/20 transition hover:scale-105 hover:shadow-xl"
                    >
                      Retry Loading
                    </button>
                  </div>
                )}
              </article>
            </ProtectedReader>

            {/* Floating Reader Controls */}
            <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2">
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-surface-raised/90 px-2 py-2 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5">
                <CustomSelect
                  value={fontFamily}
                  onChange={setFontFamily}
                  options={[
                    { value: "Georgia", label: "Georgia" },
                    { value: "Inter", label: "Inter" },
                    { value: "Times New Roman", label: "Times" }
                  ]}
                  size="lg"
                  position="top"
                  className="text-lg"
                  triggerClassName="bg-transparent border-0 rounded-full hover:bg-surface-soft text-ink text-lg font-medium px-4 h-9 focus:ring-0 focus:border-transparent"
                  dropdownClassName="w-32 px-4 bg-surface-raised border border-border"
                />
                <div className="flex items-center justify-center gap-4 border border-border rounded-full pr-2">
                    <span className="min-w-[2.5rem] text-center text-xl font-bold text-accent border-r-2 px-3">
                    {fontSize}
                  </span>
                  <button
                    onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-ink transition-all hover:bg-surface-soft hover:scale-110 active:scale-95"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold text-ink transition-all hover:bg-surface-soft hover:scale-110 active:scale-95"
                  >
                    A+
                  </button>
                </div>
                <div className="-top-2 px-4">
                  <ThemeSwitcher compact />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chapter Navigation */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={() => goToChapter("previous")}
            disabled={activeIndex <= 0}
            className="w-fit flex items-center justify-center px-4 py-1 rounded-xl border transition"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span>Previous</span>
          </button>

          {/* Interaction Bar */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleLikeToggle}
              className={`group flex items-center gap-2 rounded-full border px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${liked
                ? "border-red-500/50 bg-gradient-to-br from-red-500/15 to-red-500/5 text-red-500 shadow-sm shadow-red-500/20"
                : "border-border/60 bg-surface-raised/80 text-muted hover:border-red-500/40 hover:text-red-500 hover:bg-red-500/5"
                }`}
            >
              <Heart className={`h-4 w-4 transition-all ${liked ? "fill-current scale-110" : "group-hover:scale-110"}`} />
              {liked ? "Liked" : "Like"}
            </button>
            <button
              onClick={() => setFavorite((v) => !v)}
              className={`group flex items-center gap-2 rounded-full border px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${favorite
                ? "border-accent/50 bg-gradient-to-br from-accent/15 to-accent2/10 text-accent shadow-sm shadow-accent/20"
                : "border-border/60 bg-surface-raised/80 text-muted hover:border-accent/40 hover:text-accent hover:bg-accent/5"
                }`}
            >
              <Bookmark className={`h-4 w-4 transition-all ${favorite ? "fill-current scale-110" : "group-hover:scale-110"}`} />
              {favorite ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className={`group flex items-center gap-2 rounded-full border px-5 py-2.5 font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${showComments
                ? "border-accent/50 bg-gradient-to-br from-accent/15 to-accent2/10 text-accent shadow-sm shadow-accent/20"
                : "border-border/60 bg-surface-raised/80 text-muted hover:border-accent/40 hover:text-accent hover:bg-accent/5"
                }`}
            >
              <MessageCircle className={`h-4 w-4 transition-all ${showComments ? "scale-110" : "group-hover:scale-110"}`} />
              Comments ({comments.length})
            </button>
            <button className="group flex items-center gap-2 rounded-full border border-border/60 bg-surface-raised/80 px-5 py-2.5 font-semibold text-sm text-muted transition-all hover:scale-105 hover:border-accent/40 hover:text-ink hover:bg-surface-soft active:scale-95">
              <Share2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Share
            </button>
          </div>
          <button
            onClick={() => goToChapter("next")}
            disabled={activeIndex >= story.chapterList.length - 1}
            className="w-50 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-paper transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">Next Chapter</span>
            <ChevronRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        

        {/* Comments Section */}
        <div
          className={`mt-8 overflow-hidden transition-all duration-500 ${showComments ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-surface-raised to-surface-soft p-6 shadow-xl backdrop-blur-sm md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-xl font-black text-ink tracking-tight">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 shadow-lg shadow-accent/30">
                  <MessageCircle className="h-5 w-5 text-paper" />
                </span>
                <div>
                  <p className="leading-tight">Discussion</p>
                  <p className="text-xs font-medium text-muted mt-0.5">{comments.length} {comments.length === 1 ? "comment" : "comments"}</p>
                </div>
              </h3>
            </div>

            {/* Comment Input */}
            <div className="mb-8 relative group">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-accent/30 to-accent2/30 opacity-0 blur group-focus-within:opacity-100 transition-opacity" />
              <div className="relative">
                <textarea
                  placeholder="Share your thoughts on this chapter..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-border/60 bg-surface-soft/80 p-4 pr-14 text-sm text-ink placeholder-muted/70 outline-none transition-all focus:border-accent focus:bg-surface-soft"
                />
                <button
                  disabled={postingComment || !commentText.trim()}
                  onClick={handlePostComment}
                  className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-paper shadow-lg shadow-accent/30 transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/60 bg-surface-soft/60 p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-surface-raised to-surface-soft animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-28 bg-gradient-to-r from-surface-raised to-surface-soft rounded animate-pulse" />
                        <div className="h-2 w-16 bg-gradient-to-r from-surface-raised to-surface-soft rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-gradient-to-r from-surface-raised to-surface-soft rounded animate-pulse" />
                      <div className="h-3 w-4/5 bg-gradient-to-r from-surface-raised to-surface-soft rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-surface-soft/40 p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent2/10">
                  <MessageCircle className="h-8 w-8 text-accent/60" />
                </div>
                <p className="text-base font-bold text-ink mb-1">
                  No comments yet
                </p>
                <p className="text-sm text-muted">
                  Be the first to share your thoughts!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="group rounded-2xl border border-border/60 bg-surface-soft/60 p-5 transition-all hover:border-accent/30 hover:bg-surface-soft hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-sm font-black text-paper shadow-md">
                          {(comment.user?.displayName || comment.user?.username || "R")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">
                            {comment.user?.displayName || comment.user?.username || "Reader"}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(comment.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-raised transition-all text-muted hover:text-ink">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-soft-ink leading-relaxed pl-[3.25rem]">{comment.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapter Panel Modal */}
      {
        showChapterPanel && (
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowChapterPanel(false)}
          >
            <div
              className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border/50 bg-gradient-to-b from-surface-raised to-surface shadow-2xl animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-border/50 bg-surface-raised/80 backdrop-blur-xl p-6">
                <div>
                  <h3 className="text-xl font-black text-ink tracking-tight">Table of Contents</h3>
                  <p className="text-xs text-muted mt-1 font-medium">
                    {story.chapterList.length} chapters • {unlockedIds.size} unlocked
                  </p>
                </div>
                <button
                  onClick={() => setShowChapterPanel(false)}
                  className="group flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft border border-border/50 transition-all hover:bg-accent hover:border-accent hover:text-paper hover:rotate-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="border-b border-border/50 bg-surface-raised/50 p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="Jump to chapter..."
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchChapterByNumber()}
                      className="w-full rounded-xl border border-border/60 bg-surface-soft px-4 py-3 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <button
                    onClick={searchChapterByNumber}
                    className="rounded-xl bg-gradient-to-br from-accent to-accent2 px-6 py-3 font-bold text-paper text-sm shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                  >
                    Go
                  </button>
                </div>
              </div>

              {/* Chapter List */}
              <div className="h-[calc(100%-240px)] overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {story.chapterList.map((chapter) => {
                  const unlocked = unlockedIds.has(chapter.id);
                  const active = activeChapter.id === chapter.id;

                  return (
                    <button
                      key={chapter.id}
                      onClick={() =>
                        unlocked
                          ? (setActiveChapterId(chapter.id), void loadChapterContent(chapter.id))
                          : void unlockChapter(chapter)
                      }
                      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all ${active
                        ? "border-accent bg-gradient-to-br from-accent/15 via-accent/5 to-transparent shadow-lg shadow-accent/10 ring-1 ring-accent/30"
                        : "border-border/60 bg-surface-soft/60 hover:border-accent/40 hover:bg-surface-soft hover:shadow-md"
                        }`}
                    >
                      {active && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-accent2" />
                      )}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all ${active
                            ? "bg-gradient-to-br from-accent to-accent2 text-paper shadow-lg shadow-accent/30"
                            : unlocked
                              ? "bg-surface-raised border border-border/50 text-ink"
                              : "bg-surface-raised border border-border/50 text-muted"
                            }`}
                        >
                          {active ? (
                            <BookOpen className="h-5 w-5" />
                          ) : unlocked ? (
                            chapter.number
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${active ? "text-accent" : "text-ink"}`}>
                            {chapter.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" />
                              {chapter.readTime}
                            </span>
                            {!unlocked && (
                              <span className="text-xs font-bold text-accent flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                {chapter.coinPrice}
                              </span>
                            )}
                          </div>
                        </div>
                        {unlocked ? (
                          active ? (
                            <div className="relative flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                            </div>
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          )
                        ) : (
                          <Lock className="h-4 w-4 text-muted/60 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Panel Footer */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-surface-raised/90 backdrop-blur-xl p-5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-1.5 text-ink">
                    <BookOpen className="h-3.5 w-3.5 text-accent" />
                    {story.chapterList.length} total
                  </span>
                  <span className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5 text-success">
                    <Unlock className="h-3.5 w-3.5" />
                    {unlockedIds.size} unlocked
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}