"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import type { ThemeId } from "@/lib/themes";
import { Icon } from "@/components/icon-registry";

const themeSwatches: Record<ThemeId, string> = {
  "lm-theme-light": "linear-gradient(135deg, #11b8aa, #f4f8fb)",
  "lm-theme-dark": "linear-gradient(135deg, #4af3ff, #111418)",
  "lm-theme-grey": "linear-gradient(135deg, #127bf3, #1a1d22)",
  "lm-theme-purple": "linear-gradient(135deg, #4f9cff, #111522)",
  "lm-theme-sunset": "linear-gradient(135deg, #ffc21a, #16100c)",
  "lm-theme-forest": "linear-gradient(135deg, #34d35c, #101713)"
};

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand "More themes" if the current active theme is one of the extra themes
  useEffect(() => {
    if (["lm-theme-dark", "lm-theme-purple", "lm-theme-sunset", "lm-theme-forest"].includes(theme)) {
      setMoreExpanded(true);
    }
  }, [theme]);

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
        {/* Trigger Button with Hover Switcher */}
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

        {/* Floating Theme Selecting Panel */}
        {isOpen && (
          <div
            className="theme-mode-panel absolute right-[-40px] top-[40px] mt-2 z-[1000] w-40 rounded-xl border border-border/40 bg-surface-raised/95 shadow-luxury backdrop-blur-xl p-2 gap-1.5 grid animate-in fade-in zoom-in-95 duration-150"
            role="menu"
          >
            {/* Light Theme Button */}
            <button
              type="button"
              onClick={() => {
                setTheme("lm-theme-light");
                setIsOpen(false);
              }}
              className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                theme === "lm-theme-light"
                  ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                  : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
              }`}
            >
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                style={{ background: themeSwatches["lm-theme-light"] }}
              />
              Light
            </button>

            {/* Grey Theme Button */}
            <button
              type="button"
              onClick={() => {
                setTheme("lm-theme-grey");
                setIsOpen(false);
              }}
              className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                theme === "lm-theme-grey"
                  ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                  : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
              }`}
            >
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                style={{ background: themeSwatches["lm-theme-grey"] }}
              />
              Grey
            </button>

            {/* More Themes Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMoreExpanded(!moreExpanded);
              }}
              aria-expanded={moreExpanded}
              className={`flex w-full items-center justify-between rounded-lg border border-border bg-surface-soft/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/50 hover:bg-surface/80 cursor-pointer ${
                moreExpanded || ["lm-theme-dark", "lm-theme-purple", "lm-theme-sunset", "lm-theme-forest"].includes(theme)
                  ? "border-accent/30 text-accent bg-accent-soft/20"
                  : ""
              }`}
            >
              <span>More themes</span>
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black transition duration-200 ${
                  moreExpanded ? "bg-accent text-paper rotate-90" : "bg-accent-soft text-accent"
                }`}
              >
                ›
              </span>
            </button>

            {/* More Themes Options Sub-Panel */}
            {moreExpanded && (
              <div className="grid gap-1.5 pt-1.5 border-t border-border/20 animate-in slide-in-from-top-1 duration-150">
                {/* Dark Theme Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme("lm-theme-dark");
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                    theme === "lm-theme-dark"
                      ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                      : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches["lm-theme-dark"] }}
                  />
                  Dark
                </button>

                {/* Purple Theme Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme("lm-theme-purple");
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                    theme === "lm-theme-purple"
                      ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                      : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches["lm-theme-purple"] }}
                  />
                  Purple
                </button>

                {/* Sunset Theme Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme("lm-theme-sunset");
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                    theme === "lm-theme-sunset"
                      ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                      : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches["lm-theme-sunset"] }}
                  />
                  Sunset
                </button>

                {/* Forest Theme Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme("lm-theme-forest");
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full items-center justify-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition pl-9 cursor-pointer ${
                    theme === "lm-theme-forest"
                      ? "border-accent/40 bg-accent-soft/75 text-accent font-black outline outline-1 outline-accent/45 shadow-glow"
                      : "border-border bg-surface-soft/40 text-ink hover:border-accent/50 hover:bg-surface/80"
                  }`}
                >
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-white/10 shadow-sm"
                    style={{ background: themeSwatches["lm-theme-forest"] }}
                  />
                  Forest
                </button>
              </div>
            )}
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
