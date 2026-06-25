"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, Sparkles, X, Lock, ShieldCheck, 
  BookOpen, Compass, Award, AlertCircle, Settings2, Type, 
  MoveHorizontal, ThumbsUp, Bookmark, Share2, ChevronLeft, 
  ChevronRight, Volume2, Moon, Sun, MessageSquare, Send, CheckCircle2,
  Users, Globe2, BookOpenText, Eye, Flame, Brain, ShieldAlert,
  CalendarRange, HelpCircle, Heart, Star, BookMarked, ArrowLeft,
  LogOut, User, BookOpen as BookIcon, Info
} from "lucide-react";
import Link from "next/link";
import { ProtectedReader } from "@/components/protected-reader";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CustomSelect } from "@/components/custom-select";
import { type Chapter, type Story } from "@/lib/content";
import { getStoryLore, type StoryLore } from "@/lib/story-lore";
import { studioContentToReviewBlocks, type StudioReviewBlock } from "@/lib/studio-content-renderer";
import { useToast } from "@/components/toast-context";

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
  lineHeight: number;
  theme: "dark" | "sepia" | "light";
  fontFamily: "serif" | "sans" | "mono";
  width: "narrow" | "medium" | "wide";
  fullscreen: boolean;
  backgroundGlow: boolean;
  dropCap: boolean;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  theme: "dark",
  fontFamily: "serif",
  width: "medium",
  fullscreen: false,
  backgroundGlow: true,
  dropCap: true
};

export const metadata = {
  name: "Cinematic Immersive",
  description: "Immersive dashboard with floating particles, full lore codex tabs, character dossiers, and clean typography presets."
};

function splitChapterContent(content: string) {
  return studioContentToReviewBlocks(content);
}

