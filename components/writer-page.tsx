"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  PenTool,
  FileText,
  ChevronRight,
  Plus,
  BarChart3,
  Eye,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

type Chapter = {
  id: string;
  number: number;
  title: string;
  status: string;
  isFree: boolean;
};

type Story = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  publicationStatus: string;
  visibility: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  chapters: Chapter[];
};

type WriterPageProps = {
  user: { displayName: string | null; username: string | null; email: string };
  stories: Story[];
  stats: { totalStories: number; publishedChapters: number; draftChapters: number };
};

const backdropStyle = {
  backgroundImage:
    "radial-gradient(circle at 18% 8%, var(--accent-soft), transparent 34%), radial-gradient(circle at 88% 12%, var(--accent-light), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, var(--accent-soft)) 0%, var(--paper) 52%, color-mix(in srgb, var(--paper) 94%, var(--muted-soft)) 100%)"
};

export function WriterPage({ user, stories, stats }: WriterPageProps) {
  const displayName = user.displayName || user.username || user.email;

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-90" style={backdropStyle} />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-raised backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-soft-ink transition hover:border-accent/45 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/writer/create-story"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-soft transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              New Story
            </Link>
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-12">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-border/70 bg-surface/70 p-6 shadow-luxury backdrop-blur-2xl md:p-8"
        >
          <div className="flex items-start gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-accent via-accent2 to-accent3 text-xl font-bold text-on-accent shadow-soft">
              <PenTool className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Writer Studio</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">{displayName}</h1>
              <p className="mt-1 text-sm text-soft-ink">Manage your stories and chapters</p>
            </div>
          </div>
        </motion.section>

        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 grid gap-5 sm:grid-cols-3"
        >
          <div className="rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Total Stories</p>
                <p className="text-2xl font-bold text-ink">{stats.totalStories}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Published Chapters</p>
                <p className="text-2xl font-bold text-ink">{stats.publishedChapters}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-warning/30 bg-warning/10 text-warning">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Draft Chapters</p>
                <p className="text-2xl font-bold text-ink">{stats.draftChapters}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stories Table */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Stories</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">Your Stories</h2>
            </div>
            <Link
              href="/writer/create-story"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-soft transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              New Story
            </Link>
          </div>

          {stories.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-10 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted" />
              <p className="mt-4 font-display text-xl font-semibold text-ink">No stories yet</p>
              <p className="mt-2 text-sm text-muted">You haven&apos;t created any stories yet. Start your first story now!</p>
              <Link
                href="/writer/create-story"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105"
              >
                <PenTool className="h-4 w-4" />
                Create Your First Story
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Genre</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chapters</th>
                    <th className="px-4 py-3">Visibility</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stories.map((story) => (
                    <tr key={story.id} className="group transition hover:bg-surface-soft/40">
                      <td className="px-4 py-3 font-semibold text-ink">
                        <Link href={`/writer/stories/${story.id}`} className="hover:text-accent transition">
                          {story.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-soft-ink">{story.genre}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            story.publicationStatus === "PUBLISHED"
                              ? "border-success/30 bg-success/10 text-success"
                              : story.publicationStatus === "DRAFT"
                              ? "border-warning/30 bg-warning/10 text-warning"
                              : "border-accent/30 bg-accent-soft/70 text-accent"
                          }`}
                        >
                          {story.publicationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-soft-ink">{story.chapters.length}</td>
                      <td className="px-4 py-3 text-soft-ink">{story.visibility}</td>
                      <td className="px-4 py-3 text-soft-ink">
                        {new Date(story.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/writer/stories/${story.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-surface/60 px-3 py-1.5 text-xs font-bold text-soft-ink transition hover:border-accent/45 hover:text-ink"
                        >
                          Manage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}
