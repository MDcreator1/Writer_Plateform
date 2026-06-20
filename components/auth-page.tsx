"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Book,
  Coins,
  KeyRound,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Crown,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

const authFeatures = [
  {
    icon: KeyRound,
    label: "Easy Password Recovery",
    detail:
      "Forgot your password? Recover your account securely and regain access to your library in just a few steps.",
  },
  {
    icon: ShieldCheck,
    label: "Secure Account Access",
    detail:
      "Your reading history, purchases, and personal data are protected with secure authentication.",
  },
  {
    icon: BookOpen,
    label: "Continue Your Stories",
    detail:
      "Pick up exactly where you left off and keep track of your reading progress across all devices.",
  },
  {
    icon: Crown,
    label: "Unlock Premium Chapters",
    detail:
      "Access premium chapters and exclusive content using your coins and membership benefits.",
  },
  {
    icon: CreditCard,
    label: "Quick Checkout",
    detail:
      "Purchase coins, memberships, and premium content through a fast and seamless checkout experience.",
  },
  {
    icon: MessageCircle,
    label: "Connect With Writers",
    detail:
      "Follow your favorite writers, receive updates, and engage with the stories you love.",
  },
];

type VeloMascotProps = {
  activeField: "email" | "password" | "none";
  emailLength: number;

  isHoveringEmail: boolean;
  isHoveringPassword: boolean;

  isHoveringForgot: boolean;
  isHoveringOtp: boolean;

  isHoveringLogin: boolean;

  isSubmitting: boolean;
  loginSuccess: boolean;
  loginError: boolean;
};

