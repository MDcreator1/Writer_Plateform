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
  Star
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Story } from "@/lib/content";

type DashboardPageProps = {
  user: {
    displayName: string | null;
    username: string;
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
    stories: Story[];
  };
};

export function DashboardPage({ user, data }: DashboardPageProps) {
  const accountCards = [
    { label: "Coin balance", value: String(data.walletBalance), icon: Coins },
    { label: "Purchased chapters", value: String(data.accountStats.purchasedChapters), icon: LockKeyhole },
    { label: "Favorite stories", value: String(data.accountStats.favoriteStories), icon: Heart },
    { label: "Reading hours", value: String(data.accountStats.readingHours), icon: Clock }
  ];

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
            <Link href="/auth" className="lm-btn-primary dashboard-security-link py-2">
              Account Security
            </Link>
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
              Track your wallet balance, verified coin purchases, unlocked chapters, favorites, ratings, and recent reading activity.
            </p>
          </div>
          <div className="dashboard-verification-badge rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            Server verified wallet · Razorpay protected
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
                <p className="rounded-lg bg-surface-soft p-4 text-sm text-muted">No coin purchases yet.</p>
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
              {data.stories.map((story) => (
                <Link key={story.id} href={`/read/${story.slug}`} className="dashboard-history-item rounded-xl border border-border bg-surface-soft p-4 transition hover:border-accent hover:shadow-soft">
                  <BookOpen className="h-5 w-5 text-accent2" />
                  <h3 className="dashboard-history-item-title mt-3 font-semibold text-ink">{story.title}</h3>
                  <p className="dashboard-history-item-chap mt-1 text-sm text-muted">
                    Continue chapter {Math.min(story.freeChapters + 1, story.chapters)}
                  </p>
                </Link>
              ))}
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
            {data.stories.map((story) => (
              <div key={story.id} className="dashboard-favorite-card rounded-xl bg-surface-soft p-4">
                <div className="dashboard-favorite-header flex items-center justify-between">
                  <h3 className="dashboard-favorite-title font-semibold text-ink">{story.title}</h3>
                  <Heart className="dashboard-favorite-icon h-4 w-4 fill-accent2 text-accent2" />
                </div>
                <p className="dashboard-favorite-genre mt-2 text-sm text-muted">{story.genre}</p>
                <p className="dashboard-favorite-rating mt-3 text-sm font-semibold text-accent">
                  <Star className="mr-1 inline h-4 w-4 fill-current" />
                  Average rating: {story.rating.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}