export default function CinematicLayout({ 
  story, 
  initialCoinBalance, 
  currentUser,
  recommendations = [],
  studioData = null
}: CinematicLayoutProps) {
  const { showToast } = useToast();
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  
  // Chapter unlock tracking
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(
    () => new Set(story.chapterList.filter((chapter) => chapter.state !== "locked").map((chapter) => chapter.id))
  );
  
  const [activeChapterId, setActiveChapterId] = useState(story.chapterList[0]?.id);
  const [chapterContents, setChapterContents] = useState<Record<string, StudioReviewBlock[]>>({});
  const [contentLoadingId, setContentLoadingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [readerNotice, setReaderNotice] = useState("");
  
  // Header and user profile states
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileName = currentUser.displayName || currentUser.username || "Reader";
  const profileInitial = profileName.charAt(0).toUpperCase();

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

  // Close profile dropdown on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileOpen && profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [profileOpen]);

  // Settings states
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aetheris_reader_settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {}
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  // Locked chapter premium modal triggers
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedLockChapter, setSelectedLockChapter] = useState<{ title: string; number: number; id: string } | null>(null);

  // Active chapter helpers
  const activeIndex = story.chapterList.findIndex((chapter) => chapter.id === activeChapterId);
  const activeChapter = story.chapterList[activeIndex] ?? story.chapterList[0];
  const isUnlocked = activeChapter ? unlockedIds.has(activeChapter.id) : false;
  const activeContent = activeChapter ? chapterContents[activeChapter.id] ?? [] : [];
  const contentLoading = activeChapter ? contentLoadingId === activeChapter.id : false;

  // Custom interactive notification state
  const [notification, setNotification] = useState<string | null>(null);

  // Load lore database background
  const lore = useMemo(() => getStoryLore(story.slug, story.title, story.tags), [story]);

  // Comments states
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Font family mapping
  const fontClasses = {
    serif: 'font-serif tracking-normal antialiased',
    sans: 'font-sans tracking-wide font-normal antialiased',
    mono: 'font-mono tracking-tight text-sm leading-relaxed antialiased'
  };

  // Spacing Scale mapping
  const spacingScaleClasses: Record<number, string> = {
    1.5: "leading-relaxed",
    1.8: "leading-[1.8]",
    2.1: "leading-[2.1]"
  };

  // Sync settings with local storage
  useEffect(() => {
    localStorage.setItem("aetheris_reader_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Audio narration settings using SpeechSynthesis
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
        utterance.rate = 0.95; // Slightly slower, cinematic pace
        window.speechSynthesis.speak(utterance);
        setIsNarrating(true);
      }
    } else {
      showToast("Text to speech is not supported in this browser.", "error");
    }
  };

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Fetch comments from DB
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

  // Post comment to DB
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
        triggerNotification("Comment beamed to sanctuary successfully.");
      } else {
        showToast(body.error?.message || "Failed to post comment", "error");
      }
    } catch (err) {
      showToast("Error posting comment", "error");
    } finally {
      setPostingComment(false);
    }
  };

  // Secure content loader
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

  // Unlock chapter with coins
  async function unlockChapter(chapter: Chapter) {
    if (unlockedIds.has(chapter.id)) {
      setActiveChapterId(chapter.id);
      void loadChapterContent(chapter.id);
      return;
    }

    if (coinBalance < chapter.coinPrice) {
      showToast("Not enough coins. Purchase coins from the homepage wallet.", "error");
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
      setShowUnlockModal(false);
      setActiveChapterId(chapter.id);
      await loadChapterContent(chapter.id);
      triggerNotification(`Success! Materialized Chapter ${chapter.number}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to unlock chapter.", "error");
    } finally {
      setUnlockingId((current) => (current === chapter.id ? null : current));
    }
  }

  // Trigger modal overlay for locked chapter
  const handleLockAlert = (chapterId: string) => {
    const chap = story.chapterList.find(c => c.id === chapterId);
    if (chap) {
      setSelectedLockChapter({ title: chap.title, number: chap.number, id: chap.id });
      setShowUnlockModal(true);
    }
  };

  // Sync Likes/Ratings on chapter change
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

  // Scroll tracking for reading progress bar
  const readerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleScroll = () => {
      if (!readerRef.current) return;
      const rect = readerRef.current.getBoundingClientRect();
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
  }, [activeChapterId, activeContent]);

  // Like toggle handler
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
        triggerNotification(`Liked Chapter ${activeChapter.number}`);
      } else {
        await fetch(`/api/ratings?storyId=${story.id}&chapterId=${activeChapter.id}`, {
          method: "DELETE"
        });
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

  return (
    <div className={`relative min-h-screen transition-colors duration-500 overflow-hidden pb-12 ${
      settings.theme === "dark" 
        ? "bg-[#05070a] text-slate-200" 
        : settings.theme === "sepia" 
          ? "bg-[#faf6f0] text-[#433422]" 
          : "bg-white text-gray-900"
    } selection:bg-indigo-500/30 selection:text-white`}>
      
      {/* Ambient background glows */}
      {settings.theme === "dark" && settings.backgroundGlow && (
        <>
          <div className="absolute top-0 left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none ambient-light-1" />
          <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-900/5 blur-[100px] pointer-events-none ambient-light-2" />
        </>
      )}
      
      {/* 1. EMBEDDED NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl glass-panel-heavy border border-indigo-500/20 text-xs font-hud font-semibold text-gray-200 shadow-2xl flex items-center gap-2.5 max-w-sm sm:max-w-md"
          >
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <span className="leading-relaxed text-left">{notification}</span>
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-300 ml-2">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. REDESIGNED STICKY HUD HEADER */}
      <header className={`sticky top-0 z-40 w-full backdrop-blur-xl border-b shadow-md ${
        settings.theme === "dark" 
          ? "bg-[#05070a]/60 border-white/5" 
          : settings.theme === "sepia" 
            ? "bg-[#faf6f0]/60 border-[#433422]/10" 
            : "bg-white/60 border-gray-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          
          {/* Left: Back Arrow Button to Home page */}
          <div className="flex items-center">
            <Link
              href="/"
              className={`group flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm ${
                settings.theme === "dark"
                  ? "bg-slate-900 border-white/5 hover:border-indigo-500/30 hover:bg-slate-800"
                  : settings.theme === "sepia"
                    ? "bg-[#faf6f0] border-[#433422]/15 hover:bg-[#eae2d5]"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              title="Return to Home"
            >
              <ArrowLeft size={16} className={`transition-transform group-hover:-translate-x-0.5 ${
                settings.theme === "dark" ? "text-gray-400 group-hover:text-white" : "text-gray-600 group-hover:text-black"
              }`} />
            </Link>
          </div>

          {/* Middle: Empty */}
          <div className="flex-grow" />

          {/* Right: Coins, Unlocked, and Profile Avatar */}
          <div className="flex items-center gap-3 relative">
            <span className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${
              settings.theme === "dark"
                ? "bg-indigo-950/40 border-indigo-500/20 text-indigo-300"
                : "bg-indigo-50 border-indigo-100 text-indigo-700"
            }`}>
              ⚡ {coinBalance} Coins
            </span>
            
            <span className={`hidden sm:inline-block px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${
              settings.theme === "dark"
                ? "bg-slate-900 border-white/5 text-gray-400"
                : settings.theme === "sepia"
                  ? "bg-[#faf6f0] border-[#433422]/10 text-[#433422]/80"
                  : "bg-gray-50 border-gray-100 text-gray-500"
            }`}>
              Unlocked: {unlockedIds.size}/{story.chapterList.length}
            </span>

            {/* Profile Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition hover:scale-105 cursor-pointer ${
                  settings.theme === "dark"
                    ? "border-white/5 bg-slate-900 text-indigo-300"
                    : settings.theme === "sepia"
                      ? "border-[#433422]/10 bg-[#faf6f0] text-amber-900"
                      : "border-gray-200 bg-gray-50 text-indigo-700"
                }`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-white font-hud text-xs">
                  {profileInitial}
                </span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-xl border p-4 text-left shadow-2xl backdrop-blur-xl bg-[#0b0f17] border-white/10"
                  >
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-sm font-semibold text-white">
                        {profileInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-200 text-xs">{profileName}</p>
                        <p className="truncate text-[10px] text-gray-500 font-mono mt-0.5">{currentUser?.email || "No email address"}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 py-4 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Username</span>
                        <span className="truncate font-semibold text-gray-300">{currentUser?.username}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">User Role</span>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-indigo-400 border border-indigo-500/20">
                          {currentUser?.role || "Reader"}
                        </span>
                      </div>
                    </div>

                    {currentUser?.role === "ADMIN" && (
                      <Link 
                        href="/admin" 
                        className="w-full py-2 mb-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-hud font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        Admin Control Panel
                      </Link>
                    )}

                    <Link 
                      href="/dashboard" 
                      className="w-full py-2 mb-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-hud font-bold flex items-center justify-center gap-1.5 border border-white/5 transition cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5" />
                      View Dashboard
                    </Link>

                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-hud font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-40"
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

      {/* CORE SECTIONS */}
      <main className="flex-grow">
        
        {/* Section 1: Hero */}
        <section id="hero" className="relative min-h-[85vh] flex items-center justify-center py-20 px-4 md:px-8 lg:px-12 overflow-hidden bg-transparent border-b border-white/5">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            
            {/* Left Col: Info */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-[10px] font-hud font-medium text-cyan-400 border-cyan-500/10 tracking-wide uppercase">
                <Award size={14} className="text-cyan-400" />
                Interactive Story Universe
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-indigo-100 to-violet-300 tracking-tight leading-[1.1] text-glow">
                {story.title}
              </h1>

              <p className="text-lg sm:text-xl font-sans text-indigo-200/80 font-light leading-relaxed max-w-2xl">
                {lore.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-300 text-xs">
                    {lore.authorAvatar}
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">Creator</p>
                    <p className="text-xs font-semibold text-gray-300">{story.author}</p>
                  </div>
                </div>
                <div className="h-6 w-px bg-gray-800" />
                <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono tracking-widest">
                  {lore.status}
                </span>
                <div className="h-6 w-px bg-gray-800" />
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="font-bold">{story.rating || 4.8} Rating</span>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-slate-950/40 border border-white/5 w-full max-w-md text-left">
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Digests</p>
                  <p className="text-lg font-hud font-bold text-gray-200 mt-0.5">{story.reads || "120K"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Fascicles</p>
                  <p className="text-lg font-hud font-bold text-gray-200 mt-0.5">{story.chapterList.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Span</p>
                  <p className="text-lg font-hud font-bold text-gray-200 mt-0.5">{lore.readingTime}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const firstUncompleted = story.chapterList.find(c => !unlockedIds.has(c.id)) || story.chapterList[0];
                    setActiveChapterId(firstUncompleted?.id);
                    scrollToSection("reader");
                    triggerNotification("Portal opened. Commencing reading.");
                  }}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-hud font-bold text-white tracking-widest uppercase transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                >
                  <BookOpen size={14} />
                  Initiate Senses
                </button>
                <button
                  onClick={() => scrollToSection("chapters")}
                  className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-hud font-bold text-gray-300 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  Browse Codex
                </button>
              </div>
            </div>

            {/* Right Col: Immersive Book Card */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div 
                className="w-64 sm:w-72 h-[380px] sm:h-[420px] rounded-2xl p-1 border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900 group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${story.cover || "/cover-placeholder.png"})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-left space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/90 text-[9px] text-white uppercase tracking-widest font-mono">
                    {story.genre}
                  </span>
                  <h3 className="text-xl font-bold font-display text-white line-clamp-2">
                    {story.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    By {story.author}
                  </p>
                </div>
              </motion.div>
            </div>

          </div>
        </section>

        {/* Section 2: StoryOverview (Lore Codex) */}
        <section id="overview" className="relative py-20 px-4 md:px-8 lg:px-12 bg-transparent border-b border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-semibold">
                01 / Cosmic Archive
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                Story Overview & World Lore
              </h2>
              <div className="h-1 w-16 bg-indigo-500 mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Synopsis */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-6 md:p-8 rounded-2xl glass-panel text-left space-y-4">
                  <h3 className="text-base font-hud font-semibold text-gray-200 flex items-center gap-2 border-b border-white/5 pb-3">
                    <BookOpenText size={18} className="text-indigo-400" />
                    The Synopsis
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed font-sans first-letter:text-4xl first-letter:font-display first-letter:font-bold first-letter:text-indigo-400 first-letter:mr-2.5 first-letter:float-left">
                    {story.description || lore.synopsis}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                    {story.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-[10px] text-gray-400 font-hud">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-hud font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    Universe Highlights
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {lore.storyHighlights.map((hl, idx) => (
                      <div key={idx} className="flex gap-2.5 p-3.5 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
                        <CheckCircle2 size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">{hl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Codex Tabs */}
              <div className="lg:col-span-5">
                <OverviewCodex lore={lore} studioData={studioData} />
              </div>
            </div>

          </div>
        </section>

        {/* Section 3: Characters & Factions */}
        <section id="world" className="relative py-20 px-4 md:px-8 lg:px-12 bg-transparent border-b border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-mono tracking-[0.25em] text-violet-400 uppercase font-semibold">
                  02 / Dramatis Personae
                </span>
                <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                  Characters & Factions
                </h2>
                <div className="h-1 w-16 bg-violet-500 rounded-full" />
              </div>
            </div>

            <CharacterExplorer lore={lore} studioData={studioData} />

          </div>
        </section>

        {/* Section 4: ChapterBrowser (Chronos Codex) */}
        <section id="chapters" className="relative py-20 px-4 md:px-8 lg:px-12 bg-transparent border-b border-white/5">
          <div className="max-w-7xl mx-auto relative z-10">
            
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-[10px] font-mono tracking-[0.25em] text-cyan-400 uppercase font-semibold">
                03 / Chronos Codex
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                Fascicle Directory
              </h2>
              <div className="h-1 w-16 bg-cyan-500 mx-auto rounded-full" />
            </div>

            <ChapterNavigator 
              story={story}
              unlockedIds={unlockedIds}
              activeChapterId={activeChapterId}
              studioData={studioData}
              onSelectChapter={(id) => {
                const chap = story.chapterList.find(c => c.id === id);
                if (chap) {
                  if (unlockedIds.has(id)) {
                    setActiveChapterId(id);
                    scrollToSection("reader");
                  } else {
                    handleLockAlert(id);
                  }
                }
              }}
            />

          </div>
        </section>

        {/* Section 5: The Prose Reader Terminal */}
        <section 
          id="reader"
          ref={readerRef}
          className={`relative py-20 px-4 md:px-8 border-b border-white/5 transition-colors duration-500 ${
            settings.theme === "dark" 
              ? "bg-[#080a10]" 
              : settings.theme === "sepia" 
                ? "bg-[#faf6f0]" 
                : "bg-white"
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            
            {/* Top HUD */}
            <div className={`w-full flex items-center justify-between mb-6 pb-3 border-b ${
              settings.theme === "dark" ? "border-white/5 text-gray-400" : "border-black/10 text-gray-500"
            } font-hud text-xs ${
              settings.width === "narrow" ? "max-w-xl" : settings.width === "wide" ? "max-w-5xl" : "max-w-3xl"
            }`}>
              <div className="flex items-center gap-3">
                <span className="font-semibold tracking-widest text-indigo-500 font-mono">CH. {activeChapter?.number}</span>
                <span className="opacity-50">|</span>
                <span className="truncate max-w-[200px] sm:max-w-none">{activeChapter?.title}</span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider">
                {Math.round(scrollProgress)}% Digest
              </div>
            </div>

            {/* Prose container */}
            <div className={`w-full rounded-3xl border p-6 md:p-12 relative transition-all duration-300 ${
              settings.width === "narrow" ? "max-w-xl md:px-6" : settings.width === "wide" ? "max-w-5xl md:px-16" : "max-w-3xl md:px-10"
            } ${
              settings.theme === "dark" 
                ? "theme-reader-dark border-white/5" 
                : settings.theme === "sepia" 
                  ? "theme-reader-sepia border-[#433422]/10 shadow-[0_4px_30px_rgba(67,52,34,0.05)]" 
                  : "theme-reader-light border-gray-200 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
            }`}>
              
              <ProtectedReader user={currentUser}>
                {contentLoading ? (
                  <div className="space-y-5 py-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 animate-pulse rounded bg-slate-900" style={{ width: `${80 + Math.random() * 20}%` }} />
                        <div className="h-4 animate-pulse rounded bg-slate-900" style={{ width: `${70 + Math.random() * 20}%` }} />
                      </div>
                    ))}
                  </div>
                ) : isUnlocked ? (
                  <div>
                    {/* Chapter Header */}
                    <div className="text-center mb-10 space-y-2">
                      <p className="text-[9px] font-mono tracking-[0.25em] text-indigo-500 uppercase font-semibold">
                        Volume {Math.ceil(activeChapter.number / 10)}
                      </p>
                      <h2 className={`text-2xl md:text-3xl font-black font-display tracking-tight leading-tight ${
                        settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-[#433422]" : "text-black"
                      }`}>
                        Chapter {activeChapter.number}: {activeChapter.title}
                      </h2>
                      <div className="h-px w-16 bg-indigo-500/20 mx-auto mt-4" />
                    </div>

                    {/* Prose blocks */}
                    {activeContent.length ? (
                      <article 
                        className={`space-y-6 md:space-y-7 text-left ${fontClasses[settings.fontFamily]} ${
                          spacingScaleClasses[settings.lineHeight]
                        } ${
                          settings.theme === "dark" ? "text-slate-300" : settings.theme === "sepia" ? "text-[#433422]" : "text-gray-900"
                        }`}
                        style={{ fontSize: `${settings.fontSize}px` }}
                      >
                        {activeContent.map((block, index) => {
                          const isFirst = index === 0;
                          return (
                            <p 
                              key={index} 
                              className="indent-0 md:indent-4 leading-relaxed font-light hover:opacity-80 transition-opacity duration-300"
                            >
                              {isFirst && block.text && settings.dropCap ? (
                                <>
                                  <span className="text-4xl float-left mr-2.5 mt-1 text-indigo-400 font-display font-black leading-none">{block.text.charAt(0)}</span>
                                  {block.text.slice(1)}
                                </>
                              ) : (
                                block.text
                              )}
                            </p>
                          );
                        })}
                      </article>
                    ) : (
                      <div className="py-12 text-center text-sm text-gray-500">
                        No content blocks returned.
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-4 pt-8 border-t border-white/5 mt-10 font-hud">
                      <button
                        disabled={activeIndex <= 0}
                        onClick={handlePrevChapter}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer ${
                          settings.theme === "dark"
                            ? "bg-black/40 text-gray-400 hover:text-white border-white/5"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                        }`}
                      >
                        <ChevronLeft size={14} />
                        PREV
                      </button>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleLikeToggle}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                            liked 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/25" 
                              : "bg-black/20 text-gray-400 border-white/5 hover:text-gray-200"
                          }`}
                        >
                          <ThumbsUp size={12} className={liked ? "fill-rose-400" : ""} />
                          <span>Like</span>
                        </button>
                        <button 
                          onClick={() => setFavorite(f => !f)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                            favorite 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/25" 
                              : "bg-black/20 text-gray-400 border-white/5 hover:text-gray-200"
                          }`}
                        >
                          <Bookmark size={12} className={favorite ? "fill-amber-400 text-amber-400" : ""} />
                          <span>Favorite</span>
                        </button>
                      </div>

                      <button
                        disabled={activeIndex >= story.chapterList.length - 1}
                        onClick={handleNextChapter}
                        className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        NEXT
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Locked Chapter Screen */
                  <div className="py-16 text-center space-y-6 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center mx-auto text-indigo-400">
                      <Lock size={24} />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-indigo-400">Locked Fascicle</span>
                      <h3 className={`text-xl font-bold ${
                        settings.theme === "dark" ? "text-white" : "text-black"
                      }`}>Unlock Chapter {activeChapter?.number}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        “{activeChapter?.title}” is currently locked. Spend coins to materialize the record in your neural interface.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 grid grid-cols-2 text-left gap-4">
                      <div>
                        <p className="text-[9px] font-mono text-gray-500 uppercase">Unlock Price</p>
                        <p className="text-xs font-bold text-gray-200 mt-0.5">{activeChapter?.coinPrice || 5} Coins</p>
                      </div>
                      <div className="border-l border-white/5 pl-4">
                        <p className="text-[9px] font-mono text-gray-500 uppercase">Your Balance</p>
                        <p className="text-xs font-bold text-indigo-400 mt-0.5">{coinBalance} Coins</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLockAlert(activeChapter.id)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-bold text-white uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
                    >
                      MATERIALIZE CORE RECORD
                    </button>
                  </div>
                )}
              </ProtectedReader>

            </div>

            {/* Float HUD controls */}
            <div className="fixed bottom-6 right-6 lg:bottom-1/2 lg:-translate-y-1/2 lg:right-8 z-40 flex flex-row lg:flex-col gap-2.5 p-2 bg-[#05070a]/90 rounded-full border border-white/10 shadow-2xl">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                  showSettings ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
                title="Reader Settings"
              >
                <Settings2 size={15} />
              </button>

              <button
                onClick={toggleSpeech}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isNarrating ? "bg-cyan-600 text-white animate-pulse" : "text-gray-400 hover:text-white"
                }`}
                title="Audio Narration"
              >
                <Volume2 size={15} />
              </button>

              <button
                onClick={() => updateSetting("theme", settings.theme === "dark" ? "sepia" : settings.theme === "sepia" ? "light" : "dark")}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
                title="Cycle Reading Palette"
              >
                {settings.theme === "dark" ? <Moon size={15} /> : settings.theme === "sepia" ? <Compass size={15} /> : <Sun size={15} />}
              </button>
            </div>

            {/* Display HUD Settings */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="fixed bottom-20 right-6 lg:bottom-1/3 lg:right-20 z-40 w-80 max-h-[75vh] overflow-y-auto p-5 rounded-2xl glass-panel-heavy border border-white/10 text-left space-y-4 shadow-2xl text-gray-200 font-hud custom-scrollbar"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Settings2 size={13} />
                      Display Controls
                    </span>
                    <button onClick={() => setShowSettings(false)} className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer">
                      Close
                    </button>
                  </div>

                  {/* Predefined Layout Presets */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-400 block">Style Presets</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {([
                        {
                          name: "Cinematic Glow",
                          settings: { fontSize: 19, lineHeight: 1.8, fontFamily: "serif", width: "medium", backgroundGlow: true, dropCap: true, theme: "dark" }
                        },
                        {
                          name: "Cozy Sepia",
                          settings: { fontSize: 18, lineHeight: 1.8, fontFamily: "serif", width: "medium", backgroundGlow: false, dropCap: true, theme: "sepia" }
                        },
                        {
                          name: "Clean Sans",
                          settings: { fontSize: 16, lineHeight: 1.5, fontFamily: "sans", width: "narrow", backgroundGlow: false, dropCap: false, theme: "light" }
                        },
                        {
                          name: "Focus Mono",
                          settings: { fontSize: 15, lineHeight: 1.5, fontFamily: "mono", width: "wide", backgroundGlow: true, dropCap: false, theme: "dark" }
                        }
                      ] as const).map((preset) => {
                        const isMatched = 
                          settings.fontSize === preset.settings.fontSize &&
                          settings.lineHeight === preset.settings.lineHeight &&
                          settings.fontFamily === preset.settings.fontFamily &&
                          settings.width === preset.settings.width &&
                          settings.backgroundGlow === preset.settings.backgroundGlow &&
                          settings.dropCap === preset.settings.dropCap &&
                          settings.theme === preset.settings.theme;

                        return (
                          <button
                            key={preset.name}
                            onClick={() => {
                              setSettings((prev) => ({
                                ...prev,
                                ...preset.settings
                              }));
                            }}
                            className={`py-1.5 px-2 rounded border transition cursor-pointer text-center truncate ${
                              isMatched 
                                ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50 font-bold" 
                                : "bg-slate-900/60 text-gray-400 border-white/5 hover:text-gray-200 hover:border-white/10"
                            }`}
                          >
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reading Theme Palette Selector */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <span className="text-xs font-medium text-gray-400 block">Color Theme</span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {[
                        { id: "dark", label: "Dark", style: "bg-[#080a10] text-gray-300 border-white/10" },
                        { id: "sepia", label: "Sepia", style: "bg-[#faf6f0] text-[#433422] border-[#433422]/20" },
                        { id: "light", label: "Light", style: "bg-white text-gray-900 border-gray-300" }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => updateSetting("theme", t.id as any)}
                          className={`py-1 px-1.5 rounded border transition cursor-pointer font-medium text-center ${t.style} ${
                            settings.theme === t.id 
                              ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-black scale-95" 
                              : "opacity-75 hover:opacity-100"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Sizes Slider & Buttons */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="flex justify-between text-xs font-medium text-gray-400">
                      <span>Text Size</span>
                      <span className="font-mono">{settings.fontSize}px</span>
                    </div>
                    <div className="flex gap-2.5 items-center">
                      <button 
                        onClick={() => updateSetting("fontSize", Math.max(settings.fontSize - 1, 12))} 
                        className="py-1 px-2.5 bg-slate-900 border border-white/5 hover:border-white/15 rounded text-xs transition cursor-pointer active:scale-95"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={settings.fontSize}
                        onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <button 
                        onClick={() => updateSetting("fontSize", Math.min(settings.fontSize + 1, 32))} 
                        className="py-1 px-2.5 bg-slate-900 border border-white/5 hover:border-white/15 rounded text-xs transition cursor-pointer active:scale-95"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <span className="text-xs font-medium text-gray-400 block">Typeface Variant</span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {(["serif", "sans", "mono"] as const).map((font) => (
                        <button
                          key={font}
                          onClick={() => updateSetting("fontFamily", font)}
                          className={`py-1.5 rounded border capitalize transition cursor-pointer ${
                            settings.fontFamily === font ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-medium" : "bg-slate-900 text-gray-400 border-white/5 hover:text-gray-200"
                          }`}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spacing Scale (Line Height) */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <span className="text-xs font-medium text-gray-400 block flex items-center gap-1">
                      <Type size={11} />
                      Spacing Scale
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {([1.5, 1.8, 2.1] as const).map((lh) => (
                        <button
                          key={lh}
                          onClick={() => updateSetting("lineHeight", lh)}
                          className={`py-1.5 rounded border transition cursor-pointer ${
                            settings.lineHeight === lh ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-medium" : "bg-slate-900 text-gray-400 border-white/5 hover:text-gray-200"
                          }`}
                        >
                          {lh === 1.5 ? "Compact" : lh === 1.8 ? "Balanced" : "Loose"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column Width */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <span className="text-xs font-medium text-gray-400 block flex items-center gap-1">
                      <MoveHorizontal size={11} />
                      Column Width
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {(["narrow", "medium", "wide"] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => updateSetting("width", w)}
                          className={`py-1.5 rounded border capitalize transition cursor-pointer ${
                            settings.width === w ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/40 font-medium" : "bg-slate-900 text-gray-400 border-white/5 hover:text-gray-200"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Ambient Glow Switch */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Atmosphere Glow</span>
                    <button
                      type="button"
                      onClick={() => updateSetting("backgroundGlow", !settings.backgroundGlow)}
                      className={`w-10 h-5 rounded-full p-0.5 transition duration-300 cursor-pointer ${
                        settings.backgroundGlow ? "bg-indigo-600 flex justify-end" : "bg-slate-800 flex justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Drop Cap Switch */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Cinematic Drop Cap</span>
                    <button
                      type="button"
                      onClick={() => updateSetting("dropCap", !settings.dropCap)}
                      className={`w-10 h-5 rounded-full p-0.5 transition duration-300 cursor-pointer ${
                        settings.dropCap ? "bg-indigo-600 flex justify-end" : "bg-slate-800 flex justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

        {/* Section 6: Comments discussion board (Sanctuary) */}
        <section id="comments" className="relative py-20 px-4 md:px-8 border-b border-white/5 bg-transparent">
          <div className="max-w-3xl mx-auto text-left">
            <div className="mb-10 space-y-3">
              <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-semibold">
                04 / sanctuary discuss
              </span>
              <h2 className="text-3xl font-black font-display text-white">Comments Board</h2>
              <div className="h-1 w-12 bg-indigo-500 rounded-full" />
            </div>

            {/* Input Comment Box */}
            <form onSubmit={handlePostComment} className="mb-8 p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Synchronize your review node..."
                rows={3}
                className="w-full bg-transparent border-0 resize-none text-sm text-gray-200 placeholder-gray-500 focus:ring-0 focus:outline-none"
              />
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] font-mono text-gray-500">HTML tags filtered.</span>
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-xs font-hud font-semibold text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send size={11} />
                  Transmit
                </button>
              </div>
            </form>

            {/* Comments List */}
            {loadingComments ? (
              <div className="py-12 text-center text-sm text-gray-500">Loading comments board...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const dispName = comment.user.displayName || comment.user.username || "Reader";
                  return (
                    <div key={comment.id} className="p-4 rounded-xl bg-slate-900/30 border border-white/5 flex gap-4 text-left">
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-gray-400 text-xs shrink-0 select-none">
                        {dispName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-hud font-semibold text-indigo-300">{dispName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">{comment.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500 bg-slate-950/20 border border-white/5 rounded-xl">
                Sanctuary records are empty. Be the first to synchronize a thought!
              </div>
            )}

          </div>
        </section>

        {/* Section 7: Recommended Literature */}
        {recommendations.length > 0 && (
          <section id="recommendations" className="relative py-20 px-4 md:px-8 border-b border-white/5 bg-transparent">
            <div className="max-w-7xl mx-auto">
              
              <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
                <span className="text-[10px] font-mono tracking-[0.25em] text-indigo-400 uppercase font-semibold">
                  05 / timeline corridors
                </span>
                <h2 className="text-3xl font-black font-display text-white">Suggested Realities</h2>
                <div className="h-1 w-16 bg-indigo-500 mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {recommendations.slice(0, 3).map((rec) => (
                  <Link 
                    key={rec.id} 
                    href={`/read/${rec.slug}`}
                    className="p-4 rounded-xl bg-slate-900/30 border border-white/5 hover:border-indigo-500/20 transition-all flex gap-4 group cursor-pointer"
                  >
                    <div 
                      className="w-20 h-28 rounded bg-cover bg-center shrink-0 border border-white/5"
                      style={{ backgroundImage: `url(${rec.cover || "/cover-placeholder.png"})` }}
                    />
                    <div className="flex flex-col justify-between py-1 overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400">{rec.genre}</span>
                        <h4 className="text-sm font-hud font-bold text-gray-200 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {rec.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{rec.description}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">By {rec.author}</p>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          </section>
        )}

        {/* Section 8: Author Bio */}
        <section className="relative py-20 px-4 md:px-8 bg-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl glass-panel-heavy border border-indigo-500/10 flex flex-col sm:flex-row items-center gap-6 text-left">
              <div className="w-16 h-16 rounded-full bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center font-bold font-hud text-indigo-300 text-lg shrink-0">
                {lore.authorAvatar}
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">About The Author</span>
                <h4 className="text-base font-hud font-bold text-gray-100">{story.author}</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">{lore.authorBio}</p>
                <div className="flex gap-4 pt-2 text-[10px] font-mono text-gray-500">
                  <span>Collections: {lore.authorWorksCount} Stories</span>
                  <span>Followers: {lore.authorFollowers} Readers</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="pt-10 border-t border-white/5 text-center text-xs text-gray-600 font-mono">
        <p>© 2026 Velora Premium. All timelines recorded.</p>
        <button onClick={() => scrollToSection("hero")} className="mt-3 text-[10px] text-indigo-500 hover:text-indigo-400 transition cursor-pointer">
          [ Return to apex ]
        </button>
      </footer>

      {/* COIN UNLOCK MODAL */}
      <AnimatePresence>
        {showUnlockModal && selectedLockChapter && (
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
              className="relative w-full max-w-sm p-6 rounded-2xl glass-panel-heavy border border-indigo-500/20 text-center space-y-5 shadow-2xl z-10 text-gray-200 font-hud"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Lock size={20} className="animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400">Premium Record</span>
                <h3 className="text-lg font-bold text-white">Unlock Chapter {selectedLockChapter.number}</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                  “{selectedLockChapter.title}” is currently encrypted. Spend coins to permanently materialize this path in your library.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 grid grid-cols-2 text-left text-xs font-sans">
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Cost to unlock</p>
                  <p className="font-bold text-gray-200 mt-0.5">5 Coins</p>
                </div>
                <div className="border-l border-white/5 pl-4">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Your Balance</p>
                  <p className="font-bold text-emerald-400 mt-0.5">{coinBalance} Coins</p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  RETURN
                </button>
                <button
                  onClick={() => {
                    const chap = story.chapterList.find(c => c.id === selectedLockChapter.id);
                    if (chap) unlockChapter(chap);
                  }}
                  disabled={unlockingId === selectedLockChapter.id}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-bold text-white transition shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {unlockingId === selectedLockChapter.id ? "UNLOCKING..." : "MATERIALIZE"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* HELPER COMPONENTS */

interface CodexProps {
  lore: StoryLore;
  studioData: CinematicLayoutProps["studioData"];
}
function OverviewCodex({ lore, studioData }: CodexProps) {
  // Extract facts and parts
  const manifestFacts = useMemo(() => studioData?.manifest?.facts || [], [studioData]);
  const manifestParts = useMemo(() => studioData?.manifest?.parts || [], [studioData]);

  // Tab selections
  const tabs = useMemo(() => {
    const list = [
      { id: "cosmos", label: "The Cosmos" },
      { id: "magic", label: "Magic Rules" },
      { id: "lore", label: "Lore Text" }
    ];
    if (manifestParts.length > 0) {
      list.push({ id: "parts", label: "Story Parts" });
    }
    if (manifestFacts.length > 0) {
      list.push({ id: "facts", label: "Story Facts" });
    }
    return list;
  }, [manifestParts, manifestFacts]);

  const [activeTab, setActiveTab] = useState<string>("cosmos");
  const [selectedFactIdx, setSelectedFactIdx] = useState<number | null>(null);

  // Normalize fact object helper
  const getFactDetails = (fact: any, index: number) => {
    if (typeof fact === "string") {
      return { keyword: `Fact ${index + 1}`, description: fact };
    }
    return {
      keyword: fact?.keyword || fact?.title || fact?.key || `Fact ${index + 1}`,
      description: fact?.description || fact?.text || fact?.fact || ""
    };
  };

  return (
    <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden flex flex-col h-full text-left">
      <div className="p-5 bg-slate-900/40 border-b border-white/5">
        <div className="flex items-center gap-2.5 mb-3">
          <Globe2 size={16} className="text-cyan-400" />
          <h3 className="text-xs font-hud font-bold text-gray-200 tracking-wider uppercase">
            Interactive Lore Codex
          </h3>
        </div>
        
        {/* Scrollable category tabs */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-white/5 text-[10px] font-hud overflow-x-auto whitespace-nowrap scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedFactIdx(null);
              }}
              className={`py-1.5 px-3 rounded transition font-medium cursor-pointer shrink-0 ${
                activeTab === tab.id ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/20" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {activeTab === "cosmos" && (
              <div className="space-y-3.5">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono uppercase border border-indigo-500/20">
                  Spatial Layout
                </span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{lore.worldInfo.cosmos}</p>
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl flex gap-2">
                  <Compass size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-hud font-bold text-gray-200 uppercase">Timeline Frame</h5>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{lore.timeline}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "magic" && (
              <div className="space-y-3.5">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-mono uppercase border border-cyan-500/20">
                  Resonance Magic
                </span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{lore.worldInfo.magicSystem}</p>
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded-xl flex gap-2">
                  <Flame size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-hud font-bold text-gray-200 uppercase">Core Themes</h5>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {lore.mainThemes.map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 bg-black/40 text-gray-400 rounded-full border border-white/5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "lore" && (
              <div className="space-y-3.5">
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[9px] font-mono uppercase border border-violet-500/20">
                  Historical Scrolls
                </span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{lore.worldInfo.loreText}</p>
                <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-xl flex gap-2">
                  <Brain size={16} className="text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-hud font-bold text-gray-200 uppercase">Aura Diagnostics</h5>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Historical verification status: APPROVED</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "parts" && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono uppercase border border-indigo-500/20">
                  Story Volumes
                </span>
                {manifestParts.map((part, index) => (
                  <div key={index} className="p-3 bg-slate-900/50 border border-white/5 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-hud font-bold text-white">Part {part.no || index + 1}: {part.title}</h4>
                    {part.synopsis && <p className="text-[10px] text-gray-400 leading-relaxed">{part.synopsis}</p>}
                    <p className="text-[9px] text-indigo-400 font-mono">Chapters count: {part.chapters?.length || 0}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "facts" && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-mono uppercase border border-cyan-500/20">
                  Story Fact Logs
                </span>
                {manifestFacts.map((fact, index) => {
                  const details = getFactDetails(fact, index);
                  const expanded = selectedFactIdx === index;
                  return (
                    <div 
                      key={index} 
                      onClick={() => setSelectedFactIdx(expanded ? null : index)}
                      className={`p-3 border rounded-xl space-y-1.5 transition cursor-pointer text-left ${
                        expanded ? "bg-cyan-950/15 border-cyan-500/40" : "bg-slate-900/40 border-white/5 hover:bg-slate-900/60"
                      }`}
                    >
                      <h4 className="text-xs font-hud font-bold text-cyan-300 flex items-center justify-between">
                        <span>{details.keyword}</span>
                        <Info size={11} className="text-cyan-500" />
                      </h4>
                      {expanded ? (
                        <p className="text-[10px] text-gray-300 leading-relaxed font-sans">{details.description}</p>
                      ) : (
                        <p className="text-[10px] text-gray-500 truncate">{details.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ExplorerProps {
  lore: StoryLore;
  studioData: CinematicLayoutProps["studioData"];
}
function CharacterExplorer({ lore, studioData }: ExplorerProps) {
  // Check if we have Writing Studio naming board data
  const hasStudioNaming = useMemo(() => {
    return Boolean(studioData?.naming && studioData.naming.categories.length > 0);
  }, [studioData]);

  // Extract categories and entries
  const namingCategories = useMemo(() => studioData?.naming?.categories || [], [studioData]);
  const namingEntries = useMemo(() => studioData?.naming?.entries || [], [studioData]);

  const [activeView, setActiveView] = useState<string>(() => {
    if (hasStudioNaming) return namingCategories[0]?.id || "groups";
    return "characters";
  });

  const [selectedCharId, setSelectedCharId] = useState(() => {
    if (hasStudioNaming) {
      const firstCatId = namingCategories[0]?.id || "groups";
      const firstEntry = namingEntries.find(e => e.categoryId === firstCatId);
      return firstEntry?.id || "";
    }
    return lore.characters[0]?.id || "";
  });

  // Handle Category view changes
  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    if (hasStudioNaming) {
      const firstEntry = namingEntries.find(e => e.categoryId === viewId);
      setSelectedCharId(firstEntry?.id || "");
    }
  };

  // Find currently selected dossier details
  const selectedDossier = useMemo(() => {
    if (hasStudioNaming) {
      return namingEntries.find(e => e.id === selectedCharId);
    }
    return lore.characters.find(c => c.id === selectedCharId) || lore.characters[0];
  }, [hasStudioNaming, namingEntries, lore.characters, selectedCharId]);

  return (
    <div>
      {/* Category selector tabs */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5 font-hud text-xs mb-8 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
        {hasStudioNaming ? (
          namingCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleViewChange(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeView === cat.id ? "bg-violet-600/30 text-violet-200 border border-violet-500/20" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles size={13} />
              {cat.title}
            </button>
          ))
        ) : (
          <>
            <button
              onClick={() => handleViewChange("characters")}
              className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeView === "characters" ? "bg-violet-600/30 text-violet-200 border border-violet-500/20" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles size={13} />
              Key Presences
            </button>
            <button
              onClick={() => handleViewChange("factions")}
              className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeView === "factions" ? "bg-violet-600/30 text-violet-200 border border-violet-500/20" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Users size={13} />
              Ruling Factions
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeView === "factions" && !hasStudioNaming ? (
          /* Static Factions View */
          <motion.div
            key="factions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left"
          >
            {lore.factions.map((f) => (
              <div key={f.id} className="p-5 rounded-xl glass-panel border border-white/5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-base font-hud font-bold text-gray-200 leading-tight">{f.name}</h3>
                    <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/25 shrink-0 uppercase">
                      {f.region.split(":")[0]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">{f.description}</p>
                </div>
                <div className="pt-3 border-t border-white/5 text-[10px] font-mono text-gray-500">
                  <span className="block font-bold">Region:</span> {f.region}
                  <span className="block font-bold mt-1">Sigil:</span> “{f.sigil}”
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          /* Dossier List Explorer (Real Naming data or Static characters data) */
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left"
          >
            {/* Left list selector */}
            <div className="lg:col-span-5 flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {hasStudioNaming ? (
                namingEntries.filter(e => e.categoryId === activeView).map((entry) => {
                  const sel = entry.id === selectedCharId;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedCharId(entry.id)}
                      className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                        sel ? "bg-violet-950/20 border-violet-500/50 shadow-lg" : "bg-slate-900/30 border-white/5 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full border border-white/5 bg-slate-900/50 flex items-center justify-center font-bold text-[10px] text-gray-400 shrink-0 select-none">
                          {entry.name.slice(0, 2).toUpperCase()}
                        </div>
                        <h4 className={`text-xs font-hud font-bold truncate ${sel ? "text-violet-300" : "text-gray-200"}`}>{entry.name}</h4>
                      </div>
                      {entry.chapterTitle && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/5 text-gray-500 truncate max-w-[100px]">
                          {entry.chapterTitle}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                lore.characters.map((char) => {
                  const sel = char.id === selectedCharId;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedCharId(char.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                        sel ? "bg-violet-950/20 border-violet-500/50 shadow-lg" : "bg-slate-900/30 border-white/5 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-white/5 bg-slate-900/50 flex items-center justify-center font-bold text-xs text-gray-400">
                          {char.avatar}
                        </div>
                        <div>
                          <h4 className={`text-sm font-hud font-bold ${sel ? "text-violet-300" : "text-gray-200"}`}>{char.name}</h4>
                          <p className="text-[10px] text-gray-500">{char.role}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/5 text-gray-400">
                        {char.affinity}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right details dossier card */}
            <div className="lg:col-span-7 flex">
              {selectedDossier ? (
                <div 
                  className="rounded-2xl w-full p-6 border border-white/5 flex flex-col justify-between text-left"
                  style={{ 
                    background: hasStudioNaming 
                      ? "rgba(10, 10, 20, 0.95)" 
                      : `radial-gradient(circle at top right, ${(selectedDossier as any).cardImage}, rgba(10, 10, 20, 0.9) 60%)` 
                  }}
                >
                  <div className="space-y-4">
                    <div className="border-b border-white/5 pb-4">
                      <span className="text-[9px] text-violet-400 font-mono tracking-widest uppercase">
                        {hasStudioNaming ? "Codex Registry Entry" : (selectedDossier as any).role}
                      </span>
                      <h3 className="text-xl font-black font-display text-white mt-1">{selectedDossier.name}</h3>
                      {!hasStudioNaming && (
                        <p className="text-xs text-gray-400 font-hud mt-0.5">Aligned: {(selectedDossier as any).faction}</p>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {selectedDossier.description || "No description provided in Writing Studio metadata board."}
                    </p>
                  </div>

                  {/* Character stats sliders (Only shown for fallback characters who have stats) */}
                  {!hasStudioNaming && (selectedDossier as any).stats && (
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5 mt-6 font-hud text-xs">
                      <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Prowess</span>
                          <span className="font-mono">{(selectedDossier as any).stats.power}%</span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${(selectedDossier as any).stats.power}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Intellect</span>
                          <span className="font-mono">{(selectedDossier as any).stats.intellect}%</span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: `${(selectedDossier as any).stats.intellect}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Resonance</span>
                          <span className="font-mono">{(selectedDossier as any).stats.resonance}%</span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500" style={{ width: `${(selectedDossier as any).stats.resonance}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="rounded-2xl w-full p-8 border border-white/5 flex items-center justify-center text-center text-xs text-gray-500 bg-slate-900/10">
                  Select an entry dossier on the left to materialize its data.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ChaptersProps {
  story: Story;
  unlockedIds: Set<string>;
  activeChapterId: string | null;
  studioData: CinematicLayoutProps["studioData"];
  onSelectChapter: (id: string) => void;
}
function ChapterNavigator({ story, unlockedIds, activeChapterId, studioData, onSelectChapter }: ChaptersProps) {
  const [search, setSearch] = useState("");
  const [partFilter, setPartFilter] = useState("All");

  const manifestParts = useMemo(() => studioData?.manifest?.parts || [], [studioData]);

  // Volume grouping fallbacks
  const volumes = useMemo(() => {
    const list = new Set(story.chapterList.map(c => `Volume ${Math.ceil(c.number / 10)}`));
    return ["All", ...Array.from(list)];
  }, [story.chapterList]);

  // Filters dynamically on parts or volume
  const filterOptions = useMemo(() => {
    if (manifestParts.length > 0) {
      return ["All", ...manifestParts.map((p, idx) => p.title || `Part ${p.no || idx + 1}`)];
    }
    return volumes;
  }, [manifestParts, volumes]);

  const filtered = useMemo(() => {
    return story.chapterList.filter(chap => {
      const matchSearch = chap.title.toLowerCase().includes(search.toLowerCase()) || chap.number.toString().includes(search);
      
      if (partFilter === "All") return matchSearch;

      if (manifestParts.length > 0) {
        // Find which part this chapter belongs to by mapping it
        const matchedPart = manifestParts.find((part, idx) => {
          const partTitle = part.title || `Part ${part.no || idx + 1}`;
          if (partTitle !== partFilter) return false;
          // Check if chapter matches any chapter in the part
          return Array.isArray(part.chapters) && part.chapters.some(c => String(c.id) === String(chap.id) || String(c.title).toLowerCase() === chap.title.toLowerCase());
        });
        return matchSearch && Boolean(matchedPart);
      } else {
        const volName = `Volume ${Math.ceil(chap.number / 10)}`;
        return matchSearch && volName === partFilter;
      }
    });
  }, [story.chapterList, search, partFilter, manifestParts]);

  // Jump Continue Reading Chapter finder
  const continueReading = useMemo(() => {
    if (activeChapterId) {
      return story.chapterList.find(c => c.id === activeChapterId);
    }
    const firstUncompleted = story.chapterList.find(c => !unlockedIds.has(c.id));
    return firstUncompleted || story.chapterList[0];
  }, [story.chapterList, activeChapterId, unlockedIds]);

  return (
    <div className="space-y-6 text-left">
      {/* Continue reading dashboard banner */}
      {continueReading && (
        <div className="p-4 rounded-2xl glass-panel-heavy border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
              Progress Record
            </span>
            <h4 className="text-sm font-hud font-bold text-gray-200">
              Chapter {continueReading.number}: {continueReading.title}
            </h4>
          </div>
          <button
            onClick={() => onSelectChapter(continueReading.id)}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-hud font-bold text-white flex items-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto shadow-md"
          >
            CONTINUE
          </button>
        </div>
      )}

      {/* Filters HUD */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/40 border border-white/5">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or number..."
            className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40"
          />
        </div>

        {/* Volume/Part selectors */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full">
          {filterOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setPartFilter(opt)}
              className={`px-3 py-1 rounded-lg text-[10px] font-hud font-bold transition cursor-pointer shrink-0 ${
                partFilter === opt ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/20" : "bg-slate-950 text-gray-400 border border-white/5 hover:text-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Chapters list grid - COMPACT, LESS HEIGHT, NO EXCERPT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((chap) => {
          const unlocked = unlockedIds.has(chap.id);
          const active = chap.id === activeChapterId;
          
          return (
            <div
              key={chap.id}
              onClick={() => onSelectChapter(chap.id)}
              className={`p-3 rounded-xl cursor-pointer border transition flex items-center justify-between gap-4 text-left ${
                active 
                  ? "bg-cyan-950/15 border-cyan-500/50 shadow-inner" 
                  : "bg-slate-900/20 border-white/5 hover:bg-slate-900/50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block">Chapter {chap.number}</span>
                <h4 className={`text-xs font-hud font-bold mt-0.5 truncate ${active ? "text-cyan-300" : "text-gray-200"}`}>{chap.title}</h4>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[9px] font-mono text-gray-500">
                  {chap.publishedAt ? new Date(chap.publishedAt).toLocaleDateString() : ""}
                </span>
                
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                  unlocked ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                }`}>
                  {unlocked ? <CheckCircle2 size={11} /> : <Lock size={11} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
