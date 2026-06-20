import type { Config } from "tailwindcss";
import tailwindScrollbar from "tailwind-scrollbar";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "soft-ink": "var(--soft-ink)",
        paper: "var(--paper)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-soft": "rgb(var(--surface-soft-rgb) / <alpha-value>)",
        "surface-raised": "var(--surface-raised)",
        sidebar: "var(--sidebar)",
        topbar: "var(--topbar)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        muted: "var(--muted)",
        "muted-soft": "var(--muted-soft)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        accent2: "rgb(var(--accent2-rgb) / <alpha-value>)",
        accent3: "var(--accent3)",
        "accent-soft": "rgb(var(--accent-soft-rgb) / <alpha-value>)",
        "accent-light": "var(--accent-light)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        info: "var(--info)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        "on-accent": "var(--color-on-accent)",
        backdrop: "var(--color-backdrop)",
        "tag-char": "var(--tag-char)",
        wine: "#8b1746",
        velvet: "#3b145f"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        reader: ["var(--font-reader)", "Georgia", "serif"]
      },
      boxShadow: {
        luxury: "0 24px 80px rgba(var(--lm-color-ink-rgb), 0.14)",
        soft: "0 12px 40px rgba(var(--lm-color-ink-rgb), 0.08)",
        glow: "0 0 40px rgba(var(--lm-color-accent-rgb), 0.22)"
      },
      animation: {
        shimmer: "shimmer 7s ease-in-out infinite",
        float: "float 6s ease-in-out infinite"
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { transform: "translate3d(-8%, -4%, 0) scale(1)" },
          "50%": { transform: "translate3d(8%, 4%, 0) scale(1.04)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem"
      }
    }
  },
  plugins: [tailwindScrollbar]
};

export default config;
