import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedStoryCards } from "@/lib/content-service";

export const metadata: Metadata = {
  title: "All Stories",
  description: "Browse every published story in the Velora Fiction library."
};

export default async function StoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const stories = await getPublishedStoryCards();

  return (
    <main className="home-main min-h-screen px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 rounded-xl border border-border bg-surface-raised/70 p-4 shadow-luxury backdrop-blur-xl sm:rounded-2xl sm:p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <p className="lm-eyebrow mt-5 sm:mt-6">Story Library</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl md:text-6xl">All published stories</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-soft-ink sm:text-base">
              Every live story is loaded from the database with chapter counts, free samples, paid chapters, and rating signals.
            </p>
          </div>
          <div className="w-fit rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent2">
            {stories.length} stories live
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <article key={story.id} className="group overflow-hidden rounded-xl border border-border bg-surface-raised/70 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-luxury sm:rounded-2xl">
              <div className="relative h-56 overflow-hidden sm:h-72">
                {story.cover ? (
                  <Image src={story.cover} alt={story.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/25 via-accent2/15 to-surface-soft text-accent font-display text-7xl font-bold select-none border-b border-border shadow-inner">
                    <span className="drop-shadow-[0_4px_12px_rgba(var(--accent-rgb),0.35)]">
                      {story.storyType?.toLowerCase() === "novel" ? "N" : "S"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-surface-raised/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink backdrop-blur">
                    {story.genre}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-amber-300 backdrop-blur">
                    <Star className="h-4 w-4 fill-current" />
                    {story.rating.toFixed(1)}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="font-display text-xl font-semibold leading-tight text-white sm:text-2xl">{story.title}</h2>
                  <p className="mt-1 text-sm text-white/80">By {story.author}</p>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <p className="line-clamp-3 text-sm leading-6 text-soft-ink">{story.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-muted">
                  <span className="rounded-lg bg-surface-soft px-2 py-2"><b className="block text-base text-ink">{story.chapters}</b>chapters</span>
                  <span className="rounded-lg bg-surface-soft px-2 py-2"><b className="block text-base text-ink">{story.freeChapters}</b>free</span>
                  <span className="rounded-lg bg-surface-soft px-2 py-2"><b className="block text-base text-ink">{story.paidChapters}</b>paid</span>
                </div>
                <Link href={`/read/${story.slug}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent shadow-soft transition hover:brightness-105">
                  Read Story <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}