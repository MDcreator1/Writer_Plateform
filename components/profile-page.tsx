"use client";

import { useState, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Phone,
  User,
  Camera,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  X,
  Save,
  Sparkles,
  Send,
  KeyRound
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useToast } from "@/components/toast-context";

type ProfileUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  displayName: string | null;
  age: number | null;
  gender: string | null;
  profileImage: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type ProfilePageProps = {
  initialUser: ProfileUser;
};

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } }
};

const backdropStyle: CSSProperties = {
  backgroundImage: "radial-gradient(circle at 18% 8%, var(--accent-soft), transparent 34%), radial-gradient(circle at 88% 12%, var(--accent-light), transparent 32%), linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, var(--accent-soft)) 0%, var(--paper) 52%, color-mix(in srgb, var(--paper) 94%, var(--muted-soft)) 100%)"
};

function initials(value: string) {
  return value
    .split(/[\s_@.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function ProfilePage({ initialUser }: ProfilePageProps) {
  const { showToast } = useToast();
  const [user, setUser] = useState<ProfileUser>(initialUser);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    displayName: user.displayName || "",
    username: user.username || "",
    age: user.age ?? "",
    gender: user.gender || "",
    profileImage: user.profileImage || ""
  });

  // OTP modal state
  const [otpModal, setOtpModal] = useState<{
    open: boolean;
    field: "email" | "phone";
    value: string;
    step: "input" | "code";
    code: string;
    sending: boolean;
    verifying: boolean;
  }>({
    open: false,
    field: "email",
    value: "",
    step: "input",
    code: "",
    sending: false,
    verifying: false
  });

  const handleFormChange = useCallback((key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          username: form.username || undefined,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          profileImage: form.profileImage || null
        })
      });
      const data = await res.json();
      if (data.ok) {
        setUser((prev) => ({
          ...prev,
          displayName: data.user.displayName,
          username: data.user.username,
          age: data.user.age,
          gender: data.user.gender,
          profileImage: data.user.profileImage
        }));
        showToast("प्रोफाइल सफलतापूर्वक अपडेट हो गई।", "success");
      } else {
        showToast(data.error?.message || "अपडेट विफल रहा।", "error");
      }
    } catch {
      showToast("सर्वर से कनेक्ट करने में त्रुटि हुई।", "error");
    } finally {
      setSaving(false);
    }
  };

  const openOtpModal = (field: "email" | "phone") => {
    setOtpModal({
      open: true,
      field,
      value: field === "email" ? user.email : (user.phone || ""),
      step: "input",
      code: "",
      sending: false,
      verifying: false
    });
  };

  const sendOtp = async () => {
    if (!otpModal.value) return;
    setOtpModal((prev) => ({ ...prev, sending: true }));
    try {
      const res = await fetch("/api/profile/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: otpModal.field, value: otpModal.value })
      });
      const data = await res.json();
      if (data.ok) {
        setOtpModal((prev) => ({ ...prev, step: "code" }));
        showToast("OTP सफलतापूर्वक भेजा गया।", "success");
      } else {
        showToast(data.error?.message || "OTP भेजने में त्रुटि।", "error");
      }
    } catch {
      showToast("सर्वर से कनेक्ट करने में त्रुटि हुई।", "error");
    } finally {
      setOtpModal((prev) => ({ ...prev, sending: false }));
    }
  };

  const verifyOtp = async () => {
    if (!otpModal.code || otpModal.code.length !== 6) {
      showToast("कृपया 6-अंकीय OTP दर्ज करें।", "warning");
      return;
    }
    setOtpModal((prev) => ({ ...prev, verifying: true }));
    try {
      const res = await fetch("/api/profile/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: otpModal.field, value: otpModal.value, code: otpModal.code })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, "success");
        setOtpModal((prev) => ({ ...prev, open: false }));
        // Refresh user data
        const profileRes = await fetch("/api/profile");
        const profileData = await profileRes.json();
        if (profileData.ok) {
          setUser(profileData.user);
          setForm((prev) => ({
            ...prev,
            displayName: profileData.user.displayName || "",
            username: profileData.user.username || "",
            age: profileData.user.age ?? "",
            gender: profileData.user.gender || "",
            profileImage: profileData.user.profileImage || ""
          }));
        }
      } else {
        showToast(data.error?.message || "सत्यापन विफल।", "error");
      }
    } catch {
      showToast("सर्वर से कनेक्ट करने में त्रुटि हुई।", "error");
    } finally {
      setOtpModal((prev) => ({ ...prev, verifying: false }));
    }
  };

  const displayName = user.displayName || user.username || user.email;
  const memberSince = formatDate(user.createdAt);

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-90" style={backdropStyle} />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-raised backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-soft-ink transition hover:border-accent/45 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 md:px-5 md:py-12">
        {/* Hero header */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-border/70 bg-surface/70 p-6 shadow-luxury backdrop-blur-2xl md:p-8"
        >
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-xl bg-gradient-to-br from-accent via-accent2 to-accent3 text-2xl font-bold text-on-accent shadow-soft">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={displayName} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  initials(displayName)
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                {user.role} Profile
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">{displayName}</h1>
              <p className="mt-1 truncate text-sm text-soft-ink">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${user.status === "ACTIVE" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                  {user.status}
                </span>
                {user.emailVerified && (
                  <span className="rounded-full border border-accent/30 bg-accent-soft/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                    Email Verified
                  </span>
                )}
                {user.phoneVerified && (
                  <span className="rounded-full border border-accent2/30 bg-accent2/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent2">
                    Phone Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Basic Info Form */}
        <motion.section
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Personal Details</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">Edit Profile</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleFormChange("displayName", e.target.value)}
                  placeholder="Your display name"
                  className="lm-input pl-10"
                  maxLength={120}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Username</label>
              <div className="relative">
                <Pencil className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleFormChange("username", e.target.value)}
                  placeholder="your_username"
                  className="lm-input pl-10"
                  maxLength={40}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">Letters, numbers, and underscores only</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => handleFormChange("age", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="25"
                className="lm-input"
                min={13}
                max={120}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => handleFormChange("gender", e.target.value)}
                className="lm-input"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">Profile Image URL</label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="url"
                  value={form.profileImage}
                  onChange={(e) => handleFormChange("profileImage", e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="lm-input pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </motion.section>

        {/* Contact Info */}
        <motion.section
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Contact Info</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">Email & Phone</h2>
          </div>

          <div className="grid gap-5">
            {/* Email row */}
            <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-surface-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Email Address</p>
                  <p className="mt-1 font-semibold text-ink">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {user.emailVerified ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-success">Verified</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                        <span className="text-warning">Not verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => openOtpModal("email")}
                className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-4 py-2.5 text-xs font-bold text-soft-ink transition hover:border-accent/45 hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
                Change Email
              </button>
            </div>

            {/* Phone row */}
            <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-surface-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-accent2/30 bg-accent2/10 text-accent2">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Phone Number</p>
                  <p className="mt-1 font-semibold text-ink">{user.phone || "Not added"}</p>
                  {user.phone ? (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {user.phoneVerified ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span className="text-success">Verified</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                          <span className="text-warning">Not verified</span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => openOtpModal("phone")}
                className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-4 py-2.5 text-xs font-bold text-soft-ink transition hover:border-accent2/45 hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
                {user.phone ? "Change Phone" : "Add Phone"}
              </button>
            </div>
          </div>
        </motion.section>

        {/* Account Meta */}
        <motion.section
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 rounded-lg border border-border/70 bg-surface/55 p-6 backdrop-blur-xl md:p-8"
        >
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">Account</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">Details</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Role</p>
              <p className="mt-1 font-semibold text-ink">{user.role}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Member Since</p>
              <p className="mt-1 font-semibold text-ink">{memberSince || "—"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Last Login</p>
              <p className="mt-1 font-semibold text-ink">{formatDate(user.lastLoginAt) || "—"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface-soft/50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">User ID</p>
              <p className="mt-1 truncate font-mono text-xs font-semibold text-ink">{user.id}</p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* OTP Modal */}
      <AnimatePresence>
        {otpModal.open && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-backdrop p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setOtpModal((prev) => ({ ...prev, open: false }));
            }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-md rounded-lg border border-border/70 bg-surface-raised p-6 shadow-luxury"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent">
                  {otpModal.field === "email" ? <Mail className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
                </div>
                <button
                  onClick={() => setOtpModal((prev) => ({ ...prev, open: false }))}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-soft/60 hover:text-ink"
                  disabled={otpModal.sending || otpModal.verifying}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
                {otpModal.field === "email" ? "Change Email" : "Change Phone"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {otpModal.step === "input"
                  ? `Enter your new ${otpModal.field === "email" ? "email address" : "phone number"} and we'll send an OTP to verify it.`
                  : `Enter the 6-digit OTP sent to ${otpModal.value}.`}
              </p>

              {otpModal.step === "input" ? (
                <div className="mt-5">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    New {otpModal.field === "email" ? "Email Address" : "Phone Number"}
                  </label>
                  <div className="relative">
                    {otpModal.field === "email" ? (
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    ) : (
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    )}
                    <input
                      type={otpModal.field === "email" ? "email" : "tel"}
                      value={otpModal.value}
                      onChange={(e) => setOtpModal((prev) => ({ ...prev, value: e.target.value }))}
                      placeholder={otpModal.field === "email" ? "you@example.com" : "+91XXXXXXXXXX"}
                      className="lm-input pl-10"
                    />
                  </div>
                  <button
                    onClick={sendOtp}
                    disabled={otpModal.sending || !otpModal.value}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60"
                  >
                    {otpModal.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {otpModal.sending ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              ) : (
                <div className="mt-5">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted">OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpModal.code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtpModal((prev) => ({ ...prev, code: val }));
                      }}
                      placeholder="000000"
                      className="lm-input pl-10 text-center text-lg tracking-[0.3em]"
                    />
                  </div>
                  <button
                    onClick={verifyOtp}
                    disabled={otpModal.verifying || otpModal.code.length !== 6}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105 disabled:opacity-60"
                  >
                    {otpModal.verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {otpModal.verifying ? "Verifying..." : "Verify & Update"}
                  </button>
                  <button
                    onClick={() => setOtpModal((prev) => ({ ...prev, step: "input", code: "" }))}
                    disabled={otpModal.verifying}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border/70 px-4 py-3 text-sm font-bold text-soft-ink transition hover:bg-surface-soft/60"
                  >
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
