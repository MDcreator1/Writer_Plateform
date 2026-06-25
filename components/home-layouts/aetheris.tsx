"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Cpu,
  Layers,
  Compass,
  Orbit,
  Sparkles,
  Menu,
  X,
  Send,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Activity,
  Gauge,
  Zap,
  Flame,
  Coins,
  Crown,
  ArrowRight,
  BookOpen,
  ArrowUp,
  Twitter,
  Github,
  Linkedin,
  Star,
  Clock,
  ChevronRight,
  UserCircle,
  LogOut,
  Percent,
  Instagram,
  Youtube,
  Quote,
  Facebook
} from "lucide-react";

import { getActiveScheduledDiscount } from "@/lib/discount-campaigns";
import { useToast } from "@/components/toast-context";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/theme-provider";
import {
  adminModules,
  faqs,
  securityLayers,
  trustBadges,
  type CoinPackage,
  type Story
} from "@/lib/content";

// --- LAYOUT METADATA (Admin Panel integration) ---
export const metadata = {
  name: "Aetheris Spatial Edition",
  description: "A gorgeous modern interactive design with scrolling 3D canvas and parallax animations."
};

// --- TYPES ---
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string }; code?: string };

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
  prefill: {
    name?: string;
    email?: string;
  };
  notes: Record<string, any>;
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
  };
  method?: Record<string, boolean>;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
};


interface AetherisCanvasProps {
  scrollProgress: number; // 0 to 1
  canvasParticles: string[];
  canvasClearBg: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  originalX: number;
  originalY: number;
  originalZ: number;
  color: string;
  size: number;
  theta: number;
  phi: number;
  r: number;
  phase: number;
}

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
  monetizationSettings: any;
  writerNote: {
    content: string;
    twitter?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
  } | null;
};

// --- DYNAMIC PALETTE CALCULATIONS ---
const getThemeColors = (theme: string) => {
  // Velora's default theme in layout.tsx is "lm-theme-light".
  // As requested, when the default theme (Light) or standard Dark is active, we render our custom
  // premium Aetheris dark obsidian/cyan theme ONLY on this page.
  // Other themes (Grey, Purple, Sunset, Forest) map to their respective color palettes.
  switch (theme) {
    case "lm-theme-grey":
      return {
        bg: "bg-[#18181b]",
        text: "text-zinc-100",
        textMuted: "text-zinc-400",
        textDim: "text-zinc-500",
        accentText: "text-emerald-400",
        accentBorder: "border-emerald-500/20",
        accentBg: "bg-emerald-950/10",
        accentHover: "hover:bg-emerald-500 hover:text-white",
        cardBg: "bg-zinc-900/30",
        cardBorder: "border-zinc-800/40",
        glowColor: "rgba(16, 185, 129, 0.12)",
        textGradient: "from-emerald-400 via-zinc-200 to-cyan-400",
        textGradientSimple: "from-emerald-400 to-cyan-400",
        canvasParticles: [
          "rgba(16, 185, 129, 0.85)", // Emerald
          "rgba(6, 182, 212, 0.85)",  // Cyan
          "rgba(244, 244, 245, 0.9)"   // Silver-white
        ],
        canvasClearBg: "rgba(24, 24, 27, 0.2)",
        btnPrimary: "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/10",
        btnSecondary: "border border-emerald-500/20 bg-emerald-500/5 text-zinc-100 hover:bg-emerald-500 hover:text-white",
        rawBg: "#18181b",
        rawText: "#f4f4f5",
        carouselAccent: "rgba(16, 185, 129, 0.18)",
        glowBlobs: ["bg-emerald-950/10", "bg-zinc-800/10"]
      };
    case "lm-theme-purple":
      return {
        bg: "bg-[#120626]",
        text: "text-fuchsia-100",
        textMuted: "text-fuchsia-400/70",
        textDim: "text-fuchsia-500/50",
        accentText: "text-fuchsia-400",
        accentBorder: "border-fuchsia-500/20",
        accentBg: "bg-fuchsia-950/10",
        accentHover: "hover:bg-fuchsia-500 hover:text-white",
        cardBg: "bg-fuchsia-950/20",
        cardBorder: "border-fuchsia-900/30",
        glowColor: "rgba(217, 70, 239, 0.12)",
        textGradient: "from-fuchsia-400 via-zinc-200 to-indigo-400",
        textGradientSimple: "from-fuchsia-400 to-indigo-400",
        canvasParticles: [
          "rgba(217, 70, 239, 0.85)", // Fuchsia
          "rgba(168, 85, 247, 0.85)", // Purple
          "rgba(244, 244, 245, 0.9)"   // Silver-white
        ],
        canvasClearBg: "rgba(18, 6, 38, 0.2)",
        btnPrimary: "bg-fuchsia-500 text-white hover:bg-fuchsia-600 hover:shadow-xl hover:shadow-fuchsia-500/10",
        btnSecondary: "border border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-100 hover:bg-fuchsia-500 hover:text-white",
        rawBg: "#120626",
        rawText: "#fae8ff",
        carouselAccent: "rgba(217, 70, 239, 0.18)",
        glowBlobs: ["bg-fuchsia-950/15", "bg-purple-950/10"]
      };
    case "lm-theme-sunset":
      return {
        bg: "bg-[#1c0d02]",
        text: "text-orange-100",
        textMuted: "text-orange-400/70",
        textDim: "text-orange-500/50",
        accentText: "text-orange-400",
        accentBorder: "border-orange-500/20",
        accentBg: "bg-orange-950/10",
        accentHover: "hover:bg-orange-500 hover:text-white",
        cardBg: "bg-orange-950/20",
        cardBorder: "border-orange-900/30",
        glowColor: "rgba(249, 115, 22, 0.12)",
        textGradient: "from-orange-400 via-zinc-200 to-red-400",
        textGradientSimple: "from-orange-400 to-red-400",
        canvasParticles: [
          "rgba(249, 115, 22, 0.85)",  // Orange
          "rgba(245, 158, 11, 0.85)",  // Amber
          "rgba(254, 243, 199, 0.9)"   // Cream
        ],
        canvasClearBg: "rgba(28, 13, 2, 0.2)",
        btnPrimary: "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/10",
        btnSecondary: "border border-orange-500/20 bg-orange-500/5 text-orange-100 hover:bg-orange-500 hover:text-white",
        rawBg: "#1c0d02",
        rawText: "#ffedd5",
        carouselAccent: "rgba(249, 115, 22, 0.18)",
        glowBlobs: ["bg-orange-950/15", "bg-red-950/10"]
      };
    case "lm-theme-forest":
      return {
        bg: "bg-[#021a11]",
        text: "text-emerald-100",
        textMuted: "text-emerald-400/70",
        textDim: "text-emerald-500/50",
        accentText: "text-emerald-400",
        accentBorder: "border-emerald-500/20",
        accentBg: "bg-emerald-950/10",
        accentHover: "hover:bg-emerald-500 hover:text-white",
        cardBg: "bg-emerald-950/20",
        cardBorder: "border-emerald-900/30",
        glowColor: "rgba(16, 185, 129, 0.12)",
        textGradient: "from-emerald-400 via-zinc-200 to-lime-400",
        textGradientSimple: "from-emerald-400 to-lime-400",
        canvasParticles: [
          "rgba(16, 185, 129, 0.85)",  // Emerald
          "rgba(132, 204, 22, 0.85)",  // Lime
          "rgba(240, 253, 244, 0.9)"   // Pale Green
        ],
        canvasClearBg: "rgba(2, 26, 17, 0.2)",
        btnPrimary: "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/10",
        btnSecondary: "border border-emerald-500/20 bg-emerald-500/5 text-emerald-100 hover:bg-emerald-500 hover:text-white",
        rawBg: "#021a11",
        rawText: "#d1fae5",
        carouselAccent: "rgba(16, 185, 129, 0.18)",
        glowBlobs: ["bg-emerald-950/15", "bg-green-950/10"]
      };
    case "lm-theme-light":
    default:
      // Standard Aetheris theme (used for default theme on this page)
      return {
        bg: "bg-[#030305]",
        text: "text-white",
        textMuted: "text-white/50",
        textDim: "text-white/40",
        accentText: "text-teal-400",
        accentBorder: "border-white/10",
        accentBg: "bg-white/5",
        accentHover: "hover:bg-white hover:text-black",
        cardBg: "bg-white/5",
        cardBorder: "border-white/10",
        glowColor: "rgba(20, 184, 166, 0.12)",
        textGradient: "from-teal-400 via-zinc-200 to-indigo-400",
        textGradientSimple: "from-teal-400 to-indigo-400",
        canvasParticles: [
          "rgba(20, 184, 166, 0.85)", // Teal
          "rgba(139, 92, 246, 0.85)", // Violet
          "rgba(234, 179, 8, 0.85)"   // Amber/Gold
        ],
        canvasClearBg: "rgba(3, 3, 5, 0.2)",
        btnPrimary: "bg-white text-black hover:bg-teal-500 hover:text-white shadow-xl shadow-teal-500/10",
        btnSecondary: "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black",
        rawBg: "#030305",
        rawText: "#ffffff",
        carouselAccent: "rgba(20, 184, 166, 0.18)",
        glowBlobs: ["bg-indigo-900/10", "bg-teal-950/10"]
      };
  }
};

