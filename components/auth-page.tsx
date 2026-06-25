"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Book,
  Coins,
  KeyRound,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Crown,
  CreditCard,
  MessageCircle,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCcw,
  Smartphone,
  User,
  Camera,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CustomSelect } from "@/components/custom-select";

// ─────────────────────────────────────────────────────────────
// Feature cards
// ─────────────────────────────────────────────────────────────
const authFeatures = [
  {
    icon: KeyRound,
    label: "Secure OTP Verification",
    detail: "Email OTP verification with SHA-256 hashing, 5-minute expiry, and resend cooldowns keeps your account safe.",
  },
  {
    icon: ShieldCheck,
    label: "Google OAuth Login",
    detail: "Sign in with your Google account securely — no password collection, full OAuth 2.0 flow.",
  },
  {
    icon: BookOpen,
    label: "Continue Your Stories",
    detail: "Pick up exactly where you left off. Reading progress synced across all devices.",
  },
  {
    icon: Crown,
    label: "Unlock Premium Chapters",
    detail: "Access premium chapters using your coins and membership benefits.",
  },
  {
    icon: CreditCard,
    label: "Quick Checkout",
    detail: "Purchase coins via Razorpay UPI, card, and netbanking for a seamless experience.",
  },
  {
    icon: MessageCircle,
    label: "Connect With Writers",
    detail: "Follow your favorite writers, receive updates, and engage with stories you love.",
  },
];

// ─────────────────────────────────────────────────────────────
// Mascot (Velo the Owl)
// ─────────────────────────────────────────────────────────────
type MascotMode =
  | "idle"
  | "email"
  | "password"
  | "otp"
  | "success"
  | "error"
  | "loading"
  | "celebrating"
  | "phone";

