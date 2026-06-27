"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Lock, Award, AlertCircle, Settings2, Type,
  MoveHorizontal, MoreHorizontal, ThumbsUp, Bookmark, ChevronLeft,
  ChevronRight, Volume2, MessageSquare, Send, CheckCircle2,
  Globe2, BookOpenText, Eye, Star, ArrowLeft, Share2,
  LogOut, User, BookOpen, Info, Clock, Languages, Tag,
  Zap, Pause
} from "lucide-react";
import Link from "next/link";
import { ProtectedReader } from "@/components/protected-reader";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/theme-provider";
import { type Chapter, type Story } from "@/lib/content";
import { studioContentToReviewBlocks, type StudioReviewBlock } from "@/lib/studio-content-renderer";
import { useToast } from "@/components/toast-context";

/* ────────────────────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────────────────────── */

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type ReaderUser = {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role?: string;
  emailHash: string;
  sessionId: string;
};

type CinematicLayoutProps = {
  story: Story;
  initialCoinBalance: number;
  currentUser: ReaderUser;
  recommendations?: Story[];
  studioData?: {
    naming?: {
      categories: Array<{ id: string; title: string; color?: string; info?: string; shortcut?: string }>;
      entries: Array<{ id: string; categoryId: string; name: string; description: string; chapterTitle?: string }>;
    };
    manifest?: {
      facts?: Array<string | { keyword?: string; title?: string; key?: string; description?: string; text?: string; fact?: string }>;
      parts?: Array<{ no: number; title: string; synopsis?: string; chapters?: any[] }>;
    };
  } | null;
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

interface ReaderSettings {
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono";
  widthPercent: number;
  paragraphMargin: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "serif",
  widthPercent: 70,
  paragraphMargin: 24
};

const cinematicThemeSwatches = {
  "lm-theme-light": "linear-gradient(135deg, #11b8aa, #f4f8fb)",
  "lm-theme-dark": "linear-gradient(135deg, #4af3ff, #111418)",
  "lm-theme-grey": "linear-gradient(135deg, #127bf3, #1a1d22)",
  "lm-theme-purple": "linear-gradient(135deg, #4f9cff, #111522)",
  "lm-theme-sunset": "linear-gradient(135deg, #ffc21a, #16100c)",
  "lm-theme-forest": "linear-gradient(135deg, #34d35c, #101713)"
} as const;

function clampSetting(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function normalizeReaderSettings(value: unknown): ReaderSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;

  const parsed = value as Partial<ReaderSettings>;
  const fontFamily =
    parsed.fontFamily === "sans" || parsed.fontFamily === "mono" || parsed.fontFamily === "serif"
      ? parsed.fontFamily
      : DEFAULT_SETTINGS.fontFamily;

  return {
    fontSize: clampSetting(parsed.fontSize, 12, 32, DEFAULT_SETTINGS.fontSize),
    fontFamily,
    widthPercent: clampSetting(parsed.widthPercent, 50, 80, DEFAULT_SETTINGS.widthPercent),
    paragraphMargin: clampSetting(parsed.paragraphMargin, 12, 48, DEFAULT_SETTINGS.paragraphMargin)
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   MOTION VARIANTS
   ──────────────────────────────────────────────────────────────────────────── */

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.7, delay, ease: "easeOut" }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }
};

/* ────────────────────────────────────────────────────────────────────────────
   HELPER FUNCTIONS
   ──────────────────────────────────────────────────────────────────────────── */

function splitChapterContent(content: string) {
  return studioContentToReviewBlocks(content);
}

/* ────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   ──────────────────────────────────────────────────────────────────────────── */

