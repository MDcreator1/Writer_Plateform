"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES, type ThemeId } from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: typeof THEMES;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const body = document.body;

  THEMES.forEach(({ id }) => {
    root.classList.remove(id);
    body.classList.remove(id);
  });

  root.classList.add(theme);
  body.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const storedVelora = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const storedStudio = localStorage.getItem("lm_theme");
    let initial = DEFAULT_THEME;
    
    if (storedVelora && THEMES.some((item) => item.id === storedVelora)) {
      initial = storedVelora;
    } else if (storedStudio) {
      const mapped = `lm-theme-${storedStudio}` as ThemeId;
      if (THEMES.some((item) => item.id === mapped)) {
        initial = mapped;
      }
    }
    
    setThemeState(initial);
    applyTheme(initial);
    
    // Ensure both keys are in sync on boot
    const studioMode = initial.replace("lm-theme-", "");
    localStorage.setItem("lm_theme", studioMode);
    localStorage.setItem("lm_dark", String(studioMode === "dark"));
    localStorage.setItem(THEME_STORAGE_KEY, initial);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    
    // Synchronize with Lekhak Manch Writer Studio
    const studioMode = next.replace("lm-theme-", "");
    localStorage.setItem("lm_theme", studioMode);
    localStorage.setItem("lm_dark", String(studioMode === "dark"));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
