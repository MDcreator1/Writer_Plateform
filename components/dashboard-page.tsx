"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Clock,
  Coins,
  CreditCard,
  Heart,
  History,
  LockKeyhole,
  ShieldCheck,
  Star,
  KeyRound,
  LogOut,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

type DashboardPageProps = {
  user: {
    displayName: string | null;
    username: string | null;
    email: string;
  };
  data: {
    walletBalance: number;
    accountStats: {
      purchasedChapters: number;
      favoriteStories: number;
      readingHours: number;
    };
    purchasedChapters: Array<{ id: string; story: string; chapter: string; coins: number; date: string }>;
    paymentHistory: Array<{
      id: string;
      date: string;
      packageName: string;
      paymentMethod: string;
      amountPaid: number;
      coinsReceived: number;
      status: string;
    }>;
    coinEvents: Array<{ id: string; label: string; amount: number; date: string }>;
    favorites: Array<{
      id: string;
      slug: string;
      title: string;
      genre: string;
      rating: number;
      chapterTitle: string;
    }>;
    readingHistory: Array<{
      id: string;
      slug: string;
      title: string;
      chapterNumber: number;
      chapterTitle: string;
      progress: number;
    }>;
    activeSubscription: {
      planType: string;
      expiresAt: string;
      dailyCoins: number;
    } | null;
  };
};

