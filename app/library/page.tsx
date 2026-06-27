import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Clock, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reader Library",
  description: "Saved stories and bookmarked chapters for your Velora Fiction account."
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function LibraryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    include: { story: true, chapter: true },
    orderBy: { createdAt: "desc" }
  });

  const savedStories = Array.from(
    bookmarks.reduce((map, bookmark) => {
      if (!map.has(bookmark.storyId)) {
        map.set(bookmark.storyId, bookmark);
      }
      return map;
    }, new Map<string, (typeof bookmarks)[number]>()).values()
  );

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-raised/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-soft-ink transition hover:border-accent/45 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link href="/stories" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-accent shadow-soft transition hover:brightness-105">
            Browse Stories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 md:py-12 md:pb-16">
        <section className="rounded-lg border border-border/70 bg-surface/70 p-5 shadow-luxury backdrop-blur-2xl sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                <Bookmark className="h-3.5 w-3.5" />
                Reader Library
              </div>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink md:text-6xl">Saved stories</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-soft-ink sm:text-base">
                Your saved stories are loaded from database bookmarks, with the latest saved chapter shown for each story.
              </p>
            </div>
            <span className="w-fit rounded-full border border-border/70 bg-surface-soft/70 px-4 py-2 text-sm font-bold text-soft-ink">
              {savedStories.length} saved
            </span>
          </div>
        </section>

        {savedStories.length > 0 ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedStories.map((bookmark) => (
              <article key={bookmark.id} className="overflow-hidden rounded-lg border border-border/70 bg-surface/65 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:border-accent/45">
                <div className="relative h-56 overflow-hidden sm:h-64">
                  {bookmark.story.coverUrl ? (
                    <Image
                      src={bookmark.story.coverUrl}
                      alt={bookmark.story.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-soft text-accent">
                      <BookOpen className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-surface-raised/85 px-3 py-1 text-xs font-bold text-ink backdrop-blur">
                      {bookmark.story.genre}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-sm font-bold text-amber-300 backdrop-blur">
                      <Star className="h-4 w-4 fill-current" />
                      {bookmark.story.ratingAverage.toFixed(1)}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="font-display text-2xl font-semibold leading-tight text-white">{bookmark.story.title}</h2>
                    <p className="mt-1 text-sm text-white/80">By {bookmark.story.authorName}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="line-clamp-2 text-sm leading-6 text-soft-ink">{bookmark.story.description}</p>
                  <div className="mt-4 rounded-lg bg-surface-soft/70 p-3 text-sm text-soft-ink">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-accent" />
                      <span className="line-clamp-1">Chapter {bookmark.chapter.number}: {bookmark.chapter.title}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      Saved {formatDate(bookmark.createdAt)}
                    </div>
                  </div>
                  <Link href={`/read/${bookmark.story.slug}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105">
                    Open Story
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-6 rounded-lg border border-dashed border-border/70 bg-surface/45 p-8 text-center shadow-soft backdrop-blur-xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent">
              <Bookmark className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-ink">No saved stories yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-soft-ink">
              Save a chapter while reading and it will appear here as a story in your library.
            </p>
            <Link href="/stories" className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105">
              Explore Stories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