// --- RAZORPAY SCRIPT LOADER ---
function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay Checkout.")),
        { once: true }
      );
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

// --- 3D PARTICLE CANVAS ENGINE ---
function AetherisCanvas({ scrollProgress, canvasParticles, canvasClearBg }: AetherisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    const initialRect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: initialRect.width, height: initialRect.height });

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
  }, [dimensions]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particleCount = 650;
    const particles: Particle[] = [];
    const perspective = 400;
    let currentScrollProgress = 0;

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const r = 150;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      let color = canvasParticles[0];
      if (i % 3 === 1) {
        color = canvasParticles[1] || canvasParticles[0];
      } else if (i % 6 === 0) {
        color = canvasParticles[2] || canvasParticles[0];
      }

      particles.push({
        x,
        y,
        z,
        originalX: x,
        originalY: y,
        originalZ: z,
        color,
        size: Math.random() * 1.8 + 1,
        theta,
        phi,
        r,
        phase: Math.random() * Math.PI * 2
      });
    }

    const angleY = 0.002;
    const angleX = 0.001;
    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = canvasClearBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      currentScrollProgress += (scrollProgress - currentScrollProgress) * 0.06;

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const mouseRotY = mouse.active ? mouse.x * 0.0008 : 0;
      const mouseRotX = mouse.active ? mouse.y * 0.0008 : 0;

      const rotY = currentScrollProgress * 6.0 + mouseRotY;
      const rotX = currentScrollProgress * 3.0 + mouseRotX;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const renderedPoints = particles.map((p, index) => {
        let x1 = p.originalX * cosY - p.originalZ * sinY;
        let z1 = p.originalX * sinY + p.originalZ * cosY;

        let y2 = p.originalY * cosX - z1 * sinX;
        let z2 = p.originalY * sinX + z1 * cosX;

        p.x = x1;
        p.y = y2;
        p.z = z2;

        let targetX = p.x;
        let targetY = p.y;
        let targetZ = p.z;

        if (currentScrollProgress > 0.02) {
          const factor = currentScrollProgress;
          const twist = p.theta + factor * Math.PI * 3.5;
          const helixRadius = p.r * (1 + factor * 1.3);
          const helixHeight = (p.phi - Math.PI / 2) * 400 * factor;

          const isHelixA = index % 2 === 0;
          const hTheta = twist + (isHelixA ? 0 : Math.PI);

          const hX = helixRadius * Math.sin(p.phi) * Math.cos(hTheta);
          const hY = helixHeight;
          const hZ = helixRadius * Math.sin(p.phi) * Math.sin(hTheta);

          targetX = p.x * (1 - factor) + hX * factor;
          targetY = p.y * (1 - factor) + hY * factor;
          targetZ = p.z * (1 - factor) + hZ * factor;
        }

        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const distSqr = dx * dx + dy * dy;
          const maxDist = 180;

          if (distSqr < maxDist * maxDist) {
            const dist = Math.sqrt(distSqr);
            const force = (maxDist - dist) / maxDist;
            const pushX = (dx / dist) * force * 35;
            const pushY = (dy / dist) * force * 35;

            targetX += pushX;
            targetY += pushY;
          }
        }

        p.phase += 0.015;
        const pulse = Math.sin(p.phase) * 0.3 + 1.0;

        const projectedZ = targetZ + perspective;
        const scale = perspective / Math.max(1, projectedZ);

        const screenX = centerX + targetX * scale;
        const screenY = centerY + targetY * scale;

        return {
          sx: screenX,
          sy: screenY,
          sz: targetZ,
          scale,
          color: p.color,
          size: p.size * scale * pulse
        };
      });

      renderedPoints.sort((a, b) => b.sz - a.sz);

      renderedPoints.forEach((pt) => {
        if (pt.sx < 0 || pt.sx > canvas.width || pt.sy < 0 || pt.sy > canvas.height) {
          return;
        }

        const alpha = Math.min(1.0, Math.max(0.1, (pt.sz + 250) / 500));

        if (pt.scale > 1.2 && Math.random() < 0.1) {
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, pt.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = pt.color.replace("0.85", "0.06").replace("0.9", "0.06");
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, pt.size, 0, Math.PI * 2);

        let finalColor = pt.color;
        if (alpha < 0.95) {
          finalColor = pt.color
            .replace("0.85", (0.85 * alpha).toFixed(2))
            .replace("0.9", (0.9 * alpha).toFixed(2));
        }

        ctx.fillStyle = finalColor;
        ctx.fill();
      });

      ctx.lineWidth = 0.5;
      for (let i = 0; i < renderedPoints.length; i += 20) {
        const pt1 = renderedPoints[i];
        if (pt1.scale < 0.8) continue;

        for (let j = i + 1; j < Math.min(renderedPoints.length, i + 6); j++) {
          const pt2 = renderedPoints[j];
          if (pt2.scale < 0.8) continue;

          const dx = pt1.sx - pt2.sx;
          const dy = pt1.sy - pt2.sy;
          const dSqr = dx * dx + dy * dy;

          if (dSqr < 1500) {
            const alpha =
              (1 - Math.sqrt(dSqr) / Math.sqrt(1500)) *
              0.15 *
              ((pt1.sz + pt2.sz) / 2 + 250) /
              500;
            ctx.beginPath();
            ctx.moveTo(pt1.sx, pt1.sy);
            ctx.lineTo(pt2.sx, pt2.sy);
            const lineCol = canvasParticles[1] || canvasParticles[0];
            ctx.strokeStyle = lineCol.replace("0.85", String(alpha.toFixed(3)));
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [scrollProgress, canvasParticles, canvasClearBg]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden"
    >
      <canvas
        id="aetheris-3d-canvas"
        ref={canvasRef}
        className="w-full h-full block mix-blend-screen opacity-95 transition-opacity duration-700"
      />
    </div>
  );
}

// --- GUEST 3D STORY CAROUSEL SECTION ---
function StoryCard({ story, featured = false, colors }: { story: Story; featured?: boolean; colors: any }) {
  return (
    <div
      className={`group relative mx-auto flex h-full w-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${featured ? `${colors.cardBorder} shadow-2xl` : `${colors.cardBorder} opacity-60`
        } bg-white/5 backdrop-blur-xl aspect-[3/4]`}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        {story.cover ? (
          <Image
            src={story.cover}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-950/80 text-white/20 text-7xl font-bold select-none font-mono">
            {story.storyType?.toLowerCase() === "novel" ? "N" : "S"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      </div>

      <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] items-start justify-between z-10">
        {story.genre && (
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-white backdrop-blur">
            {story.genre}
          </span>
        )}
        {story.rating && (
          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-amber-400 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-current" />
            <span>{story.rating}</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col pointer-events-none">
        <h3 className="font-sans text-lg font-bold leading-tight text-white drop-shadow-lg line-clamp-2">
          {story.title}
        </h3>
        {story.genre && (
          <p className="text-[10px] font-mono font-medium text-white/60 drop-shadow-md mt-1 uppercase">
            {story.genre}
          </p>
        )}
      </div>

      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Link
          href={`/read/${story.slug}`}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-5 py-2.5 text-xs font-mono font-bold tracking-wider text-black shadow-lg hover:scale-105 transition-all duration-300"
        >
          <span>READ STORY</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}


// --- MAIN LAYOUT COMPONENT ---
export default function AetherisSpatialLayout({
  stories = [],
  coinPackages = [],
  platformStats = [],
  isAuthenticated = false,
  currentUser = null,
  userRole = null,
  monetizationSettings = null,
  writerNote = null
}: HomePageProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [telemetryTime, setTelemetryTime] = useState("");
  const [activeTab, setActiveTab] = useState("vault");
  const [checkoutPackageId, setCheckoutPackageId] = useState<string | null>(null);
  const [checkoutSubscriptionId, setCheckoutSubscriptionId] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileName = currentUser?.displayName || currentUser?.username || "Reader";
  const profileInitial = profileName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileOpen]);



  // Feedback form states
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dailyRewardClaiming, setDailyRewardClaiming] = useState(false);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const { showToast } = useToast();

  // Dynamic Theme Colors
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const isGuest = !isAuthenticated;
  const isAdmin = userRole === "ADMIN";

  // Subscription settings and packages
  const settings = monetizationSettings || {};
  const subCoinsPerDay = settings.subCoinsPerDay ?? 10;
  const weeklyBasePrice = settings.weeklyBasePrice ?? 150;
  const monthlyBasePrice = settings.monthlyBasePrice ?? 450;
  const yearlyBasePrice = settings.yearlyBasePrice ?? 4000;
  const monthlyUpgradeDiscount = settings.monthlyUpgradeDiscount ?? 5;
  const yearlyUpgradeDiscount = settings.yearlyUpgradeDiscount ?? 25;

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

  const handleSubscriptionSelect = async (pack: typeof subscriptionPackages[0]) => {
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

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay Checkout did not load.");
      }

      const razorpay = new (window as any).Razorpay({
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
        handler: async (razorpayResponse: RazorpaySuccessResponse) => {
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
  };

  const handleDailyCheckIn = () => {
    if (dailyRewardClaimed || dailyRewardClaiming) return;
    setDailyRewardClaiming(true);
    showToast("Initiating neural synchronization...", "info");
    setTimeout(() => {
      setDailyRewardClaiming(false);
      setDailyRewardClaimed(true);
      showToast("Sync success! Claimed 5 free loyalty coins.", "success");
    }, 1800);
  };

  // Monitor scroll progress and navbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const totalScrollable = docHeight - winHeight;

      if (totalScrollable > 0) {
        setScrollProgress(currentScrollY / totalScrollable);
      }

      setScrolled(currentScrollY > 40);

      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true); // scrolling up or at top
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Mainframe Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTelemetryTime(now.toISOString().slice(11, 19));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync scroll progress on Hero social bars translations
  const textTranslateY = scrollProgress * -150;
  const opacityFade = Math.max(0, 1 - scrollProgress * 1.8);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0, filter: "blur(10px)", scale: 0.96 },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  // --- Handlers ---

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim()) {
      setFeedbackError("Please enter your name.");
      return;
    }
    if (feedbackRating < 3) {
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
          rating: feedbackRating,
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
      setFeedbackRating(5);
      showToast("Feedback sent successfully!", "success");
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handlePackageSelect = async (pack: CoinPackage) => {
    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }

    setCheckoutPackageId(pack.id);
    showToast(`Initializing payment for ${pack.coins} coins...`, "info");

    try {
      const response = await fetch("/api/wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinPackageId: pack.id, provider: "RAZORPAY" })
      });
      const payload = await response.json();

      if (!payload.ok) {
        throw new Error(payload.error.message);
      }

      const { checkout } = payload.data;
      await loadRazorpayScript();

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay Checkout did not load.");
      }

      const razorpay = new (window as any).Razorpay({
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
        handler: async (razorpayResponse: any) => {
          try {
            const verifyResponse = await fetch("/api/wallet/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: checkout.paymentId,
                ...razorpayResponse
              })
            });
            const verifyPayload = await verifyResponse.json();

            if (!verifyPayload.ok) {
              throw new Error(verifyPayload.error.message);
            }

            showToast("Payment success! Coins added to wallet.", "success");
            window.location.href = "/dashboard";
          } catch (error) {
            showToast(
              error instanceof Error ? error.message : "Payment could not be verified.",
              "error"
            );
            setCheckoutPackageId(null);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to start payment.", "error");
      setCheckoutPackageId(null);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      showToast("Logged out successfully.", "success");
    } finally {
      window.location.href = "/auth";
    }
  };

  // Scheduled Campaign Logic
  const activeDiscountResult = getActiveScheduledDiscount(settings, new Date());
  const isCampaignLive = Boolean(activeDiscountResult);

  // Navigation Links
  const menuItems = [];

  if (isAdmin) {
    menuItems.push({ label: "Tactile Grid", href: "#features" });
    menuItems.push({ label: "Telemetry", href: "#showcase" });
  }

  menuItems.push({ label: "Chronicles", href: "#story" });

  if (isAdmin) {
    menuItems.push({ label: "Protection", href: "#admin-protection" });
    menuItems.push({ label: "Admin Console", href: "/admin" });
  }
  menuItems.push({ label: "Neural Uplink", href: "#cta" });

  // Showcase spec maps
  const showcaseTabs = {
    vault: {
      title: "Velora Reader Vault",
      subtitle: "COGNITIVE GEOMETRIC ARCHIVE",
      desc: "The Reader Vault organizes your virtual credentials, purchased coin packages, and unlocked archives. It utilizes local session caches to sync library states securely, ensuring instant load vectors.",
      tech: ["Session Crypt", "Local Cache", "State Synchronization"],
      metricLabel: "Uplink Sync Rate",
      metricValue: "100% // OK",
      accent: "from-teal-400 to-emerald-500",
      icon: Gauge
    },
    studio: {
      title: "Velora Creator Studio",
      subtitle: "MODULAR NARRATIVE FORGE",
      desc: "The engine backing creator uploads and chapter releases. Supports dynamic Markdown parsing, automatic scheduling, and monetization telemetry tracking to boost content visibility.",
      tech: ["Draft Cache", "Prisma ORM", "Monetization Telemetry"],
      metricLabel: "Author Share Rate",
      metricValue: "85% // BASE",
      accent: "from-violet-500 to-fuchsia-600",
      icon: Zap
    },
    drm: {
      title: "DRM-Shield Engine",
      subtitle: "VOLUMETRIC ANTIPIRACY MATRIX",
      desc: "Prevents screen capturing and text scraping using canvas overlays, DOM protection pipelines, and custom font obfuscation, guaranteeing content security for writers.",
      tech: ["Font Obfuscation", "DOM Protection", "Client Signature Check"],
      metricLabel: "Scrape Defense Rate",
      metricValue: "99.9% // SECURE",
      accent: "from-amber-400 to-orange-500",
      icon: Flame
    }
  };

  const activeShowcase = showcaseTabs[activeTab as keyof typeof showcaseTabs] || showcaseTabs.vault;
  const SelectedIcon = activeShowcase.icon;

  return (
    <div
      className={`relative min-h-screen w-full transition-colors duration-700 ${colors.bg} ${colors.text} selection:bg-teal-500/20 selection:text-teal-200 overflow-x-hidden font-sans`}
    >
      {/* SCOPED CUSTOM ANIMATION KEYFRAMES AND SCROLL UTILITIES */}
      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        .animate-spin-slow {
          animation: spin-slow 40s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 25s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .aetheris-perspective {
          perspective: 1200px;
        }
        .aetheris-preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>

      {/* FIXED 3D PARTICLE ENGINE BACKDROP (Theme Aware particles & clear color) */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <AetherisCanvas
          scrollProgress={scrollProgress}
          canvasParticles={colors.canvasParticles}
          canvasClearBg={colors.canvasClearBg}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/20 opacity-40 pointer-events-none" />
      </div>

      {/* HEADER & MOBILE NAVIGATION DRAWER */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{
          y: visible ? 0 : -95,
          opacity: visible ? 1 : 0
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 border-b ${scrolled
          ? "bg-[#030305]/80 backdrop-blur-xl border-zinc-800/40 py-4 shadow-xl shadow-black/20"
          : "bg-transparent border-transparent py-6"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative w-8 h-8 border border-white/40 flex items-center justify-center rotate-45 group-hover:border-teal-400 transition-colors duration-500">
              <div className="w-2 h-2 bg-white group-hover:bg-teal-400 transition-colors duration-500"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-[0.3em] text-white opacity-85 group-hover:text-teal-300 transition-colors duration-500 uppercase">
                Velora / Aetheris
              </span>
              <span className="font-mono text-[8px] tracking-[0.18em] text-zinc-500 uppercase">
                SPATIAL EDITION
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60">
            {menuItems.map((item, idx) => {
              const isInternal = item.href.startsWith("/");
              return isInternal ? (
                <Link
                  key={idx}
                  href={item.href}
                  className="hover:text-white hover:scale-105 transition-all duration-300"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={idx}
                  href={item.href}
                  className="hover:text-white hover:scale-105 transition-all duration-300"
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-6">

            {/* Live mainframe node clock */}
            <div className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-zinc-900 bg-zinc-950/40 text-zinc-500 font-mono text-[9px] tracking-widest">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
              </span>
              <span>CORE MATRIX // UP</span>
              <span className="text-zinc-800">|</span>
              <span className="text-teal-400">{telemetryTime || "12:00:00"}</span>
            </div>

            <ThemeSwitcher compact />

            {isAuthenticated ? (
              <div className="relative flex items-center gap-4" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className={`relative w-9 h-9 rounded-full border ${colors.cardBorder} bg-white/5 flex items-center justify-center hover:border-teal-400 transition-colors duration-300 shadow-lg`}
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                >
                  <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${colors.textGradientSimple} text-black font-mono font-bold text-xs flex items-center justify-center shadow-inner`}>
                    {profileInitial}
                  </span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className={`absolute right-0 top-[calc(100%+12px)] w-72 rounded-2xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-2xl p-5 text-left shadow-2xl z-50`}
                    >
                      <div className="flex items-center gap-3.5 border-b border-white/10 pb-4 mb-4 select-none">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${colors.textGradientSimple} text-black font-mono text-sm font-semibold shadow-inner`}>
                          {profileInitial}
                        </span>
                        <div className="min-w-0 flex flex-col">
                          <p className="truncate font-sans font-bold text-sm text-white">{profileName}</p>
                          <p className="truncate font-mono text-[10px] text-white/50 mt-0.5">{currentUser?.email}</p>
                        </div>
                      </div>

                      <div className="grid gap-3.5 py-1 text-xs font-sans">
                        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                          <span className="text-white/40">Username</span>
                          <span className="truncate font-mono font-semibold text-white">{currentUser?.username}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                          <span className="text-white/40">Role</span>
                          <span className="rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-teal-400">
                            {currentUser?.role}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-2.5">
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-xs font-mono tracking-widest uppercase hover:bg-teal-500 hover:text-white transition-all duration-300 text-center flex items-center justify-center gap-2"
                        >
                          <UserCircle className="h-4 w-4" />
                          Dashboard
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            handleLogout();
                          }}
                          disabled={isLoggingOut}
                          className="w-full py-2.5 rounded-full border border-red-500/30 bg-red-950/10 hover:bg-red-500 hover:text-white transition-all duration-300 text-red-400 text-xs font-mono tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          {isLoggingOut ? "Ending..." : "Logout"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth"
                  className={`px-5 py-2 rounded-full text-xs font-mono tracking-widest uppercase border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black transition-all duration-300`}
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=register"
                  className={`px-5 py-2 rounded-full text-xs font-mono tracking-widest uppercase bg-white text-black hover:bg-teal-500 hover:text-white transition-all duration-300 font-bold`}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-4">
            <ThemeSwitcher compact />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/50 text-white hover:border-teal-500/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="lg:hidden w-full border-t border-zinc-800 bg-[#030305]/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-6 py-8 flex flex-col gap-5">
                {menuItems.map((item, idx) => {
                  const isInternal = item.href.startsWith("/");
                  return isInternal ? (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm uppercase tracking-widest text-zinc-300 hover:text-teal-400 transition-colors py-1"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={idx}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm uppercase tracking-widest text-zinc-300 hover:text-teal-400 transition-colors py-1"
                    >
                      {item.label}
                    </a>
                  );
                })}
                <div className="h-[1px] bg-zinc-800/60 my-2" />
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wider text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    STABLE CORE
                  </span>
                  <span>{telemetryTime} UTC</span>
                </div>
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 rounded-lg text-xs font-mono tracking-wider uppercase font-semibold bg-white text-black"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-center py-3 rounded-lg text-xs font-mono tracking-wider uppercase font-semibold bg-red-500 text-white"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 rounded-lg text-xs font-mono tracking-wider uppercase font-semibold bg-white/10 text-white"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth?mode=register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-3 rounded-lg text-xs font-mono tracking-wider uppercase font-semibold bg-white text-black"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* BODY SEGMENTS */}
      <div className="relative z-10 flex flex-col w-full">
        {/* --- 1. HERO GATE --- */}
        <section
          id="hero"
          className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]/10 px-6 md:px-12 pt-24"
        >
          {/* Ambient Glows */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <motion.div
              style={{ y: scrollProgress * -150, opacity: opacityFade }}
              className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] ${colors.glowBlobs[0]} rounded-full blur-[130px] animate-pulse-slow`}
            />
            <motion.div
              style={{ y: scrollProgress * 150, opacity: opacityFade }}
              className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ${colors.glowBlobs[1]} rounded-full blur-[110px] animate-pulse-slow`}
            />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "40px 40px"
              }}
            />
          </div>

          {/* Socials HUD */}
          <motion.div
            style={{ y: textTranslateY * 0.5, opacity: opacityFade }}
            className="absolute hidden xl:flex top-1/2 left-8 -translate-y-1/2 flex-col gap-12 text-[9px] font-bold tracking-[0.35em] text-white/30 uppercase z-10 [writing-mode:vertical-lr] rotate-180"
          >
            {writerNote?.twitter && (
              <a
                href={writerNote.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-400 transition-colors"
              >
                TWITTER
              </a>
            )}
            {writerNote?.instagram && (
              <a
                href={writerNote.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-400 transition-colors"
              >
                INSTAGRAM
              </a>
            )}
            {writerNote?.facebook && (
              <a
                href={writerNote.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-400 transition-colors"
              >
                FACEBOOK
              </a>
            )}
          </motion.div>

          {/* Step indicator HUD */}
          <motion.div
            style={{ y: -textTranslateY * 0.5, opacity: opacityFade }}
            className="absolute hidden xl:flex top-1/2 right-8 -translate-y-1/2 z-10"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-[1px] h-16 bg-white/10" />
              <span className="text-[10px] font-mono text-teal-400 tracking-tighter">01/05</span>
              <div className="w-[1px] h-16 bg-white/10" />
            </div>
          </motion.div>

          <div className="relative max-w-5xl mx-auto z-10 text-center flex flex-col items-center">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{ y: textTranslateY, opacity: opacityFade }}
              className="flex flex-col items-center select-none"
            >
              <motion.div
                variants={itemVariants}
                className="text-[11px] uppercase tracking-[0.6em] mb-6 text-teal-400 font-bold"
              >
                ✦ The Premium Fiction Convergence ✦
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="font-sans text-[50px] sm:text-[75px] md:text-[95px] lg:text-[105px] font-extralight tracking-[-0.04em] leading-[0.85] mb-8 text-white text-center"
              >
                VELORA<br />
                <span
                  className={`font-medium italic tracking-[-0.02em] ml-12 sm:ml-20 bg-clip-text text-transparent bg-gradient-to-r ${colors.textGradient}`}
                >
                  BEYOND
                </span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="max-w-lg text-white/50 text-[13px] sm:text-[14px] leading-relaxed tracking-wide font-light mb-12 px-4"
              >
                Experience a dynamic reading library. Purchase coin packages, support original authors, and own premium archives forever.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center gap-5 justify-center w-full sm:w-auto"
              >
                <a
                  href={isAuthenticated ? "#story-library" : "#story"}
                  className={`px-8 py-3.5 ${colors.btnPrimary} font-bold rounded-full text-xs font-mono tracking-widest uppercase transition-all duration-300 cursor-pointer`}
                >
                  Examine Archives
                </a>
                <a
                  href="#features"
                  className={`px-8 py-3.5 ${colors.btnSecondary} font-bold rounded-full text-xs font-mono tracking-widest uppercase transition-all duration-300 cursor-pointer`}
                >
                  Explore Features
                </a>
              </motion.div>
            </motion.div>
          </div>

          <div className="absolute bottom-10 left-6 right-6 md:left-12 md:right-12 z-10 flex items-end justify-between select-none pointer-events-none">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[9px] font-bold tracking-widest text-white/40">
                  SCENE PROGRESS
                </span>
                <div className="flex gap-1 items-center">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-500 ${scrollProgress < 0.2 ? "bg-teal-400" : "border border-white/20"
                      }`}
                  />
                  <div className="w-10 h-[1.5px] bg-white/10" />
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-500 ${scrollProgress >= 0.2 && scrollProgress < 0.75
                      ? "bg-teal-400"
                      : "border border-white/20"
                      }`}
                  />
                  <div className="w-10 h-[1.5px] bg-white/10" />
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-500 ${scrollProgress >= 0.75 ? "bg-teal-400" : "border border-white/20"
                      }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2 items-center">
                <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-teal-400 to-transparent" />
                <span className="text-[9px] [writing-mode:vertical-lr] rotate-180 uppercase tracking-[0.4em] text-white/40">
                  Explore Depth
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --- ADMIN: TRUST BADGES STRIP --- */}
        {isAdmin && trustBadges.length > 0 && (
          <div className={`w-full border-y ${colors.cardBorder} bg-white/5 py-4 backdrop-blur-md relative z-20`}>
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-6">
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className={`flex items-center gap-2.5 rounded-full border ${colors.cardBorder} bg-white/5 px-4.5 py-2 text-xs font-semibold text-white/80`}
                >
                  <badge.icon className="h-4 w-4 text-teal-400" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent relative z-20" />

        {/* --- EXTRA: FEATURES GRID (Visible to all) --- */}
        {isAdmin && (
          <section
            id="features"
            className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10"
          >
            <div className="absolute top-1/4 left-[-10%] w-[35rem] h-[35rem] rounded-full bg-teal-950/5 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-[-10%] w-[30rem] h-[30rem] rounded-full bg-indigo-950/5 blur-[150px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <div className="flex flex-col items-center text-center mb-20 md:mb-28 select-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/40 text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-5">
                  <Orbit className="w-3.5 h-3.5 text-teal-400 animate-spin-slow" />
                  <span>Tactile Systems Architecture</span>
                </div>
                <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                  Designed for Immersion
                </h2>
                <p className="max-w-xl font-sans text-sm md:text-base text-zinc-400 font-normal mt-4 leading-relaxed">
                  Every component in the Velora ecosystem is engineered to support clean readability, robust piracy protection, and creator-focused token systems.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    id: "f1",
                    icon: Shield,
                    title: "DRM-Shield Encryption",
                    description:
                      "Protects original author assets with advanced client-side overlays and screen protection systems.",
                    category: "Core Security",
                    glowColor: colors.glowColor
                  },
                  {
                    id: "f2",
                    icon: Zap,
                    title: "Instant Chapter Sync",
                    description:
                      "Chapters unlock instantly across devices. Enjoy clean reading without ads or distraction panels.",
                    category: "Performance",
                    glowColor: colors.glowColor
                  },
                  {
                    id: "f3",
                    icon: Crown,
                    title: "Crystalline Archives",
                    description:
                      "Once you unlock a chapter with coins, it remains bound to your reader library for permanent access.",
                    category: "Library Control",
                    glowColor: colors.glowColor
                  },
                  {
                    id: "f4",
                    icon: Cpu,
                    title: "Fair Share Economy",
                    description:
                      "A transparent token economy that rewards creators directly. Your coins feed directly into creator workspaces.",
                    category: "Token Mechanics",
                    glowColor: colors.glowColor
                  }
                ].map((card, idx) => {
                  const cardRef = useRef<HTMLDivElement | null>(null);
                  const [rotate, setRotate] = useState({ x: 0, y: 0 });
                  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
                  const [isHovered, setIsHovered] = useState(false);
                  const CardIcon = card.icon;

                  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                    if (!cardRef.current) return;
                    const rect = cardRef.current.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;

                    setRotate({ x: -y * 18, y: x * 18 });
                    setGlowPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  };

                  const handleMouseLeave = () => {
                    setIsHovered(false);
                    setRotate({ x: 0, y: 0 });
                  };

                  return (
                    <motion.div
                      key={card.id}
                      initial={{
                        y: 75,
                        opacity: 0,
                        rotateX: 18,
                        rotateY: -5,
                        scale: 0.94,
                        filter: "blur(6px)"
                      }}
                      whileInView={{
                        y: 0,
                        opacity: 1,
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        filter: "blur(0px)"
                      }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 1.2, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="aetheris-perspective transform-gpu"
                    >
                      <div
                        ref={cardRef}
                        onMouseMove={handleMouseMove}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          transform: isHovered
                            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(1.025)`
                            : "rotateX(0deg) rotateY(0deg) scale(1)",
                          transition: isHovered
                            ? "none"
                            : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
                        }}
                        className={`relative h-full flex flex-col justify-between p-8 rounded-2xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl overflow-hidden group cursor-pointer shadow-lg hover:border-teal-400/40 hover:shadow-teal-950/10 transition-all duration-300 min-h-[260px]`}
                      >
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 z-0"
                          style={{
                            background: `radial-gradient(circle 220px at ${glowPos.x}px ${glowPos.y}px, ${card.glowColor}, transparent 80%)`
                          }}
                        />

                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg border ${colors.cardBorder} bg-white/5 group-hover:border-teal-500/30 transition-all duration-500 shadow-inner`}>
                              <CardIcon className="w-6 h-6 text-teal-400 group-hover:scale-110 group-hover:text-teal-300 transition-all duration-500" />
                            </div>
                            <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest italic font-mono">
                              {card.category}
                            </span>
                          </div>

                          <h3 className="font-sans text-[15px] font-bold text-white tracking-tight mb-2.5 group-hover:text-teal-200 transition-colors">
                            {card.title}
                          </h3>
                          <p className="font-sans text-[12px] text-white/70 leading-relaxed font-light group-hover:text-white transition-colors">
                            {card.description}
                          </p>
                        </div>

                        <div className="mt-6 w-6 h-[1.5px] bg-white/30 group-hover:w-full transition-all duration-500 ease-out" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent relative z-20" />

        {isAdmin && (
          <section
            id="showcase"
            className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10"
          >
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-950/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-violet-950/5 blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-24 gap-6 select-none"
              >
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-5">
                    <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                    <span>Modular State Explorer</span>
                  </div>
                  <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                    Interactive Systems Control
                  </h2>
                  <p className="font-sans text-sm md:text-base text-white/50 font-normal mt-4 leading-relaxed">
                    Toggle the modules below to review how the Velora architecture maps reader libraries, secure author studios, and DRM encryption engines.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md self-start md:self-auto overflow-x-auto w-full md:w-auto">
                  {Object.entries(showcaseTabs).map(([key, tab]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 md:flex-none px-5 py-2.5 rounded-full text-xs font-mono tracking-wider uppercase font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${activeTab === key
                        ? "bg-white text-black shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      {tab.title.split(" ").slice(1).join(" ") || tab.title}
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`lg:col-span-7 flex flex-col justify-between p-8 md:p-12 rounded-xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl relative overflow-hidden shadow-2xl shadow-black/60`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.01)_0%,transparent_65%)] pointer-events-none" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col h-full justify-between gap-10"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8 font-mono">
                          <span className="text-[10px] tracking-widest text-teal-400 uppercase">
                            {activeShowcase.subtitle}
                          </span>
                          <span className="text-[9px] tracking-widest text-white/30">
                            SYS-ID // 0{activeTab === "vault" ? "1" : activeTab === "studio" ? "2" : "3"}
                          </span>
                        </div>

                        <h3 className="font-sans text-3xl md:text-4xl font-black text-white tracking-tight mb-6">
                          {activeShowcase.title}
                        </h3>
                        <p className="font-sans text-sm md:text-base text-white/75 leading-relaxed font-normal mb-8">
                          {activeShowcase.desc}
                        </p>

                        <div className="flex flex-wrap gap-2.5">
                          {activeShowcase.tech.map((tech, idx) => (
                            <motion.span
                              key={tech}
                              initial={{ opacity: 0, scale: 0.85, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{
                                duration: 0.4,
                                delay: idx * 0.08,
                                ease: [0.16, 1, 0.3, 1]
                              }}
                              className={`px-3 py-1.5 rounded-md border ${colors.cardBorder} bg-white/5 text-white/60 font-mono text-[9px] tracking-wider uppercase`}
                            >
                              {tech}
                            </motion.span>
                          ))}
                        </div>
                      </div>

                      <div className={`mt-6 p-6 rounded-xl border ${colors.cardBorder} bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-white/5 border ${colors.cardBorder} flex items-center justify-center`}>
                            <Sliders className="w-4 h-4 text-teal-400" />
                          </div>
                          <div>
                            <div className="font-mono text-[9px] tracking-wider text-white/40 uppercase">
                              Current Telemetry Field
                            </div>
                            <div className="font-sans text-sm font-semibold text-white mt-0.5">
                              {activeShowcase.metricLabel}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                          {activeShowcase.metricValue}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`lg:col-span-5 flex flex-col justify-center items-center p-8 rounded-xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl relative overflow-hidden shadow-xl min-h-[400px]`}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="relative flex flex-col items-center justify-center w-full h-full"
                    >
                      <div className="relative w-64 h-64 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-white/5 shadow-[0_0_80px_rgba(20,184,166,0.15)] pointer-events-none" />
                        <div className="absolute inset-4 rounded-full border border-dashed border-white/10 opacity-40 animate-spin-slow" />
                        <div className="absolute inset-10 rounded-full border border-white/20 opacity-20 animate-spin-reverse" />

                        <div className={`absolute inset-[44px] bg-gradient-to-br from-white/15 to-transparent backdrop-blur-2xl rounded-full border ${colors.cardBorder} shadow-2xl flex items-center justify-center group overflow-hidden`}>
                          <div className="absolute w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent)]" />
                          <div className="w-[85%] h-[85%] border border-teal-400/20 rounded-full flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                              className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${activeShowcase.accent} p-[1.5px] shadow-lg shadow-black/40`}
                            >
                              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
                                <SelectedIcon className="w-6 h-6 text-teal-400" />
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 text-center select-none font-mono">
                        <div className="text-[9px] tracking-widest text-white/40 uppercase">
                          System Core Signature
                        </div>
                        <div className="text-xs font-semibold text-white mt-1.5 tracking-wider">
                          {activeShowcase.title.toUpperCase()} // ACTIVE
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </section>
        )}


        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent relative z-20" />

        {/* --- EXTRA: TIMELINE CHRONICLE (Visible to all) --- */}
        <section
          id="story"
          className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10"
        >
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-zinc-800 to-transparent pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
            <div className="max-w-xl mb-20 md:mb-28 select-none">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-5">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>Featured Chronicles</span>
              </div>
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                Chronicles of Velora
              </h2>
              <p className="font-sans text-sm md:text-base text-white/50 font-normal mt-4 leading-relaxed font-light">
                Step into premium serialized fiction. Explore top archives mapped dynamically to structural time vectors.
              </p>
            </div>

            <div className="relative pl-8 md:pl-16 border-l border-white/10 flex flex-col gap-16 md:gap-24">
              {stories.length > 0 ? (
                stories.slice(0, 4).map((story, index) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 50, scale: 0.97, filter: "blur(5px)" }}
                    whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 1.1, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16 group"
                  >
                    <motion.div
                      initial={{ scale: 0.85, borderColor: "rgba(255, 255, 255, 0.15)" }}
                      whileInView={{ scale: 1.25, borderColor: "rgba(20, 184, 166, 0.8)" }}
                      viewport={{ once: false, margin: "-160px" }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute -left-[37px] md:-left-[69px] top-1.5 w-4 h-4 rounded-full bg-black border-2 flex items-center justify-center z-10 transition-shadow duration-500 cursor-pointer"
                    >
                      <motion.span
                        initial={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                        whileInView={{ backgroundColor: "rgb(20, 184, 166)" }}
                        viewport={{ once: false, margin: "-160px" }}
                        className="w-1.5 h-1.5 rounded-full"
                      />
                    </motion.div>

                    <div className="lg:w-48 shrink-0 select-none">
                      <div className="font-mono text-xs font-bold text-teal-400 tracking-[0.25em] uppercase mb-1">
                        ARCHIVE // 0{index + 1}
                      </div>
                      <div className="font-mono text-[10px] text-white/40 tracking-wider uppercase">
                        {story.genre || "GENERAL FICTION"}
                      </div>
                    </div>

                    <div className={`flex-1 p-8 rounded-xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl hover:border-teal-400/30 transition-all duration-500 relative group shadow-lg flex flex-col md:flex-row gap-6`}>
                      <div className="absolute top-0 left-0 w-3 h-[1.5px] bg-white/30 group-hover:bg-teal-400 transition-colors duration-500" />
                      <div className="absolute top-0 left-0 w-[1.5px] h-3 bg-white/30 group-hover:bg-teal-400 transition-colors duration-500" />

                      {story.cover && (
                        <div className={`relative w-full md:w-32 aspect-[3/4] rounded-lg overflow-hidden shrink-0 border ${colors.cardBorder} bg-zinc-950`}>
                          <Image
                            src={story.cover}
                            alt={story.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                      )}

                      <div className="flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <h3 className="font-sans text-xl font-bold text-white tracking-tight mb-2 group-hover:text-teal-200 transition-colors leading-tight">
                            {story.title}
                          </h3>
                          <p className="font-sans text-xs text-white/50 mb-4 line-clamp-1 select-none">
                            Status: <span className="text-teal-400 font-mono">ONGOING</span>
                          </p>
                          <p className="font-sans text-sm text-white/70 leading-relaxed font-light mb-4 line-clamp-2">
                            {story.description ||
                              "Read chapters of this gripping adventure. Monetized chapter unlocks now available."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-auto">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/50 font-mono text-[9px] tracking-wider uppercase select-none">
                            <span className="h-1 w-1 rounded-full bg-teal-400" />
                            <span>Telemetry Locked</span>
                          </div>

                          <Link
                            href={`/read/${story.slug}`}
                            className={`inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-white border ${colors.cardBorder} px-5 py-2.5 rounded-full hover:bg-white hover:text-black transition-all`}
                          >
                            Uplink Reader <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-zinc-500 font-mono text-sm py-6">
                  No archives cataloged in registry.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent relative z-20" />

        {/* --- READER: COIN WALLET FORGE (Visible to Authenticated) --- */}
        {isAuthenticated && (
          <section id="coins" className="relative py-28 md:py-36 w-full bg-transparent z-10">
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <div className="relative p-8 md:p-16 rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 backdrop-blur-3xl overflow-hidden shadow-2xl">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-950/20 blur-[130px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-12">
                  {/* Header */}
                  <div className="flex flex-col items-center text-center select-none max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 text-teal-400 mb-6 font-mono">
                      <Zap className="fill-current w-4 h-4 animate-bounce" />
                      <span className="text-xs font-bold tracking-[0.3em] uppercase">
                        Quantum Wallet Forge
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-none text-white uppercase">
                      Power Your Reading Journey
                    </h2>
                    <p className="text-white/50 text-sm md:text-base leading-relaxed font-light">
                      Velora runs on a fully transparent creator economy. Purchase packages or activate subscription passes to unlock chapters permanently, supporting your writers directly.
                    </p>
                  </div>

                  {/* Two columns: Subscription Passes + Coin Packages */}
                  <div className="grid lg:grid-cols-2 gap-12 items-start mt-6">
                    {/* LEFT Column - Subscription Passes */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-teal-400 mb-2 flex items-center gap-2 font-mono select-none">
                        <Crown className="w-4 h-4 animate-pulse text-teal-400" />
                        Subscription Passes
                      </h3>
                      {subscriptionPackages.map((pack, idx) => (
                        <div
                          key={pack.id}
                          onClick={() => handleSubscriptionSelect(pack)}
                          className={`group flex justify-between items-center p-5 rounded-2xl bg-white/5 border ${colors.cardBorder} hover:bg-teal-500/10 hover:border-teal-500/50 transition-all duration-300 cursor-pointer`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-white/5 border ${colors.cardBorder} flex items-center justify-center group-hover:scale-105 transition-all duration-300`}>
                              <Crown className="text-teal-400 w-6 h-6 group-hover:animate-pulse" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-lg text-white">{pack.name}</p>
                                <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-teal-400 border border-teal-500/20">
                                  {pack.badge}
                                </span>
                              </div>
                              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest font-mono mt-1">
                                {pack.dailyCoins} coins/day · Total: {pack.totalCoins} coins
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="px-4 py-2 bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-black text-xs font-bold rounded-full transition-all duration-300 shadow-md">
                              ₹{pack.price}/{pack.period === "week" ? "wk" : pack.period === "month" ? "mo" : "yr"}
                            </span>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-mono">
                              ₹{pack.costPerCoin}/coin
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* RIGHT Column - Coin Transmissions */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-teal-400 mb-2 flex items-center gap-2 font-mono select-none">
                        <Coins className="w-4 h-4 animate-pulse text-teal-400" />
                        Coin Transmissions
                      </h3>
                      {coinPackages.length > 0 ? (
                        coinPackages.map((pack) => {
                          const campaignParts = (pack.campaign || "").split("|");
                          const manual = Number(campaignParts[1]) || 0;
                          const combined = Number(campaignParts[2]) || 0;
                          const scheduled = isCampaignLive ? (activeDiscountResult?.campaign?.percent ?? 0) : 0;
                          const totalDiscount = manual + combined + scheduled;
                          const basePrice = pack.price;
                          const discountedPrice = Math.max(0, Math.round(basePrice * (1 - totalDiscount / 100)));

                          return (
                            <div
                              key={pack.id}
                              onClick={() =>
                                checkoutPackageId ? undefined : handlePackageSelect(pack)
                              }
                              className={`group flex justify-between items-center p-5 rounded-2xl bg-white/5 border ${totalDiscount > 0
                                ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                                : `${colors.cardBorder} hover:bg-teal-500/10 hover:border-teal-500/50`
                                } transition-all duration-300 cursor-pointer ${checkoutPackageId === pack.id ? "opacity-55 cursor-wait" : ""
                                }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-white/5 border ${colors.cardBorder} flex items-center justify-center group-hover:scale-105 transition-all duration-300`}>
                                  <Coins className="text-teal-400 w-6 h-6 group-hover:animate-pulse" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-lg text-white">{pack.coins} Coins</p>
                                    <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-teal-400 border border-teal-500/20">
                                      {checkoutPackageId === pack.id ? "Opening..." : pack.badge || "TRANSMISSION"}
                                    </span>
                                    {totalDiscount > 0 && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-bold text-emerald-400 border border-emerald-500/30 animate-pulse font-mono">
                                        SAVE {totalDiscount}%
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest font-mono mt-1">
                                    {pack.bonus ? `+ ${pack.bonus} bonus coins` : "DIRECT COIN DISPATCH"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right font-mono">
                                <div className="flex items-center gap-2 justify-end">
                                  {totalDiscount > 0 && (
                                    <span className="text-xs text-white/40 line-through">₹{basePrice}</span>
                                  )}
                                  <span className="px-4 py-2 bg-gradient-to-r from-teal-400 to-indigo-500 text-black text-xs font-bold rounded-full transition-all shadow-md">
                                    ₹{discountedPrice}
                                  </span>
                                </div>
                                {totalDiscount > 0 && (
                                  <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                                    Save ₹{basePrice - discountedPrice}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-zinc-500 font-mono text-xs py-4">
                          No transmissions cataloged.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM Grid - Promotion Cards, active campaign, and Check-in Reward Box */}
                  <div className="mt-12 select-none">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-6 flex items-center gap-2 font-mono select-none">
                      <Sparkles className="text-teal-400 w-4 h-4 animate-pulse" />
                      Platform Offers & System Rewards
                    </h4>
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Card 1: Best Value Subscription */}
                      <div className={`relative overflow-hidden rounded-2xl border ${colors.cardBorder} bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-teal-500/30 hover:bg-white/[0.07] group`}>
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-105 transition-transform">
                            <Crown className="h-5 w-5" />
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400 font-mono">Best Value Pass</span>
                        </div>
                        <h4 className="mt-4 font-sans text-base font-bold text-white uppercase group-hover:text-teal-200 transition-colors">Yearly Pass</h4>
                        <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
                          Save 25% compared to weekly/monthly renewals. Credited daily with 15 coins for a full 365 days.
                        </p>
                      </div>

                      {/* Card 2: Best Value Coin Purchase */}
                      <div className={`relative overflow-hidden rounded-2xl border ${colors.cardBorder} bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-teal-500/30 hover:bg-white/[0.07] group`}>
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-teal-400 group-hover:scale-105 transition-transform">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400 font-mono">Best Value Purchase</span>
                        </div>
                        <h4 className="mt-4 font-sans text-base font-bold text-white uppercase group-hover:text-teal-200 transition-colors">VIP Pack (₹999)</h4>
                        <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
                          Get 1,400 coins instantly. Best price-per-coin conversion rate with zero wait time.
                        </p>
                      </div>

                      {/* Card 3: Neural Check-in (Reward Box) */}
                      <div className={`relative overflow-hidden rounded-2xl border ${colors.cardBorder} bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-teal-500/30 hover:bg-white/[0.07] group flex flex-col justify-between`}>
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                              <Zap className="h-5 w-5 animate-pulse" />
                            </div>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 font-mono">Neural check-in</span>
                          </div>
                          <h4 className="mt-4 font-sans text-base font-bold text-white uppercase group-hover:text-emerald-200 transition-colors">Reward Sync Box</h4>
                          <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
                            Synchronize your reader coordinates to claim 5 free loyalty coins once every 24 hours.
                          </p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleDailyCheckIn}
                            disabled={dailyRewardClaimed || dailyRewardClaiming}
                            className={`w-full py-2 rounded-full font-mono text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${dailyRewardClaimed
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                              : dailyRewardClaiming
                                ? "bg-white/10 text-white/50 border border-white/10 cursor-wait animate-pulse"
                                : "bg-white text-black hover:bg-emerald-500 hover:text-white"
                              }`}
                          >
                            {dailyRewardClaimed ? (
                              "✓ Synced & Claimed"
                            ) : dailyRewardClaiming ? (
                              "Syncing Coordinates..."
                            ) : (
                              "Synchronize & Claim"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Offer Campaign banner at bottom of grid */}
                    <div className={`mt-6 p-6 rounded-2xl border ${isCampaignLive ? "border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" : `border-white/10 bg-white/5`
                      } backdrop-blur relative overflow-hidden group`}>
                      {isCampaignLive && (
                        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg border ${isCampaignLive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse" : "bg-white/5 border-white/10 text-white/50"
                            }`}>
                            <Percent className="h-5 w-5" />
                          </div>
                          <div>
                            <span className={`text-[9px] uppercase tracking-wider font-mono font-bold ${isCampaignLive ? "text-emerald-400" : "text-white/40"
                              }`}>
                              {isCampaignLive ? "Active Surprise Discount" : "Promotional Campaigns"}
                            </span>
                            <h4 className="font-sans text-base font-bold text-white uppercase mt-0.5">
                              {isCampaignLive ? activeDiscountResult?.campaign?.title : "Weekend Flash Sales"}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto font-mono">
                          {isCampaignLive ? (
                            <>
                              <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 animate-pulse">
                                <Clock className="h-3 w-3 shrink-0" />
                                Active offer
                              </span>
                              <span className="px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-full shrink-0">
                                - {activeDiscountResult?.campaign?.percent}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white/5 text-white/40 border border-white/10 flex items-center gap-1.5 font-mono">
                              <Clock className="h-3 w-3 shrink-0" />
                              No active sales
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-white/50 leading-relaxed font-light pl-0.5">
                        {isCampaignLive
                          ? activeDiscountResult?.campaign?.description
                          : "No active discount campaigns scheduled currently. Turn on notifications to catch upcoming surprise sales!"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* --- ADMIN: ANTI-PIRACY PROTECTION LAYERS --- */}
        {isAdmin && (
          <section id="admin-protection" className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <div className="flex flex-col items-center text-center mb-16 md:mb-24 select-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/40 text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-5">
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>Security Infrastructure</span>
                </div>
                <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                  Content Protection Layers
                </h2>
                <p className="max-w-xl font-sans text-sm md:text-base text-zinc-400 font-normal mt-4 leading-relaxed font-light">
                  Review Velora's active piracy countermeasures, DOM observers, canvas overlays, and decryption nodes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {securityLayers.map((layer: any) => {
                  const cardRef = useRef<HTMLDivElement | null>(null);
                  const [rotate, setRotate] = useState({ x: 0, y: 0 });
                  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
                  const [isHovered, setIsHovered] = useState(false);
                  const LayerIcon = layer.icon;

                  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                    if (!cardRef.current) return;
                    const rect = cardRef.current.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    setRotate({ x: -y * 14, y: x * 14 });
                    setGlowPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  };

                  const handleMouseLeave = () => {
                    setIsHovered(false);
                    setRotate({ x: 0, y: 0 });
                  };

                  return (
                    <div
                      key={layer.label}
                      ref={cardRef}
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        transform: isHovered
                          ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(1.02)`
                          : "rotateX(0deg) rotateY(0deg) scale(1)",
                        transition: isHovered
                          ? "none"
                          : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                      className={`relative flex flex-col p-8 rounded-2xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-black/50 transition-all duration-300 min-h-[180px]`}
                    >
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 z-0"
                        style={{
                          background: `radial-gradient(circle 200px at ${glowPos.x}px ${glowPos.y}px, ${colors.glowColor}, transparent 80%)`
                        }}
                      />
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg border ${colors.cardBorder} bg-white/5`}>
                          <LayerIcon className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h4 className="font-sans text-base font-bold text-white tracking-tight">
                          {layer.label}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* --- ADMIN: DASHBOARD OVERVIEW --- */}
        {isAdmin && (
          <section className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              <div className="flex flex-col items-center text-center mb-16 md:mb-24 select-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/40 text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-5">
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                  <span>Author Workspaces</span>
                </div>
                <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
                  Studio Workbenches
                </h2>
                <p className="max-w-xl font-sans text-sm md:text-base text-zinc-400 font-normal mt-4 leading-relaxed font-light">
                  Admin console panel modules to govern user accounts, track ledger settlements, and publish novel drafts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {adminModules.map((item: any) => {
                  const ModuleIcon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex flex-col p-8 rounded-2xl border ${colors.cardBorder} ${colors.cardBg} backdrop-blur-xl relative overflow-hidden group shadow-lg hover:shadow-black/50 transition-all duration-300 min-h-[200px]`}
                    >
                      <ModuleIcon className="h-6 w-6 text-teal-400 mb-4 group-hover:scale-115 transition-transform duration-300" />
                      <h3 className="font-sans text-base font-bold text-white tracking-tight">
                        {item.label}
                      </h3>
                      <p className="font-sans text-xs text-white/50 leading-relaxed font-light mt-2.5">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center select-none">
                <Link
                  href="/admin"
                  className={`inline-flex items-center gap-2 border ${colors.cardBorder} bg-white/5 px-8 py-3.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase text-white hover:bg-white hover:text-black transition-all`}
                >
                  OPEN STUDIO BOARD <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent relative z-20" />



        {/* --- 6. NEURAL UPLINK & FEEDBACK --- */}
        <section id="cta" className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10 border-t border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(20,184,166,0.1)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-teal-900/5 blur-[120px] pointer-events-none animate-pulse-slow" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center mb-12 text-center select-none"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${colors.cardBorder} bg-white/5 text-zinc-400 font-mono text-[9px] tracking-[0.25em] uppercase mb-8`}
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Secure Neural Uplink Channel</span>
              </motion.div>

              <h2 className="font-sans text-[35px] sm:text-[45px] md:text-[55px] font-extralight tracking-[-0.04em] leading-[0.95] mb-6 uppercase text-white">
                Initialize the<br />
                <span className="font-medium italic tracking-[-0.02em] bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-400">
                  Convergence
                </span>
              </h2>

              <p className="max-w-xl font-sans text-sm md:text-base text-white/50 font-light leading-relaxed">
                Connect your coordinates to the Velora grid. Get notified of catalog updates, creator logs, and active economy discounts.
              </p>
            </motion.div>

            <div className={`grid grid-cols-1 ${isAuthenticated || !isAuthenticated ? "md:grid-cols-2" : ""} gap-8 items-stretch max-w-6xl mx-auto`}>
              {/* Left Column: Writer's Note Quote Box */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className={`p-8 rounded-xl border ${colors.cardBorder} bg-white/5 backdrop-blur-xl relative overflow-hidden shadow-xl flex flex-col justify-between ${
                  !isAuthenticated ? "max-w-md mx-auto w-full" : ""
                }`}
              >
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-950/20 blur-xl rounded-full pointer-events-none" />
                <div>
                  <div className="flex items-center gap-3 text-teal-400 mb-6 font-mono select-none">
                    <Quote className="w-4 h-4 text-teal-400" />
                    <span className="text-[10px] font-bold tracking-[0.25em] uppercase">
                      Transmission from the Creator
                    </span>
                  </div>
                  <p className="font-sans text-xs sm:text-sm text-white/80 leading-relaxed font-light whitespace-pre-line italic">
                    "{writerNote?.content || "Velora is designed for fiction that deserves a premium home: beautiful discovery, respectful monetization, and enough protection to make paid chapters viable at scale."}"
                  </p>
                </div>
                
                <div className="mt-8 pt-5 border-t border-white/5 flex flex-col gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400/60 font-mono select-none">
                    Digital Frequency Coordinates
                  </span>
                  <div className="flex gap-3.5 items-center">
                    {writerNote?.twitter && (
                      <a
                        href={writerNote.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                        title="Twitter / X"
                      >
                        <Twitter className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {writerNote?.instagram && (
                      <a
                        href={writerNote.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                        title="Instagram"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {writerNote?.facebook && (
                      <a
                        href={writerNote.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                        title="Facebook"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {writerNote?.youtube && (
                      <a
                        href={writerNote.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                        title="YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {writerNote?.linkedin && (
                      <a
                        href={writerNote.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!writerNote?.twitter && !writerNote?.instagram && !writerNote?.facebook && !writerNote?.youtube && !writerNote?.linkedin && (
                      <span className="text-[9px] text-zinc-500 font-mono uppercase">Offline Sync only // No Social coordinates</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Reader Feedback / Guest Auth Portal */}
              {isAuthenticated ? (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className={`p-8 rounded-xl border ${colors.cardBorder} bg-white/5 backdrop-blur-xl relative overflow-hidden shadow-xl flex flex-col justify-between`}
                >
                  <div>
                    <h4 className="font-sans text-lg font-bold text-white mb-2 uppercase">
                      Feedback Signal
                    </h4>
                    <p className="font-sans text-xs text-zinc-400 leading-relaxed mb-4 font-light">
                      Send suggestions, review notes, and performance reports directly to writers.
                    </p>

                    <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          placeholder="Your name..."
                          className={`flex-1 px-3 py-2.5 rounded-lg border ${colors.cardBorder} bg-white/5 text-white font-sans text-xs placeholder-white/30 focus:outline-none focus:border-teal-400/50 focus:shadow-[0_0_10px_rgba(20,184,166,0.08)] transition-all duration-300`}
                        />

                        {/* Interactive Star rating selector */}
                        <div className="flex items-center gap-1 border border-white/10 bg-white/5 rounded-lg px-2 text-zinc-400 select-none">
                          <span className="font-mono text-[9px] uppercase tracking-wider">Rating:</span>
                          <div className="flex gap-0.5 font-mono">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setFeedbackRating(star)}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 transition-colors duration-300 ${
                                    star <= feedbackRating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-zinc-600"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <textarea
                        required
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Your suggestions/review message..."
                        className={`w-full px-3 py-2.5 rounded-lg border ${colors.cardBorder} bg-white/5 text-white font-sans text-xs placeholder-white/30 focus:outline-none focus:border-teal-400/50 focus:shadow-[0_0_10px_rgba(20,184,166,0.08)] transition-all duration-300 h-20 resize-none`}
                      />

                      {feedbackError && (
                        <div className="font-mono text-[9px] text-red-400 uppercase tracking-wide">
                          Error: {feedbackError}
                        </div>
                      )}
                      {feedbackSuccess && (
                        <div className="font-mono text-[9px] text-emerald-400 uppercase tracking-wide">
                          {feedbackSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={feedbackSubmitting}
                        className="w-full py-3 bg-white text-black font-semibold rounded-full text-xs font-mono tracking-widest uppercase hover:bg-teal-500 hover:text-white transition-all duration-500 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-55"
                      >
                        {feedbackSubmitting ? "TRANSMITTING..." : "SEND SIGNAL"}
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                /* Guest auth uplink portal */
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className={`p-8 rounded-xl border ${colors.cardBorder} bg-white/5 backdrop-blur-xl relative overflow-hidden shadow-xl flex flex-col justify-between max-w-md mx-auto w-full`}
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-950/20 blur-xl rounded-full pointer-events-none" />
                  <div>
                    <h4 className="font-sans text-lg font-bold text-white mb-2 uppercase">
                      Neural Interface
                    </h4>
                    <p className="font-sans text-xs text-zinc-400 leading-relaxed mb-8 font-light">
                      Establish your coordinate credentials to connect to the converged library database and send feedback signals.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3.5">
                    <Link
                      href="/auth"
                      className="w-full py-3 bg-white text-black font-semibold rounded-full text-xs font-mono tracking-widest uppercase hover:bg-teal-500 hover:text-white transition-all duration-500 text-center shadow-lg"
                    >
                      Authenticate Access
                    </Link>
                    <Link
                      href="/auth?mode=register"
                      className="w-full py-3 border border-white/10 bg-white/5 text-white font-semibold rounded-full text-xs font-mono tracking-widest uppercase hover:bg-white hover:text-black transition-all duration-500 text-center"
                    >
                      Register Node
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        
        {/* --- FAQ SECTION (Visible to Authenticated) --- */}
        {isAuthenticated && faqs.length > 0 && (
          <section className="relative py-28 md:py-36 w-full bg-transparent overflow-hidden z-10">
            <div className="max-w-4xl mx-auto px-6 relative z-10">
              <div className="flex flex-col items-center text-center mb-16 md:mb-24 select-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/40 text-zinc-500 font-mono text-[9px] tracking-widest uppercase mb-5">
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  <span>Frequently Asked Questions</span>
                </div>
                <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase font-black">
                  Common Questions
                </h2>
              </div>

              <div className={`border ${colors.cardBorder} divide-y ${colors.cardBorder} overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl`}>
                {faqs.map((faq: any) => (
                  <details
                    key={faq.q}
                    className={`faq-item group cursor-pointer p-6 transition-colors hover:bg-white/5`}
                  >
                    <summary className="flex items-center justify-between gap-4 font-bold text-sm tracking-tight text-white focus:outline-none select-none">
                      {faq.q}
                      <ChevronRight className="h-4 w-4 shrink-0 text-teal-400 transition-transform duration-200 group-open:rotate-90" />
                    </summary>
                    <p className="mt-4 text-xs sm:text-sm leading-relaxed text-white/60 font-light pl-1">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
        {/* --- 7. MINIMAL FOOTER --- */}
        <footer
          id="footer"
          className="bg-[#030303] border-t border-white/10 py-16 md:py-24 relative overflow-hidden font-sans"
        >
          <div className="absolute top-0 right-1/3 w-[1px] h-36 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 border-b border-white/10 pb-16">
              <div className="lg:col-span-6 flex flex-col items-start gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-8 h-8 border border-white/40 flex items-center justify-center rotate-45">
                    <div className="w-2 h-2 bg-white"></div>
                  </div>
                  <span className="font-sans font-bold text-sm tracking-[0.3em] text-white uppercase">
                    Velora Fiction
                  </span>
                </div>
                <p className="max-w-md font-sans text-xs text-white/40 leading-relaxed font-light">
                  Velora structures the future of serialized reading. Combining gorgeous vector animations with secure, direct author support ecosystems.
                </p>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-5">
                  <h4 className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase font-bold">
                    Spatial Architecture
                  </h4>
                  <ul className="flex flex-col gap-3.5">
                    <li>
                      <a
                        href="#features"
                        className="font-sans text-xs text-white/60 hover:text-teal-400 transition-colors font-light"
                      >
                        Quantum Shaders
                      </a>
                    </li>
                    <li>
                      <a
                        href="#showcase"
                        className="font-sans text-xs text-white/60 hover:text-teal-400 transition-colors font-light"
                      >
                        Telemetry Modules
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-5">
                  <h4 className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase font-bold">
                    Legal Channels
                  </h4>
                  <ul className="flex flex-col gap-3.5 font-sans text-xs">
                    <li>
                      <Link
                        href="/privacy"
                        className="text-white/60 hover:text-teal-400 transition-colors font-light"
                      >
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/terms"
                        className="text-white/60 hover:text-teal-400 transition-colors font-light"
                      >
                        Terms of Service
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/refunds"
                        className="text-white/60 hover:text-teal-400 transition-colors font-light"
                      >
                        Refund Policy
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 select-none font-sans">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <span className="font-mono text-[9px] tracking-wider text-white/30 uppercase">
                  © {new Date().getFullYear()} VELORA // AETHERIS LABS. ALL RIGHTS RESERVED.
                </span>
                <span className="hidden sm:inline text-white/10">|</span>
                <span className="font-mono text-[9px] tracking-wider text-white/30 uppercase font-mono">
                  LICENSED UNDER VELORA CORE
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  {writerNote?.twitter && (
                    <a
                      href={writerNote.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                  >
                    <Github className="w-3.5 h-3.5" />
                  </a>
                </div>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-teal-400 hover:border-teal-400/40 flex items-center justify-center transition-all duration-300"
                >
                  <ArrowUp className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
