"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CreditCard,
  LogOut,
  Mail,
  Menu,
  Quote,
  ShieldCheck,
  Star,
  UserCircle
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  adminModules,
  faqs,
  paymentProviders,
  securityLayers,
  transactions,
  trustBadges,
  type CoinPackage,
  type Story
} from "@/lib/content";

type HomePageProps = {
  stories: Story[];
  coinPackages: CoinPackage[];
  platformStats: { label: string; value: string }[];
  isAuthenticated: boolean;
  currentUser: {
    displayName: string | null;
    email: string;
    role: string;
    username: string;
  } | null;
  userRole: string | null;
};

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutConfig = {
  paymentId: string;
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  package: {
    name: string;
    coins: number;
    bonusCoins: number;
    price: number;
  };
  prefill: {
    email: string;
    name: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string };
  notes: Record<string, string>;
  method: Record<string, boolean>;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-title-container mx-auto max-w-3xl text-center">
      <p className="lm-eyebrow section-title-eyebrow">{eyebrow}</p>
      <h2 className="section-title-heading mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h2>
      <p className="section-title-description mt-4 text-base leading-7 text-soft-ink md:text-lg">{description}</p>
    </div>
  );
}

function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  const cardClassName = featured
    ? "home-story-card home-story-card-featured group relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/20 bg-surface/10 backdrop-blur transition-all duration-200 hover:border-accent/40 lg:max-w-lg"
    : "home-story-card group relative mx-auto flex h-full w-full min-w-0 max-w-sm flex-col overflow-hidden rounded-2xl border border-border/20 bg-surface/10 backdrop-blur transition-all duration-200 hover:border-accent/40";
  const coverClassName = featured ? "relative h-72 w-full flex-shrink-0 overflow-hidden lg:h-[22rem]" : "relative h-72 w-full flex-shrink-0 overflow-hidden sm:h-80 lg:h-96";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      viewport={{ once: true, margin: "50px" }}
      whileHover={{
        y: -8,
        scale: 1.02,
        // borderColor: "rgba(var(--accent-rgb), 0.6)",
        boxShadow: "0 10px 20px -12px rgba(0,0,0,0.3)",
      }}
      className={cardClassName}
    >
      {/* ===== à¤¬à¥ˆà¤•à¤—à¥à¤°à¤¾à¤‰à¤‚à¤¡ à¤—à¥à¤²à¥‹ (à¤¹à¥‹à¤µà¤°) ===== */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ===== à¤ªà¥‹à¤¸à¥à¤Ÿà¤° à¤‡à¤®à¥‡à¤œ ===== */}
      <div className={coverClassName}>
        {story.cover ? (
          <Image
            src={story.cover}
            alt={story.title}
            fill
            sizes={featured ? "(min-width: 1024px) 42vw, 100vw" : "(min-width: 1024px) 24rem, (min-width: 768px) 50vw, 100vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface/20 text-5xl text-accent/30">
            ðŸ“–
          </div>
        )}

        {/* à¤‡à¤®à¥‡à¤œ à¤ªà¤° à¤¡à¤¾à¤°à¥à¤• à¤“à¤µà¤°à¤²à¥‡ (à¤Ÿà¥‡à¤•à¥à¤¸à¥à¤Ÿ à¤•à¥‹ à¤ªà¤¢à¤¼à¤¨à¥‡ à¤¯à¥‹à¤—à¥à¤¯ à¤¬à¤¨à¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* ===== à¤Ÿà¥‰à¤ª-à¤°à¤¾à¤‡à¤Ÿ: à¤¬à¥ˆà¤œ + à¤°à¥‡à¤Ÿà¤¿à¤‚à¤— ===== */}
        <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] items-start justify-between">
          {story.genre && (
            <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink shadow-sm backdrop-blur-sm">
              {story.genre}
            </span>
          )}
          {story.rating && (
            <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-sm font-medium text-amber-400 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{story.rating}</span>
            </div>
          )}
        </div>

        {/* ===== à¤¬à¥‰à¤Ÿà¤®-à¤²à¥‡à¤«à¥à¤Ÿ: Title + Genre (à¤“à¤µà¤°à¤²à¥‡) ===== */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-lg font-semibold leading-tight text-white drop-shadow-lg line-clamp-1">
            {story.title}
          </h3>
          {story.genre && (
            <p className="text-xs font-medium text-white/80 drop-shadow-md">
              {story.genre}
            </p>
          )}
        </div>
      </div>

      {/* ===== à¤•à¤¾à¤°à¥à¤¡ à¤•à¤¾ à¤•à¤‚à¤Ÿà¥‡à¤‚à¤Ÿ ===== */}
      <div className="flex flex-1 flex-col p-4">
        {/* ===== à¤¡à¤¿à¤¸à¥à¤•à¥à¤°à¤¿à¤ªà¥à¤¶à¤¨ (à¤…à¤¬ à¤‘à¤ªà¥à¤¶à¤¨à¤²) ===== */}
        {/* {story.description && (
          <p className="line-clamp-2 text-sm opacity-70 mb-3">
            {story.description}
          </p>
        )} */}

        {/* ===== à¤šà¥ˆà¤ªà¥à¤Ÿà¤° à¤‡à¤¨à¥à¤«à¥‹ (3 à¤•à¥‰à¤²à¤®) ===== */}
        <div className="story-card-chapters-info mt-1 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="story-chapters-total rounded-lg bg-surface px-2 py-2">
            <b className="block text-base text-ink">{story.chapters || 0}</b> chapters
          </span>
          <span className="story-chapters-free rounded-lg bg-surface px-2 py-2">
            <b className="block text-base text-ink">{story.freeChapters || 0}</b> free
          </span>
          <span className="story-chapters-paid rounded-lg bg-surface px-2 py-2">
            <b className="block text-base text-ink">{story.paidChapters || 0}</b> paid
          </span>
        </div>

        {/* ===== à¤Ÿà¥ˆà¤—à¥à¤¸ ===== */}
        {story.tags && story.tags.length > 0 && (
          <div className="story-card-tags my-3 flex flex-wrap gap-1.5">
            {story.tags.map((tag) => (
              <span
                key={tag}
                className="story-tag rounded-full border border-border bg-accent-soft/40 px-2.5 py-0.5 text-xs text-accent3"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ===== "Read" à¤¬à¤Ÿà¤¨ (à¤¸à¤¬à¤¸à¥‡ à¤¨à¥€à¤šà¥‡) ===== */}
        <motion.div
          whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(var(--accent-rgb), 0.3)" }}
          whileTap={{ scale: 0.95 }}
          className="mt-auto"
        >
          <Link href={`/read/${story.slug}`} className="home-card-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent shadow-soft transition hover:brightness-105">
            <span className="relative z-10">Read Story</span>
            <ArrowRight className="relative z-10 h-4 w-4" />
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

export function HomePage({ stories, coinPackages, platformStats, isAuthenticated, currentUser, userRole }: HomePageProps) {
  const isGuest = !isAuthenticated;
  const isAdmin = userRole === "ADMIN";
  const featuredStory = stories[3] ?? null;
  const heroStyle = featuredStory?.cover
    ? ({
        "--home-hero-cover": `url("${featuredStory.cover}")`
      } as CSSProperties & Record<string, string>)
    : undefined;
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [checkoutPackageId, setCheckoutPackageId] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileName = currentUser?.displayName || currentUser?.username || "Reader";
  const profileInitial = profileName.charAt(0).toUpperCase();
  
  const topstories = stories.slice(0, 3)

  useEffect(() => {
    document.documentElement.classList.add("home-scrollbar-hidden");
    document.body.classList.add("home-scrollbar-hidden");

    return () => {
      document.documentElement.classList.remove("home-scrollbar-hidden");
      document.body.classList.remove("home-scrollbar-hidden");
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  async function handlePackageSelect(pack: CoinPackage) {
    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }

    setCheckoutPackageId(pack.id);

    try {
      const response = await fetch("/api/wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinPackageId: pack.id, provider: "RAZORPAY" })
      });
      const payload = (await response.json()) as ApiResponse<{ checkout: RazorpayCheckoutConfig }>;

      if (!payload.ok) {
        throw new Error(payload.error.message);
      }

      const { checkout } = payload.data;
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout did not load.");
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Velora Fiction",
        description: `${checkout.package.name} coin package`,
        order_id: checkout.orderId,
        prefill: {
          name: checkout.prefill.name || currentUser?.username,
          email: checkout.prefill.email || currentUser?.email
        },
        notes: {
          paymentId: checkout.paymentId,
          packageName: checkout.package.name
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true
        },
        theme: { color: "#14b8a6" },
        modal: {
          ondismiss: () => setCheckoutPackageId(null)
        },
        handler: async (razorpayResponse) => {
          try {
            const verifyResponse = await fetch("/api/wallet/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: checkout.paymentId,
                ...razorpayResponse
              })
            });
            const verifyPayload = (await verifyResponse.json()) as ApiResponse<{
              status: "credited" | "already_processed";
              coinsAdded: number;
              walletBalance: number | null;
            }>;

            if (!verifyPayload.ok) {
              throw new Error(verifyPayload.error.message);
            }

            window.location.href = "/dashboard";
          } catch (error) {
            alert(error instanceof Error ? error.message : "Payment could not be verified.");
            setCheckoutPackageId(null);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to start payment.");
      setCheckoutPackageId(null);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      window.location.href = "/auth";
    }
  }

  async function getHeaderHeight() {
    const header = await document.querySelector(".home-header");

    if (!header) return 0;

    return header.getBoundingClientRect().height;
  }

  return (
    <main className="home-main overflow-hidden">
      <header className="home-header fixed sticy left-0 top-0 z-[9999] w-full px-4 py-2">
        <nav className="mx-auto flex justify-between rounded-full border border-white/10 bg-surface-raised/90 backdrop-blur-xl pr-2 pl-3 py-1.5">
          <Link href="/" className="home-logo flex items-center gap-3">
            <span className="home-logo-icon grid h-10 w-10 place-items-center rounded-xl bg-accent text-on-accent shadow-glow">
              <BookOpen className="h-7 w-7" />
            </span>
            <span className="home-logo-text-wrapper">
              <span className="home-logo-title block font-display text-xl font-semibold leading-none text-ink">Velora Fiction</span>
              <span className="home-logo-subtitle text-xs font-medium uppercase tracking-[0.22em] text-muted">Premium stories</span>
            </span>
          </Link>
          {isAuthenticated ? (
            <div className="home-nav-links hidden items-center gap-7 text-sm font-semibold text-soft-ink lg:flex">
              <a href="#stories" className="home-nav-link transition hover:text-accent text-xl">
                Stories
              </a>
              <a href="#coins" className="home-nav-link transition hover:text-accent text-xl">
                Coins
              </a>
              {isAdmin ? (
                <a href="#protection" className="home-nav-link transition hover:text-accent text-xl">
                  Protection
                </a>
              ) : null}
              {isAdmin ? (
                <Link href="/admin/create-story" className="home-nav-link transition hover:text-accent text-xl">
                  Create Story
                </Link>
              ) : null}
              {isAdmin ? (
                <Link href="/admin" className="home-nav-link transition hover:text-accent text-xl">
                  Admin
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="home-header-actions flex items-center gap-3">
            <div className={isGuest ? "block" : "hidden md:block"}>
              <ThemeSwitcher compact />
            </div>
            {isGuest ? (
              <>
                <Link href="/auth" className="lm-btn-secondary home-action-login py-2">
                  Login
                </Link>
                <Link href="/auth?mode=register" className="lm-btn-accent2 home-action-register py-2">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link href="#coins" className="lm-btn-secondary home-action-buy-coins hidden py-2 md:inline-flex">
                  Buy Coins
                </Link>
                <div className="home-profile-menu relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    className="home-profile-trigger inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised text-sm font-semibold text-on-accent shadow-soft transition hover:border-accent hover:shadow-glow"
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    aria-label="Open profile menu"
                    onClick={() => setProfileOpen((value) => !value)}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent via-accent2 to-accent3">
                      {profileInitial}
                    </span>
                  </button>
                  {profileOpen ? (
                    <div
                      className="home-profile-panel absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-xl border border-border bg-surface-raised p-4 text-left shadow-luxury backdrop-blur-xl"
                      role="menu"
                    >
                      <div className="flex items-center gap-3 border-b border-border pb-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent via-accent2 to-accent3 text-base font-semibold text-on-accent">
                          {profileInitial}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{profileName}</p>
                          <p className="truncate text-sm text-muted">{currentUser?.email}</p>
                        </div>
                      </div>
                      <div className="grid gap-2 py-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">Username</span>
                          <span className="truncate font-semibold text-ink">{currentUser?.username}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">Role</span>
                          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase text-accent2">
                            {currentUser?.role}
                          </span>
                        </div>
                      </div>
                      <Link href="/dashboard" className="lm-btn-secondary mb-3 w-full py-2" role="menuitem">
                        <UserCircle className="h-4 w-4" />
                        View Dashboard
                      </Link>
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:border-danger/50 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoggingOut}
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        {isLoggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button className="home-action-mobile-menu rounded-lg border border-border bg-surface p-2 lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5 text-ink" />
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative min-h-[100svh] w-full flex flex-col" style={heroStyle}>
        <div className="hero-glow-effects absolute inset-0 z-10">
          <div className="lm-glow-accent hero-glow-1 absolute left-[-8rem] top-[-6rem] h-96 w-96 animate-shimmer rounded-full blur-3xl" />
          <div className="lm-glow-accent2 hero-glow-2 absolute right-[-10rem] top-24 h-[34rem] w-[34rem] animate-shimmer rounded-full blur-3xl" />
        </div>
        <div className="hero-container mx-auto max-w-7xl pt-10">
          <div className={`hero-container h-full items-center gap-10 px-5 pt-4 ${isGuest ? "grid grid-cols-1" : "grid lg:grid-cols-[0.92fr_1.08fr]"}`}>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.65 }} className="hero-left-content h-full flex flex-col justify-between">
            <div className="flex flex-col gap-6">
              <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-accent2 shadow-sm backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                Monetized serialized fiction with protected chapters
              </div>
              <div>
                <h1 className="hero-title mt-7 font-display text-5xl font-semibold tracking-tight text-ink md:text-7xl">
                  Velora Fiction
                </h1>
                <p className={`hero-description mt-6 text-lg leading-8 text-soft-ink ${isGuest ? "max-w-5xl" : "max-w-2xl"}`}>
                  A premium marketplace for original stories, coin-based chapter unlocking, reader loyalty, payment
                  integrations, and a DRM-inspired reading experience for professional authors.
                </p>
              </div>
            </div>
            <Link
              href={featuredStory ? `/read/${featuredStory.slug}` : "/auth"}
              className="home-hero-cta mt-4 mr-auto inline-flex flex-wrap items-center gap-3 rounded-lg bg-accent px-6 py-3 text-xl font-semibold text-on-accent shadow-soft transition hover:brightness-105"
            >
              {featuredStory ? "Start Reading" : "Explore Stories"}
              <ArrowRight className="h-8 w-8" />
            </Link>
          </motion.div>
          {isAuthenticated && featuredStory ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.1 }}
              className="hero-featured-story relative"
            >
              <div className="hero-featured-glow absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent-soft via-surface-raised to-accent-light blur-2xl" />
              <StoryCard story={featuredStory} featured />
            </motion.div>
          ) : null}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className={`hero-stats mt-12 md:mt-16 grid grid-cols-2 md:flex md:flex-wrap md:justify-center gap-2 sm:gap-6 w-full`}
          >
            {platformStats.map((stat) => (
              <div
                key={stat.label}
                className="lm-card-soft hero-stat-card border border-border/60 bg-surface-raised/40 backdrop-blur-sm px-3 py-2 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 transition-all duration-300 hover:border-border hover:bg-surface-raised/80"
              >
                <strong className="hero-stat-value block font-display text-2xl font-bold text-ink tracking-tight">
                  {stat.value}
                </strong>
                <div className="h-px w-4 bg-border hidden sm:block" /> {/* à¤µà¤¿à¤œà¥à¤…à¤² à¤¡à¤¿à¤µà¤¾à¤‡à¤¡à¤° */}
                <span className="hero-stat-label block text-sm font-semibold uppercase tracking-[0.15em] text-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {isAuthenticated ? (
        <>
          {isAdmin ? (<section className="trust-badges-section border-y border-border bg-surface-soft/60 py-6 backdrop-blur">
            <div className="trust-badges-container mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-5">
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="trust-badge-item flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-soft-ink shadow-sm"
                >
                  <badge.icon className="h-4 w-4 text-accent" />
                  {badge.label}
                </div>
              ))}
            </div>
          </section>) : null}

          <section id="stories" className="stories-section relative min-h-screen overflow-hidden py-20">
            
            {/* ===== à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤¬à¥ˆà¤•à¤—à¥à¤°à¤¾à¤‰à¤‚à¤¡ à¤‡à¤«à¤¼à¥‡à¤•à¥à¤Ÿà¥à¤¸ ===== */}
            <div className="pointer-events-none absolute inset-0 -z-10">
              {/* à¤®à¥à¤–à¥à¤¯ à¤‘à¤°à¤¾ à¤—à¥à¤²à¥‹ */}
              <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />

              {/* à¤…à¤¤à¤¿à¤°à¤¿à¤•à¥à¤¤ à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤¬à¥à¤²à¥‰à¤¬à¥à¤¸ */}
              <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-2xl animate-pulse" />

              {/* à¤¹à¤²à¥à¤•à¥€ à¤—à¥à¤°à¤¿à¤¡ à¤²à¤¾à¤‡à¤¨à¥à¤¸ (à¤®à¥‰à¤¡à¤°à¥à¤¨ à¤Ÿà¤š) */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(236,72,153,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>
              
            {/* ===== à¤¸à¥‡à¤•à¥à¤¶à¤¨ à¤à¤‚à¤Ÿà¥à¤°à¥€ à¤à¤¨à¤¿à¤®à¥‡à¤¶à¤¨ ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative z-10"
            >
              {/* ===== à¤Ÿà¤¾à¤‡à¤Ÿà¤² (à¤…à¤¬ à¤à¤¨à¤¿à¤®à¥‡à¤Ÿà¥‡à¤¡ à¤”à¤° à¤®à¥‰à¤¡à¤°à¥à¤¨) ===== */}
              <div className="relative">
                {/* à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤…à¤‚à¤¡à¤°à¤²à¤¾à¤‡à¤¨ à¤‡à¤‚à¤¡à¤¿à¤•à¥‡à¤Ÿà¤° */}
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "60px" }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="mb-4 h-1 rounded-full bg-gradient-to-r from-accent to-accent/20"
                />

                <div className="stories-info mx-auto max-w-7xl px-5 text-center md:text-left">
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-sm font-semibold uppercase tracking-[0.26em] text-accent"
                  >
                    Story Library
                  </motion.p>

                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mt-3 font-display text-4xl font-semibold md:text-5xl"
                  >
                    Premium stories with free and paid chapters
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-4 max-w-3xl text-lg leading-8 opacity-80"
                  >
                    Each story card exposes genre, ratings, total chapters, free samples, paid chapters, descriptions, and a direct reading path.
                  </motion.p>
                </div>

                {/* à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤¡à¥‡à¤•à¥‹à¤°à¥‡à¤Ÿà¤¿à¤µ à¤²à¤¾à¤‡à¤¨ */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-6 h-px w-full max-w-2xl bg-gradient-to-r from-accent/30 via-transparent to-transparent origin-left"
                />
              </div>

              {/* ===== à¤¸à¥à¤Ÿà¥‹à¤°à¥€à¤œà¤¼ à¤—à¥à¤°à¤¿à¤¡ â€“ à¤¸à¤¿à¤°à¥à¤« à¤•à¤‚à¤Ÿà¥‡à¤¨à¤° à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• ===== */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                transition={{ staggerChildren: 0.08 }}
                className="stories-grid mx-auto mt-12 grid max-w-7xl gap-6 px-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {topstories.slice(0, 3).map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25 }}
                className="mx-auto mt-8 flex max-w-7xl justify-end px-5"
              >
                <Link href="/stories" className="home-more-stories-btn inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/70 px-5 py-3 text-sm font-semibold text-ink shadow-soft backdrop-blur transition hover:border-accent hover:text-accent">
                  More Stories
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              {/* ===== à¤¬à¥‰à¤Ÿà¤® à¤¡à¤¿à¤µà¤¾à¤‡à¤¡à¤° (à¤ªà¥‚à¤°à¥‡ à¤¸à¥‡à¤•à¥à¤¶à¤¨ à¤•à¥‹ à¤à¤‚à¤•à¤° à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤) ===== */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-16 h-px w-full max-w-3xl mx-auto bg-gradient-to-r from-transparent via-accent/20 to-transparent origin-center"
              />
            </motion.div>

            {/* ===== à¤¸à¥à¤Ÿà¤¾à¤‡à¤²à¥à¤¸ ===== */}
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
              }
              .animate-pulse {
                animation: pulse 6s ease-in-out infinite;
              }
            `}</style>
          </section>

          <section id="coins" className="coin-packages-section lm-section-invert relative min-h-screen overflow-hidden py-20">
            {/* ===== à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤¬à¥ˆà¤•à¤—à¥à¤°à¤¾à¤‰à¤‚à¤¡ à¤‘à¤°à¤¾ ===== */}
            {/* ===== à¤¡à¤¾à¤¯à¤¨à¥ˆà¤®à¤¿à¤• à¤¬à¥ˆà¤•à¤—à¥à¤°à¤¾à¤‰à¤‚à¤¡ à¤‘à¤°à¤¾ (à¤¬à¤¿à¤²à¥à¤•à¥à¤² à¤µà¤¹à¥€) ===== */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="aura-glow absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
              <div className="aura-glow-2 absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
            </div>

            <div className="coin-packages-container mx-auto max-w-7xl px-5">
              {/* ===== 1. à¤Ÿà¥‡à¤•à¥à¤¸à¥à¤Ÿ â€“ à¤ªà¥‚à¤°à¥€ à¤šà¥Œà¤¡à¤¼à¤¾à¤ˆ à¤®à¥‡à¤‚ à¤¸à¤¬à¤¸à¥‡ à¤Šà¤ªà¤° ===== */}
              <div className="coin-packages-info text-center md:text-left">
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-sm font-semibold uppercase tracking-[0.26em] text-accent"
                >
                  Coin Wallet
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mt-3 font-display text-4xl font-semibold md:text-5xl"
                >
                  A complete virtual currency economy
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-4 max-w-3xl text-lg leading-8 opacity-80"
                >
                  Readers buy coins, receive bonus coins on larger packs, unlock chapters
                  permanently, and see every wallet event in a transaction history.
                </motion.p>
              </div>

              {/* ===== 2. à¤µà¥‰à¤²à¥‡à¤Ÿ à¤ªà¥à¤°à¥€à¤µà¥à¤¯à¥‚ (à¤¬à¤¾à¤¯à¤¾à¤) + à¤•à¥‹à¤‡à¤¨ à¤ªà¥ˆà¤•à¥‡à¤œ (à¤¦à¤¾à¤¯à¤¾à¤) ===== */}
              <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                {/* à¤¬à¤¾à¤¯à¤¾à¤ à¤•à¥‰à¤²à¤® â€“ à¤µà¥‰à¤²à¥‡à¤Ÿ à¤ªà¥à¤°à¥€à¤µà¥à¤¯à¥‚ */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="coin-wallet-preview relative overflow-hidden rounded-xl border border-border/30 bg-surface/10 p-5 backdrop-blur"
                >
                  {/* à¤¶à¤¿à¤®à¤° à¤“à¤µà¤°à¤²à¥‡ */}
                  <div className="shimmer-overlay pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                  <div className="coin-wallet-balance-row flex items-center justify-between border-b border-border/20 pb-4">
                    <span className="opacity-70">Current balance</span>
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.6, type: "spring" }}
                      className="font-display text-4xl font-semibold text-accent"
                    >
                      <Counter value={328} />
                    </motion.span>
                  </div>

                  <div className="coin-wallet-tx-history mt-4 space-y-3 h-[450px] overflow-y-auto no-scrollbar">
                    {transactions.map((transaction, idx) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0 + idx * 0.01 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="coin-wallet-tx-item flex items-center justify-between rounded-lg bg-surface/10 px-4 py-3 text-sm transition-all hover:bg-surface/20"
                      >
                        <span>
                          <b className="block">{transaction.label}</b>
                          <span className="opacity-60">{transaction.date}</span>
                        </span>
                        <motion.span
                          whileHover={{ scale: 1.2 }}
                          className={transaction.amount > 0 ? "text-success" : "text-danger"}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </motion.span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* à¤¦à¤¾à¤¯à¤¾à¤ à¤•à¥‰à¤²à¤® â€“ à¤•à¥‹à¤‡à¤¨ à¤ªà¥ˆà¤•à¥‡à¤œ (à¤—à¥à¤°à¤¿à¤¡) */}
                <div className="coin-packages-list space-y-3">
                  {coinPackages.map((pack, idx) => (
                    <motion.div
                      key={pack.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 + idx * 0.06 }}
                      whileHover={{
                        x: 6,
                        borderColor: "rgba(var(--accent-rgb), 0.5)",
                        boxShadow: "0 8px 30px -8px rgba(0,0,0,0.25)",
                      }}
                      onClick={() => (checkoutPackageId ? null : handlePackageSelect(pack))}
                      aria-busy={checkoutPackageId === pack.id}
                      className="coin-package-panel group flex cursor-pointer items-center justify-between rounded-xl border border-border/30 bg-surface/10 px-3 py-0.5 shadow-luxury backdrop-blur transition-all duration-300 hover:border-accent/40 hover:bg-surface/20"
                    >
                      {/* à¤¹à¥‹à¤²à¥‹à¤—à¥à¤°à¤¾à¤«à¤¿à¤• à¤¶à¤¿à¤®à¤° */}
                      <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                      {/* à¤¬à¤¾à¤¯à¤¾à¤ à¤­à¤¾à¤—: Badge + Coins + Bonus */}
                      <div className="">
                        <motion.span
                          whileHover={{ scale: 1.05,
                            background: "accent-soft"
                          }}
                          className="rounded-full bg-accent-light px-1.5 py-0.4 text-xs font-semibold text-ink"
                        >
                          {checkoutPackageId === pack.id ? "Opening checkout..." : pack.badge}
                        </motion.span>

                        <div className="flex gap-1.5 item-center">
                          <span className="text-xl font-semibold sm:text-2xl">
                            <Counter value={pack.coins} />
                          </span>
                          {pack.bonus? (
                            <span className="text-sm font-medium text-accent/80">
                              + <Counter value={pack.bonus} /> bonus
                            </span>
                          ): null}
                        </div>
                      </div>

                      {/* à¤¦à¤¾à¤¯à¤¾à¤ à¤­à¤¾à¤—: Price */}
                      <motion.span
                        whileHover={{ scale: 1.04 }}
                        className="text-xl text-accent3 font-semibold px-6 py-1 rounded-full sm:text-2xl bg-accent"
                      >
                        Rs. <Counter value={pack.price} />
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ===== 3. à¤ªà¥‡à¤®à¥‡à¤‚à¤Ÿ à¤ªà¥à¤°à¥‹à¤µà¤¾à¤‡à¤¡à¤° â€“ à¤¸à¤¬à¤¸à¥‡ à¤¨à¥€à¤šà¥‡ (à¤¬à¤¿à¤²à¥à¤•à¥à¤² à¤µà¤¹à¥€) ===== */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="payment-providers-grid mt-10 grid gap-4 md:grid-cols-3"
              >
                {paymentProviders.map((provider, idx) => (
                  <motion.div
                    key={provider.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.7 + idx * 0.1 }}
                    whileHover={{
                      y: -4,
                      borderColor: "rgba(var(--accent-rgb), 0.4)",
                      boxShadow: "0 12px 22px -8px rgba(0,0,0,0.2)",
                    }}
                    className="payment-provider-card group relative overflow-hidden rounded-xl border border-border/30 bg-surface/10 p-5 backdrop-blur transition-all duration-300"
                  >
                    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <CreditCard className="h-6 w-6 text-accent" />
                    </motion.div>

                    <h3 className="mt-3 font-semibold">{provider.name}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-70">{provider.detail}</p>

                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.9 + idx * 0.1 }}
                      className="mt-3 h-0.5 w-full origin-left rounded-full bg-accent/20"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
          {isAdmin ? (
            <section id="protection" className="protection-section mx-auto max-w-7xl px-5 py-20">
              <SectionTitle
                eyebrow="Anti-Piracy System"
                title="Protection layers built into the reader and API"
                description="No web DRM is perfect, but this platform uses layered deterrence, forensic signals, and server-side verification before delivering any paid chapter."
              />
              <div className="protection-layers-grid mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {securityLayers.map((layer) => (
                  <div key={layer.label} className="protection-layer-card lm-card p-5 transition hover:shadow-luxury">
                    <layer.icon className="h-6 w-6 text-accent2" />
                    <p className="mt-4 font-semibold leading-6 text-ink">{layer.label}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="admin-overview-section border-y border-border bg-surface-soft/50 py-20 backdrop-blur">
              <div className="admin-overview-container mx-auto max-w-7xl px-5">
                <SectionTitle
                  eyebrow="Author Studio"
                  title="Admin dashboard for publishing and revenue"
                  description="Admin tooling covers story operations, wallets, users, payment events, analytics, refunds, and content protection logs."
                />
                <div className="admin-modules-grid mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {adminModules.map((item) => (
                    <div key={item.label} className="admin-module-card lm-card p-5 transition hover:shadow-soft">
                      <item.icon className="h-6 w-6 text-accent2" />
                      <h3 className="mt-4 font-semibold text-ink">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-soft-ink">{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="admin-overview-action mt-8 text-center">
                  <Link href="/admin" className="lm-btn-primary admin-overview-btn">
                    Open Admin Preview <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="writer-note-and-feedback mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="writer-note-card lm-section-invert rounded-2xl p-8 shadow-luxury h-full flex flex-col">
          <Quote className="h-8 w-8 text-accent" />
          <h2 className="mt-6 font-display text-4xl font-semibold">A note from the writer</h2>
          <p className="mt-4 text-lg leading-8 opacity-80">
            Velora is designed for fiction that deserves a premium home: beautiful discovery, respectful monetization,
            and enough protection to make paid chapters viable at scale.
          </p>
          <div className="writer-note-links mt-auto grid gap-3 sm:grid-cols-2">
            <a className="writer-note-email rounded-lg border border-border/30 bg-surface/10 px-4 py-3 text-sm font-semibold backdrop-blur" href="mailto:hello@velorafiction.example">
              hello@velorafiction.example
            </a>
            <a className="writer-note-subscribe rounded-lg border border-border/30 bg-surface/10 px-4 py-3 text-sm font-semibold backdrop-blur" href="#newsletter">
              Join newsletter
            </a>
          </div>
        </div>
        <div className="feedback-and-newsletter grid gap-5">
          <div className="feedback-card lm-card p-6">
            <h3 className="feedback-card-heading font-display text-2xl font-semibold text-ink">Reader Feedback</h3>
            <div className="feedback-form-fields mt-5 grid gap-3 md:grid-cols-2">
              <input className="lm-input feedback-input-name" placeholder="Your name" />
              <select className="lm-input feedback-select-rating" defaultValue="5">
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
              </select>
              <textarea
                className="lm-input feedback-textarea-comment min-h-32 md:col-span-2"
                placeholder="Review, rating note, or suggestion"
              />
            </div>
            <button className="lm-btn-accent2 feedback-submit-btn mt-4">Submit Review</button>
          </div>
          <div id="newsletter" className="newsletter-card lm-card p-6">
            <h3 className="newsletter-card-heading font-display text-2xl font-semibold text-ink">Connect with the writer</h3>
            <p className="newsletter-card-text mt-2 text-sm leading-6 text-muted">
              Contact form, email, social links, and newsletter subscription are wired for deployment.
            </p>
            <div className="newsletter-form-fields mt-5 flex flex-col gap-3 sm:flex-row">
              <input className="lm-input newsletter-input-email min-w-0 flex-1" placeholder="Email address" />
              <button className="lm-btn-primary newsletter-subscribe-btn">
                Subscribe <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </section>

      <section className="faq-section mx-auto max-w-5xl px-5 pb-20">
        <SectionTitle
          eyebrow="FAQ"
          title="Payment, coin, and reading access questions"
          description="Common reader support questions are available up front, with policies linked in the footer."
        />
        <div className="faq-list lm-card mt-10 divide-y divide-border">
          {faqs.map((faq) => (
            <details key={faq.q} className="faq-item group p-5">
              <summary className="faq-question flex cursor-pointer items-center justify-between font-semibold text-ink">
                {faq.q}
                <ChevronRight className="h-4 w-4 text-accent transition group-open:rotate-90" />
              </summary>
              <p className="faq-answer mt-3 text-sm leading-6 text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="footer-section lm-section-invert px-5 py-12">
        <div className="footer-container mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="footer-about">
            <h2 className="footer-brand font-display text-3xl font-semibold">Velora Fiction</h2>
            <p className="footer-about-text mt-3 max-w-xl text-sm leading-6 opacity-70">
              Premium publishing infrastructure for original fiction, virtual coins, protected reading, and reader
              community features.
            </p>
          </div>
          <div className="footer-links-column">
            <h3 className="footer-column-heading font-semibold">Policies</h3>
            <div className="footer-links mt-3 grid gap-2 text-sm opacity-70">
              <Link href="/terms" className="footer-link transition hover:text-accent">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="footer-link transition hover:text-accent">
                Privacy Policy
              </Link>
              <Link href="/refunds" className="footer-link transition hover:text-accent">
                Refund Policy
              </Link>
              <Link href="/dmca" className="footer-link transition hover:text-accent">
                DMCA Notice
              </Link>
              <Link href="/anti-piracy" className="footer-link transition hover:text-accent">
                Anti-Piracy Policy
              </Link>
            </div>
          </div>
          <div className="footer-contact-column">
            <h3 className="footer-column-heading font-semibold">Contact</h3>
            <div className="footer-contact-info mt-3 grid gap-2 text-sm opacity-70">
              <span>hello@velorafiction.example</span>
              <span>Instagram - X - YouTube</span>
              <span>Copyright 2026 Velora Fiction</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
