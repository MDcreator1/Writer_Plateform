"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import type { ThemeId } from "@/lib/themes";
import { Icon } from "@/components/icon-registry";
import { Moon, Sun, Palette } from "lucide-react";

const themeSwatches: Record<ThemeId, string> = {
  "lm-theme-light": "linear-gradient(135deg, #11b8aa, #f4f8fb)",
  "lm-theme-dark": "linear-gradient(135deg, #4af3ff, #111418)",
  "lm-theme-grey": "linear-gradient(135deg, #127bf3, #1a1d22)",
  "lm-theme-purple": "linear-gradient(135deg, #4f9cff, #111522)",
  "lm-theme-sunset": "linear-gradient(135deg, #ffc21a, #16100c)",
  "lm-theme-forest": "linear-gradient(135deg, #34d35c, #101713)"
};

export function ThemeSwitcher({ 
  compact = false,
  variant = "classic"
}: { 
  compact?: boolean;
  variant?: "classic" | "aetheris" | "cinematic";
}) {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close floating panel
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (compact) {
    return (
      <div className="relative inline-block" ref={containerRef}>
        {/* Variant-Specific Trigger Buttons */}
        {variant === "aetheris" ? (
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title="Theme"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 focus:outline-none cursor-pointer ${
              isOpen || isHovered 
                ? "bg-zinc-900 border-teal-500/50 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.4)]" 
                : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"
            }`}
          >
            <Icon
              name={isHovered || isOpen ? "themeModeHover" : "themeModeDefault"}
              className={`h-4.5 w-4.5 transition-all duration-150 ${
                isHovered || isOpen ? "text-teal-400 scale-105" : "text-zinc-500"
              }`}
            />
          </button>
        ) : variant === "cinematic" ? (
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title="Theme"
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition duration-150 cursor-pointer ${
              isOpen ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-slate-900/60"
            }`}
          >
            {theme === "lm-theme-dark" ? (
              <Moon size={15} />
            ) : theme === "lm-theme-light" ? (
              <Sun size={15} />
            ) : (
              <Palette size={15} />
            )}
          </button>
        ) : (
          /* Classic trigger */
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title="Theme"
            className="relative flex h-7 w-7 items-center justify-center rounded-lg text-ink transition focus:outline-none cursor-pointer"
          >
            <Icon
              name={isHovered || isOpen ? "themeModeHover" : "themeModeDefault"}
              className={`h-4.1 w-4.1 transition-all duration-150 ${isHovered || isOpen ? "text-accent scale-105" : "text-muted"}`}
            />
          </button>
        )}

        {/* Variant-Specific Selecting Panels */}
        {isOpen && variant === "aetheris" && (
          <div
            className="theme-mode-panel absolute right-0 top-[48px] mt-2 z-[1000] w-48 rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-[0_0_25px_rgba(20,184,166,0.25)] backdrop-blur-2xl p-2.5 gap-2 grid animate-in fade-in zoom-in-95 duration-150 text-left font-mono"
            role="menu"
          >
            <div className="text-[10px] uppercase tracking-widest text-teal-400 border-b border-zinc-900 pb-1.5 mb-1 font-bold">
              mainframe // theme
            </div>
            {themes.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-[10px] tracking-wider uppercase font-semibold transition pl-9 cursor-pointer ${
                    active
                      ? "border-teal-500 bg-teal-500/10 text-teal-400 font-bold outline outline-1 outline-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.25)]"
                      : "border-zinc-900 bg-zinc-900/30 text-zinc-400 hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/5 shadow-sm"
                    style={{ background: themeSwatches[t.id] }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {isOpen && variant === "cinematic" && (
          <div
            className="theme-mode-panel absolute right-0 bottom-[48px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-[48px] z-[1000] w-40 rounded-xl border border-white/10 bg-[#05070a]/95 shadow-[0_0_30px_rgba(99,102,241,0.25)] backdrop-blur-3xl p-2.5 gap-1.5 grid animate-in fade-in zoom-in-95 duration-150 text-left font-hud"
            role="menu"
          >
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-1.5 mb-1 font-bold">
              Select Theme
            </div>
            {themes.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-[10px] tracking-wider uppercase font-semibold transition pl-9 cursor-pointer ${
                    active
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-400 font-bold outline outline-1 outline-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                      : "border-white/5 bg-slate-950/40 text-gray-400 hover:border-indigo-500/30 hover:bg-indigo-600/10 hover:text-indigo-200"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches[t.id] }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {isOpen && variant === "classic" && (
          <div
            className="theme-mode-panel absolute right-[-40px] top-[40px] mt-2 z-[1000] w-40 rounded-xl border border-border/40 bg-surface-raised/95 shadow-luxury backdrop-blur-xl p-2 gap-1.5 grid animate-in fade-in zoom-in-95 duration-150"
            role="menu"
          >
            {themes.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                    active
                      ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                      : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches[t.id] }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Non-compact card switcher (used in settings panels)
  return (
    <div className="lm-card p-4 border border-border/80 shadow-sm bg-surface">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <Icon name="themeModeDefault" className="h-4.5 w-4.5 text-accent" />
        Website Theme Mode
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        {themes.map((item) => {
          const active = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              title={item.label}
              className={`rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer text-center ${
                active
                  ? "border-accent bg-accent-soft/25 text-accent shadow-glow outline outline-1 outline-accent/30 font-bold"
                  : "border-border bg-surface hover:border-accent/50 hover:bg-surface-soft"
              }`}
            >
              <span
                className="mb-2 block h-8 w-full rounded-lg border border-white/5"
                style={{ background: themeSwatches[item.id] }}
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