export function DashboardPage({ user, data }: DashboardPageProps) {
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);

  const accountCards = [
    { label: "Coin balance", value: String(data.walletBalance), icon: Coins },
    { label: "Purchased chapters", value: String(data.accountStats.purchasedChapters), icon: LockKeyhole },
    { label: "Favorite stories", value: String(data.accountStats.favoriteStories), icon: Heart },
    { label: "Reading hours", value: String(data.accountStats.readingHours), icon: Clock }
  ];

  const handleSecurityReset = async () => {
    setRequestingReset(true);
    try {
      await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/auth";
    } catch (e) {
      console.error(e);
      window.location.href = "/auth";
    }
  };

  return (
    <main className="min-h-screen">
      <header className="lm-topbar dashboard-header">
        <nav className="dashboard-nav mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="dashboard-back-to-marketplace inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <div className="dashboard-header-actions flex items-center gap-3">
            <ThemeSwitcher compact />
            <button
              onClick={() => setSecurityModalOpen(true)}
              className="lm-btn-primary dashboard-security-link py-2 px-4 text-sm font-semibold cursor-pointer"
            >
              Account Security
            </button>
          </div>
        </nav>
      </header>

      <section className="dashboard-main-section mx-auto max-w-7xl px-5 py-10">
        <div className="dashboard-profile-section flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="dashboard-profile-info">
            <p className="lm-eyebrow dashboard-profile-eyebrow">Reader Dashboard</p>
            <h1 className="dashboard-profile-welcome mt-2 font-display text-5xl font-semibold text-ink">
              Welcome back, {user.displayName || user.username}
            </h1>
            <p className="dashboard-profile-desc mt-3 max-w-2xl leading-7 text-soft-ink">
              Track your wallet balance, verified coin purchases, active memberships, unlocked chapters, favorites, ratings, and recent reading activity.
            </p>
          </div>
          <div className="flex flex-col gap-3.5 items-end">
            <div className="dashboard-verification-badge rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              Server verified wallet · Razorpay protected
            </div>
            {data.activeSubscription && (
              <div className="rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-sm font-semibold text-accent2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active: {data.activeSubscription.planType} Pass (Expires: {data.activeSubscription.expiresAt})</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-stats-grid mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {accountCards.map((card) => (
            <div key={card.label} className="dashboard-stat-card lm-card p-5 transition hover:shadow-soft">
              <card.icon className="h-6 w-6 text-accent2" />
              <strong className="dashboard-stat-value mt-4 block font-display text-4xl text-ink">{card.value}</strong>
              <span className="dashboard-stat-label mt-1 block text-sm font-semibold text-muted">{card.label}</span>
            </div>
          ))}
        </div>

        <div className="dashboard-purchases-and-tx-row mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="dashboard-purchased-chapters lm-card p-6">
            <h2 className="dashboard-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <LockKeyhole className="h-6 w-6 text-accent2" />
              Purchased Chapters
            </h2>
            <div className="dashboard-purchased-list mt-5 divide-y divide-border">
              {data.purchasedChapters.length ? data.purchasedChapters.map((item) => (
                <div key={item.id} className="dashboard-purchased-item flex items-center justify-between gap-4 py-4">
                  <span>
                    <b className="dashboard-purchased-chapter-title block text-ink">{item.chapter}</b>
                    <span className="dashboard-purchased-story-info text-sm text-muted">
                      {item.story} · {item.date}
                    </span>
                  </span>
                  <span className="dashboard-purchased-coins rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent2">
                    {item.coins} coins
                  </span>
                </div>
              )) : (
                <p className="mt-4 rounded-lg bg-surface-soft p-4 text-sm text-muted">No paid chapters unlocked yet.</p>
              )}
            </div>
          </section>

          <section className="dashboard-transactions lm-card p-6">
            <h2 className="dashboard-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <CreditCard className="h-6 w-6 text-accent2" />
              Payment History
            </h2>
            <div className="dashboard-transactions-list mt-5 space-y-3">
              {data.paymentHistory.length ? data.paymentHistory.map((payment) => (
                <div key={payment.id} className="dashboard-transaction-item grid gap-3 rounded-lg bg-surface-soft px-4 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                  <span>
                    <b className="dashboard-transaction-label block text-ink">{payment.packageName}</b>
                    <span className="dashboard-transaction-date text-xs text-muted">
                      {payment.date} · {payment.paymentMethod}
                    </span>
                  </span>
                  <span className="text-right">
                    <b className="block text-ink">Rs. {payment.amountPaid}</b>
                    <span className={payment.status === "success" ? "text-success" : payment.status === "failed" ? "text-danger" : "text-warning"}>
                      {payment.coinsReceived} coins · {payment.status}
                    </span>
                  </span>
                </div>
              )) : (
                <p className="rounded-lg bg-surface-soft p-4 text-sm text-muted">No transactions recorded yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="dashboard-history-and-security-row mt-8 grid gap-6 lg:grid-cols-3">
          <section className="dashboard-reading-history lm-card p-6 lg:col-span-2">
            <h2 className="dashboard-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <History className="h-6 w-6 text-accent2" />
              Continue Reading
            </h2>
            <div className="dashboard-history-grid mt-5 grid gap-4 md:grid-cols-3">
              {data.readingHistory.length ? data.readingHistory.map((history) => (
                <Link key={history.id} href={`/read/${history.slug}`} className="dashboard-history-item rounded-xl border border-border bg-surface-soft p-4 transition hover:border-accent hover:shadow-soft flex flex-col justify-between min-h-[140px]">
                  <div>
                    <BookOpen className="h-5 w-5 text-accent2" />
                    <h3 className="dashboard-history-item-title mt-3 font-semibold text-ink line-clamp-2">{history.title}</h3>
                  </div>
                  <div>
                    <p className="dashboard-history-item-chap mt-2 text-xs text-muted font-mono uppercase tracking-wide">
                      Chapter {history.chapterNumber}
                    </p>
                    {history.progress > 0 && (
                      <div className="w-full bg-border rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-accent h-full rounded-full" style={{ width: `${history.progress}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
              )) : (
                <p className="col-span-full rounded-lg bg-surface-soft p-4 text-sm text-muted">No recently read stories.</p>
              )}
            </div>
          </section>
          
          <section className="dashboard-security-status lm-card p-6">
            <h2 className="dashboard-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <ShieldCheck className="h-6 w-6 text-accent2" />
              Payment Security
            </h2>
            <div className="dashboard-security-details mt-5 space-y-3 text-sm text-muted">
              <p>Coins are credited only after server-side Razorpay verification.</p>
              <p>Webhook processing is idempotent to prevent duplicate credit.</p>
              <p>Frontend success response is never trusted directly.</p>
              <p>Every wallet change has a transaction audit record.</p>
            </div>
          </section>
        </div>

        <section className="dashboard-favorites-and-ratings lm-card mt-8 p-6">
          <h2 className="dashboard-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
            <Bookmark className="h-6 w-6 text-accent2" />
            Favorites and Ratings
          </h2>
          <div className="dashboard-favorites-grid mt-5 grid gap-4 md:grid-cols-3">
            {data.favorites.length ? data.favorites.map((fav) => (
              <Link key={fav.id} href={`/read/${fav.slug}`} className="dashboard-favorite-card rounded-xl bg-surface-soft p-4 border border-transparent hover:border-accent transition-all block">
                <div className="dashboard-favorite-header flex items-center justify-between">
                  <h3 className="dashboard-favorite-title font-semibold text-ink line-clamp-1">{fav.title}</h3>
                  <Heart className="dashboard-favorite-icon h-4 w-4 fill-accent2 text-accent2" />
                </div>
                <p className="dashboard-favorite-genre mt-2 text-xs text-muted font-mono uppercase tracking-wider">{fav.genre} · {fav.chapterTitle}</p>
                <p className="dashboard-favorite-rating mt-3 text-sm font-semibold text-accent flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current" />
                  Average rating: {fav.rating.toFixed(1)}
                </p>
              </Link>
            )) : (
              <p className="col-span-full rounded-lg bg-surface-soft p-4 text-sm text-muted">No favorite stories bookmarked yet.</p>
            )}
          </div>
        </section>
      </section>

      {/* Security reset logout confirmation modal */}
      {securityModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSecurityModalOpen(false); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised shadow-luxury p-6 animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-danger/10 border border-danger/30">
                <KeyRound className="h-7 w-7 text-danger" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Secure Account Reset
              </h2>
              <p className="text-sm text-muted leading-6 max-w-xs">
                To update your password or make changes to account security, you must log out first. We will send a secure password reset link to:
                <span className="block font-semibold text-ink mt-1.5">{user.email}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                disabled={requestingReset}
                onClick={handleSecurityReset}
              >
                {requestingReset ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {requestingReset ? "Processing..." : "Request Reset & Log Out"}
              </button>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-soft-ink transition hover:bg-surface-soft"
                disabled={requestingReset}
                onClick={() => setSecurityModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}