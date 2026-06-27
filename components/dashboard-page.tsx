"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Coins,
  CreditCard,
  Crown,
  ExternalLink,
  Heart,
  History,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  X
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

type DashboardPageProps = {
  user: {
    displayName: string | null;
    username: string | null;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    hasPhone: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  data: {
    walletBalance: number;
    accountStats: {
      purchasedChapters: number;
      favoriteStories: number;
    };
    purchasedChapters: Array<{
      id: string;
      slug: string;
      story: string;
      cover: string | null;
      chapter: string;
      chapterNumber: number;
      coins: number;
      date: string;
    }>;
    paymentHistory: Array<{
      id: string;
      date: string;
      packageName: string;
      provider: string;
      paymentMethod: string | null;
      amountPaid: number;
      coinsReceived: number;
      status: string;
    }>;
    coinEvents: Array<{ id: string; label: string; amount: number; date: string }>;
    favorites: Array<{
      id: string;
      slug: string;
      title: string;
      cover: string | null;
      genre: string;
      rating: number;
      chapterNumber: number;
      chapterTitle: string;
      date: string;
    }>;
    readingHistory: Array<{
      id: string;
      slug: string;
      title: string;
      cover: string | null;
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

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } }
};

const dashboardBackdropStyle: CSSProperties = {
  backgroundImage: "radial-gradient(circle at 18% 8%, var(--accent-soft), transparent 34%), radial-gradient(circle at 88% 12%, var(--accent-light), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, var(--accent-soft)) 0%, var(--paper) 52%, color-mix(in srgb, var(--paper) 94%, var(--muted-soft)) 100%)"
};

const dashboardGridStyle: CSSProperties = {
  backgroundImage: "linear-gradient(rgba(var(--lm-color-accent-rgb), 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--lm-color-accent-rgb), 0.06) 1px, transparent 1px)",
  backgroundSize: "72px 72px"
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function initials(value: string) {
  return value
    .split(/[\s_@.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "R";
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 850;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatNumber(display)}</>;
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">{title}</h2>
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} whileHover={{ y: -5, scale: 1.01 }} className="rounded-lg border border-border/70 bg-surface/65 p-5 shadow-soft backdrop-blur-xl transition hover:border-accent/45">
      <div className="flex items-center justify-between gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-border/70 to-transparent" />
      </div>
      <strong className="mt-5 block font-display text-4xl font-semibold text-ink"><AnimatedNumber value={value} /></strong>
      <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</span>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, actionHref, actionLabel }: { icon: React.ComponentType<{ className?: string }>; title: string; actionHref: string; actionLabel: string }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-dashed border-border/70 bg-surface/35 p-8 text-center backdrop-blur-xl">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent"><Icon className="h-6 w-6" /></div>
      <h3 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h3>
      <Link href={actionHref} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent transition hover:bg-accent-soft">
        {actionLabel}<ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

function StoryCover({ src, title, className = "h-28 w-20" }: { src: string | null; title: string; className?: string }) {
  if (!src) return null;
  return <div className={`${className} shrink-0 rounded-lg border border-border/70 bg-cover bg-center shadow-[0_18px_40px_rgba(var(--lm-color-ink-rgb),0.18)]`} style={{ backgroundImage: `url(${src})` }} aria-label={title} />;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes = normalized === "success"
    ? "border-success/30 bg-success/10 text-success"
    : normalized === "failed"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-warning/30 bg-warning/10 text-warning";
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${classes}`}>{status}</span>;
}
export function DashboardPage({ user, data }: DashboardPageProps) {
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const displayName = user.displayName || user.username || user.email;
  const memberSince = formatDateTime(user.createdAt);
  const lastLogin = formatDateTime(user.lastLoginAt);
  const latestHistory = data.readingHistory[0];

  const metricCards = useMemo(() => [
    { label: "Wallet Coins", value: data.walletBalance, icon: Wallet, tone: "border-accent/30 bg-accent-soft/70 text-accent" },
    { label: "Recent Unlocks", value: data.purchasedChapters.length, icon: LockKeyhole, tone: "border-accent2/30 bg-accent2/10 text-accent2" },
    { label: "Favorites", value: data.accountStats.favoriteStories, icon: Heart, tone: "border-danger/30 bg-danger/10 text-danger" },
    { label: "Coin Events", value: data.coinEvents.length, icon: ReceiptText, tone: "border-warning/30 bg-warning/10 text-warning" }
  ], [data.accountStats.favoriteStories, data.coinEvents.length, data.purchasedChapters.length, data.walletBalance]);

  const securityItems = [
    { label: "Email", value: user.emailVerified ? "Verified" : "Unverified", icon: Mail, show: true },
    { label: "Phone", value: user.phoneVerified ? "Verified" : "Unverified", icon: Phone, show: user.hasPhone },
    { label: "Last Login", value: lastLogin, icon: ShieldCheck, show: Boolean(lastLogin) },
    { label: "Account Status", value: user.status, icon: CheckCircle2, show: Boolean(user.status) }
  ].filter((item) => item.show && item.value);

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
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-90" style={dashboardBackdropStyle} />
      <div className="pointer-events-none fixed inset-0 opacity-35" style={dashboardGridStyle} />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-raised backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-soft-ink transition hover:border-accent/45 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <button onClick={() => setSecurityModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-warning transition hover:bg-warning/15">
              <KeyRound className="h-4 w-4" />
              Security
            </button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:py-12">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="rounded-lg border border-border/70 bg-surface/70 p-6 shadow-luxury backdrop-blur-2xl md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Reader Control Center
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-tight text-ink md:text-6xl">Welcome back, {displayName}</h1>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-soft-ink">
                <span className="rounded-full border border-border/70 bg-surface/55 px-3 py-1.5">{user.email}</span>
                <span className="rounded-full border border-border/70 bg-surface/55 px-3 py-1.5 uppercase">{user.role}</span>
                {memberSince ? <span className="rounded-full border border-border/70 bg-surface/55 px-3 py-1.5">Member since {memberSince}</span> : null}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/stories" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105">
                  <BookOpen className="h-4 w-4" />
                  Browse Stories
                </Link>
                {latestHistory ? (
                  <Link href={`/read/${latestHistory.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-5 py-3 text-sm font-bold text-ink transition hover:border-accent2/45 hover:bg-surface/75">
                    <History className="h-4 w-4" />
                    Resume Reading
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface-soft/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Wallet Balance</p>
                  <p className="mt-2 font-display text-5xl font-semibold text-ink"><AnimatedNumber value={data.walletBalance} /></p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Coins</p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-lg border border-warning/30 bg-warning/10 text-warning"><Coins className="h-8 w-8" /></div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-border/70 bg-surface/55 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/80">Wallet Summary</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{formatNumber(data.walletBalance)} coins available</h2>
              </div>
              <Wallet className="h-7 w-7 text-accent" />
            </div>
          </motion.div>
          {data.activeSubscription ? (
            <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-accent2/30 bg-accent2/10 p-5 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-lg border border-accent2/30 bg-accent2/10 text-accent2"><Crown className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent2/80">Membership</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{data.activeSubscription.planType} Pass</h2>
                  </div>
                </div>
                <div className="grid gap-1 text-sm text-soft-ink sm:text-right">
                  <span>{data.activeSubscription.dailyCoins} daily coins</span>
                  <span className="text-muted">Expires {data.activeSubscription.expiresAt}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <EmptyState icon={Crown} title="No active membership" actionHref="/" actionLabel="View Plans" />
          )}
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Account Statistics" title="Your Library Signals" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metricCards.map((card) => <MetricCard key={card.label} {...card} />)}</div>
        </section>

        {data.readingHistory.length > 0 ? (
          <section className="mt-12">
            <SectionHeader eyebrow="Continue Reading" title="Open Sessions" />
            <div className="grid gap-4 md:grid-cols-3">
              {data.readingHistory.map((history) => (
                <motion.div key={history.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} whileHover={{ y: -6 }}>
                  <Link href={`/read/${history.slug}`} className="flex h-full flex-col rounded-lg border border-border/70 bg-surface/65 p-4 backdrop-blur-xl transition hover:border-accent/45">
                    <div className="flex gap-4">
                      <StoryCover src={history.cover} title={history.title} className="h-32 w-20" />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-display text-xl font-semibold text-ink">{history.title}</h3>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">Chapter {history.chapterNumber}</p>
                        <p className="mt-1 line-clamp-1 text-sm text-muted">{history.chapterTitle}</p>
                      </div>
                    </div>
                    {history.progress > 0 ? (
                      <div className="mt-5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-border/40"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2" style={{ width: `${history.progress}%` }} /></div>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{history.progress}% complete</p>
                      </div>
                    ) : null}
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}
        <section className="mt-12">
          <SectionHeader eyebrow="Purchased Chapters" title="Unlock Timeline" />
          {data.purchasedChapters.length > 0 ? (
            <div className="relative space-y-4 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border/40">
              {data.purchasedChapters.map((item) => (
                <motion.div key={item.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="relative pl-12">
                  <span className="absolute left-2 top-5 grid h-7 w-7 place-items-center rounded-full border border-success/30 bg-success/10 text-success"><CheckCircle2 className="h-4 w-4" /></span>
                  <Link href={`/read/${item.slug}`} className="flex flex-col gap-4 rounded-lg border border-border/70 bg-surface/55 p-4 backdrop-blur-xl transition hover:border-success/45 sm:flex-row sm:items-center">
                    <StoryCover src={item.cover} title={item.story} className="h-24 w-16" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold text-ink">{item.story}</h3>
                      <p className="mt-1 text-sm text-soft-ink">Chapter {item.chapterNumber}: {item.chapter}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Unlocked {item.date}</p>
                    </div>
                    <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-bold text-warning">{item.coins} coins</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState icon={LockKeyhole} title="No chapters unlocked yet" actionHref="/stories" actionLabel="Find Stories" />
          )}
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Favorites" title="Saved Stories" />
          {data.favorites.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {data.favorites.map((fav) => (
                <motion.div key={fav.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} whileHover={{ y: -6 }}>
                  <Link href={`/read/${fav.slug}`} className="block h-full rounded-lg border border-border/70 bg-surface/65 p-4 backdrop-blur-xl transition hover:border-danger/45">
                    <div className="flex gap-4">
                      <StoryCover src={fav.cover} title={fav.title} className="h-32 w-20" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="line-clamp-2 font-display text-xl font-semibold text-ink">{fav.title}</h3>
                          <Heart className="h-4 w-4 shrink-0 fill-danger text-danger" />
                        </div>
                        {fav.genre ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-accent2">{fav.genre}</p> : null}
                        <p className="mt-2 line-clamp-1 text-sm text-muted">Chapter {fav.chapterNumber}: {fav.chapterTitle}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {fav.rating > 0 ? <span className="inline-flex items-center gap-1 text-warning"><Star className="h-3.5 w-3.5 fill-current" />{fav.rating.toFixed(1)}</span> : null}
                      <span>Saved {fav.date}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bookmark} title="No saved stories" actionHref="/stories" actionLabel="Browse Library" />
          )}
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHeader eyebrow="Payment History" title="Coin Purchases" />
            {data.paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {data.paymentHistory.map((payment) => {
                  const expanded = expandedPaymentId === payment.id;
                  return (
                    <motion.div key={payment.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-border/70 bg-surface/55 p-4 backdrop-blur-xl">
                      <button className="flex w-full items-center gap-4 text-left" onClick={() => setExpandedPaymentId(expanded ? null : payment.id)}>
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-xs font-black text-accent">{payment.provider.slice(0, 2)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg font-semibold text-ink">{payment.packageName}</span>
                          <span className="mt-1 block text-xs text-muted">{payment.date}{payment.paymentMethod ? ` - ${payment.paymentMethod}` : ""}</span>
                        </span>
                        <span className="hidden text-right sm:block">
                          <span className="block font-semibold text-ink">{formatCurrency(payment.amountPaid)}</span>
                          <span className="text-xs text-accent">{formatNumber(payment.coinsReceived)} coins</span>
                        </span>
                        <StatusBadge status={payment.status} />
                        <ChevronDown className={`h-4 w-4 text-muted transition ${expanded ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {expanded ? (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-4 grid gap-3 border-t border-border/70 pt-4 text-sm text-soft-ink sm:grid-cols-3">
                              <span><b className="block text-xs uppercase tracking-[0.16em] text-muted">Provider</b>{payment.provider}</span>
                              <span><b className="block text-xs uppercase tracking-[0.16em] text-muted">Amount</b>{formatCurrency(payment.amountPaid)}</span>
                              <span><b className="block text-xs uppercase tracking-[0.16em] text-muted">Coins</b>{formatNumber(payment.coinsReceived)}</span>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={CreditCard} title="No payment records" actionHref="/" actionLabel="Open Wallet" />
            )}
          </div>

          <div>
            <SectionHeader eyebrow="Coin Transactions" title="Wallet Ledger" />
            {data.coinEvents.length > 0 ? (
              <div className="space-y-3">
                {data.coinEvents.map((event) => (
                  <motion.div key={event.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-surface/55 p-4 backdrop-blur-xl">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{event.label}</p>
                      <p className="mt-1 text-xs text-muted">{event.date}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${event.amount >= 0 ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>{event.amount > 0 ? "+" : ""}{event.amount}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ReceiptText} title="No coin ledger entries" actionHref="/" actionLabel="Open Marketplace" />
            )}
          </div>
        </section>
        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          {securityItems.length > 0 ? (
            <div>
              <SectionHeader eyebrow="Security" title="Account Signals" />
              <div className="grid gap-3 sm:grid-cols-2">
                {securityItems.map((item) => (
                  <motion.div key={item.label} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-border/70 bg-surface/55 p-4 backdrop-blur-xl">
                    <item.icon className="h-5 w-5 text-accent" />
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                    <p className="mt-1 font-semibold text-ink">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <SectionHeader eyebrow="Account Settings" title="Profile Controls" />
            <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} className="rounded-lg border border-border/70 bg-surface/55 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-lg border border-border/70 bg-surface-soft/80 font-display text-xl font-semibold text-ink">{initials(displayName)}</div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-2xl font-semibold text-ink">{displayName}</h3>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-soft-ink sm:grid-cols-2">
                {user.username ? <span className="rounded-lg border border-border/70 bg-surface-soft/50 px-3 py-2"><b className="block text-[10px] uppercase tracking-[0.16em] text-muted">Username</b>{user.username}</span> : null}
                <span className="rounded-lg border border-border/70 bg-surface-soft/50 px-3 py-2"><b className="block text-[10px] uppercase tracking-[0.16em] text-muted">Role</b>{user.role}</span>
              </div>
              <button onClick={() => setSecurityModalOpen(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-bold text-warning transition hover:bg-warning/15">
                <KeyRound className="h-4 w-4" />
                Request Password Reset
              </button>
            </motion.div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {securityModalOpen ? (
          <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(event) => { if (event.target === event.currentTarget) setSecurityModalOpen(false); }} role="dialog" aria-modal="true">
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} className="w-full max-w-md rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-danger/30 bg-danger/10 text-danger"><KeyRound className="h-6 w-6" /></div>
                <button onClick={() => setSecurityModalOpen(false)} className="rounded-lg p-2 text-muted transition hover:bg-surface-soft/60 hover:text-ink" disabled={requestingReset}><X className="h-4 w-4" /></button>
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Secure Account Reset</h2>
              <p className="mt-3 text-sm leading-6 text-muted">A password reset request will be created for <span className="font-semibold text-ink">{user.email}</span>, then this session will end.</p>
              <div className="mt-6 grid gap-2">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-danger px-4 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60" disabled={requestingReset} onClick={handleSecurityReset}>
                  {requestingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {requestingReset ? "Processing" : "Request Reset and Log Out"}
                </button>
                <button className="inline-flex w-full items-center justify-center rounded-lg border border-border/70 px-4 py-3 text-sm font-bold text-soft-ink transition hover:bg-surface-soft/60" disabled={requestingReset} onClick={() => setSecurityModalOpen(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
