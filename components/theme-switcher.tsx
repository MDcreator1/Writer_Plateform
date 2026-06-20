"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { ThemeId } from "@/lib/themes";

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

  if (compact) {
    return (
      <div className="relative">
        <label className="sr-only" htmlFor="theme-select">
          Choose theme
        </label>
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Palette className="h-4 w-4" />
        </div>
        <select
          id="theme-select"
          value={theme}
          onChange={(event) => setTheme(event.target.value as ThemeId)}
          className="lm-input appearance-none py-1 pl-10 pr-4 text-md font-semibold"
        >
          {themes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="lm-card-soft p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        <Palette className="h-3.5 w-3.5" />
        Theme
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {themes.map((item) => {
          const active = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              title={item.label}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                active ? "border-accent shadow-glow" : "border-border hover:border-accent/50"
              }`}
            >
              <span
                className="mb-1.5 block h-6 w-full rounded-md"
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
