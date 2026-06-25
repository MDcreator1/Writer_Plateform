"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
export const metadata = {
  name: "Classic 2D Layout",
  description: "Standard premium 2D dark glassmorphism layout with grids and smooth gradients."
};
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  LogOut,
  Menu,
  Quote,
  Star,
  UserCircle,
  Crown,
  Sparkles,
  Percent,
  Clock,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Linkedin
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useToast } from "@/components/toast-context";
import {
  describeRecurringDiscount,
  getActiveScheduledDiscount,
  getNextUpcomingOneTimeDiscount,
  type OneTimeDiscountCampaign,
  type RecurringDiscountCampaign
} from "@/lib/discount-campaigns";
import {
  adminModules,
  faqs,
  securityLayers,
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
    username: string | null;
  } | null;
  userRole: string | null;
  monetizationSettings: {
    maxDiscountPercent?: number;
    activeCampaign?: string;
    subCoinsPerDay?: number;
    weeklyBasePrice?: number;
    monthlyBasePrice?: number;
    yearlyBasePrice?: number;
    monthlyUpgradeDiscount?: number;
    yearlyUpgradeDiscount?: number;
    subscriptionsEnabled?: boolean;
    scheduledDiscountEnabled?: boolean;
    scheduledDiscountPercent?: number;
    scheduledDiscountStart?: string;
    scheduledDiscountEnd?: string;
    scheduledDiscountTitle?: string;
    scheduledDiscountDescription?: string;
    scheduledDiscounts?: OneTimeDiscountCampaign[];
    recurringDiscounts?: RecurringDiscountCampaign[];
  } | null;
  writerNote: {
    content: string;
    twitter?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
  } | null;
  activeLayout?: string;
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


const scrollReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } }
};

const slideRevealLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } }
};

const slideRevealRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } }
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};