function VeloMascot({ activeField, emailLength, isHoveringEmail, isHoveringPassword, isHoveringForgot, isHoveringOtp, isHoveringLogin, isSubmitting, loginSuccess, loginError }: VeloMascotProps) {
  // Eye horizontal tracking offset based on characters typed (capped between -8 and 8)
  const lookOffset = Math.min(8, Math.max(-8, -8 + emailLength * 0.7));

  // Determine eye state SVG
  const renderEyes = () => {
    if (activeField === "password") {
      // Closed/sleeping eyes (no peeking)
      return (
        <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none">
          {/* Left closed eye */}
          <path d="M 67 100 L 83 100" className="text-accent2" opacity="0.9" />
          {/* Right closed eye */}
          <path d="M 117 100 L 133 100" className="text-accent2" opacity="0.9" />
        </g>
      );
    }

    if (isHoveringLogin) {
      // Happy smiling arches
      return (
        <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none">
          {/* Left happy arch */}
          <path d="M 66 104 Q 75 92 84 104" className="text-accent2" />
          {/* Right happy arch */}
          <path d="M 116 104 Q 125 92 134 104" className="text-accent2" />
        </g>
      );
    }
    

    if (activeField === "email") {
      // Wide open eyes scanning towards the input (rightward shift)
      return (
        <g>
          {/* Left Eye Screen */}
          <circle cx="75" cy="100" r="14" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
          {/* Left Pupil following characters */}
          <motion.circle
            cx="75"
            cy="100"
            r="6"
            fill="var(--accent)"
            animate={{ x: lookOffset, y: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          />

          {/* Right Eye Screen */}
          <circle cx="125" cy="100" r="14" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
          {/* Right Pupil following characters */}
          <motion.circle
            cx="125"
            cy="100"
            r="6"
            fill="var(--accent)"
            animate={{ x: lookOffset, y: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          />
        </g>
      );
    }

    if (isSubmitting) {
      return (
        <g>
          <circle
            cx="75"
            cy="100"
            r="6"
            fill="var(--accent)"
          />
          <motion.circle
            cx="125"
            cy="100"
            r="6"
            fill="var(--accent)"
            animate={{
              x: [-5, 5, -5],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.6,
            }}
          />
        </g>
      );
    }


    if (loginSuccess) {
      return (
        <g
          stroke="var(--accent2)"
          strokeWidth="4"
          fill="none"
        >
          <path d="M66 102 Q75 92 84 102" />
          <path d="M116 102 Q125 92 134 102" />
        </g>
      );
    }


    if (loginError) {
      return (
        <g
          stroke="red"
          strokeWidth="4"
          fill="none"
        >
          <path d="M68 92 L82 108" />
          <path d="M82 92 L68 108" />

          <path d="M118 92 L132 108" />
          <path d="M132 92 L118 108" />
        </g>
      );
    }

    // Default Idle: Circular eyes with blinking animation
    return (
      <g>
        {/* Left Eye */}
        <circle cx="75" cy="100" r="13" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
        <motion.circle
          cx="75"
          cy="100"
          r="6"
          fill="var(--accent)"
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            repeatDelay: 2.8,
            ease: "easeInOut"
          }}
        />

        {/* Right Eye */}
        <circle cx="125" cy="100" r="13" fill="#080c14" stroke="var(--accent)" strokeWidth="1.5" />
        <motion.circle
          cx="125"
          cy="100"
          r="6"
          fill="var(--accent)"
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            repeatDelay: 3.1,
            ease: "easeInOut"
          }}
        />
      </g>
    );
  };

  // Wing animation poses
  const leftWingPose =
    isSubmitting
      ? {
        rotate: [-5, 10, -5],
      }
      : loginSuccess
        ? {
          rotate: [-25, 45, -25, 45, -25],
        }
        : activeField === "password"
          ? {
            rotate: 120,
            x: 20,
            y: -25,
          }
          : isHoveringLogin
            ? {
              rotate: [-15, 40, -15],
              y: [0, -4, 0],
            }
            : {
              rotate: [12, 16, 12],
            };

  const rightWingPose =
    isSubmitting
      ? {
        rotate: [5, -10, 5],
      }
      : loginSuccess
        ? {
          rotate: [25, -45, 25, -45, 25],
        }
        : activeField === "password"
          ? {
            rotate: -120,
            x: -20,
            y: -25,
          }
          : isHoveringLogin
            ? {
              rotate: [15, -40, 15],
              y: [0, -4, 0],
            }
            : {
              rotate: [-12, -16, -12],
            };

  // Head rotation and position offsets
  let headPose: {
    x?: number;
    y?: number | number[];
    rotateY?: number;
    rotateZ?: number | number[];
  } = {
    y: [0, -2, 0],
    rotateZ: [0, 1, -1, 0],
  };

  if (isSubmitting) {
    headPose = {
      rotateZ: [-3, 3, -3],
      y: [0, -2, 0],
    };
  }

  else if (loginSuccess) {
    headPose = {
      y: [0, -20, 0],
      rotateZ: [0, -12, 12, -12, 0],
    };
  }

  else if (loginError) {
    headPose = {
      rotateZ: [0, -10, 10, -10, 10, 0],
    };
  }

  else if (activeField === "email") {
    headPose = {
      rotateY: 18,
      x: 6,
      y: 2,
      rotateZ: 2,
    };
  }

  else if (isHoveringEmail) {
    headPose = {
      rotateY: 10,
      x: 3,
    };
  }

  else if (activeField === "password") {
    headPose = {
      rotateY: -45,
      x: -10,
      rotateZ: -4,
    };
  }

  else if (isHoveringPassword) {
    headPose = {
      rotateY: -12,
    };
  }

  else if (isHoveringForgot) {
    headPose = {
      rotateZ: -10,
      rotateY: 8,
    };
  }

  else if (isHoveringOtp) {
    headPose = {
      rotateZ: 10,
      rotateY: -8,
    };
  }

  else if (isHoveringLogin) {
    headPose = {
      y: [0, -12, 0],
      rotateZ: [0, -5, 5, -5, 0],
    };
  }

  return (
    <div className="relative mx-auto flex h-[400px] w-[400px] items-center justify-center">
      {/* Hover pad platform */}
      <motion.svg
        width="230"
        height="52"
        viewBox="0 0 130 26"
        className="absolute bottom-3 z-0 text-accent/20"
        animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <ellipse cx="65" cy="13" rx="50" ry="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="65" cy="13" rx="30" ry="5" fill="currentColor" opacity="0.25" />
      </motion.svg>

      {/* Mascot Body Wrapper */}
      <motion.div
        className="relative z-10 h-full w-full"
        animate={isHoveringLogin ? { y: [0, -8, 0] } : { y: [0, -5, 0] }}
        transition={
          isHoveringLogin
            ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
            : { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }
      >
        <svg width="350" height="350" viewBox="0 0 200 200" className="overflow-visible mx-auto">
          {/* Main Body */}
          <g id="body" className="text-ink">
            {/* Belly plate */}
            <rect x="72" y="115" width="56" height="48" rx="18" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="3" />
            {/* Glowing Core */}
            <motion.circle
              cx="100"
              cy="138"
              r="18"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
              animate={{
                scale: [1, 2.2],
                opacity: [0.8, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
              }}
            />

            <motion.circle
              cx="100"
              cy="138"
              r="9"
              fill={
                loginError
                  ? "#ef4444"
                  : isHoveringLogin
                    ? "var(--accent2)"
                    : "var(--accent)"
              }
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.95, 1.3, 0.95],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
              }}
            />
            {/* Feet */}
            <circle cx="84" cy="166" r="7" fill="var(--muted-soft)" stroke="var(--border)" strokeWidth="2" />
            <circle cx="116" cy="166" r="7" fill="var(--muted-soft)" stroke="var(--border)" strokeWidth="2" />
          </g>

          {/* Wings */}
          {/* Left Wing */}
          <motion.g
            id="left-wing"
            style={{ transformOrigin: "65px 125px" }}
            animate={leftWingPose}
            transition={
              isSubmitting || loginSuccess || isHoveringLogin
                ? { repeat: Infinity, duration: isHoveringLogin ? 0.4 : 0.6, ease: "easeInOut" }
                : { duration: 0.5, ease: "easeInOut" }
            }
          >
            <path
              d="M 65 125 C 40 120, 35 148, 60 152 Z"
              fill="var(--surface-soft)"
              stroke="var(--border)"
              strokeWidth="2"
            />
          </motion.g>

          {/* Right Wing */}
          <motion.g
            id="right-wing"
            style={{ transformOrigin: "135px 125px" }}
            animate={rightWingPose}
            transition={
              isSubmitting || loginSuccess || isHoveringLogin
                ? { repeat: Infinity, duration: isHoveringLogin ? 0.4 : 0.6, ease: "easeInOut" }
                : { duration: 0.5, ease: "easeInOut" }
            }
          >
            <path
              d="M 135 125 C 160 120, 165 148, 140 152 Z"
              fill="var(--surface-soft)"
              stroke="var(--border)"
              strokeWidth="2"
            />
          </motion.g>

          {/* Head (animated) */}
          <motion.g
            id="head"
            style={{ transformOrigin: "100px 100px" }}
            animate={headPose}
            transition={
              isSubmitting || loginSuccess || loginError || isHoveringLogin
                ? { repeat: Infinity, duration: isHoveringLogin ? 1.2 : loginError ? 0.5 : 0.8, ease: "easeInOut" }
                : { duration: 0.4, ease: "easeInOut" }
            }
          >
            {/* Ears */}
            <motion.polygon
              points="60,65 71,46 86,58"
              fill="var(--surface-soft)"
              stroke="var(--border)"
              strokeWidth="2"
              animate={activeField === "email" ? { rotate: [0, -10, 0] } : { rotate: 0 }}
              transition={activeField === "email" ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" } : { duration: 0.3 }}
            />
            <motion.polygon
              points="140,65 129,46 114,58"
              fill="var(--surface-soft)"
              stroke="var(--border)"
              strokeWidth="2"
              animate={activeField === "email" ? { rotate: [0, 10, 0] } : { rotate: 0 }}
              transition={activeField === "email" ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" } : { duration: 0.3 }}
            />

            {/* Main Head Circle-Rect */}
            <rect
              x="50"
              y="55"
              width="100"
              height="78"
              rx="28"
              fill="var(--surface-raised)"
              stroke="var(--border)"
              strokeWidth="3.5"
            />

            {/* Dark Screen Visor */}
            <rect
              x="58"
              y="68"
              width="84"
              height="52"
              rx="16"
              fill="#080c14"
              stroke={isHoveringLogin ? "var(--accent2)" : "var(--border)"}
              strokeWidth="1.5"
            />

            {/* Eyes Screen Output */}
            {renderEyes()}

            {/* Beak */}
            <polygon
              points="97,104 103,104 100,111"
              fill={isHoveringLogin ? "var(--accent2)" : "var(--accent)"}
            />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}

export function AuthPage() {
  const [activeField, setActiveField] = useState<"email" | "password" | "none">("none");
  const [emailLength, setEmailLength] = useState(0);
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [isHoveringEmail, setIsHoveringEmail] = useState(false);
  const [isHoveringPassword, setIsHoveringPassword] = useState(false);

  const isHoveringForgot = false;
  const isHoveringOtp = false;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState("");



  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") {
      setAuthMode("register");
    }
  }, []);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="auth-header flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="auth-back-to-marketplace inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <ThemeSwitcher compact />
        </div>

        <section className="auth-main-section mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          {/* Left Pane - Redesigned with Mascot Velo */}
          <div className="auth-info-pane relative flex justify-center overflow-hidden rounded-2xl">
            {/* Background elements */}
            <div className="absolute inset-0 -z-10 overflow-hidden flex justify-center">
              {/* Rotating Cyber Grid Ring */}
              <motion.div
                className="absolute left-1/2 top-1/2 h-[100%] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
              >
                <svg width="100%" height="100%" viewBox="0 0 400 400" className="text-accent2">
                  <circle cx="200" cy="200" r="195" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
                  <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8" />
                  <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                </svg>
              </motion.div>

              {/* Floating holographic particle orbs */}
              <motion.div
                className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-accent-soft/20 blur-3xl"
                animate={{ x: [-20, 20, -20], y: [-30, 20, -30] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -right-12 bottom-12 h-72 w-72 rounded-full bg-accent2-soft/15 blur-3xl"
                animate={{ x: [20, -20, 20], y: [30, -10, 30] }}
                transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
              />

              {/* Floating Book Icon */}
              <motion.div
                className="absolute left-10 top-24 text-accent/30"
                animate={{ y: [0, -15, 0], rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <Book className="h-7 w-7" />
              </motion.div>

              {/* Floating Coin Icon */}
              <motion.div
                className="absolute right-12 top-1/2 text-accent2/30"
                animate={{ y: [0, 15, 0], rotate: [0, -20, 20, 0] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
              >
                <Coins className="h-7 w-7" />
              </motion.div>

              {/* Floating Sparkle */}
              <motion.div
                className="absolute bottom-24 left-16 text-success/20"
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 0.9, 0.4] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
            </div>

            {/* Interactive Mascot Velo Owl */}
            <div className="flex justify-center">
              <VeloMascot
                activeField={activeField}
                emailLength={emailLength}
                isHoveringEmail={isHoveringEmail}
                isHoveringPassword={isHoveringPassword}
                isHoveringForgot={isHoveringForgot}
                isHoveringOtp={isHoveringOtp}
                isHoveringLogin={isHoveringLogin}
                isSubmitting={isSubmitting}
                loginSuccess={loginSuccess}
                loginError={loginError}
              />
            </div>
            {/* 
            <div className="mt-4">
              <p className="lm-eyebrow auth-info-eyebrow">Authentication</p>
              <h1 className="auth-info-title mt-3 font-display text-4xl font-semibold leading-tight text-ink">Secure account access for readers and admins</h1>
              <p className="auth-info-desc mt-4 text-base leading-relaxed text-soft-ink">
                The platform includes deployable route handlers and database tables for email auth, Google OAuth linking,
                password reset, OTP, email verification, device checks, and sessions.
              </p>
            </div>

            <div className="auth-security-posture-card lm-card mt-6 p-4">
              <div className="flex gap-3 items-start">
                <ShieldCheck className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                <div>
                  <h2 className="auth-card-heading font-semibold text-ink text-sm">Security posture</h2>
                  <p className="auth-card-text mt-1 text-xs leading-relaxed text-muted">
                    JWT cookies are HTTP-only, passwords are hashed, sessions have device metadata, and suspicious activity
                    can force OTP verification before chapter access.
                  </p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Right Pane - Form wired with handlers */}
          <form className="auth-login-form lm-card p-6 shadow-luxury flex flex-col justify-center">
            <h2 className="auth-form-heading font-display text-3xl font-semibold text-ink">
              {authMode === "login" ? "Login" : "Register"}
            </h2>
            <div className="auth-form-fields mt-6 grid gap-4">
              <label className="auth-form-label grid gap-2 text-sm font-semibold text-ink">
                Email
                <input
                  className="lm-input auth-input-email"
                  placeholder="user@example.com"
                  type="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailLength(e.target.value.length);
                  }}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField("none")}
                  onMouseEnter={() => setIsHoveringEmail(true)}
                  onMouseLeave={() => setIsHoveringEmail(false)}
                />
              </label>
              {authMode === "register" &&  <label className="auth-form-label grid gap-2 text-sm font-semibold text-ink">
                username
                <input
                  className="lm-input"
                  placeholder="name"
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setEmailLength(e.target.value.length);
                  }}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField("none")}
                  onMouseEnter={() => setIsHoveringEmail(true)}
                  onMouseLeave={() => setIsHoveringEmail(false)}
                />
              </label>}
              <label className="auth-form-label grid gap-2 text-sm font-semibold text-ink">
                Password
                <input
                  className="lm-input auth-input-password"
                  placeholder="Minimum 10 characters"
                  type="password"
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField("none")}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  onMouseEnter={() => setIsHoveringPassword(true)}
                  onMouseLeave={() => setIsHoveringPassword(false)}
                />
              </label>
              {authMode === "register" && <label className="auth-form-label grid gap-2 text-sm font-semibold text-ink">
                Confirm Password
                <input
                  className="lm-input auth-input-password"
                  placeholder="Minimum 10 characters"
                  type="password"
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField("none")}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                  }}
                  onMouseEnter={() => setIsHoveringPassword(true)}
                  onMouseLeave={() => setIsHoveringPassword(false)}
                />
              </label>}
              <button
                type="button"
                className="lm-btn-primary auth-submit-email-btn"
                onMouseEnter={() => setIsHoveringLogin(true)}
                onMouseLeave={() => setIsHoveringLogin(false)}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    setLoginSuccess(false);
                    setLoginError(false);
                    setAuthErrorMessage("");

                    if (authMode === "register" && password !== confirmPassword) throw new Error("Passwords do not match");
                    const apiPath =
                      authMode === "login"
                        ? "/api/auth/login"
                        : "/api/auth/signup";

                    const requestBody =
                      authMode === "login"
                        ? {
                          email,
                          password,
                        }
                        : {
                          email,
                          username,
                          password,
                        };

                    const response = await fetch(apiPath, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(requestBody),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data?.error?.message || data?.message || "Authentication failed");
                    }

                    setLoginSuccess(true);
                    window.location.href = "/";

                  } catch (error) {
                    setLoginError(true);
                    setAuthErrorMessage(error instanceof Error ? error.message : "Authentication failed");
                  } finally {
                    setIsSubmitting(false);
                  }}}
                disabled={isSubmitting}
              >
                {
                  isSubmitting
                    ? authMode === "login"
                      ? "Logging in..."
                      : "Registering..."
                    : authMode === "login"
                      ? "Login with Email"
                      : "Register with Email"
                }
              </button>
              {loginError && authErrorMessage ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger" role="alert">
                  {authErrorMessage}
                </p>
              ) : null}

              <button type="button" className="lm-btn-secondary auth-submit-google-btn" onMouseEnter={() => setIsHoveringLogin(true)} onMouseLeave={() => setIsHoveringLogin(false)}>
                Continue with Google
              </button>
              <div className="auth-form-helpers flex flex-wrap justify-between gap-3 text-sm text-muted">
                {authMode === "login" && (
                    <button
                      type="button"
                      className="auth-forgot-password-btn transition hover:text-accent"
                    >
                      Forgot password?
                    </button>
                )}
                {authMode === "register" && (
                    <p className="auth-register-note text-soft-ink">
                      <a href="#" className="transition hover:text-accent">Terms of Service</a> and <a href="#" className="transition hover:text-accent">Privacy Policy</a>
                    </p>
                  )}

                <button
                  type="button"
                  className="hover:text-accent"
                  onClick={() => {
                    const nextMode = authMode === "login" ? "register" : "login";
                    setAuthMode(nextMode);
                    setLoginSuccess(false);
                    setLoginError(false);
                    setAuthErrorMessage("");
                    window.history.replaceState(null, "", nextMode === "register" ? "/auth?mode=register" : "/auth");
                  }}
                >
                  {authMode === "login"
                    ? "Create Account"
                    : "Already have an account?"}
                </button>
                {/* <button type="button" className="auth-verify-otp-btn transition hover:text-accent" onMouseEnter={() => setIsHoveringOtp(true)} onMouseLeave={() => setIsHoveringOtp(false)}>
                  Verify OTP
                </button> */}
              </div>
            </div>
          </form>
        </section>

        {/* Bottom Feature Cards */}
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
