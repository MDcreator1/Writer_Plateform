export const THEMES = [
  { id: "lm-theme-light", label: "Light" },
  { id: "lm-theme-dark", label: "Dark" },
  { id: "lm-theme-grey", label: "Grey" },
  { id: "lm-theme-purple", label: "Purple" },
  { id: "lm-theme-sunset", label: "Sunset" },
  { id: "lm-theme-forest", label: "Forest" }
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "lm-theme-light";

export const THEME_STORAGE_KEY = "velora-theme";