function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  const cardClassName = featured
    ? "home-story-card home-story-card-featured group relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/20 bg-surface/10 backdrop-blur transition-all duration-200 hover:border-accent/40 lg:max-w-lg aspect-[3/4]"
    : "home-story-card group relative mx-auto flex h-full w-full min-w-0 max-w-sm flex-col overflow-hidden rounded-2xl border border-border/20 bg-surface/10 backdrop-blur transition-all duration-200 hover:border-accent/40 aspect-[3/4]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      viewport={{ once: true, margin: "50px" }}
      whileHover={{
        y: -8,
        scale: 1.02,
        boxShadow: "0 10px 20px -12px rgba(0,0,0,0.3)",
      }}
      className={cardClassName}
    >
      {/* ===== बैकग्राउंड ग्लो (होवर) ===== */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ===== पोस्टर इमेज (फुल हाइट और विड्थ) ===== */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        {story.cover ? (
          <Image
            src={story.cover}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/25 via-accent2/15 to-surface-soft text-accent font-display text-7xl font-bold select-none shadow-inner">
            <span className="drop-shadow-[0_4px_12px_rgba(var(--accent-rgb),0.35)]">
              {story.storyType?.toLowerCase() === "novel" ? "N" : "S"}
            </span>
          </div>
        )}

        {/* इमेज पर डार्क ओवरले (टेक्स्ट को पढ़ने योग्य बनाने के लिए) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      </div>

      {/* ===== टॉप-राइट: बैज + रेटिंग (पहले की तरह) ===== */}
      <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] items-start justify-between z-10">
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

      {/* ===== बॉटम: नाम और जैनर (फ्लोटिंग) ===== */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col pointer-events-none">
        {/* नाम और जैनर (लेफ्ट बॉटम और कवर के ऊपर फ्लोट करते हुए) */}
        <h3 className="font-display text-xl md:text-2xl font-bold leading-tight text-white drop-shadow-lg line-clamp-2">
          {story.title}
        </h3>
        {story.genre && (
          <p className="text-xs md:text-sm font-medium text-white/80 drop-shadow-md mt-1">
            {story.genre}
          </p>
        )}
      </div>

      {/* ===== होवर ओवरले: रीड स्टोरी बटन (परमानेन्ट नहीं, केवल होवर पर) ===== */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Link
          href={`/read/${story.slug}`}
          className="home-card-cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent shadow-lg transition duration-200 hover:scale-105"
        >
          <span className="relative z-10">Read Story</span>
          <ArrowRight className="relative z-10 h-4 w-4" />
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── यह कोड आपकी पेज फाइल में, HomePage कंपोनेंट से पहले या बाद में डालें ───

function StoryCarouselSection({ stories }: { stories: Story[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardContainers = useRef<Map<number, HTMLDivElement>>(new Map());

  const [rotation, setRotation] = useState(0);
  const [currentTilt, setCurrentTilt] = useState(-16);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const [dragVelocity, setDragVelocity] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapProgress, setSnapProgress] = useState(0);
  const [snapStartRotation, setSnapStartRotation] = useState(0);
  const [snapTargetRotation, setSnapTargetRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const lastFrameTime = useRef(performance.now());
  const lastInteractionTime = useRef(performance.now());

  const total = stories.length;
  const autoSpeed = -360 / 28;
  const idleDelay = 2000;
  const snapDuration = 700;
  const minTilt = -32;
  const maxTilt = 4;

  const clamp = useCallback((v: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, v));
  }, []);

  const easeInOutCubic = useCallback((t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }, []);

  const applyRotation = useCallback(
    (rot: number) => {
      if (!carouselRef.current) return;
      const carousel = carouselRef.current;
      carousel.style.transform = `rotateY(${rot}deg)`;

      const radius = getComputedStyle(document.documentElement)
        .getPropertyValue("--carousel-radius")
        .trim() || "400px";

      let frontIndex = -1;
      let maxDepth = -Infinity;

      cardContainers.current.forEach((container, index) => {
        const baseAngle = (360 / total) * index;
        const currentAngle = baseAngle + rot;
        const rad = (currentAngle * Math.PI) / 180;
        const z = Math.cos(rad);
        const depth = (z + 1) / 2;

        container.style.transform = `rotateY(${baseAngle}deg) translateZ(${radius})`;
        container.style.scale = String(0.7 + depth * 0.30);
        container.style.opacity = String(0.25 + depth * 0.75);
        container.style.filter = `brightness(${0.3 + depth * 0.7})`;
        container.style.zIndex = String(Math.round(depth * 1000));

        if (depth > maxDepth) {
          maxDepth = depth;
          frontIndex = index;
        }
      });

      if (frontIndex >= 0 && frontIndex !== activeIndex) {
        setActiveIndex(frontIndex);
      }
    },
    [total, activeIndex]
  );

  const snapToCard = useCallback(
    (index: number) => {
      if (isSnapping || index < 0 || index >= total) return;
      const targetBase = -(360 / total) * index;
      let delta = targetBase - rotation;
      delta = ((delta + 180) % 360 + 360) % 360 - 180;
      const target = rotation + delta;

      setSnapStartRotation(rotation);
      setSnapTargetRotation(target);
      setSnapProgress(0);
      setIsSnapping(true);
      lastInteractionTime.current = performance.now();

      const container = cardContainers.current.get(index);
      if (container) {
        container.classList.remove("snap-flash");
        void container.offsetWidth;
        container.classList.add("snap-flash");
      }
    },
    [isSnapping, rotation, total]
  );

  const pauseAuto = useCallback(() => {
    lastInteractionTime.current = performance.now();
  }, []);

  // ─── Drag handlers ──────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!stageRef.current) return;
      stageRef.current.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setWasDragged(false);
      setDragVelocity(0);
      stageRef.current.classList.add("is-dragging");
      pauseAuto();
      if (isSnapping) setIsSnapping(false);
    },
    [isSnapping, pauseAuto]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setWasDragged(true);
      }

      const newRotation = rotation + dx * 0.35;
      setRotation(newRotation);
      setDragVelocity(dx * 0.35);

      const newTilt = clamp(currentTilt - dy * 0.10, minTilt, maxTilt);
      setCurrentTilt(newTilt);

      if (stageRef.current) {
        stageRef.current.style.transform = `translateY(var(--stage-shift-y)) rotateX(${newTilt}deg)`;
      }

      applyRotation(newRotation);
      pauseAuto();
    },
    [isDragging, rotation, currentTilt, clamp, applyRotation, pauseAuto]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (stageRef.current) {
        stageRef.current.classList.remove("is-dragging");
      }
      pauseAuto();
    }
  }, [isDragging, pauseAuto]);

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
    setWasDragged(false);
    if (stageRef.current) {
      stageRef.current.classList.remove("is-dragging");
    }
  }, []);

  const handleCardClick = useCallback(
    (_e: React.MouseEvent<HTMLDivElement>, index: number) => {
      if (wasDragged) return;
      snapToCard(index);
    },
    [wasDragged, snapToCard]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isSnapping) setIsSnapping(false);
      const amount = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const newRotation = rotation - amount * 0.18;
      setRotation(newRotation);
      setDragVelocity(-amount * 0.08);
      applyRotation(newRotation);
      pauseAuto();
    },
    [isSnapping, rotation, applyRotation, pauseAuto]
  );

  // ─── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (isSnapping) setIsSnapping(false);
        const newRotation = rotation - 12;
        setRotation(newRotation);
        applyRotation(newRotation);
        pauseAuto();
      }
      if (e.key === "ArrowRight") {
        if (isSnapping) setIsSnapping(false);
        const newRotation = rotation + 12;
        setRotation(newRotation);
        applyRotation(newRotation);
        pauseAuto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSnapping, rotation, applyRotation, pauseAuto]);

  // ─── Animation loop ────────────────────────────────────────
  useEffect(() => {
    let frameId: number;

    const animate = (now: number) => {
      const delta = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;

      if (isSnapping) {
        const newProgress = snapProgress + (delta * 1000) / snapDuration;
        if (newProgress >= 1) {
          setSnapProgress(1);
          setIsSnapping(false);
          const finalRotation = snapStartRotation + (snapTargetRotation - snapStartRotation) * 1;
          setRotation(finalRotation);
          applyRotation(finalRotation);
          setTimeout(() => pauseAuto(), 400);
        } else {
          setSnapProgress(newProgress);
          const t = easeInOutCubic(newProgress);
          const currentRot = snapStartRotation + (snapTargetRotation - snapStartRotation) * t;
          setRotation(currentRot);
          applyRotation(currentRot);
        }
        frameId = requestAnimationFrame(animate);
        return;
      }

      if (!isDragging) {
        const idle = now - lastInteractionTime.current;
        if (idle < idleDelay && Math.abs(dragVelocity) > 0.01) {
          const newRotation = rotation + dragVelocity;
          setRotation(newRotation);
          setDragVelocity(dragVelocity * 0.94);
          applyRotation(newRotation);
        } else if (idle >= idleDelay) {
          const newRotation = rotation + autoSpeed * delta;
          setRotation(newRotation);
          applyRotation(newRotation);
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    applyRotation(rotation);
    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [
    isSnapping,
    snapProgress,
    snapStartRotation,
    snapTargetRotation,
    snapDuration,
    easeInOutCubic,
    pauseAuto,
    isDragging,
    idleDelay,
    dragVelocity,
    rotation,
    autoSpeed,
    applyRotation,
  ]);

  // ─── Render cards ──────────────────────────────────────────
  const cardElements = useMemo(() => {
    return stories.map((story, index) => {
      const isFeatured = index === activeIndex;
      return (
        <div
          key={story.id}
          className="carousel-card-container"
          data-index={index}
          ref={(el) => {
            if (el) {
              cardContainers.current.set(index, el);
            } else {
              cardContainers.current.delete(index);
            }
          }}
          onClick={(e) => handleCardClick(e, index)}
        >
          <StoryCard story={story} featured={isFeatured} />
        </div>
      );
    });
  }, [stories, activeIndex, handleCardClick]);

  return (
    <div className="story-carousel-wrapper">
      <div className="carousel-bg" />
      <div className="particles" />

      <div className="carousel-headline">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          ✦ Explore Stories ✦
        </h1>
        <span className="sub">▸ किसी भी कार्ड पर क्लिक करें · वह फ्रंट पर आ जाएगा ◂</span>
      </div>

      <section
        className="carousel-stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <div className="carousel-floor" />

        <div className="carousel-track" ref={carouselRef}>
          {cardElements}
        </div>

        <div className="carousel-center-logo">
          <div className="logo-text">
            NOVEL
            <small>✦ studio ✦</small>
          </div>
        </div>

        <div className="carousel-hint">
          <span>ड्रैग करें · स्क्रॉल करें · क्लिक करें</span>
          <div className="arrow" />
        </div>
      </section>

      <style>{`
        .story-carousel-wrapper {
          --carousel-radius: clamp(280px, 40vw, 500px);
          --stage-shift-y: -30px;
          --tilt: -16deg;
          --bg-dark: #0b0719;

          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: var(--bg-dark);
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 0 2rem;
          width: 100%;
        }

        .carousel-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(123,47,252,.20) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(255,45,149,.15) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(0,212,255,.08) 0%, transparent 50%),
            linear-gradient(180deg, #0b0719 0%, #130f2a 40%, #0f0b1f 100%);
        }

        .particles {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .particles::after {
          content: '';
          display: block;
          width: 100%;
          height: 100%;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,.10), transparent),
            radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,.07), transparent),
            radial-gradient(2px 2px at 60% 20%, rgba(255,255,255,.08), transparent),
            radial-gradient(2px 2px at 80% 80%, rgba(255,255,255,.05), transparent);
          background-size: 200px 200px;
          animation: twinkle 8s ease-in-out infinite alternate;
        }
        @keyframes twinkle {
          0% { opacity: .5; }
          100% { opacity: 1; }
        }

        .carousel-headline {
          text-align: center;
          z-index: 10;
          pointer-events: none;
          margin-bottom: 1.5rem;
        }
        .carousel-headline h1 {
          background: linear-gradient(135deg, #ffd700, #ff6bcb, #7b2ffc, #00d4ff);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradShift 6s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 40px rgba(123,47,252,.25));
        }
        @keyframes gradShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .carousel-headline .sub {
          display: block;
          margin-top: 4px;
          font-size: clamp(.7rem, 1vw, .9rem);
          color: rgba(255,255,255,.45);
          letter-spacing: .12em;
          text-transform: uppercase;
          -webkit-text-fill-color: rgba(255,255,255,.45);
        }

        .carousel-stage {
          position: relative;
          width: min(96vw, 800px);
          height: min(70svh, 560px);
          display: grid;
          place-items: center;
          transform-style: preserve-3d;
          transform: translateY(var(--stage-shift-y)) rotateX(var(--tilt));
          transform-origin: center 72%;
          cursor: grab;
          user-select: none;
          touch-action: none;
          z-index: 2;
        }
        .carousel-stage.is-dragging {
          cursor: grabbing;
        }

        .carousel-track {
          position: absolute;
          width: 1px;
          height: 1px;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .carousel-card-container {
          position: absolute;
          left: 50%;
          top: 50%;
          transform-style: preserve-3d;
          will-change: transform, scale, opacity, filter;
          cursor: pointer;
          pointer-events: auto;
          width: 280px;
          margin-left: -140px;
          height: 400px;
          margin-top: -200px;
          transform-origin: center center;
          transition: filter 0.2s ease;
        }
        .carousel-card-container .story-card {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
        }
        .carousel-card-container.snap-flash .story-card {
          animation: snapFlash 0.7s ease;
        }
        @keyframes snapFlash {
          0% { filter: brightness(1) drop-shadow(0 0 0 transparent); }
          30% { filter: brightness(1.8) drop-shadow(0 0 60px rgba(255,215,0,.9)); }
          70% { filter: brightness(1.2) drop-shadow(0 0 30px rgba(255,215,0,.4)); }
          100% { filter: brightness(1) drop-shadow(0 0 0 transparent); }
        }

        .carousel-floor {
          position: absolute;
          width: min(60vw, 500px);
          height: 100px;
          bottom: clamp(40px, 8vh, 80px);
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(123,47,252,.18), rgba(255,45,149,.08), transparent 70%);
          transform: rotateX(78deg) translateZ(-80px);
          filter: blur(10px);
          z-index: 0;
          animation: floorPulse 4s ease-in-out infinite alternate;
        }
        @keyframes floorPulse {
          0% { opacity: .5; transform: rotateX(78deg) translateZ(-80px) scale(1); }
          100% { opacity: 1; transform: rotateX(78deg) translateZ(-80px) scale(1.06); }
        }

        .carousel-center-logo {
          position: absolute;
          width: clamp(90px, 12vw, 140px);
          aspect-ratio: 1;
          border-radius: 50%;
          display: grid;
          place-items: center;
          z-index: 5;
          background: radial-gradient(circle at 30% 30%, rgba(255,215,0,.95), rgba(255,107,203,.85));
          box-shadow: 0 0 50px rgba(255,215,0,.25), 0 0 100px rgba(123,47,252,.12);
          border: 3px solid rgba(255,255,255,.18);
          transform: translateZ(50px);
          animation: logoFloat 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateZ(50px) translateY(0); }
          50% { transform: translateZ(60px) translateY(-6px); }
        }
        .carousel-center-logo .logo-text {
          color: #0b0719;
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: clamp(1rem, 2vw, 1.6rem);
          text-align: center;
          text-shadow: 0 2px 12px rgba(255,255,255,.25);
        }
        .carousel-center-logo .logo-text small {
          display: block;
          font-size: .4rem;
          font-weight: 400;
          opacity: .60;
          letter-spacing: .12em;
        }

        .carousel-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          opacity: .25;
          animation: hintBounce 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .carousel-hint span {
          font-size: .6rem;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: rgba(255,255,255,.50);
        }
        .carousel-hint .arrow {
          width: 18px;
          height: 18px;
          border-right: 2px solid rgba(255,255,255,.25);
          border-bottom: 2px solid rgba(255,255,255,.25);
          transform: rotate(45deg);
        }
        @keyframes hintBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }

        @media (max-width: 720px) {
          .story-carousel-wrapper {
            --carousel-radius: clamp(180px, 40vw, 250px);
            --stage-shift-y: -20px;
            --tilt: -10deg;
          }
          .carousel-card-container {
            width: 180px;
            margin-left: -90px;
            height: 280px;
            margin-top: -140px;
          }
          .carousel-headline .sub { display: none; }
          .carousel-stage { height: 60svh; }
          .carousel-hint { display: none; }
        }
        @media (max-width: 420px) {
          .carousel-card-container {
            width: 140px;
            margin-left: -70px;
            height: 220px;
            margin-top: -110px;
          }
          .carousel-center-logo { width: 60px; }
          .carousel-center-logo .logo-text { font-size: .7rem; }
          .carousel-center-logo .logo-text small { display: none; }
        }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </div>
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

export default function HomeClassicLayout({ stories, coinPackages, isAuthenticated, currentUser, userRole, monetizationSettings, writerNote }: HomePageProps) {
  const isGuest = !isAuthenticated;
  const isAdmin = userRole === "ADMIN";
  const featuredStory = stories[3] ?? null;
  const { showToast } = useToast();

  // Subscription Settings dynamically read from monetizationSettings prop
  const settings = monetizationSettings || {};
  const subCoinsPerDay = settings.subCoinsPerDay ?? 10;
  const weeklyBasePrice = settings.weeklyBasePrice ?? 150;
  const monthlyBasePrice = settings.monthlyBasePrice ?? 450;
  const yearlyBasePrice = settings.yearlyBasePrice ?? 4000;
  const monthlyUpgradeDiscount = settings.monthlyUpgradeDiscount ?? 5;
  const yearlyUpgradeDiscount = settings.yearlyUpgradeDiscount ?? 25;

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [rating, setRating] = useState<number>(4);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim()) {
      setFeedbackError("Please enter your name.");
      return;
    }
    if (rating < 3) {
      setFeedbackError("Feedback submission requires a minimum rating of 3 stars.");
      return;
    }
    if (!feedbackComment.trim()) {
      setFeedbackError("Please enter your review or suggestion.");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          rating: rating,
          comment: feedbackComment
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Something went wrong.");
      }
      setFeedbackSuccess("Thank you for your valuable feedback!");
      setFeedbackName("");
      setFeedbackComment("");
      setRating(4);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const activeDiscountResult = getActiveScheduledDiscount(settings, now);
  const upcomingOneTimeCampaign = getNextUpcomingOneTimeDiscount(settings, now);
  const displayCampaign = activeDiscountResult?.campaign ?? upcomingOneTimeCampaign ?? null;
  const isCampaignLive = Boolean(activeDiscountResult);
  const isCampaignUpcoming = !isCampaignLive && Boolean(upcomingOneTimeCampaign);
  const campaignStart = displayCampaign && "start" in displayCampaign ? new Date(displayCampaign.start) : null;
  const campaignEnd = displayCampaign && "end" in displayCampaign ? new Date(displayCampaign.end) : null;

  const getCampaignTimeLabel = () => {
    if (!displayCampaign) return "";

    if (activeDiscountResult?.kind === "recurring") {
      return describeRecurringDiscount(activeDiscountResult.campaign);
    }

    if (!campaignStart || !campaignEnd) return "";

    // Server-side / pre-hydration fallback to prevent mismatch
    if (!mounted) {
      const startFormatted = campaignStart.toLocaleString("en-IN", { day: "2-digit", month: "short" });
      const endFormatted = campaignEnd.toLocaleString("en-IN", { day: "2-digit", month: "short" });
      return `${startFormatted} - ${endFormatted}`;
    }

    if (isCampaignLive) {
      const msLeft = campaignEnd.getTime() - now.getTime();
      const secondsLeft = Math.max(0, Math.floor(msLeft / 1000));
      const minutesLeft = Math.floor(secondsLeft / 60);
      const hoursLeft = Math.floor(minutesLeft / 60);
      const daysLeft = Math.floor(hoursLeft / 24);

      if (daysLeft > 0) {
        return `Ends on ${campaignEnd.toLocaleString("en-IN", { day: "2-digit", month: "short" })}`;
      } else if (hoursLeft > 0) {
        const displayMins = minutesLeft % 60;
        return `Ends in ${hoursLeft}h ${displayMins}m`;
      } else {
        const displaySecs = secondsLeft % 60;
        return `Ends in ${minutesLeft}m ${displaySecs}s`;
      }
    }

    const durationMs = campaignEnd.getTime() - campaignStart.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    if (durationDays > 1) {
      const startFormatted = campaignStart.toLocaleString("en-IN", { day: "2-digit", month: "short" });
      const endFormatted = campaignEnd.toLocaleString("en-IN", { day: "2-digit", month: "short" });
      return `${startFormatted} - ${endFormatted}`;
    }

    const dateFormatted = campaignStart.toLocaleString("en-IN", { day: "2-digit", month: "short" });
    const startTimeFormatted = campaignStart.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const endTimeFormatted = campaignEnd.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateFormatted}, ${startTimeFormatted} to ${endTimeFormatted}`;
  };
  const subscriptionPackages = [
    {
      id: "sub_weekly",
      name: "Weekly Pass",
      description: "Weekly membership",
      dailyCoins: subCoinsPerDay,
      totalCoins: subCoinsPerDay * 7,
      costPerCoin: (weeklyBasePrice / (subCoinsPerDay * 7)).toFixed(2),
      price: weeklyBasePrice,
      badge: "Best Weekly Rate",
      period: "week",
    },
    {
      id: "sub_monthly",
      name: "Monthly Pass",
      description: "Monthly membership",
      dailyCoins: subCoinsPerDay,
      totalCoins: subCoinsPerDay * 30,
      costPerCoin: (Math.round(monthlyBasePrice * (1 - monthlyUpgradeDiscount / 100)) / (subCoinsPerDay * 30)).toFixed(2),
      price: Math.round(monthlyBasePrice * (1 - monthlyUpgradeDiscount / 100)),
      badge: "Popular Choice",
      period: "month",
    },
    {
      id: "sub_yearly",
      name: "Yearly Pass",
      description: "Annual membership",
      dailyCoins: subCoinsPerDay,
      totalCoins: subCoinsPerDay * 365,
      costPerCoin: (Math.round(yearlyBasePrice * (1 - yearlyUpgradeDiscount / 100)) / (subCoinsPerDay * 365)).toFixed(2),
      price: Math.round(yearlyBasePrice * (1 - yearlyUpgradeDiscount / 100)),
      badge: "Best Value Pass",
      period: "year",
    }
  ];

  async function handleSubscriptionSelect(pack: typeof subscriptionPackages[0]) {
    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }
    setCheckoutSubscriptionId(pack.id);
    try {
      const response = await fetch("/api/wallet/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: pack.period === "week" ? "WEEKLY" : pack.period === "month" ? "MONTHLY" : "YEARLY"
        })
      });
      const payload = (await response.json()) as ApiResponse<{
        checkout: RazorpayCheckoutConfig & { subscriptionId: string; plan: { type: string; dailyCoins: number; periodDays: number; totalCoins: number; price: number } };
      }>;

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
        description: `${checkout.plan.type} Subscription — ${checkout.plan.periodDays} days`,
        order_id: checkout.orderId,
        prefill: {
          name: checkout.prefill.name || currentUser?.username || undefined,
          email: checkout.prefill.email || currentUser?.email || undefined
        },
        notes: {
          paymentId: checkout.paymentId,
          subscriptionId: checkout.subscriptionId,
          planType: checkout.plan.type
        },
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false
        },
        theme: { color: "#14b8a6" },
        modal: {
          ondismiss: () => setCheckoutSubscriptionId(null)
        },
        handler: async (razorpayResponse) => {
          try {
            const verifyResponse = await fetch("/api/wallet/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: checkout.paymentId,
                subscriptionId: checkout.subscriptionId,
                ...razorpayResponse
              })
            });
            const verifyPayload = (await verifyResponse.json()) as ApiResponse<{
              status: "activated" | "already_active";
              subscriptionId: string;
              coinsCredited: number;
              walletBalance: number;
              expiresAt: Date;
            }>;

            if (!verifyPayload.ok) {
              throw new Error(verifyPayload.error.message);
            }

            window.location.href = "/dashboard";
          } catch (error) {
            showToast(error instanceof Error ? error.message : "Subscription could not be verified.", "error");
            setCheckoutSubscriptionId(null);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to start subscription payment.", "error");
      setCheckoutSubscriptionId(null);
    }
  }
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [checkoutPackageId, setCheckoutPackageId] = useState<string | null>(null);
  const [checkoutSubscriptionId, setCheckoutSubscriptionId] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileName = currentUser?.displayName || currentUser?.username || "Reader";
  const profileInitial = profileName.charAt(0).toUpperCase();


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
          name: checkout.prefill.name || currentUser?.username || undefined,
          email: checkout.prefill.email || currentUser?.email || undefined
        },
        notes: {
          paymentId: checkout.paymentId,
          packageName: checkout.package.name
        },
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false
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
            showToast(error instanceof Error ? error.message : "Payment could not be verified.", "error");
            setCheckoutPackageId(null);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to start payment.", "error");
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
                      className="home-profile-panel absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-xl border border-border bg-surface-raised p-4 text-left shadow-soft backdrop-blur-xl"
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

      {/* ================================================================
          ✦ VELORA FICTION — HOMEPAGE (Kai Portfolio Structure)
          ================================================================ */}

      {/* ─────────────── HERO ─────────────── */}
      <section id="home" className="hero-section relative flex min-h-screen w-full items-center overflow-hidden pt-20">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent2) 0%, transparent 70%)" }}
          />
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="hero-container relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16">

          {/* ── LEFT COL ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="hero-left flex flex-col gap-8"
          >
            {/* Badge */}
            <motion.div variants={scrollReveal} className="hero-badge inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-raised/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-accent backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Premium Serialized Fiction
            </motion.div>

            {/* Title */}
            <motion.div variants={scrollReveal}>
              <h1 className="hero-title font-display text-5xl font-semibold leading-[1.1] tracking-tight text-ink md:text-7xl">
                Velora
                <span
                  className="hero-title-gradient ml-4"
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Fiction
                </span>
              </h1>
              <HeroTyped />
            </motion.div>

            {/* Description */}
            <motion.p
              variants={scrollReveal}
              className="hero-description text-lg leading-8 text-soft-ink"
            >
              A premium marketplace for original stories — coin-based chapter unlocking,
              reader loyalty rewards, and a DRM-inspired experience for professional authors.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={scrollReveal} className="hero-ctas flex flex-wrap items-center gap-4">
              <Link
                href={isAuthenticated ? "/stories" : (featuredStory ? `/read/${featuredStory.slug}` : "/auth")}
                className="hero-cta-primary group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-on-accent shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              >
                <span className="relative z-10">
                  {isAuthenticated ? "Explore Stories" : (featuredStory ? "Start Reading" : "Explore Stories")}
                </span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {isGuest ? (
                <Link
                  href="/auth?mode=register"
                  className="hero-cta-secondary inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/60 px-7 py-3.5 text-sm font-semibold text-ink backdrop-blur transition-all duration-300 hover:border-accent hover:text-accent"
                >
                  Create Account
                </Link>
              ) : (
                <a
                  href="#coins"
                  className="hero-cta-secondary inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/60 px-7 py-3.5 text-sm font-semibold text-ink backdrop-blur transition-all duration-300 hover:border-accent hover:text-accent"
                >
                  Buy Coins
                </a>
              )}
            </motion.div>

            {/* Platform stat pills — Kai "social links" style */}
            {/* <motion.div variants={scrollReveal} className="hero-stats flex flex-wrap gap-3">
              {platformStats.map((stat) => (
                <div
                  key={stat.label}
                  className="hero-stat-pill flex items-center gap-2 rounded-full border border-border/50 bg-surface-raised/40 px-4 py-2 text-sm backdrop-blur"
                >
                  <strong className="font-display font-semibold text-accent">{stat.value}</strong>
                  <span className="text-muted">{stat.label}</span>
                </div>
              ))}
            </motion.div> */}
          </motion.div>

          {/* ── RIGHT COL — Floating orb + featured story card ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="hero-right relative flex items-center justify-center"
          >
            {/* Outer glow ring */}
            <div
              className="hero-orb-ring absolute h-[380px] w-[380px] animate-spin rounded-full md:h-[440px] md:w-[440px]"
              style={{
                background: "conic-gradient(from 0deg, var(--accent), var(--accent2), transparent, var(--accent))",
                animationDuration: "8s",
                filter: "blur(2px)",
                opacity: 0.35,
              }}
            />
            {/* Card container */}
            {featuredStory ? (
              <div className="hero-featured-card relative h-[340px] w-[280px] overflow-hidden rounded-3xl border border-border/30 shadow-soft backdrop-blur md:h-[400px] md:w-[320px]">
                {featuredStory.cover ? (
                  <Image
                    src={featuredStory.cover}
                    alt={featuredStory.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--surface) 0%, var(--paper) 100%)",
                    }}
                  >
                    <BookOpen className="h-20 w-20 text-accent opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">{featuredStory.genre}</p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-white line-clamp-2">{featuredStory.title}</h3>
                  <Link
                    href={`/read/${featuredStory.slug}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
                  >
                    Read Now <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              /* No featured story — glowing Velora logo orb */
              <div
                className="hero-logo-orb relative flex h-72 w-72 items-center justify-center rounded-full border border-border/20 md:h-80 md:w-80"
                style={{
                  background: "radial-gradient(circle at center, rgba(var(--accent-rgb),0.15) 0%, transparent 70%)",
                  boxShadow: "0 0 80px rgba(var(--accent-rgb), 0.2), inset 0 0 40px rgba(var(--accent-rgb), 0.08)",
                }}
              >
                <BookOpen className="h-24 w-24 text-accent opacity-60" />
              </div>
            )}

            {/* Floating story count badge */}
            {stories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -bottom-10 -left-16 flex items-center gap-2 rounded-2xl border border-border bg-surface-raised/90 px-4 py-2.5 backdrop-blur"
              >
                <BookOpen className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-ink">{stories.length} Stories</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-accent to-transparent" />
        </motion.div>
      </section>

      {/* ─────────────── GUEST: 3D CAROUSEL ─────────────── */}
      {isGuest && stories.length > 0 ? (
        <StoryCarouselSection stories={stories} />
      ) : null}

      {/* ─────────────── AUTHENTICATED SECTIONS ─────────────── */}
      {isAuthenticated ? (
        <>
          {/* Admin trust badges */}
          {isAdmin ? (
            <div className="trust-badges-strip border-y border-border/50 bg-surface-soft/40 py-4 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-6">
                {trustBadges.map((badge) => (
                  <div
                    key={badge.label}
                    className="trust-badge flex items-center gap-2 rounded-full border border-border bg-surface-raised/80 px-4 py-1.5 text-xs font-semibold text-soft-ink"
                  >
                    <badge.icon className="h-3.5 w-3.5 text-accent" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── STORIES — Kai "Projects" layout ── */}
          <section id="stories" className="stories-section relative overflow-hidden py-24">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -right-32 top-0 h-96 w-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent)" }} />
              <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent2)" }} />
            </div>

            <div className="stories-container mx-auto max-w-7xl px-6">
              {/* Section heading */}
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className="stories-heading mb-14 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Story Library</p>
                <h2 className="mt-4 font-display text-4xl font-semibold text-ink md:text-5xl">
                  Premium stories, free &amp; paid
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-soft-ink">
                  Each story has free sample chapters to explore. Unlock premium chapters with coins.
                </p>
                {/* Decorative line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="mx-auto mt-6 h-px w-24 origin-center rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
                />
              </motion.div>

              {/* Story cards grid — Kai projects style */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="stories-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {stories.slice(0, 3).map((story) => (
                  <KaiStoryCard key={story.id} story={story} />
                ))}
              </motion.div>

              {/* More stories CTA */}
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-12 flex justify-center"
              >
                <Link
                  href="/stories"
                  className="stories-more-btn inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/60 px-7 py-3 text-sm font-semibold text-ink backdrop-blur transition-all hover:border-accent hover:text-accent"
                >
                  View All Stories
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </section>

          {/* ── COIN PACKAGES — Kai "Resume" two-col layout ── */}
          <section id="coins" className="coins-section lm-section-invert relative overflow-hidden py-24">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent)" }} />
              <div className="absolute -right-20 bottom-1/4 h-64 w-64 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent2)" }} />
            </div>

            <div className="coins-container mx-auto max-w-7xl px-6">
              {/* Heading */}
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className="coins-heading mb-14 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Coin Wallet</p>
                <h2 className="mt-4 font-display text-4xl font-semibold md:text-5xl">
                  A virtual currency economy
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 opacity-70">
                  Buy coins, get bonus on larger packs, unlock chapters permanently, track every transaction.
                </p>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="mx-auto mt-6 h-px w-24 origin-center rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
                />
              </motion.div>

              {/* Two-column: wallet preview + packages */}
              <div className="coins-grid grid gap-10 lg:grid-cols-2">
                {/* LEFT — Subscription Packages */}
                <motion.div
                  variants={slideRevealLeft}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  className="coins-packages flex flex-col gap-4"
                >
                  <h3 className="text-lg font-semibold text-ink mb-2 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                    Subscription Passes
                  </h3>
                  {subscriptionPackages.map((pack, idx) => (
                    <motion.button
                      key={pack.id}
                      type="button"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.07 }}
                      whileHover={{ x: -6, borderColor: "rgba(var(--accent-rgb), 0.6)" }}
                      onClick={() => handleSubscriptionSelect(pack)}
                      className="coin-package-row group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl border border-border/30 bg-surface/10 px-5 py-4 text-left backdrop-blur transition-all duration-300 hover:bg-surface/20"
                    >
                      {/* hover glow */}
                      <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-accent/5 via-transparent to-accent2/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                      <div>
                        <span className="inline-block rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent">
                          {pack.badge}
                        </span>
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span className="text-2xl font-semibold text-ink">
                            {pack.name}
                          </span>
                          <span className="text-xs font-medium text-muted">
                            ({pack.dailyCoins} coins/day)
                          </span>
                        </div>
                        <p className="text-xs text-muted/80 mt-1">
                          Total: {pack.totalCoins} coins · Cost/Coin: ₹{pack.costPerCoin}
                        </p>
                      </div>

                      <span
                        className="coin-price rounded-full px-5 py-2 text-sm font-semibold text-on-accent shadow-sm transition-transform group-hover:scale-105"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                      >
                        ₹<Counter value={pack.price} />/{pack.period === "week" ? "wk" : pack.period === "month" ? "mo" : "yr"}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>

                {/* RIGHT — Packages */}
                <motion.div
                  variants={slideRevealRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  className="coins-packages flex flex-col gap-4"
                >
                  <h3 className="text-lg font-semibold text-ink mb-2 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent2 animate-pulse" />
                    Coin Packages
                  </h3>
                  {coinPackages.map((pack, idx) => {
                    const campaignParts = (pack.campaign || "").split("|");
                    const manual = Number(campaignParts[1]) || 0;
                    const combined = Number(campaignParts[2]) || 0;
                    const scheduled = isCampaignLive ? (displayCampaign?.percent ?? 0) : 0;
                    const totalDiscount = manual + combined + scheduled;
                    const basePrice = pack.price;
                    const discountedPrice = Math.max(0, Math.round(basePrice * (1 - totalDiscount / 100)));

                    return (
                      <motion.button
                        key={pack.id}
                        type="button"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.07 }}
                        whileHover={{ x: 6, borderColor: totalDiscount > 0 ? "rgba(16, 185, 129, 0.5)" : "rgba(var(--accent-rgb), 0.6)" }}
                        onClick={() => (checkoutPackageId ? undefined : handlePackageSelect(pack))}
                        disabled={!!checkoutPackageId}
                        aria-busy={checkoutPackageId === pack.id}
                        className={`coin-package-row group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl border px-5 py-4 text-left backdrop-blur transition-all duration-300 disabled:cursor-wait ${totalDiscount > 0
                            ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                            : "border-border/30 bg-surface/10 hover:bg-surface/20"
                          }`}
                      >
                        {/* hover glow */}
                        <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-accent/5 via-transparent to-accent2/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent">
                              {checkoutPackageId === pack.id ? "Opening…" : pack.badge}
                            </span>
                            {totalDiscount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 animate-pulse">
                                <Sparkles className="h-3 w-3" />
                                Save {totalDiscount}%
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-ink">
                              <Counter value={pack.coins} />
                            </span>
                            <span className="text-sm font-medium text-muted">coins</span>
                            {pack.bonus ? (
                              <span className="text-sm font-medium text-accent/80">
                                + <Counter value={pack.bonus} /> bonus
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {totalDiscount > 0 && (
                            <div className="text-right">
                              <div className="text-[10px] text-muted line-through font-mono">
                                ₹{basePrice}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-bold font-mono">
                                Save ₹{basePrice - discountedPrice}
                              </div>
                            </div>
                          )}
                          <span
                            className="coin-price rounded-full px-5 py-2 text-sm font-semibold text-on-accent shadow-sm transition-transform group-hover:scale-105"
                            style={{
                              background: totalDiscount > 0
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : "linear-gradient(135deg, var(--accent), var(--accent2))"
                            }}
                          >
                            ₹{discountedPrice}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>

              {/* Status and Promotions grid replacing Payment providers */}
              <div className="mt-16">
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid gap-6 md:grid-cols-3"
                >
                  <div className="relative overflow-hidden rounded-xl border border-border/30 bg-surface/10 p-5 backdrop-blur transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/15 text-accent">
                        <Crown className="h-5 w-5" />
                      </div>
                      <span className="text-xs uppercase tracking-wider font-bold text-accent">Best Value Subscription</span>
                    </div>
                    <h4 className="mt-3 font-display text-lg font-bold text-ink">Yearly Pass Pass</h4>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      Save 25% compared to weekly/monthly renewals. Credited daily with 10 coins for full 365 days.
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-border/30 bg-surface/10 p-5 backdrop-blur transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent2/15 text-accent2">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <span className="text-xs uppercase tracking-wider font-bold text-accent2">Best Value Coin Purchase</span>
                    </div>
                    <h4 className="mt-3 font-display text-lg font-bold text-ink">VIP Pack (₹999)</h4>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      Get 1,400 coins instantly. Best price-per-coin conversion rate with zero wait time.
                    </p>
                  </div>

                  <div className={`relative overflow-hidden rounded-xl border p-5 backdrop-blur transition-all duration-300 ${isCampaignLive
                      ? "border-emerald-500/20 bg-emerald-500/5 shadow-md shadow-emerald-500/5"
                      : isCampaignUpcoming
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-border/30 bg-surface/10"
                    }`}
                  >
                    {isCampaignLive && (
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                    )}

                    <div className="flex items-center gap-3">
                      {isCampaignLive ? (
                        <>
                          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 animate-pulse">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                            Top Discount
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                          </span>
                          <span className="text-emerald-400 text-[20px] font-black px-2 py-0.5 rounded-full shrink-0 ml-auto">
                            - {displayCampaign?.percent ?? 0}%
                          </span>
                        </>
                      ) : isCampaignUpcoming ? (
                        <>
                          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500">
                            <Percent className="h-5 w-5" />
                          </div>
                          <span className="text-xs uppercase tracking-wider font-bold text-amber-400">Upcoming Discounts</span>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-lg bg-muted/15 text-muted">
                            <Percent className="h-5 w-5" />
                          </div>
                          <span className="text-xs uppercase tracking-wider font-bold text-muted">Discounts & Offers</span>
                        </>
                      )}
                    </div>

                    {isCampaignLive || isCampaignUpcoming ? (
                      <>
                        <h4 className="mt-3 font-display text-lg font-bold text-ink flex flex-wrap items-center gap-2">
                          <span>
                            {displayCampaign?.title || `${displayCampaign?.percent ?? 0}% Surprise Discount!`}
                          </span>
                          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded flex items-center gap-1.5 shrink-0 ${isCampaignLive
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            }`}>
                            <Clock className="h-3 w-3 shrink-0" />
                            {getCampaignTimeLabel()}
                          </span>
                        </h4>
                        <p className="mt-1 text-xs text-muted leading-relaxed">
                          {displayCampaign?.description || `Get a special ${displayCampaign?.percent ?? 0}% discount applied to all coin packages during the promotional period.`}
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="mt-3 font-display text-lg font-bold text-ink flex flex-wrap items-center gap-2">
                          <span>Weekend Flash Sale</span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-muted/10 text-muted border border-border/40 flex items-center gap-1.5 shrink-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            Inactive
                          </span>
                        </h4>
                        <p className="mt-1 text-xs text-muted leading-relaxed">
                          No active or upcoming discount campaigns scheduled currently. Turn on notifications to catch upcoming surprise sales!
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── ADMIN: PROTECTION LAYERS ── */}
          {isAdmin ? (
            <section id="protection" className="protection-section py-24">
              <div className="mx-auto max-w-7xl px-6">
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  className="mb-14 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Anti-Piracy</p>
                  <h2 className="mt-4 font-display text-4xl font-semibold text-ink md:text-5xl">
                    Protection layers built in
                  </h2>
                </motion.div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {securityLayers.map((layer) => (
                    <div key={layer.label} className="lm-card group relative overflow-hidden p-6 transition-all duration-300">
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <layer.icon className="h-6 w-6 text-accent2" />
                      <p className="mt-4 font-semibold leading-6 text-ink">{layer.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>
          ) : null}

          {/* ── ADMIN: DASHBOARD OVERVIEW ── */}
          {isAdmin ? (
            <section className="admin-section border-y border-border bg-surface-soft/50 py-24 backdrop-blur">
              <div className="mx-auto max-w-7xl px-6">
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  className="mb-14 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Author Studio</p>
                  <h2 className="mt-4 font-display text-4xl font-semibold text-ink md:text-5xl">
                    Admin dashboard for publishing
                  </h2>
                </motion.div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {adminModules.map((item) => (
                    <div className="admin-module-card lm-card p-6 transition-all duration-300"
                    >
                      <item.icon className="h-6 w-6 text-accent2" />
                      <h3 className="mt-4 font-semibold text-ink">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-soft-ink">{item.detail}</p>
                    </div>
                  ))}
                </motion.div>
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="mt-12 flex justify-center"
                >
                  <Link
                    href="/admin"
                    className="stories-more-btn inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised/60 px-7 py-3 text-sm font-semibold text-ink backdrop-blur transition-all hover:border-accent hover:text-accent"
                  >
                    Open Admin Panel
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </div>
            </section>
          ) : null}

          {/* ── CONTACT + ABOUT — Kai "Contact" layout ── */}
          <section id="contact" className="contact-section py-24">
            <div className="mx-auto max-w-7xl px-6">
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className="mb-14 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Connect</p>
                <h2 className="mt-4 font-display text-4xl font-semibold text-ink md:text-5xl">
                  A note from the writer
                </h2>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="mx-auto mt-6 h-px w-24 origin-center rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
                />
              </motion.div>

              {/* Two-column: details left, forms right */}
              <div className="contact-grid grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                {/* LEFT — writer note + contact details */}
                <motion.div
                  variants={slideRevealLeft}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  className="contact-left flex flex-col gap-6"
                >
                  <div className="lm-section-invert rounded-2xl p-8 shadow-soft">
                    <Quote className="h-8 w-8 text-accent" />
                    <p className="mt-6 text-lg leading-8 opacity-80 whitespace-pre-line">
                      {writerNote?.content || "Velora is designed for fiction that deserves a premium home: beautiful discovery, respectful monetization, and enough protection to make paid chapters viable at scale."}
                    </p>
                  </div>
                  <div className="w-full">
                    <div className="rounded-xl border border-border/30 bg-surface/10 px-5 py-4 backdrop-blur">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent block mb-3">Connect on Social Media</span>
                      <div className="flex gap-4 items-center">
                        {writerNote?.twitter && (
                          <motion.a
                            href={writerNote.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="p-2.5 rounded-full border border-border/30 bg-surface/20 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all text-soft-ink"
                            title="Twitter / X"
                          >
                            <Twitter className="h-5 w-5" />
                          </motion.a>
                        )}
                        {writerNote?.instagram && (
                          <motion.a
                            href={writerNote.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="p-2.5 rounded-full border border-border/30 bg-surface/20 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all text-soft-ink"
                            title="Instagram"
                          >
                            <Instagram className="h-5 w-5" />
                          </motion.a>
                        )}
                        {writerNote?.facebook && (
                          <motion.a
                            href={writerNote.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="p-2.5 rounded-full border border-border/30 bg-surface/20 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all text-soft-ink"
                            title="Facebook"
                          >
                            <Facebook className="h-5 w-5" />
                          </motion.a>
                        )}
                        {writerNote?.youtube && (
                          <motion.a
                            href={writerNote.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="p-2.5 rounded-full border border-border/30 bg-surface/20 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all text-soft-ink"
                            title="YouTube"
                          >
                            <Youtube className="h-5 w-5" />
                          </motion.a>
                        )}
                        {writerNote?.linkedin && (
                          <motion.a
                            href={writerNote.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="p-2.5 rounded-full border border-border/30 bg-surface/20 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all text-soft-ink"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </motion.a>
                        )}
                        {!writerNote?.twitter && !writerNote?.instagram && !writerNote?.facebook && !writerNote?.youtube && !writerNote?.linkedin && (
                          <span className="text-xs text-muted">No social links configured.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* RIGHT — forms */}
                <motion.div
                  variants={slideRevealRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  className="contact-right flex flex-col gap-5"
                >
                  {/* Feedback form */}
                  <form onSubmit={handleFeedbackSubmit} className="feedback-card lm-card p-6">
                    <h3 className="font-display text-xl font-semibold text-ink">Reader Feedback</h3>
                    <div className="mt-1 grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        className="input-underline ml-2 pl-2"
                        placeholder="Your name"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        required
                      />
                      <div className="flex flex-col gap-1 justify-center justify-self-end mr-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">Rating (Min 3 stars)</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const starValue = idx + 1;
                            const isFilled = starValue <= rating;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (starValue < 3) {
                                    showToast("Feedback submission requires a minimum rating of 3 stars.", "warning");
                                    setRating(3);
                                  } else {
                                    setRating(starValue);
                                  }
                                }}
                                className="transition-transform hover:scale-110 focus:outline-none"
                              >
                                <svg
                                  className={`h-6 w-6 cursor-pointer ${isFilled
                                      ? "fill-warning text-warning"
                                      : "fill-none text-muted-soft"
                                    }`}
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </button>
                            );
                          })}
                          <span className="ml-1.5 text-xs font-semibold text-ink">({rating}/5)</span>
                        </div>
                      </div>
                      <textarea
                        className="lm-input min-h-28 md:col-span-2"
                        placeholder="Your review or suggestion…"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        required
                      />
                    </div>

                    {feedbackSuccess && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                        {feedbackSuccess}
                      </div>
                    )}
                    {feedbackError && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
                        {feedbackError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={feedbackSubmitting}
                      className="lm-btn-accent2 mt-4 w-full justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {feedbackSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <motion.section
            variants={scrollReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="faq-section mx-auto max-w-4xl px-6 pb-24"
          >
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">FAQ</p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">Common questions</h2>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lm-card divide-y divide-border overflow-hidden rounded-2xl"
            >
              {faqs.map((faq, idx) => (
                <motion.details
                  key={faq.q}
                  variants={scrollReveal}
                  custom={idx}
                  className="faq-item group cursor-pointer p-5 transition-colors hover:bg-surface-soft/30"
                >
                  <summary className="flex items-center justify-between gap-4 font-semibold text-ink">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-muted">{faq.a}</p>
                </motion.details>
              ))}
            </motion.div>
          </motion.section>
        </>
      ) : null}

      {/* ─────────────── FOOTER ─────────────── */}
      <motion.footer
        variants={scrollReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="footer-section lm-section-invert px-6 py-14"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-on-accent">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="font-display text-2xl font-semibold">Velora Fiction</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 opacity-60">
              Premium publishing infrastructure for original fiction, virtual coins, and protected reading.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Policies</h3>
            <div className="mt-4 flex flex-col gap-2 text-sm opacity-60">
              {[
                { href: "/terms", label: "Terms & Conditions" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/refunds", label: "Refund Policy" },
                { href: "/dmca", label: "DMCA Notice" },
                { href: "/anti-piracy", label: "Anti-Piracy Policy" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-accent hover:opacity-100">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Contact</h3>
            <div className="mt-4 flex flex-col gap-2 text-sm opacity-60">
              <span>hello@velorafiction.example</span>
              <span>Instagram · X · YouTube</span>
              <span className="mt-2">© 2026 Velora Fiction</span>
            </div>
          </div>
        </div>
      </motion.footer>
    </main>
  );
}

/* ─── HeroTyped: cycling subtitle ─── */
function HeroTyped() {
  const phrases = [
    "Serialized Fiction ✦",
    "Coin-Powered Reading ✦",
    "Premium Stories ✦",
    "Original Authors ✦",
  ];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <p
      className="hero-typed mt-4 text-lg font-semibold transition-opacity duration-400"
      style={{
        color: "var(--accent)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      {phrases[index]}
    </p>
  );
}

/* ─── KaiStoryCard: Kai projects-style card with hover overlay ─── */
function KaiStoryCard({ story }: { story: Story }) {
  return (
    <motion.div
      variants={scrollReveal}
      whileHover={{ y: -6 }}
      className="kai-story-card group relative overflow-hidden rounded-xl border border-border/20 bg-surface/10 backdrop-blur transition-all duration-300 hover:border-accent/30 hover:shadow-soft aspect-[3/4] w-150 h-250"
    >
      {/* ===== बैकग्राउंड ग्लो (होवर) ===== */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ===== पोस्टर इमेज (फुल हाइट और विड्थ) ===== */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        {story.cover ? (
          <Image
            src={story.cover}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--surface-soft) 0%, var(--paper) 100%)" }}
          >
            <BookOpen className="h-12 w-12 opacity-20 text-accent" />
          </div>
        )}

        {/* इमेज पर डार्क ओवरले (टेक्स्ट को पढ़ने योग्य बनाने के लिए) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      </div>

      {/* ===== टॉप-राइट/लेफ्ट: बैज + रेटिंग (पहले की तरह) ===== */}
      <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] items-start justify-between z-10">
        {story.genre ? (
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {story.genre}
          </span>
        ) : (
          <div />
        )}
        {story.rating && (
          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-sm font-medium text-amber-400 backdrop-blur-sm">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{story.rating}</span>
          </div>
        )}
      </div>

      {/* ===== बॉटम: नाम और जैनर (फ्लोटिंग) ===== */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col pointer-events-none">
        {/* नाम और जैनर (लेफ्ट बॉटम और कवर के ऊपर फ्लोट करते हुए) */}
        <h3 className="font-display text-xl md:text-2xl font-bold leading-tight text-white drop-shadow-lg line-clamp-2">
          {story.title}
        </h3>
        {story.genre && (
          <p className="text-xs md:text-sm font-medium text-white/80 drop-shadow-md mt-1">
            {story.genre}
          </p>
        )}
      </div>

      {/* ===== होवर ओवरले: रीड स्टोरी बटन (परमानेन्ट नहीं, केवल होवर पर) ===== */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Link
          href={`/read/${story.slug}`}
          className="home-card-cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-2.5 text-md font-semibold text-paper shadow-lg transition duration-200 hover:scale-105"
        >
          <span className="relative z-10">Read Story</span>
          <ArrowRight className="relative z-10 h-4 w-4" />
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </Link>
      </div>
    </motion.div>
  );
}