function CommentForm({
  onSubmit,
  value,
  onChange,
  placeholder,
  isSubmitting,
  submitLabel = "Post",
  cancelLabel,
  onCancel,
  replyToUser
}: {
  onSubmit: (e: React.FormEvent) => void;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isSubmitting: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  replyToUser?: string | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      onClick={(e) => e.stopPropagation()}
      className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] shadow-md flex flex-col gap-3 transition-all duration-300 w-full"
    >
      {replyToUser && (
        <div className="flex items-center justify-between px-3 py-1 bg-[var(--accent)]/15 border-b border-[var(--accent)]/20 text-xs text-[var(--accent)] rounded-t-xl mb-1 font-hud font-bold">
          <span>Replying to @{replyToUser}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 hover:bg-[var(--accent)]/20 rounded-full transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-transparent border-0 resize-none text-sm text-[var(--ink)] placeholder-[var(--muted)]/60 focus:ring-0 focus:outline-none overflow-y-auto leading-relaxed"
        style={{ height: "auto" }}
      />
      <div className="flex items-center justify-between border-t border-[var(--border)]/30 pt-3">
        <span className="text-[10px] text-[var(--muted)]">Secure discussion portal.</span>
        <div className="flex gap-2">
          {cancelLabel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-xs text-[var(--muted)] font-bold transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !value.trim()}
            className="px-5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-50 text-[var(--color-on-accent)] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Send size={11} />
            <span>{submitLabel}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function normalizeUnlockedChapters(
  chapters: Chapter[],
  unlockedSet: Set<string>
): Set<string> {
  const result = new Set<string>();

  let firstLockedIdx = -1;
  for (let i = 0; i < chapters.length; i++) {
    const isFree = chapters[i].coinPrice === 0 || chapters[i].state === "free";
    const isUnlocked = isFree || unlockedSet.has(chapters[i].id);
    if (!isUnlocked) {
      firstLockedIdx = i;
      break;
    }
  }

  if (firstLockedIdx === -1) {
    return unlockedSet;
  }

  for (let i = 0; i < firstLockedIdx; i++) {
    result.add(chapters[i].id);
  }

  let anomalyBudget = 0;
  for (let i = firstLockedIdx; i < chapters.length; i++) {
    const isFree = chapters[i].coinPrice === 0 || chapters[i].state === "free";
    if (!isFree && unlockedSet.has(chapters[i].id)) {
      anomalyBudget += chapters[i].coinPrice || 0;
    }
  }

  for (let i = firstLockedIdx; i < chapters.length; i++) {
    const isFree = chapters[i].coinPrice === 0 || chapters[i].state === "free";
    if (isFree) {
      result.add(chapters[i].id);
    } else {
      const price = chapters[i].coinPrice || 0;
      if (anomalyBudget >= price) {
        anomalyBudget -= price;
        result.add(chapters[i].id);
      } else {
        break;
      }
    }
  }

  return result;
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────────────────────── */

export default function CinematicLayout({
  story,
  initialCoinBalance,
  currentUser,
  recommendations = [],
  studioData = null
}: CinematicLayoutProps) {
  const { showToast } = useToast();
  const { theme, setTheme, themes } = useTheme();

  const isDarkTheme = theme !== "lm-theme-light" && theme !== "lm-theme-sunset";
  const isSepiaTheme = theme === "lm-theme-sunset";

  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);

  /* ── Chapter unlock tracking ── */
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => {
    const initialUnlocked = new Set(
      story.chapterList.filter((chapter) => chapter.state !== "locked").map((chapter) => chapter.id)
    );
    return normalizeUnlockedChapters(story.chapterList, initialUnlocked);
  });

  const [activeChapterId, setActiveChapterId] = useState(story.chapterList[0]?.id || null);
  const [chapterContents, setChapterContents] = useState<Record<string, StudioReviewBlock[]>>({});
  const [contentLoadingId, setContentLoadingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [readerNotice, setReaderNotice] = useState("");

  /* ── Header and user profile ── */
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileName = currentUser.displayName || currentUser.username || "Reader";
  const profileInitial = profileName.charAt(0).toUpperCase();

  /* ── Refs for click-outside setting panel ── */
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/auth";
      }
    } catch {
      showToast("Error logging out", "error");
    } finally {
      setIsLoggingOut(false);
    }
  };

  /* ── Settings ── */
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aetheris_reader_settings");
      if (saved) {
        try {
          return normalizeReaderSettings(JSON.parse(saved));
        } catch { /* ignore */ }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  /* ── Unlock modal ── */
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockModalData, setUnlockModalData] = useState<{
    targetChapter: Chapter;
    chaptersToUnlock: Chapter[];
    totalCost: number;
  } | null>(null);

  /* ── Active chapter helpers ── */
  const activeIndex = story.chapterList.findIndex((chapter) => chapter.id === activeChapterId);
  const activeChapter = story.chapterList[activeIndex] ?? story.chapterList[0];
  const isUnlocked = activeChapter ? unlockedIds.has(activeChapter.id) : false;
  const activeContent = activeChapter ? chapterContents[activeChapter.id] ?? [] : [];
  const contentLoading = activeChapter ? contentLoadingId === activeChapter.id : false;

  /* ── Notification ── */
  const [notification, setNotification] = useState<string | null>(null);
  const triggerNotification = useCallback((message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 4000);
  }, []);

  /* ── Comments ── */
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  
  const [activeMenuCommentId, setActiveMenuCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  
  const [isInputFloatingViewport, setIsInputFloatingViewport] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isReaderVisible, setIsReaderVisible] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const handleFocusModeToggle = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev;
      triggerNotification(next ? "Focus Mode Active. Press Escape to exit." : "Focus Mode Closed.");
      return next;
    });
  }, [triggerNotification]);

  useEffect(() => {
    const updateReaderVisibility = () => {
      const rect = readerRef.current?.getBoundingClientRect();
      if (!rect) {
        setIsReaderVisible(false);
        return;
      }

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const nextVisible = rect.top < viewportHeight && rect.bottom > 0;
      setIsReaderVisible((prev) => (prev === nextVisible ? prev : nextVisible));
    };

    updateReaderVisibility();
    window.addEventListener("scroll", updateReaderVisibility, { passive: true });
    window.addEventListener("resize", updateReaderVisibility);
    return () => {
      window.removeEventListener("scroll", updateReaderVisibility);
      window.removeEventListener("resize", updateReaderVisibility);
    };
  }, [activeChapterId, activeContent.length]);

  useEffect(() => {
    if (!isFocusMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFocusMode(false);
        triggerNotification("Focus Mode Closed.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, triggerNotification]);

  /* ── Font mapping ── */
  const fontClasses = {
    serif: "font-serif tracking-normal antialiased",
    sans: "font-sans tracking-wide font-normal antialiased",
    mono: "font-mono tracking-tight antialiased"
  };

  useEffect(() => {
    localStorage.setItem("aetheris_reader_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  /* ── Audio narration ── */
  const toggleSpeech = () => {
    if ("speechSynthesis" in window) {
      if (isNarrating) {
        window.speechSynthesis.cancel();
        setIsNarrating(false);
      } else {
        const textToSpeak = activeContent.map(b => b.text).filter(Boolean).join(" ");
        if (!textToSpeak) {
          showToast("Prose content is not loaded yet.", "error");
          return;
        }
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setIsNarrating(false);
        utterance.onerror = () => setIsNarrating(false);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
        setIsNarrating(true);
      }
    } else {
      showToast("Text to speech is not supported in this browser.", "error");
    }
  };


  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* ── Fetch comments ── */
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

  /* ── Post comment ── */
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
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
        triggerNotification("Comment posted successfully.");
      } else {
        showToast(body.error?.message || "Failed to post comment", "error");
      }
    } catch (err) {
      showToast("Error posting comment", "error");
    } finally {
      setPostingComment(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChapter || !activeReplyId) return;
    setPostingReply(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          chapterId: activeChapter.id,
          parentId: activeReplyId,
          body: replyText.trim()
        })
      });
      const body = await res.json();
      if (res.ok) {
        setReplyText("");
        setActiveReplyId(null);
        setReplyToUser(null);
        fetchComments(activeChapter.id);
        triggerNotification("Reply posted successfully.");
      } else {
        showToast(body.error?.message || "Failed to post reply", "error");
      }
    } catch (err) {
      showToast("Error posting reply", "error");
    } finally {
      setPostingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      const body = await res.json();
      if (res.ok) {
        triggerNotification("Comment deleted successfully.");
        if (activeChapter) fetchComments(activeChapter.id);
      } else {
        showToast(body.error?.message || "Failed to delete comment", "error");
      }
    } catch (err) {
      showToast("Error deleting comment", "error");
    } finally {
      setActiveMenuCommentId(null);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    setUpdatingComment(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editText.trim() })
      });
      const body = await res.json();
      if (res.ok) {
        triggerNotification("Comment updated successfully.");
        setEditingCommentId(null);
        setEditText("");
        if (activeChapter) fetchComments(activeChapter.id);
      } else {
        showToast(body.error?.message || "Failed to update comment", "error");
      }
    } catch (err) {
      showToast("Error updating comment", "error");
    } finally {
      setUpdatingComment(false);
      setActiveMenuCommentId(null);
    }
  };

  /* ── Secure content loader ── */
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

  /* ── Unlock chapter ── */
  async function unlockChapters(chaptersToUnlock: Chapter[]) {
    if (chaptersToUnlock.length === 0) return;

    const lastChapter = chaptersToUnlock[chaptersToUnlock.length - 1];
    setUnlockingId(lastChapter.id);

    try {
      let currentBalance = coinBalance;
      const newlyUnlockedIds = new Set<string>();

      for (const chapter of chaptersToUnlock) {
        const response = await fetch(`/api/chapters/${chapter.id}/unlock`, { method: "POST" });
        const payload = (await response.json()) as ApiResponse<UnlockPayload>;
        if (!payload.ok) {
          throw new Error(payload.error.message ?? `Failed to unlock Chapter ${chapter.number}`);
        }
        if (typeof payload.data.coinBalance === "number") {
          currentBalance = payload.data.coinBalance;
        }
        newlyUnlockedIds.add(chapter.id);
      }

      setCoinBalance(currentBalance);
      setUnlockedIds((current) => {
        const updated = new Set(current);
        newlyUnlockedIds.forEach(id => updated.add(id));
        return normalizeUnlockedChapters(story.chapterList, updated);
      });
      setShowUnlockModal(false);
      setActiveChapterId(lastChapter.id);
      await loadChapterContent(lastChapter.id);
      triggerNotification(`Success! Unlocked ${chaptersToUnlock.length} chapter(s).`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to unlock chapter.", "error");
    } finally {
      setUnlockingId(null);
    }
  }

  const handleLockAlert = (chapterId: string) => {
    const chapIndex = story.chapterList.findIndex(c => c.id === chapterId);
    if (chapIndex === -1) return;

    const targetChapter = story.chapterList[chapIndex];

    const chaptersToUnlock: Chapter[] = [];
    for (let i = 0; i <= chapIndex; i++) {
      const c = story.chapterList[i];
      const isFree = c.coinPrice === 0 || c.state === "free";
      if (!isFree && !unlockedIds.has(c.id)) {
        chaptersToUnlock.push(c);
      }
    }

    const totalCost = chaptersToUnlock.reduce((sum, c) => sum + (c.coinPrice || 0), 0);

    setUnlockModalData({
      targetChapter,
      chaptersToUnlock,
      totalCost
    });
    setShowUnlockModal(true);
  };

  /* ── Sync likes / reading history on chapter change ── */
  useEffect(() => {
    if (activeChapter) {
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
      fetchComments(activeChapter.id);
      setScrollProgress(0);
    }
  }, [activeChapter?.id, isUnlocked, fetchComments, loadChapterContent, story.id]);

  /* ── Scroll progress tracking ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!readerRef.current) return;
      const elementHeight = readerRef.current.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrolled = window.scrollY - (readerRef.current.offsetTop - 60);
      const totalScrollable = elementHeight - windowHeight;
      if (totalScrollable <= 0) {
        setScrollProgress(0);
      } else {
        const percentage = Math.min(Math.max((scrolled / totalScrollable) * 100, 0), 100);
        setScrollProgress(percentage);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeChapterId, activeContent.length]);

  /* ── Click outside / scroll closures ── */
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Profile menu
      if (profileOpen && profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      // Settings panel
      if (
        showSettings &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
      // Clear reply popups
      setActiveMenuCommentId(null);
    };
    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, [profileOpen, showSettings]);

  useEffect(() => {
    const handleScrollClose = () => {
      if (!activeReplyId || !commentsContainerRef.current) return;
      const rect = commentsContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Auto close reply box if comments box is completely out of view
      if (rect.top > viewportHeight || rect.bottom < 0) {
        setActiveReplyId(null);
        setReplyToUser(null);
        setReplyText("");
        return;
      }
      setIsInputFloatingViewport(rect.bottom > viewportHeight);
    };

    if (activeReplyId) {
      window.addEventListener("scroll", handleScrollClose);
      window.addEventListener("resize", handleScrollClose);
      handleScrollClose();
    }
    return () => {
      window.removeEventListener("scroll", handleScrollClose);
      window.removeEventListener("resize", handleScrollClose);
    };
  }, [activeReplyId]);

  /* ── Like toggle ── */
  const handleLikeToggle = async () => {
    if (!activeChapter) return;
    const nextState = !liked;
    setLiked(nextState);
    try {
      if (nextState) {
        await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: story.id, chapterId: activeChapter.id, value: 5 })
        });
        triggerNotification(`Liked Chapter ${activeChapter.number}`);
      } else {
        await fetch(`/api/ratings?storyId=${story.id}&chapterId=${activeChapter.id}`, { method: "DELETE" });
        triggerNotification(`Unliked Chapter ${activeChapter.number}`);
      }
    } catch (err) {
      console.error("Error toggling like status", err);
      setLiked(!nextState);
    }
  };

  const handleNextChapter = () => {
    if (activeIndex < story.chapterList.length - 1) {
      const nextChapter = story.chapterList[activeIndex + 1];
      const unlocked = unlockedIds.has(nextChapter.id);
      if (unlocked) {
        setActiveChapterId(nextChapter.id);
        scrollToSection("reader");
      } else {
        handleLockAlert(nextChapter.id);
      }
    }
  };

  const handlePrevChapter = () => {
    if (activeIndex > 0) {
      const prevChapter = story.chapterList[activeIndex - 1];
      setActiveChapterId(prevChapter.id);
      scrollToSection("reader");
    }
  };

  /* ── Derived data ── */
  const hasRecommendations = recommendations.length > 0;
  const hasChapters = story.chapterList.length > 0;
  const hasDescription = Boolean(story.description?.trim());
  const hasTags = story.tags && story.tags.length > 0;
  const hasGenres = story.genres && story.genres.length > 0;
  const hasRating = story.rating && story.rating > 0;
  const hasReads = Boolean(story.reads);
  const hasCover = Boolean(story.cover);

  /* ── Theme classes mapping ── */
  const themeBase = "bg-[var(--paper)] text-[var(--ink)]";
  const themeBorder = "border-[var(--border)]";
  const themeCard = "bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm";
  const themeMuted = "text-[var(--muted)]";
  const themeText = "text-[var(--ink)]";
  const themeSubtext = "text-[var(--soft-ink)]";
  
  const themeInput = "bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] placeholder-[var(--muted)]/60 focus:border-[var(--accent)]/50 focus:ring-0 focus:outline-none";
  const themeButtonPrimary = "bg-[var(--accent)] hover:opacity-90 text-[var(--color-on-accent)] font-bold shadow-md transition-all rounded-xl cursor-pointer disabled:opacity-50";
  const themeButtonSecondary = "bg-[var(--surface-soft)] hover:bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] font-semibold transition-all rounded-xl cursor-pointer";

  /* ── Story Studio filtered data ── */
  const manifestFacts = useMemo(() => {
    return studioData?.manifest?.facts || [];
  }, [studioData]);

  const activeChapterNamingEntries = useMemo(() => {
    if (!studioData?.naming?.entries || !activeChapter) return [];
    // Prioritize character entries that correspond to the active chapter
    return studioData.naming.entries.filter(
      entry => entry.chapterTitle?.toLowerCase() === activeChapter.title.toLowerCase() || !entry.chapterTitle
    );
  }, [studioData, activeChapter]);

  const activeChapterNamingCategories = useMemo(() => {
    if (!studioData?.naming?.categories || activeChapterNamingEntries.length === 0) return [];
    return studioData.naming.categories.filter(cat => 
      activeChapterNamingEntries.some(entry => entry.categoryId === cat.id)
    );
  }, [studioData, activeChapterNamingEntries]);

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("");
  useEffect(() => {
    if (activeChapterNamingCategories.length > 0) {
      setActiveCategoryTab(activeChapterNamingCategories[0].id);
    } else {
      setActiveCategoryTab("");
    }
  }, [activeChapterNamingCategories]);

  /* ── Chapter navigator filtering ── */
  const [chapterSearch, setChapterSearch] = useState("");
  const filteredChapters = useMemo(() => {
    return story.chapterList.filter(chap =>
      chap.title.toLowerCase().includes(chapterSearch.toLowerCase()) || 
      chap.number.toString().includes(chapterSearch)
    );
  }, [story.chapterList, chapterSearch]);

  const continueReadingChapter = useMemo(() => {
    if (activeChapterId) {
      return story.chapterList.find(c => c.id === activeChapterId);
    }
    const firstUncompleted = story.chapterList.find(c => !unlockedIds.has(c.id));
    return firstUncompleted || story.chapterList[0];
  }, [story.chapterList, activeChapterId, unlockedIds]);

  /* ────────────────────────────────────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className={`relative min-h-screen transition-colors duration-500 overflow-hidden pb-12 ${themeBase} selection:bg-indigo-500/30 selection:text-white`}>

      {/* ═══════════════════════════════════════════════════════════════════════
          AMBIENT BACKGROUND GLOWS
          ═══════════════════════════════════════════════════════════════════════ */}
      {isDarkTheme && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-indigo-900/8 blur-[150px] animate-pulse" style={{ animationDuration: "8s" }} />
          <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-900/6 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-cyan-900/5 blur-[140px] animate-pulse" style={{ animationDuration: "10s" }} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          NOTIFICATION TOAST
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-indigo-500/20 text-xs font-semibold text-gray-200 shadow-2xl flex items-center gap-2.5 max-w-sm sm:max-w-md"
          >
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <span className="leading-relaxed text-left">{notification}</span>
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-300 ml-2 transition">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          STICKY HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      {isFocusMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-mono text-gray-400 pointer-events-none uppercase tracking-widest animate-pulse">
          Focus Mode Active • Press Esc to Exit
        </div>
      )}
      {!isFocusMode && (
        <header className={`sticky top-0 z-40 w-full backdrop-blur-xl border-b shadow-sm ${themeBorder} ${isDarkTheme ? "bg-[#05070a]/60" : isSepiaTheme ? "bg-[#faf6f0]/60" : "bg-white/60"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className={`group flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm ${isDarkTheme ? "bg-slate-900 border-white/5 hover:border-indigo-500/30 hover:bg-slate-800" : isSepiaTheme ? "bg-[#faf6f0] border-[#433422]/15 hover:bg-[#eae2d5]" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}
              title="Return to Home"
            >
              <ArrowLeft size={16} className={`transition-transform group-hover:-translate-x-0.5 ${isDarkTheme ? "text-gray-400 group-hover:text-white" : "text-gray-600 group-hover:text-black"}`} />
            </Link>
          </div>
          <div className="flex-grow flex justify-center">
            {/* Header Title Accent */}
            <span className="text-xs font-hud font-bold tracking-widest text-indigo-400 uppercase hidden md:inline-block">
              {story.title}
            </span>
          </div>
          <div className="flex items-center gap-3 relative">
            <span className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${isDarkTheme ? "bg-indigo-950/40 border-indigo-500/20 text-indigo-300" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}>
              <Zap size={10} className="inline mr-1" />
              {coinBalance} Coins
            </span>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition hover:scale-105 cursor-pointer ${isDarkTheme ? "border-white/5 bg-slate-900 text-indigo-300" : isSepiaTheme ? "border-[#433422]/10 bg-[#faf6f0] text-amber-900" : "border-gray-200 bg-gray-50 text-indigo-700"}`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-white font-semibold text-xs animate-pulse">
                  {profileInitial}
                </span>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-2xl border p-4 text-left shadow-2xl backdrop-blur-xl bg-[#0b0f17] border-white/10"
                  >
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-sm font-semibold text-white">
                        {profileInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-200 text-xs">{profileName}</p>
                        <p className="truncate text-[10px] text-gray-500 font-mono mt-0.5">{currentUser?.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 py-4 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Username</span>
                        <span className="truncate font-semibold text-gray-300">{currentUser?.username}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Role</span>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-indigo-400 border border-indigo-500/20">
                          {currentUser?.role || "Reader"}
                        </span>
                      </div>
                    </div>
                    {currentUser?.role === "ADMIN" && (
                      <Link href="/admin" className="w-full py-2 mb-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer">
                        Admin Control Panel
                      </Link>
                    )}
                    <Link href="/dashboard" className="w-full py-2 mb-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-white/5 transition cursor-pointer">
                      <User className="h-3.5 w-3.5" />
                      View Dashboard
                    </Link>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-40"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {isLoggingOut ? "LOGGING OUT..." : "LOGOUT"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN WRAPPER - exactly 4 consecutive sections
          ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-grow relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-24">

        {/* ─────────────────────────────────────────────────────────────────────
            SECTION 1: HERO SECTION (Story Data)
            ───────────────────────────────────────────────────────────────────── */}
        {!isFocusMode && (
          <section id="hero" className="relative min-h-[80vh] flex items-center py-10 overflow-hidden border-b border-white/5">
          {/* Ambient Particles */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-indigo-400 rounded-full blur-[0.5px]"
                style={{ top: `${15 + i * 8}%`, left: `${10 + (i * 13) % 80}%` }}
                animate={{ y: [0, -40, 0], opacity: [0.1, 0.8, 0.1] }}
                transition={{ duration: 7 + (i % 3) * 4, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
            {/* Left: Text & Info */}
            <motion.div
              className="lg:col-span-7 flex flex-col items-start text-left space-y-6"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-bold text-[var(--accent)] tracking-wider uppercase font-hud">
                <Award size={14} className="text-[var(--accent)]" />
                {story.storyType || "Premium Novel"}
              </motion.div>

              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-glow"
              >
                {story.title}
              </motion.h1>

              {hasDescription && (
                <motion.p variants={staggerItem} className="text-base sm:text-lg text-[var(--muted)] font-light leading-relaxed max-w-2xl font-sans">
                  {story.description}
                </motion.p>
              )}

              <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--accent)] text-xs">
                    {story.author?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--muted)] uppercase font-mono tracking-wider">Author</p>
                    <p className="font-semibold text-[var(--ink)]">{story.author}</p>
                  </div>
                </div>
                {story.publicationStatus && (
                  <>
                    <div className="h-6 w-px bg-[var(--border)]" />
                    <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono tracking-widest">
                      {story.publicationStatus}
                    </span>
                  </>
                )}
                {hasRating && (
                  <>
                    <div className="h-6 w-px bg-[var(--border)]" />
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span>{story.rating.toFixed(1)}</span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Stats Bar */}
              <motion.div
                variants={staggerItem}
                className={`grid grid-cols-3 gap-6 p-4 w-full max-w-md text-left ${themeCard}`}
              >
                {hasReads && (
                  <div>
                    <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">Reads</p>
                    <p className="text-lg font-bold text-[var(--ink)] mt-0.5">{story.reads}</p>
                  </div>
                )}
                {hasChapters && (
                  <div>
                    <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">Chapters</p>
                    <p className="text-lg font-bold text-[var(--ink)] mt-0.5">{story.chapterList.length}</p>
                  </div>
                )}
                {story.language && (
                  <div>
                    <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">Language</p>
                    <p className="text-lg font-bold text-[var(--ink)] mt-0.5 capitalize">{story.language}</p>
                  </div>
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                <button
                  onClick={() => {
                    const firstUncompleted = story.chapterList.find(c => !unlockedIds.has(c.id)) || story.chapterList[0];
                    if (firstUncompleted) {
                      setActiveChapterId(firstUncompleted.id);
                      scrollToSection("reader");
                      triggerNotification(`Redirected to Ch. ${firstUncompleted.number}`);
                    }
                  }}
                  className={`px-8 py-3.5 ${themeButtonPrimary} uppercase tracking-widest text-xs flex items-center justify-center gap-2`}
                >
                  <BookOpen size={14} />
                  Start Reading
                </button>
                <button
                  onClick={() => scrollToSection("chapters")}
                  className={`px-8 py-3.5 ${themeButtonSecondary} uppercase tracking-widest text-xs flex items-center justify-center gap-2`}
                >
                  Browse Codex
                </button>
              </motion.div>
            </motion.div>

            {/* Right: Immersive Cover Art */}
            <motion.div
              className="lg:col-span-5 flex justify-center"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative group perspective-1000">
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-[var(--accent)]/20 to-violet-500/10 blur-2xl opacity-60 group-hover:opacity-100 transition duration-700" />
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 5 }}
                  className="relative w-64 sm:w-72 h-[380px] sm:h-[420px] rounded-2xl p-1 border border-white/10 shadow-2xl overflow-hidden bg-slate-950 flex flex-col justify-between p-6 select-none"
                >
                  {/* Foil overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-30 group-hover:opacity-40 pointer-events-none" />
                  
                  {hasCover ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${story.cover})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center">
                      <BookOpen size={48} className="text-indigo-500/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Foil details */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-indigo-300 bg-black/50 px-2 py-0.5 rounded border border-white/5">
                      GENESIS VOL
                    </div>
                    <Globe2 size={14} className="text-white/40" />
                  </div>

                  <div className="space-y-1 text-left relative z-10">
                    {story.genre && (
                      <span className="px-2 py-0.5 rounded bg-indigo-600/90 text-[8px] font-bold text-white uppercase tracking-widest font-mono">
                        {story.genre}
                      </span>
                    )}
                    <h3 className="text-xl font-black text-white leading-tight">{story.title}</h3>
                    <p className="text-[10px] text-gray-400 font-mono">By {story.author}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            SECTION 2: CHAPTERS LIST SECTION (Chronos Codex)
            ───────────────────────────────────────────────────────────────────── */}
        {!isFocusMode && (
          <section id="chapters" className="relative py-12 border-b border-white/5">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-[10px] font-mono tracking-[0.25em] text-[var(--accent)] uppercase font-semibold">
              02 / Chronos Codex
            </span>
            <h2 className="text-3xl font-black text-[var(--ink)]">Chapter Navigator</h2>
            <div className="h-1 w-14 bg-[var(--accent)] mx-auto rounded-full" />
          </div>

          {/* Continue Reading Bar */}
          {continueReadingChapter && (
            <div className={`p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left ${themeCard} border-[var(--accent)]/30 bg-[var(--accent)]/5`}>
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-ping" />
                  Quick Continue
                </span>
                <h4 className="text-sm font-bold text-[var(--ink)]">
                  Chapter {continueReadingChapter.number}: {continueReadingChapter.title}
                </h4>
              </div>
              <button
                onClick={() => {
                  if (unlockedIds.has(continueReadingChapter.id)) {
                    setActiveChapterId(continueReadingChapter.id);
                    scrollToSection("reader");
                  } else {
                    handleLockAlert(continueReadingChapter.id);
                  }
                }}
                className={`px-5 py-2 ${themeButtonPrimary} text-xs uppercase flex items-center gap-1.5 shadow-md`}
              >
                <PlayIcon size={12} />
                Continue
              </button>
            </div>
          )}

          {/* Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8 p-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)]">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search chapter title or number..."
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl text-xs font-sans placeholder-gray-500 border border-[var(--border)] outline-none transition ${themeInput}`}
              />
            </div>
            <div className="text-xs text-[var(--muted)] font-mono shrink-0">
              Total: {story.chapterList.length} Chapters
            </div>
          </div>

          {/* Core Interactive Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Chapters Cards list */}
            <div className="lg:col-span-7 space-y-3.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredChapters.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-2xl">
                  No chapters matched your search query.
                </div>
              ) : (
                filteredChapters.map((chap) => {
                  const active = chap.id === activeChapterId;
                  const unlocked = unlockedIds.has(chap.id);
                  return (
                    <div
                      key={chap.id}
                      onClick={() => {
                        setActiveChapterId(chap.id);
                        if (unlocked) {
                          // Allow fast navigation to reading box on click if already unlocked
                          scrollToSection("reader");
                        }
                      }}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-4 group ${
                        active
                          ? "bg-[var(--accent)]/10 border-[var(--accent)] shadow-sm"
                          : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-soft)] hover:border-[var(--accent)]/20"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-[var(--muted)] tracking-wider block uppercase">Chapter {chap.number}</span>
                          {!unlocked && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/20">
                              <Lock size={8} /> locked
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-bold truncate transition-colors group-hover:text-[var(--accent)] ${active ? "text-[var(--accent)]" : "text-[var(--ink)]"}`}>
                          {chap.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {chap.readTime && (
                          <span className="text-[9px] font-mono text-[var(--muted)] flex items-center gap-1">
                            <Clock size={10} />
                            {chap.readTime}
                          </span>
                        )}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          active
                            ? "bg-[var(--accent)] text-[var(--color-on-accent)] border-[var(--accent)]"
                            : unlocked
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-[var(--surface-soft)] border-[var(--border)] text-[var(--muted)] group-hover:border-[var(--accent)]/30 group-hover:text-[var(--accent)]"
                        }`}>
                          {unlocked ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Selected Chapter Detail Panel (Story Studio details) */}
            <div className="lg:col-span-5 flex">
              <div className={`w-full p-6 flex flex-col justify-between text-left relative overflow-hidden h-full ${themeCard}`}>
                
                {activeChapter ? (
                  <div className="space-y-6 w-full flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      {/* Chapter Title Metadata */}
                      <div className="border-b border-[var(--border)] pb-4 space-y-1">
                        <span className="text-[9px] text-[var(--accent)] font-mono tracking-widest uppercase">Active Chapter Details</span>
                        <h3 className="text-lg font-black text-[var(--ink)] mt-1">
                          Ch. {activeChapter.number}: {activeChapter.title}
                        </h3>
                        {activeChapter.publishedAt && (
                          <span className="text-[9px] text-[var(--muted)] font-mono block pt-0.5">
                            Published on {new Date(activeChapter.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Summary Excerpt */}
                      {activeChapter.excerpt && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">Chapter Synopsis</h4>
                          <p className="text-xs text-[var(--ink)] font-sans leading-relaxed">{activeChapter.excerpt}</p>
                        </div>
                      )}

                      {/* Naming Dossiers (Story Studio Character info relevant to active chapter) */}
                      {activeChapterNamingEntries.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={11} className="text-[var(--accent)]" />
                            Studio Naming Board ({activeChapterNamingEntries.length})
                          </h4>
                          
                          {/* Tabs for Naming Categories */}
                          {activeChapterNamingCategories.length > 1 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none font-hud text-[9px]">
                              {activeChapterNamingCategories.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => setActiveCategoryTab(cat.id)}
                                  className={`px-2.5 py-1 rounded border transition ${
                                    activeCategoryTab === cat.id
                                      ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] font-medium"
                                      : "bg-[var(--surface-soft)] border-[var(--border)] text-[var(--muted)]"
                                  }`}
                                >
                                  {cat.title}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Dossier details */}
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {activeChapterNamingEntries
                              .filter(e => !activeCategoryTab || e.categoryId === activeCategoryTab)
                              .map(entry => (
                                <div key={entry.id} className="p-3 bg-[var(--surface-soft)]/50 border border-[var(--border)] rounded-xl text-left space-y-1">
                                  <span className="text-[9px] font-bold text-[var(--accent)]">{entry.name}</span>
                                  <p className="text-[10px] text-[var(--muted)] leading-normal">{entry.description}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Lore Facts from Story Studio manifest */}
                      {manifestFacts.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
                          <h4 className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                            <Info size={11} className="text-indigo-400" />
                            Codex Lore Facts
                          </h4>
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {manifestFacts.slice(0, 3).map((fact, idx) => {
                              const title = typeof fact === "string" ? `Fact ${idx + 1}` : (fact.keyword || fact.title || `Fact ${idx + 1}`);
                              const bodyText = typeof fact === "string" ? fact : (fact.description || fact.text || fact.fact || "");
                              return (
                                <div key={idx} className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-left text-[10px]">
                                  <strong className="text-indigo-400 font-hud block uppercase tracking-wider">{title}</strong>
                                  <span className="text-[var(--muted)] leading-relaxed block mt-0.5">{bodyText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Details panel footer: Stats & actions */}
                    <div className="pt-4 border-t border-[var(--border)] space-y-4">
                      {/* Chapter Stats */}
                      <div className="flex items-center justify-between text-xs font-hud">
                        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                          <button
                            onClick={handleLikeToggle}
                            className={`flex items-center gap-1 hover:text-rose-400 transition cursor-pointer ${liked ? "text-rose-400 font-semibold" : ""}`}
                          >
                            <ThumbsUp size={11} className={liked ? "fill-rose-400 text-rose-400" : ""} />
                            <span>{liked ? "Liked" : "Like"}</span>
                          </button>
                          <span className="flex items-center gap-1">
                            <MessageSquare size={11} />
                            <span>{comments.length} Comments</span>
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            triggerNotification("Chapter link copied to clipboard.");
                          }}
                          className="text-[var(--muted)] hover:text-[var(--accent)] transition cursor-pointer flex items-center gap-1"
                          title="Copy Share Link"
                        >
                          <Share2 size={11} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Action CTA */}
                      {isUnlocked ? (
                        <button
                          onClick={() => scrollToSection("reader")}
                          className={`w-full py-2.5 ${themeButtonSecondary} text-xs uppercase flex items-center justify-center gap-2`}
                        >
                          <BookOpen size={13} />
                          Scroll to Read Chapter
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLockAlert(activeChapter.id)}
                          className={`w-full py-2.5 ${themeButtonPrimary} text-xs uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white`}
                        >
                          <Lock size={13} />
                          Unlock Chapter ({activeChapter.coinPrice} Coins)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2 w-full h-full">
                    <Info size={24} className="text-[var(--muted)]/40" />
                    <span>Select a chapter from the list to view stats, lore, and access controls.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            SECTION 3: CHAPTER READING SECTION (Immersive Terminal)
            ───────────────────────────────────────────────────────────────────── */}
        <section id="reader" className={`relative ${isFocusMode ? "min-h-screen py-8 border-b-0" : "py-12 border-b border-white/5"}`}>
          {/* Section Header */}
          {!isFocusMode && (
            <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
              <span className="text-[10px] font-mono tracking-[0.25em] text-[var(--accent)] uppercase font-semibold">
                03 / Immersive Reading
              </span>
              <h2 className="text-3xl font-black text-[var(--ink)]">Reader Stage</h2>
              <div className="h-1 w-14 bg-[var(--accent)] mx-auto rounded-full" />
            </div>
          )}

          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Top HUD progress */}
            <div style={{ "--reader-width": `${settings.widthPercent}%` } as React.CSSProperties} className={`w-full sm:max-w-[var(--reader-width)] flex items-center justify-between mb-6 pb-3 border-b ${themeBorder} font-hud text-xs ${themeSubtext}`}>
              {activeChapter ? (
                <div className="flex items-center gap-3">
                  <span className="font-bold tracking-widest text-[var(--accent)] font-mono">CH. {activeChapter.number}</span>
                  <span className="opacity-40">|</span>
                  <span className="truncate max-w-[150px] sm:max-w-none">{activeChapter.title}</span>
                </div>
              ) : (
                <span className="text-gray-500">No active chapter loaded</span>
              )}
              <div className="font-mono text-[10px] uppercase tracking-wider">
                {Math.round(scrollProgress)}% read
              </div>
            </div>

            {/* PRIMARY IMPRESSIBLE PROSE BOX */}
            <div
              ref={readerRef}
              style={{ "--reader-width": `${settings.widthPercent}%` } as React.CSSProperties}
              className={`w-full sm:max-w-[var(--reader-width)] rounded-3xl border p-6 md:p-12 relative overflow-hidden transition-all duration-300 bg-[var(--surface-soft)] ${themeBorder}`}
            >
              {isUnlocked ? (
                contentLoading ? (
                  <div className="py-24 text-center space-y-3 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-xs text-[var(--muted)]">Syncing encrypted streams...</p>
                  </div>
                ) : readerNotice ? (
                  <div className="py-16 text-center text-xs text-red-400 flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={20} />
                    <p>{readerNotice}</p>
                    <button onClick={() => void loadChapterContent(activeChapter.id)} className="mt-2 text-indigo-400 hover:underline">Retry Stream</button>
                  </div>
                ) : activeContent.length > 0 ? (
                  <div>
                    {/* Chapter Headers Inside flow */}
                    <div className="text-center mb-10 space-y-4">
                      <p className="text-[9px] font-mono tracking-[0.25em] text-[var(--accent)] uppercase font-semibold">
                        Chapter {activeChapter.number}
                      </p>
                      <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight leading-tight text-[var(--ink)]">
                        {activeChapter.title}
                      </h2>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-hud text-[var(--muted)]">
                        <span>Min: {activeChapter.readTime || "5 min"}</span>
                        <span>•</span>
                        <span>Scope: Immersive</span>
                      </div>
                      <div className="h-px w-16 bg-[var(--border)] mx-auto mt-4" />
                    </div>

                    {/* actual prose content */}
                    <article
                      className={`${fontClasses[settings.fontFamily]} text-left text-[var(--ink)]`}
                      style={{
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: 1.8
                      }}
                    >
                      {activeContent.map((block, index) => {
                        return (
                          <p
                            key={index}
                            className="indent-0 md:indent-4 font-light hover:opacity-85 transition duration-300 cursor-default"
                            style={{ marginBottom: `${settings.paragraphMargin}px` }}
                          >
                            {block.text}
                          </p>
                        );
                      })}
                    </article>

                    {/* Section End divider */}
                    <div className="my-10 flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[var(--accent)]/45" />
                        <span className="w-6 h-px bg-[var(--border)]/40" />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span className="w-6 h-px bg-[var(--border)]/40" />
                        <span className="w-1 h-1 rounded-full bg-[var(--accent)]/45" />
                      </div>
                      <p className="text-[9px] font-mono tracking-widest uppercase text-[var(--muted)]">End of Transmission</p>
                    </div>

                    {/* Chapter Checkbox indicator */}
                    <div className="flex flex-col items-center gap-3 py-5 px-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 max-w-sm mx-auto text-center mt-6">
                      <p className="text-[10px] text-[var(--muted)]">Mark completed to update reading progress:</p>
                      <span className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[10px] font-hud font-bold text-[var(--accent)] flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--accent)]" />
                        LOG SYNCHRONIZED
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-xs text-[var(--muted)]">Prose text stream empty.</div>
                )
              ) : (
                <div className="py-20 text-center space-y-6 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-500 flex items-center justify-center mx-auto">
                    <Lock size={20} className="animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-[var(--ink)]">Premium Chapter Locked</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                      Chapter {activeChapter?.number} (&ldquo;{activeChapter?.title}&rdquo;) requires coins to decrypt. Permanent access will be unlocked.
                    </p>
                  </div>
                  <button
                    onClick={() => activeChapter && handleLockAlert(activeChapter.id)}
                    className={`w-full py-3 ${themeButtonPrimary} uppercase tracking-wider text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white`}
                  >
                    Unlock Chapter ({activeChapter?.coinPrice} Coins)
                  </button>
                </div>
              )}

              {/* SECTION READING CONTROLS: Prev/Next on side, Like/Share in middle */}
              {activeChapter && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-[var(--border)]/40 mt-10">
                  {/* Prev Button */}
                  <button
                    disabled={activeIndex === 0}
                    onClick={handlePrevChapter}
                    className={`px-5 py-2.5 ${themeButtonSecondary} text-xs flex items-center gap-1.5 disabled:opacity-20 disabled:pointer-events-none`}
                  >
                    <ChevronLeft size={14} />
                    PREV
                  </button>

                  {/* Like / Share Middle buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLikeToggle}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-hud font-bold transition border cursor-pointer ${
                        liked
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--ink)]"
                      }`}
                    >
                      <ThumbsUp size={13} className={liked ? "fill-rose-400 text-rose-400" : ""} />
                      <span>{liked ? "Liked Chapter" : "Like Chapter"}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        triggerNotification("Chapter link copied to clipboard.");
                      }}
                      className="p-2.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--ink)] transition cursor-pointer"
                      title="Share Chapter"
                    >
                      <Share2 size={13} />
                    </button>
                  </div>

                  {/* Next Button */}
                  <button
                    disabled={activeIndex === story.chapterList.length - 1}
                    onClick={handleNextChapter}
                    className={`px-5 py-2.5 ${themeButtonPrimary} text-xs flex items-center gap-1.5 disabled:opacity-20 disabled:pointer-events-none`}
                  >
                    NEXT
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* CHAPTER DISCUSSION BOARD (Comments) */}
            {!isFocusMode && (
              <div ref={commentsContainerRef} className="w-full max-w-3xl mt-12 text-left space-y-6">
              
              {/* Comment Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
                    04 / Thread Board
                  </span>
                  <h3 className="text-xl font-black text-[var(--ink)] flex items-center gap-2">
                    <MessageSquare size={16} />
                    Discussion Board
                  </h3>
                </div>
                <div className="text-xs text-[var(--muted)] font-mono">
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </div>
              </div>

              {/* Main Comment Input Form (Using unified CommentForm) */}
              {activeReplyId === null && (
                <CommentForm
                  onSubmit={handlePostComment}
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Share your thoughts on Kaelyn's choice or the temporal streams..."
                  isSubmitting={postingComment}
                  submitLabel="Post Comment"
                />
              )}

              {/* Comments list */}
              {loadingComments ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <span>Retrieving comments...</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {comments.map((comment) => {
                    const dispName = comment.user?.displayName || comment.user?.username || "Reader";
                    return (
                      <div key={comment.id} className="group p-5 rounded-2xl bg-[var(--surface-soft)]/50 border border-[var(--border)] flex flex-col gap-3">
                        <div className="flex gap-4">
                          <div className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--accent)] text-xs shrink-0 select-none">
                            {dispName.slice(0, 2).toUpperCase()}
                          </div>
                          
                          <div className="space-y-1.5 flex-1 relative min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--ink)]">{dispName}</span>
                                <span className="text-[9px] text-[var(--muted)] font-mono">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              {/* Action Menu (Edit / Delete) */}
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuCommentId(activeMenuCommentId === comment.id ? null : comment.id); }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer"
                                >
                                  <MoreHorizontal size={12} />
                                </button>
                                {activeMenuCommentId === comment.id && (
                                  <div className="absolute right-0 mt-1 w-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] py-1 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-[10px] font-mono">
                                    {currentUser && currentUser.id === comment.userId && (
                                      <button onClick={(e) => { e.stopPropagation(); setEditingCommentId(comment.id); setEditText(comment.body); setActiveMenuCommentId(null); }} className="w-full text-left px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--surface-soft)] transition uppercase">Edit</button>
                                    )}
                                    {currentUser && (currentUser.id === comment.userId || currentUser.role === "ADMIN") && (
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }} className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 transition uppercase">Delete</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Editing card mode */}
                            {editingCommentId === comment.id ? (
                              <div className="space-y-2 pt-1 w-full">
                                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className={`w-full text-xs font-sans rounded-xl p-2.5 outline-none resize-none ${themeInput}`} />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => { setEditingCommentId(null); setEditText(""); }} className="px-3 py-1 rounded-lg border border-[var(--border)] text-[9px] font-mono text-[var(--muted)] uppercase transition cursor-pointer">Cancel</button>
                                  <button onClick={() => handleUpdateComment(comment.id)} disabled={updatingComment || !editText.trim()} className="px-3 py-1 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-30 text-[9px] font-mono text-[var(--color-on-accent)] uppercase transition cursor-pointer">{updatingComment ? "Saving..." : "Save"}</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--ink)] leading-relaxed font-sans font-light">{comment.body}</p>
                            )}

                            {/* Actions footer */}
                            <div className="flex items-center gap-4 pt-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                                  setReplyToUser(dispName);
                                  setReplyText("");
                                }}
                                className="text-[9px] font-mono tracking-wider text-[var(--accent)] uppercase cursor-pointer hover:underline flex items-center gap-1"
                              >
                                <MessageSquare size={10} />
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inline sub-comment replies container */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-10 pl-4 border-l border-[var(--accent)]/15 space-y-3 pt-1">
                            {comment.replies.map((reply: any) => {
                              const rName = reply.user?.displayName || reply.user?.username || "Reader";
                              return (
                                <div key={reply.id} className="group/reply p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex gap-3 text-left">
                                  <div className="w-7 h-7 rounded-full bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--muted)] text-[10px] shrink-0 select-none">
                                    {rName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="space-y-1 flex-grow min-w-0 relative">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-[var(--ink)]">{rName}</span>
                                        <span className="text-[9px] text-[var(--muted)] font-mono">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                      </div>

                                      <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuCommentId(activeMenuCommentId === reply.id ? null : reply.id); }} className="opacity-0 group-hover/reply:opacity-100 p-0.5 rounded hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer">
                                          <MoreHorizontal size={10} />
                                        </button>
                                        {activeMenuCommentId === reply.id && (
                                          <div className="absolute right-0 mt-1 w-24 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] py-1 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1 duration-150 text-[10px] font-mono">
                                            {currentUser && currentUser.id === reply.userId && (
                                              <button onClick={(e) => { e.stopPropagation(); setEditingCommentId(reply.id); setEditText(reply.body); setActiveMenuCommentId(null); }} className="w-full text-left px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--surface)] transition uppercase">Edit</button>
                                            )}
                                            {currentUser && (currentUser.id === reply.userId || currentUser.role === "ADMIN") && (
                                              <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(reply.id); }} className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 transition uppercase">Delete</button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {editingCommentId === reply.id ? (
                                      <div className="space-y-2 pt-1 w-full">
                                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className={`w-full text-xs font-sans rounded-xl p-2.5 outline-none resize-none ${themeInput}`} />
                                        <div className="flex gap-2 justify-end">
                                          <button onClick={() => { setEditingCommentId(null); setEditText(""); }} className="px-3 py-1 rounded-lg border border-[var(--border)] text-[9px] font-mono text-[var(--muted)] uppercase transition cursor-pointer">Cancel</button>
                                          <button onClick={() => handleUpdateComment(reply.id)} disabled={updatingComment || !editText.trim()} className="px-3 py-1 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-30 text-[9px] font-mono text-[var(--color-on-accent)] uppercase transition cursor-pointer">{updatingComment ? "Saving..." : "Save"}</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-[var(--muted)] leading-relaxed font-sans font-light">{reply.body}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Inline reply input mode */}
                        {activeReplyId === comment.id && !isInputFloatingViewport && (
                          <div className="ml-10 pt-2 w-full max-w-xl">
                            <CommentForm
                              onSubmit={handlePostReply}
                              value={replyText}
                              onChange={setReplyText}
                              placeholder={`Reply to @${replyToUser}...`}
                              isSubmitting={postingReply}
                              submitLabel="Reply"
                              cancelLabel="Cancel"
                              onCancel={() => { setActiveReplyId(null); setReplyToUser(null); setReplyText(""); }}
                              replyToUser={replyToUser}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-soft)]/20">
                  No comments yet. Share your cinematic reflections above!
                </div>
              )}

              {/* Floating viewport bottom reply input form (using unified CommentForm) */}
              <AnimatePresence>
                {activeReplyId !== null && isInputFloatingViewport && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-50 animate-in fade-in slide-in-from-bottom-5">
                    <CommentForm
                      onSubmit={handlePostReply}
                      value={replyText}
                      onChange={setReplyText}
                      placeholder={`Reply to @${replyToUser}...`}
                      isSubmitting={postingReply}
                      submitLabel="Reply"
                      cancelLabel="Cancel"
                      onCancel={() => { setActiveReplyId(null); setReplyToUser(null); setReplyText(""); }}
                      replyToUser={replyToUser}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
            )}

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            SECTION 4: RECOMMENDATIONS SECTION (New Stories)
            ───────────────────────────────────────────────────────────────────── */}
        {!isFocusMode && hasRecommendations && (
          <section id="recommendations" className="relative py-12">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
                <span className="text-[10px] font-mono tracking-[0.25em] text-[var(--accent)] uppercase font-semibold">
                  05 / Discover Streams
                </span>
                <h2 className="text-3xl font-black text-[var(--ink)]">Recommended Novels</h2>
                <div className="h-1 w-14 bg-[var(--accent)] mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {recommendations.slice(0, 3).map((rec) => (
                  <Link
                    key={rec.id}
                    href={`/read/${rec.slug}`}
                    className={`p-4 transition-all flex gap-4 group cursor-pointer ${themeCard} hover:border-[var(--accent)]/30`}
                  >
                    <div
                      className="w-20 h-28 rounded-xl bg-cover bg-center shrink-0 border border-white/5 bg-slate-900"
                      style={{ backgroundImage: `url(${rec.cover || ""})` }}
                    />
                    <div className="flex flex-col justify-between py-1 overflow-hidden min-w-0">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent)]">{rec.genre}</span>
                        <h4 className="text-sm font-bold text-[var(--ink)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{rec.title}</h4>
                        <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed font-sans">{rec.description}</p>
                      </div>
                      <p className="text-[10px] text-[var(--muted)] font-mono mt-1">By {rec.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            FOOTER
            ═══════════════════════════════════════════════════════════════════════ */}
        {!isFocusMode && (
          <footer className="pt-10 pb-4 border-t border-[var(--border)]/40 text-center">
            <div className="max-w-7xl mx-auto px-4 space-y-4">
              <p className="text-xs text-[var(--muted)] font-mono">&copy; {new Date().getFullYear()} Velora Press. All rights reserved.</p>
              <button onClick={() => scrollToSection("hero")} className="text-[10px] text-[var(--accent)] hover:underline transition cursor-pointer flex items-center gap-1 mx-auto">
                <ChevronUpIcon size={12} />
                Back to top
              </button>
            </div>
          </footer>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          FLOATING HUD CONTROLS
          ═══════════════════════════════════════════════════════════════════════ */}
      {(isReaderVisible || isFocusMode) && (
        <div className="fixed bottom-6 right-6 lg:bottom-1/2 lg:-translate-y-1/2 lg:right-8 z-40 flex flex-row lg:flex-col gap-2.5 p-2 bg-[#05070a]/90 rounded-full border border-white/10 shadow-2xl backdrop-blur-md overflow-visible">
          {/* Settings button */}
          <button
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${showSettings ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-slate-900/60"}`}
            title="Reader Settings"
          >
            <Settings2 size={15} />
          </button>

          {/* Audio narration */}
          <button
            onClick={toggleSpeech}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${isNarrating ? "bg-cyan-600 text-white animate-pulse" : "text-gray-400 hover:text-white hover:bg-slate-900/60"}`}
            title={isNarrating ? "Stop narration" : "Listen chapter"}
          >
            {isNarrating ? <Pause size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Focus mode */}
          <button
            type="button"
            onClick={handleFocusModeToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${isFocusMode ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-slate-900/60"}`}
            title={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
          >
            {isFocusMode ? <BookOpen size={15} /> : <Eye size={15} />}
          </button>

          {/* Compact theme selector switcher inside floating HUD */}
          <ThemeSwitcher compact variant="cinematic" />
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════════════════════
          DISPLAY CONTROLS SETTINGS POPUP
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && (isReaderVisible || isFocusMode) && (
          <motion.div
            ref={settingsPanelRef}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-20 right-4 left-4 sm:right-6 sm:left-auto lg:bottom-1/3 lg:right-20 z-40 sm:w-80 max-h-[75vh] overflow-y-auto p-5 rounded-2xl glass-panel-heavy border border-white/10 text-left space-y-4 shadow-2xl text-gray-200 font-hud custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Settings2 size={13} />
                Display Controls
              </span>
              <button onClick={() => setShowSettings(false)} className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer font-mono">
                Close
              </button>
            </div>

            {/* Core Themes */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400 block">Core Themes</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {themes.map((item) => {
                  const active = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTheme(item.id);
                        triggerNotification(`Theme applied: ${item.label}`);
                      }}
                      className={`p-1.5 rounded-lg border text-left transition cursor-pointer ${active ? "bg-indigo-600/20 border-indigo-500/45 text-indigo-100" : "bg-slate-900 text-gray-400 border-white/5 hover:border-indigo-500/30 hover:text-gray-200"}`}
                    >
                      <span
                        className="mb-1.5 block h-5 w-full rounded-md border border-white/10"
                        style={{ background: cinematicThemeSwatches[item.id] }}
                      />
                      <span className="font-semibold uppercase tracking-wider">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reader Width */}
            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="flex justify-between text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1"><MoveHorizontal size={11} /> Reader Width</span>
                <span className="font-mono">{settings.widthPercent}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="80"
                step="1"
                value={settings.widthPercent}
                onChange={(e) => updateSetting("widthPercent", parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-gray-400">
                <span>Text Size</span>
                <span className="font-mono">{settings.fontSize}px</span>
              </div>
              <div className="flex gap-2.5 items-center">
                <button onClick={() => updateSetting("fontSize", Math.max(settings.fontSize - 1, 12))} className="py-1 px-2.5 bg-slate-900 border border-white/5 hover:border-white/15 rounded text-xs transition cursor-pointer active:scale-95">A-</button>
                <input type="range" min="12" max="32" value={settings.fontSize} onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <button onClick={() => updateSetting("fontSize", Math.min(settings.fontSize + 1, 32))} className="py-1 px-2.5 bg-slate-900 border border-white/5 hover:border-white/15 rounded text-xs transition cursor-pointer active:scale-95">A+</button>
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <span className="text-xs font-medium text-gray-400 block">Typeface</span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {(["serif", "sans", "mono"] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => updateSetting("fontFamily", font)}
                    className={`py-1.5 rounded border capitalize transition cursor-pointer ${settings.fontFamily === font ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-medium" : "bg-slate-900 text-gray-400 border-white/5 hover:text-gray-200"}`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Paragraph Margin */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex justify-between text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1"><Type size={11} /> Paragraph Margin</span>
                <span className="font-mono">{settings.paragraphMargin}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="48"
                step="2"
                value={settings.paragraphMargin}
                onChange={(e) => updateSetting("paragraphMargin", parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          UNLOCK MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showUnlockModal && unlockModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnlockModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm p-6 rounded-2xl bg-[#0b0f17]/95 backdrop-blur-xl border border-indigo-500/20 text-center space-y-5 shadow-2xl z-10 text-gray-200"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Lock size={20} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400">
                  {unlockModalData.chaptersToUnlock.length > 1 ? "Bulk Unlock Required" : "Unlock Chapter"}
                </span>
                <h3 className="text-lg font-bold text-white">Unlock Chapter {unlockModalData.targetChapter.number}</h3>
                {unlockModalData.chaptersToUnlock.length > 1 ? (
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                    To read Chapter {unlockModalData.targetChapter.number}, you must also unlock preceding locked chapters:{" "}
                    <span className="text-indigo-300 font-semibold">
                      {unlockModalData.chaptersToUnlock
                        .slice(0, -1)
                        .map((c) => `Ch. ${c.number}`)
                        .join(", ")}
                    </span>.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                    &ldquo;{unlockModalData.targetChapter.title}&rdquo; is locked. Spend coins to permanently unlock this chapter.
                  </p>
                )}
              </div>

              {coinBalance < unlockModalData.totalCost && (
                <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 text-left text-xs leading-normal text-red-400 border-l-4">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Insufficient Coins
                  </p>
                  <p className="mt-0.5 text-red-300/80">
                    You do not have enough coins. Please purchase coins or cancel.
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 grid grid-cols-2 text-left text-xs">
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">
                    {unlockModalData.chaptersToUnlock.length > 1 ? "Total Cost" : "Cost"}
                  </p>
                  <p className="font-bold text-gray-200 mt-0.5">{unlockModalData.totalCost} Coins</p>
                </div>
                <div className="border-l border-white/5 pl-4">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Your Balance</p>
                  <p className="font-bold text-emerald-400 mt-0.5">{coinBalance} Coins</p>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowUnlockModal(false)} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => unlockChapters(unlockModalData.chaptersToUnlock)}
                  disabled={coinBalance < unlockModalData.totalCost || unlockingId !== null}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-bold text-white transition shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {unlockingId !== null ? "Unlocking..." : "Unlock"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   HELPER ICON COMPONENTS (to prevent external lookup issues)
   ──────────────────────────────────────────────────────────────────────────── */

function ChevronUpIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  );
}
