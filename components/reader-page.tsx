"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Heart,
  Lock,
  MessageCircle,
  Star,
  Type,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedReader } from "@/components/protected-reader";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { readerControls, type Chapter, type Story } from "@/lib/content";

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
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function fingerprintText(text: string, chapterId: string, userId: string) {
  const marker = `\u200b${userId}:${chapterId}\u200c`;
  return `${text}${marker}`;
}

export function ReaderPage({ story, initialCoinBalance, currentUser }: ReaderPageProps) {
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [unlockedIds, setUnlockedIds] = useState(
    () => new Set(story.chapterList.filter((chapter) => chapter.state !== "locked").map((chapter) => chapter.id))
  );
  const [activeChapterId, setActiveChapterId] = useState(story.chapterList[0]?.id);
  const [chapterContents, setChapterContents] = useState<Record<string, string[]>>({});
  const [contentLoadingId, setContentLoadingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [readerNotice, setReaderNotice] = useState("");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Georgia");
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [rating, setRating] = useState(5);
  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");

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

  useEffect(() => {
    if (activeChapter && isUnlocked) {
      void loadChapterContent(activeChapter.id);
    }
  }, [activeChapter, isUnlocked, loadChapterContent]);

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
    return <div className="flex h-screen items-center justify-center text-muted">No chapters available</div>;
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
    <main className="min-h-screen bg-surface text-ink transition-colors duration-300">
      <header className="fixed left-0 top-0 z-50 w-full px-4 py-3">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-surface-raised/80 px-5 py-2.5 shadow-xl backdrop-blur-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Marketplace</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher compact />
            <Link href="/dashboard" className="lm-btn-secondary hidden rounded-lg py-1.5 text-sm sm:inline-block">
              Dashboard
            </Link>
            <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-sm font-bold text-accent3">
              <Coins className="h-4 w-4" />
              {coinBalance}
            </span>
          </div>
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-32 pt-24 lg:grid-cols-[18rem_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="lm-card group relative overflow-hidden rounded-2xl border border-white/10 bg-surface-raised shadow-lg">
              <div className="relative aspect-[4/6] w-full overflow-hidden">
                <Image
                  src={story.cover}
                  alt={`${story.title} cover`}
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <button
                  onClick={() => setFavorite((value) => !value)}
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-black/60"
                  aria-label="Toggle favorite"
                >
                  <Heart className={`h-5 w-5 ${favorite ? "fill-red-500 text-red-500" : "text-white"}`} />
                </button>

                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-yellow-400/95 px-2.5 py-1 text-xs font-bold text-black shadow-lg">
                  <Star className="h-3 w-3 fill-current" />
                  {story.rating}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent3">{story.genre}</p>
                  <h1 className="mt-1 line-clamp-2 text-xl font-bold text-white">{story.title}</h1>
                  <p className="mt-1 text-sm text-gray-300">by {story.author}</p>
                </div>
              </div>

              <div className="p-4">
                <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Rate this story</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-125" aria-label={`Rate ${star} stars`}>
                      <Star className={`h-6 w-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted-soft">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent3 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-raised p-4 shadow-md backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
            <button
              onClick={() => setShowChapterPanel((prev) => !prev)}
              className="group flex w-full items-center justify-between gap-4 rounded-xl bg-black/10 p-3 transition-all hover:bg-black/20"
            >
              <div className="min-w-0 text-left">
                <span className="block text-xs font-bold uppercase tracking-widest text-muted">Currently Reading</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-ink">Chapter {activeChapter.number}:</span>
                  <span className="truncate font-display text-lg font-bold text-accent3">{activeChapter.title}</span>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-surface-soft px-3 py-2 text-xs font-bold text-accent1 transition group-hover:bg-accent group-hover:text-paper">
                {story.chapterList.length} Chapters <ChevronRight className={`h-4 w-4 transition-transform ${showChapterPanel ? "rotate-90" : ""}`} />
              </span>
            </button>
          </div>

          {readerNotice ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
              {readerNotice}
            </div>
          ) : null}

          {showChapterPanel && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowChapterPanel(false)}>
              <div className="relative flex h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-raised shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <h3 className="text-lg font-bold text-ink">Chapter List</h3>
                  <button onClick={() => setShowChapterPanel(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close chapter list">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="border-b border-white/10 p-4">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter chapter number..."
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchChapterByNumber()}
                      className="flex-1 rounded-lg border border-border bg-surface-soft px-4 py-2 text-ink outline-none focus:border-accent"
                    />
                    <button onClick={searchChapterByNumber} className="rounded-lg bg-accent px-6 py-2 font-semibold text-paper transition hover:opacity-90">Go</button>
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4 no-scrollbar">
                  {story.chapterList.map((chapter) => {
                    const unlocked = unlockedIds.has(chapter.id);
                    const active = activeChapter.id === chapter.id;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => (unlocked ? (setActiveChapterId(chapter.id), void loadChapterContent(chapter.id)) : void unlockChapter(chapter))}
                        className={`w-full rounded-xl border p-4 text-left transition ${active ? "border-accent bg-accent/10 shadow-glow" : "border-border bg-surface-soft hover:border-accent/40 hover:bg-black/20"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-ink">Chapter {chapter.number}</span>
                            <span className="ml-2 text-sm text-muted">{chapter.title}</span>
                          </div>
                          {unlocked ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Lock className="h-5 w-5 text-accent" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted">
                          <span>{chapter.readTime}</span>
                          <span>{unlocked ? "Accessible" : `${chapter.coinPrice} coins`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!isUnlocked ? (
            <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-surface-raised to-surface-soft p-8 text-center shadow-xl">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
              <div className="z-10 flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
                  <Lock className="h-10 w-10 text-accent2" />
                </div>
                <h2 className="font-display text-3xl font-bold text-ink">This chapter is locked</h2>
                <p className="mt-3 max-w-md leading-relaxed text-muted">
                  Unlock this chapter permanently for {activeChapter.coinPrice} coins. The backend verifies wallet balance, deducts coins, and grants access.
                </p>
                <button
                  disabled={unlockingId === activeChapter.id}
                  onClick={() => void unlockChapter(activeChapter)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-bold text-paper shadow-glow transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Coins className="h-5 w-5" />
                  {unlockingId === activeChapter.id ? "Unlocking..." : `Unlock for ${activeChapter.coinPrice} coins`}
                </button>
                {coinBalance < activeChapter.coinPrice ? (
                  <Link href="/#coins" className="mt-4 text-sm font-semibold text-accent transition hover:text-accent2">
                    Buy coins to unlock this chapter
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative">
              <ProtectedReader user={currentUser}>
                <article className="lm-card relative mx-auto max-w-3xl rounded-2xl border border-white/10 bg-surface-raised p-8 shadow-md md:p-12" style={pageStyle}>
                  <p className="lm-eyebrow mb-8 border-b border-white/5 pb-4 text-xs uppercase tracking-widest text-muted">
                    Chapter {activeChapter.number} - Forensic fingerprint embedded
                  </p>
                  {contentLoading ? (
                    <p className="rounded-xl bg-surface-soft p-5 text-center text-sm font-semibold text-muted">Loading secure chapter content...</p>
                  ) : activeContent.length ? (
                    <div className="space-y-6 text-ink/90">
                      {activeContent.map((paragraph, index) => (
                        <p key={`${activeChapter.id}-${index}`} className="text-justify">
                          {fingerprintText(paragraph, activeChapter.id, currentUser.id)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-center text-sm font-semibold text-warning">
                      Secure content is not loaded yet.
                      <button onClick={() => void loadChapterContent(activeChapter.id)} className="ml-2 underline underline-offset-4">
                        Retry
                      </button>
                    </div>
                  )}
                </article>
              </ProtectedReader>

              <div className="sticky bottom-6 z-20 mx-auto mt-8 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-surface-raised/80 p-2 shadow-2xl backdrop-blur-xl">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="cursor-pointer rounded-full bg-transparent px-4 py-2 text-sm font-medium text-ink outline-none hover:bg-white/5"
                >
                  <option value="Georgia">Georgia</option>
                  <option value="Inter">Inter</option>
                  <option value="Times New Roman">Times</option>
                </select>
                <div className="h-6 w-px bg-white/10" />
                <button onClick={() => setFontSize((s) => Math.max(14, s - 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-ink transition hover:bg-white/10">
                  A-
                </button>
                <button onClick={() => setFontSize((s) => Math.min(24, s + 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-ink transition hover:bg-white/10">
                  A+
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                onClick={() => setLiked((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-2 font-semibold transition ${liked ? "border-red-500/50 bg-red-500/10 text-red-500" : "border-white/10 text-muted hover:text-ink"}`}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                {liked ? "Liked" : "Like Chapter"}
              </button>
              <div className="flex items-center gap-2 text-sm text-muted">
                <MessageCircle className="h-5 w-5" />
                <span>Comments</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-surface-soft p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent1/20 text-sm font-bold text-accent1">A</div>
                  <b className="text-sm text-ink">Reader Asha</b>
                  <span className="text-xs text-muted">- 2h ago</span>
                </div>
                <p className="mt-2 text-sm text-muted">The watermark notice is subtle, and the dark reader feels excellent. Loving the story so far!</p>
              </div>

              <textarea
                placeholder="Add a thoughtful comment..."
                className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-surface-soft p-4 text-sm text-ink placeholder-muted outline-none transition focus:border-accent"
              />
              <button className="ml-auto block rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-paper transition hover:opacity-90">
                Post Comment
              </button>
            </div>
          </div>

          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 pt-8">
            <button
              onClick={() => goToChapter("previous")}
              disabled={activeIndex <= 0}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-semibold text-ink transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" /> Previous
            </button>
            <button
              onClick={() => goToChapter("next")}
              disabled={activeIndex >= story.chapterList.length - 1}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 font-semibold text-paper shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
            >
              Next Chapter <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-white/10 p-4">
            <h3 className="flex items-center justify-center gap-2 text-center text-xs font-medium text-muted">
              <Type className="h-4 w-4" /> Reader controls included
            </h3>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {readerControls.map((control) => (
                <span key={control} className="rounded-full bg-surface-soft px-3 py-1 text-xs text-muted">
                  {control}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}