function VeloMascot({ mode, charCount }: { mode: MascotMode; charCount?: number }) {
  const lookOffset = Math.min(8, Math.max(-8, -8 + (charCount ?? 0) * 0.7));

  const renderEyes = () => {
    if (mode === "password") {
      return (
        <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M 67 100 L 83 100" className="text-accent2" opacity="0.9" />
          <path d="M 117 100 L 133 100" className="text-accent2" opacity="0.9" />
        </g>
      );
    }
    if (mode === "celebrating" || mode === "success") {
      return (
        <g stroke="var(--accent2)" strokeWidth="4" fill="none">
          <path d="M66 102 Q75 92 84 102" />
          <path d="M116 102 Q125 92 134 102" />
        </g>
      );
    }
    if (mode === "error") {
      return (
        <g stroke="red" strokeWidth="4" fill="none">
          <path d="M68 92 L82 108" /><path d="M82 92 L68 108" />
          <path d="M118 92 L132 108" /><path d="M132 92 L118 108" />
        </g>
      );
    }
    if (mode === "loading") {
      return (
        <g>
          <circle cx="75" cy="100" r="6" fill="var(--accent)" />
          <motion.circle cx="125" cy="100" r="6" fill="var(--accent)"
            animate={{ x: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          />
        </g>
      );
    }
    if (mode === "email" || mode === "otp" || mode === "phone") {
      return (
        <g>
          <circle cx="75" cy="100" r="14" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
          <motion.circle cx="75" cy="100" r="6" fill="var(--accent)"
            animate={{ x: lookOffset, y: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          />
          <circle cx="125" cy="100" r="14" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
          <motion.circle cx="125" cy="100" r="6" fill="var(--accent)"
            animate={{ x: lookOffset, y: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          />
        </g>
      );
    }
    return (
      <g>
        <circle cx="75" cy="100" r="13" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
        <motion.circle cx="75" cy="100" r="6" fill="var(--accent)"
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ repeat: Infinity, duration: 3.5, repeatDelay: 2.8, ease: "easeInOut" }}
        />
        <circle cx="125" cy="100" r="13" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
        <motion.circle cx="125" cy="100" r="6" fill="var(--accent)"
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ repeat: Infinity, duration: 3.5, repeatDelay: 3.1, ease: "easeInOut" }}
        />
      </g>
    );
  };

  const isContinuous = ["celebrating", "success", "error", "loading", "idle"].includes(mode);
  const wingPose =
    mode === "celebrating" || mode === "success" ? { rotate: [-25, 45, -25, 45, -25] }
    : mode === "password" ? { rotate: 120, x: 20, y: -25 }
    : mode === "loading" ? { rotate: [-5, 10, -5] }
    : { rotate: [12, 16, 12] };

  const headPose =
    mode === "celebrating" || mode === "success" ? { y: [0, -20, 0], rotateZ: [0, -12, 12, -12, 0] }
    : mode === "error" ? { rotateZ: [0, -10, 10, -10, 10, 0] }
    : mode === "email" || mode === "otp" ? { rotateY: 18, x: 6, y: 2, rotateZ: 2 }
    : mode === "password" ? { rotateY: -45, x: -10, rotateZ: -4 }
    : mode === "phone" ? { rotateY: 10, x: 4, rotateZ: 3 }
    : { y: [0, -2, 0], rotateZ: [0, 1, -1, 0] };

  return (
    <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center">
      <motion.svg width="180" height="40" viewBox="0 0 130 26"
        className="absolute bottom-3 z-0 text-accent/20"
        animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <ellipse cx="65" cy="13" rx="50" ry="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="65" cy="13" rx="30" ry="5" fill="currentColor" opacity="0.25" />
      </motion.svg>

      <motion.div className="relative z-10 h-full w-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <svg width="270" height="270" viewBox="0 0 200 200" className="overflow-visible mx-auto">
          <g className="text-ink">
            <rect x="72" y="115" width="56" height="48" rx="18" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="3" />
            <motion.circle cx="100" cy="138" r="18" fill="none" stroke="var(--accent)" strokeWidth="1"
              animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.circle cx="100" cy="138" r="9"
              fill={mode === "error" ? "#ef4444" : mode === "celebrating" ? "var(--accent2)" : "var(--accent)"}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.3, 0.95] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <circle cx="84" cy="166" r="7" fill="var(--muted-soft)" stroke="var(--border)" strokeWidth="2" />
            <circle cx="116" cy="166" r="7" fill="var(--muted-soft)" stroke="var(--border)" strokeWidth="2" />
          </g>

          <motion.g style={{ transformOrigin: "65px 125px" }} animate={wingPose}
            transition={isContinuous ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" } : { duration: 0.5 }}
          >
            <path d="M 65 125 C 40 120, 35 148, 60 152 Z" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
          </motion.g>
          <motion.g style={{ transformOrigin: "135px 125px" }}
            animate={mode === "celebrating" || mode === "success" ? { rotate: [25, -45, 25, -45, 25] }
              : mode === "password" ? { rotate: -120, x: -20, y: -25 }
              : mode === "loading" ? { rotate: [5, -10, 5] }
              : { rotate: [-12, -16, -12] }}
            transition={isContinuous ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" } : { duration: 0.5 }}
          >
            <path d="M 135 125 C 160 120, 165 148, 140 152 Z" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
          </motion.g>

          <motion.g style={{ transformOrigin: "100px 100px" }} animate={headPose}
            transition={isContinuous ? { repeat: Infinity, duration: mode === "error" ? 0.5 : 0.8, ease: "easeInOut" } : { duration: 0.4 }}
          >
            <motion.polygon points="60,65 71,46 86,58" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
            <motion.polygon points="140,65 129,46 114,58" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="2" />
            <rect x="50" y="55" width="100" height="78" rx="28" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="3.5" />
            <rect x="58" y="68" width="84" height="52" rx="16" fill="#080c14" stroke="var(--border)" strokeWidth="1.5" />
            {renderEyes()}
            <polygon points="97,104 103,104 100,111" fill="var(--accent)" />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "Verify" },
  { id: 3, label: "Profile" },
  { id: 4, label: "Avatar" },
  { id: 5, label: "Mobile" },
  { id: 6, label: "Done" },
];

function StepIndicator({ current, loginMode }: { current: number; loginMode: boolean }) {
  if (loginMode) {
    // Only show 2 steps for login
    const loginSteps = [{ id: 1, label: "Email" }, { id: 2, label: "Login" }];
    return (
      <div className="flex items-center gap-1 w-full justify-center mb-6">
        {loginSteps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
              current === step.id ? "bg-accent text-on-accent shadow-glow scale-110"
              : current > step.id ? "bg-accent/30 text-accent"
              : "bg-surface border border-border text-muted"
            }`}>
              {current > step.id ? <CheckCircle2 className="h-4 w-4" /> : step.id}
            </div>
            {idx < loginSteps.length - 1 && (
              <div className={`h-0.5 w-10 transition-all duration-500 ${current > step.id ? "bg-accent/50" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 w-full justify-center mb-6">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
            current === step.id ? "bg-accent text-on-accent shadow-glow scale-110"
            : current > step.id ? "bg-accent/30 text-accent"
            : "bg-surface border border-border text-muted"
          }`}>
            {current > step.id ? <CheckCircle2 className="h-4 w-4" /> : step.id}
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`h-0.5 w-6 sm:w-10 transition-all duration-500 ${current > step.id ? "bg-accent/50" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main AuthPage export
// ─────────────────────────────────────────────────────────────
export function AuthPage({ defaultStep = 1 }: { defaultStep?: number }) {
  const [step, setStep] = useState(defaultStep);
  const [mascotMode, setMascotMode] = useState<MascotMode>("idle");
  const [charCount, setCharCount] = useState(0);
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Step 1 – Email / Login Options
  const [email, setEmail] = useState("");
  const [, setVerifyMethod] = useState<"otp" | "google" | null>(null);
  const [loginType, setLoginType] = useState<"otp" | "password">("otp");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Step 2 – OTP
  const [otp, setOtp] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3 – Profile
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 4 – Avatar
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLetter, setAvatarLetter] = useState("");

  // Step 5 – Mobile
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  // Shared
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const urlError = searchParams.get("error");
  const sessionStep = searchParams.get("step");

  // URL param handling
  useEffect(() => {
    if (mode === "login") {
      setIsLoginMode(true);
    } else {
      setIsLoginMode(false);
    }

    if (urlError) {
      const msgs: Record<string, string> = {
        csrf_error: "सुरक्षा जांच विफल। कृपया पुनः प्रयास करें।",
        token_error: "Google लॉगिन में समस्या आई।",
        profile_error: "Google प्रोफ़ाइल लोड नहीं हो सकी।",
        server_error: "सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।",
      };
      setError(msgs[urlError] ?? "कोई त्रुटि हुई।");
      setMascotMode("error");
    }

    if (sessionStep) {
      const parsed = parseInt(sessionStep, 10);
      if (parsed >= 3 && parsed <= 5) setStep(parsed);
    }
  }, [searchParams, mode, urlError, sessionStep]);

  // OTP cooldown
  useEffect(() => {
    if (otpCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [otpCooldown]);

  // Avatar letter from username
  useEffect(() => {
    if (username.trim()) setAvatarLetter(username.trim()[0].toUpperCase());
  }, [username]);

  // Auto-redirect on step 6
  useEffect(() => {
    if (step === 6) {
      const t = setTimeout(() => { window.location.href = "/"; }, 2800);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ───── Handlers ─────

  async function handleSendOtp() {
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("कृपया एक मान्य ईमेल दर्ज करें।");
      setMascotMode("error");
      return;
    }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: isLoginMode ? "LOGIN" : "REGISTRATION" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "OTP भेजने में त्रुटि।");
      setOtpCooldown(60);
      setStep(2);
      setVerifyMethod("otp");
      setMascotMode("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP भेजने में त्रुटि।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    if (otp.length !== 6) { setError("कृपया 6-अंकीय OTP दर्ज करें।"); setMascotMode("error"); return; }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, type: isLoginMode ? "LOGIN" : "REGISTRATION" }),
      });
      const data = await res.json();
      if (!data.ok) {
        // If login mode and user not found, suggest registration
        if (isLoginMode && (data.code === "USER_NOT_FOUND" || res.status === 404)) {
          setError("यह ईमेल पंजीकृत नहीं है। कृपया पहले Register करें।");
          setMascotMode("error");
          return;
        }
        throw new Error(data.error?.message ?? "OTP गलत है।");
      }
      const nextStep = data.nextStep ?? 3;
      setMascotMode("celebrating");
      if (isLoginMode) {
        // Login mode: always redirect home after verify
        setTimeout(() => { window.location.href = "/"; }, 1200);
        return;
      }
      setStep(nextStep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP सत्यापन त्रुटि।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin() {
    setError("");
    if (!email || !email.includes("@")) {
      setError("कृपया एक मान्य ईमेल दर्ज करें।");
      setMascotMode("error");
      return;
    }
    if (!loginPassword) {
      setError("कृपया अपना पासवर्ड दर्ज करें।");
      setMascotMode("error");
      return;
    }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.code === "USER_NOT_FOUND" || res.status === 404) {
          setError("यह ईमेल पंजीकृत नहीं है। कृपया पहले Register करें।");
        } else if (data.code === "PASSWORD_INCORRECT") {
          setError("गलत पासवर्ड। क्या आप OTP से लॉगिन करना चाहते हैं?");
        } else {
          setError(data.error?.message ?? "लॉगिन करने में त्रुटि।");
        }
        setMascotMode("error");
        return;
      }
      
      setMascotMode("celebrating");
      // Redirect home after successful password login
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "लॉगिन करने में त्रुटि।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteProfile() {
    setError("");
    if (!username || username.length < 3) { setError("यूज़रनेम कम से कम 3 अक्षर का होना चाहिए।"); setMascotMode("error"); return; }
    if (!age || Number(age) < 5 || Number(age) > 120) { setError("कृपया एक मान्य आयु दर्ज करें (5–120)।"); setMascotMode("error"); return; }
    if (!gender) { setError("कृपया अपना लिंग चुनें।"); setMascotMode("error"); return; }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, age: Number(age), gender, password: profilePassword || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "प्रोफ़ाइल अपडेट विफल।");
      setStep(4);
      setMascotMode("celebrating");
    } catch (e) {
      setError(e instanceof Error ? e.message : "प्रोफ़ाइल अपडेट विफल।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneOtp() {
    setError("");
    if (!phone || phone.trim().length < 10) { setError("कृपया एक मान्य मोबाइल नंबर दर्ज करें।"); setMascotMode("error"); return; }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/mobile/verify-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "OTP भेजने में त्रुटि।");
      setPhoneOtpSent(true);
      setOtpCooldown(60);
      setMascotMode("phone");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP भेजने में त्रुटि।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    setError("");
    if (phoneOtp.length !== 6) { setError("6-अंकीय OTP दर्ज करें।"); setMascotMode("error"); return; }
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/mobile/verify-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone, code: phoneOtp }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "OTP गलत है।");
      setStep(6);
      setMascotMode("celebrating");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP सत्यापन विफल।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipMobile() {
    setLoading(true);
    setMascotMode("loading");
    try {
      const res = await fetch("/api/auth/mobile/verify-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? "त्रुटि।");
      setStep(6);
      setMascotMode("celebrating");
    } catch (e) {
      setError(e instanceof Error ? e.message : "त्रुटि।");
      setMascotMode("error");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step content renderers
  // ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── Step 1: Email ──
      case 1:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {isLoginMode ? "Welcome Back" : "Welcome to Velora"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isLoginMode
                  ? (loginType === "otp" ? "अपना ईमेल दर्ज करें — OTP से लॉगिन करें।" : "अपना ईमेल और पासवर्ड दर्ज करें।")
                  : "अपना ईमेल दर्ज करें और आगे बढ़ें।"}
              </p>
            </div>

            {isLoginMode && (
              <div className="flex rounded-lg bg-surface p-1 border border-border">
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                    loginType === "otp"
                      ? "bg-accent text-on-accent shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  onClick={() => { setLoginType("otp"); setError(""); }}
                >
                  OTP लॉगिन
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                    loginType === "password"
                      ? "bg-accent text-on-accent shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  onClick={() => { setLoginType("password"); setError(""); }}
                >
                  पासवर्ड लॉगिन
                </button>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Email Address
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  className="lm-input pl-9"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setCharCount(e.target.value.length); setMascotMode(loginType === "password" ? "password" : "email"); setError(""); }}
                  onFocus={() => setMascotMode(loginType === "password" ? "password" : "email")}
                  onBlur={() => setMascotMode("idle")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isLoginMode && loginType === "password") {
                        handlePasswordLogin();
                      } else {
                        handleSendOtp();
                      }
                    }
                  }}
                />
              </div>
            </label>

            {isLoginMode && loginType === "password" && (
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Password
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    className="lm-input pl-9 pr-10"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="अपना पासवर्ड दर्ज करें"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setError(""); }}
                    onFocus={() => setMascotMode("password")}
                    onBlur={() => setMascotMode("idle")}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePasswordLogin(); }}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    onClick={() => setShowLoginPassword((v) => !v)}>
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}

            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

            {isLoginMode && loginType === "password" ? (
              <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
                onClick={handlePasswordLogin} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                पासवर्ड से Login करें
              </button>
            ) : (
              <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
                onClick={handleSendOtp} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isLoginMode ? "OTP से Login करें" : "Email OTP से जारी रखें"}
              </button>
            )}

            <div className="relative flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">या</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button type="button" className="lm-btn-secondary flex items-center justify-center gap-2"
              onClick={() => { setMascotMode("loading"); window.location.href = "/api/auth/google/redirect"; }}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google से जारी रखें
            </button>

            <p className="text-center text-xs text-muted">
              {isLoginMode
                ? <><span>नया खाता बनाएं? </span><Link href="/auth" className="text-accent hover:underline">Register करें</Link></>
                : <><span>पहले से खाता है? </span><Link href="/auth?mode=login" className="text-accent hover:underline">Login करें</Link></>
              }
            </p>
          </div>
        );

      // ── Step 2: OTP Verification ──
      case 2:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">OTP सत्यापन</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-semibold text-accent">{email}</span> पर 6-अंकीय OTP भेजा गया है।
              </p>
            </div>

            {/* Dev-mode notice: shown when SMTP is not configured */}
            {process.env.NODE_ENV !== "production" && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-400">
                <p className="font-bold">🛠️ Dev Mode — SMTP कॉन्फ़िगर नहीं है</p>
                <p className="mt-1 text-amber-300/80">OTP ईमेल के बजाय <strong>server terminal</strong> में print हो रहा है। Terminal खोलें और <code className="rounded bg-amber-900/30 px-1">[OTP DEV FALLBACK]</code> देखें।</p>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-ink">
              OTP Code
              <input
                className="lm-input text-center tracking-[0.4em] text-xl font-bold"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setOtp(v); setCharCount(v.length); setMascotMode("otp"); setError(""); }}
                onFocus={() => setMascotMode("otp")}
                onBlur={() => setMascotMode("idle")}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
              />
            </label>

            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

            <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
              onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              OTP सत्यापित करें
            </button>

            <button type="button"
              className="flex items-center justify-center gap-2 text-sm text-muted hover:text-accent transition disabled:opacity-40"
              onClick={handleSendOtp} disabled={otpCooldown > 0 || loading}>
              <RefreshCcw className="h-3.5 w-3.5" />
              {otpCooldown > 0 ? `पुनः भेजें (${otpCooldown}s)` : "OTP पुनः भेजें"}
            </button>

            <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); setMascotMode("idle"); }}
              className="flex items-center gap-1 text-xs text-muted hover:text-accent transition">
              <ArrowLeft className="h-3 w-3" /> ईमेल बदलें
            </button>
          </div>
        );

      // ── Step 3: Complete Profile ──
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">प्रोफ़ाइल बनाएं</h2>
              <p className="mt-1 text-sm text-muted">अपना यूज़रनेम और बुनियादी जानकारी भरें।</p>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Username *
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input className="lm-input pl-9" type="text" placeholder="your_username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/\s/g, "_")); setError(""); }}
                  onFocus={() => setMascotMode("email")}
                  onBlur={() => setMascotMode("idle")}
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Age *
                <input className="lm-input" type="number" min="5" max="120" placeholder="18"
                  value={age} onChange={(e) => { setAge(e.target.value); setError(""); }}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Gender *
                <CustomSelect
                  value={gender}
                  onChange={(val) => { setGender(val); setError(""); }}
                  options={[
                    { value: "", label: "चुनें" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "non-binary", label: "Non-Binary" },
                    { value: "prefer-not", label: "Prefer Not to Say" }
                  ]}
                  placeholder="चुनें"
                  size="md"
                  triggerClassName="bg-surface border-border hover:border-accent w-full"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Password (Optional)
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input className="lm-input pl-9 pr-10" type={showPassword ? "text" : "password"}
                  placeholder="Min 10 characters (optional)"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  onFocus={() => setMascotMode("password")}
                  onBlur={() => setMascotMode("idle")}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted">पासवर्ड सेट करने से आप ईमेल+पासवर्ड से भी लॉगिन कर सकेंगे।</p>
            </label>

            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

            <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
              onClick={handleCompleteProfile} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              जारी रखें
            </button>
          </div>
        );

      // ── Step 4: Avatar ──
      case 4:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">प्रोफ़ाइल तस्वीर</h2>
              <p className="mt-1 text-sm text-muted">अपनी तस्वीर URL दर्ज करें या डिफ़ॉल्ट अवतार से आगे बढ़ें।</p>
            </div>

            <div className="flex justify-center">
              <div className="relative h-24 w-24">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="rounded-full object-cover border-2 border-accent" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-accent via-accent2 to-accent3 flex items-center justify-center text-4xl font-bold text-on-accent border-2 border-accent shadow-glow">
                    {avatarLetter || "?"}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-surface border border-border flex items-center justify-center">
                  <Camera className="h-3.5 w-3.5 text-muted" />
                </div>
              </div>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Image URL (Optional)
              <input className="lm-input" type="url" placeholder="https://example.com/photo.jpg"
                value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </label>

            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

            <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
              onClick={() => { setStep(5); setMascotMode("phone"); }}>
              <ArrowRight className="h-4 w-4" />
              {avatarUrl ? "तस्वीर सहेजें और जारी रखें" : "डिफ़ॉल्ट अवतार से जारी रखें"}
            </button>
          </div>
        );

      // ── Step 5: Mobile ──
      case 5:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">मोबाइल सत्यापन</h2>
              <p className="mt-1 text-sm text-muted">Coins खरीदने के लिए मोबाइल सत्यापन आवश्यक है।</p>
            </div>

            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-400">
              ⚠️ बिना मोबाइल सत्यापन के आप coins नहीं खरीद सकते। आप इसे बाद में भी कर सकते हैं।
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Mobile Number
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input className="lm-input pl-9" type="tel" placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(""); }}
                  onFocus={() => setMascotMode("phone")}
                  onBlur={() => setMascotMode("idle")}
                />
              </div>
            </label>

            {!phoneOtpSent ? (
              <button type="button" className="lm-btn-secondary flex items-center justify-center gap-2"
                onClick={handleSendPhoneOtp} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                OTP भेजें
              </button>
            ) : (
              <>
                <label className="grid gap-1.5 text-sm font-semibold text-ink">
                  OTP Code
                  <input className="lm-input text-center tracking-[0.4em] text-xl font-bold"
                    type="text" inputMode="numeric" maxLength={6} placeholder="••••••"
                    value={phoneOtp}
                    onChange={(e) => { setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  />
                </label>
                <button type="button" className="lm-btn-accent2 flex items-center justify-center gap-2"
                  onClick={handleVerifyPhoneOtp} disabled={loading || phoneOtp.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  सत्यापित करें
                </button>
                <button type="button"
                  className="flex items-center justify-center gap-1 text-xs text-muted hover:text-accent disabled:opacity-40"
                  onClick={handleSendPhoneOtp} disabled={otpCooldown > 0 || loading}>
                  <RefreshCcw className="h-3 w-3" />
                  {otpCooldown > 0 ? `पुनः भेजें (${otpCooldown}s)` : "OTP पुनः भेजें"}
                </button>
              </>
            )}

            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

            <button type="button" className="text-sm text-muted hover:text-accent transition"
              onClick={handleSkipMobile} disabled={loading}>
              अभी छोड़ें → बाद में करूंगा/करूंगी
            </button>
          </div>
        );

      // ── Step 6: Success ──
      case 6:
        return (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-accent via-accent2 to-accent3 flex items-center justify-center shadow-glow">
                <CheckCircle2 className="h-12 w-12 text-on-accent" />
              </div>
              {[...Array(8)].map((_, i) => (
                <motion.div key={i}
                  className="absolute h-2 w-2 rounded-full bg-accent"
                  style={{ top: "50%", left: "50%", originX: "0px", originY: "0px" }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 8) * 60,
                    y: Math.sin((i * Math.PI * 2) / 8) * 60,
                    opacity: 0, scale: 0,
                  }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: "easeOut" }}
                />
              ))}
            </motion.div>

            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">🎉 स्वागत है!</h2>
              <p className="mt-2 text-muted">आपका खाता सफलतापूर्वक बन गया। Velora Fiction में आपका स्वागत है!</p>
              <p className="mt-1 text-sm text-muted">कुछ ही क्षणों में होम पेज पर भेजा जा रहा है...</p>
            </div>

            <Link href="/" className="lm-btn-accent2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              अभी Explore करें
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="auth-header flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <ThemeSwitcher compact />
        </div>

        {/* Main grid */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          {/* Left: Mascot */}
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl min-h-[350px]">
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <motion.div className="absolute left-1/2 top-1/2 h-[100%] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 45, ease: "linear" }}>
                <svg width="100%" height="100%" viewBox="0 0 400 400" className="text-accent2">
                  <circle cx="200" cy="200" r="195" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
                  <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8" />
                  <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </motion.div>
              <motion.div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-accent-soft/20 blur-3xl"
                animate={{ x: [-20, 20, -20], y: [-30, 20, -30] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} />
              <motion.div className="absolute -right-12 bottom-12 h-72 w-72 rounded-full bg-accent2-soft/15 blur-3xl"
                animate={{ x: [20, -20, 20], y: [30, -10, 30] }}
                transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }} />
              <motion.div className="absolute left-10 top-24 text-accent/30"
                animate={{ y: [0, -15, 0], rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}>
                <Book className="h-7 w-7" />
              </motion.div>
              <motion.div className="absolute right-12 top-1/2 text-accent2/30"
                animate={{ y: [0, 15, 0], rotate: [0, -20, 20, 0] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}>
                <Coins className="h-7 w-7" />
              </motion.div>
              <motion.div className="absolute bottom-24 left-16 text-success/20"
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 0.9, 0.4] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}>
                <Sparkles className="h-6 w-6" />
              </motion.div>
            </div>
            <VeloMascot mode={mascotMode} charCount={charCount} />
            <motion.p key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">
              {isLoginMode
                ? ["", "Email दर्ज करें", "OTP सत्यापित करें"][step] ?? ""
                : ["", "Email दर्ज करें", "OTP सत्यापित करें", "प्रोफ़ाइल", "तस्वीर", "मोबाइल", "पूरा हो गया!"][step] ?? ""}
            </motion.p>
          </div>

          {/* Right: Form */}
          <div className="lm-card p-6 shadow-soft flex flex-col">
            <StepIndicator current={step} loginMode={isLoginMode} />
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Feature cards */}
        <section className="auth-features-section mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {authFeatures.map((feature) => (
            <div key={feature.label} className="auth-feature-card lm-card p-5 transition hover:shadow-soft">
              <feature.icon className="h-6 w-6 text-accent" />
              <h3 className="auth-feature-title mt-4 font-semibold text-ink">{feature.label}</h3>
              <p className="auth-feature-desc mt-2 text-sm leading-6 text-muted">{feature.detail}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
