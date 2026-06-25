import React from "react";
import * as Lucide from "lucide-react";

/**
 * CUSTOM_ICONS dictionary:
 * If an icon name has a string value (raw SVG markup), it will render that SVG.
 * If it is null or undefined, it will fall back to the mapped Lucide React icon.
 * You can manually paste SVG strings here to customize any icon!
 */
export const CUSTOM_ICONS: Record<string, string | null> = {
  bookOpen: null,
  crown: null,
  zap: null,
  shieldCheck: null,
  chevronDown: null,
  check: null,
  menu: null,
  x: null,
  mail: null,
  star: null,
  arrowRight: null,
  chevronLeft: null,
  chevronRight: null,
  edit: null,
  delete: null,
  search: null,
  userCircle: null,
  logOut: null,
  creditCard: null,
  smartphone: null,
  timer: null,
  themeModeDefault: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full" aria-hidden="true" focusable="false">
          <path d="M12 22.75A2.752 2.752 0 0 1 9.25 20v-3a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 .75.75v3A2.752 2.752 0 0 1 12 22.75Zm-1.25-5V20a1.25 1.25 0 0 0 2.5 0v-2.25Z" />
          <path d="M18 17.75H6a2.75 2.75 0 0 1 0-5.5h12a2.75 2.75 0 0 1 0 5.5Zm-12-4a1.25 1.25 0 0 0 0 2.5h12a1.25 1.25 0 0 0 0-2.5Z" />
          <path d="M19 14.02a.75.75 0 0 1-.75-.75V4A1.252 1.252 0 0 0 17 2.75h-4.76a1.247 1.247 0 0 0-1.119.695l-.452.893a.78.78 0 0 1-1.338 0l-.451-.89a1.247 1.247 0 0 0-1.12-.7H7A1.252 1.252 0 0 0 5.75 4v9.27a.75.75 0 0 1-1.5 0V4A2.753 2.753 0 0 1 7 1.25h.76A2.734 2.734 0 0 1 10 2.406a2.732 2.732 0 0 1 2.24-1.156H17A2.753 2.753 0 0 1 19.75 4v9.27a.75.75 0 0 1-.75.75Z" />
          <path d="M10 6.75A.75.75 0 0 1 9.25 6V4a.75.75 0 0 1 1.5 0v2a.75.75 0 0 1-.75.75Z" />
        </svg>`,
  themeModeHover: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full" aria-hidden="true" focusable="false">
          <path d="M14 16.25h-4a.75.75 0 0 0-.75.75v3a2.75 2.75 0 0 0 5.5 0v-3a.75.75 0 0 0-.75-.75zM19.75 4v8.51a1.62 1.62 0 0 0-.22-.01H4.47a1.62 1.62 0 0 0-.22.01V4A2.748 2.748 0 0 1 7 1.25h.76a2.676 2.676 0 0 1 1.49.46V5a.75.75 0 0 0 1.5 0V1.71a2.676 2.676 0 0 1 1.49-.46H17A2.748 2.748 0 0 1 19.75 4z" />
          <rect width="17" height="4" x="3.5" y="13.5" rx="2" />
        </svg>`,
};

// Fallback mapping to default Lucide React icons
export const DEFAULT_LUCIDE_MAP: Record<string, React.ComponentType<any>> = {
  bookOpen: Lucide.BookOpen,
  crown: Lucide.Crown,
  zap: Lucide.Zap,
  shieldCheck: Lucide.ShieldCheck,
  chevronDown: Lucide.ChevronDown,
  check: Lucide.Check,
  menu: Lucide.Menu,
  x: Lucide.X,
  mail: Lucide.Mail,
  star: Lucide.Star,
  arrowRight: Lucide.ArrowRight,
  chevronLeft: Lucide.ChevronLeft,
  chevronRight: Lucide.ChevronRight,
  edit: Lucide.Edit3,
  delete: Lucide.Trash2,
  search: Lucide.Search,
  userCircle: Lucide.UserCircle,
  logOut: Lucide.LogOut,
  creditCard: Lucide.CreditCard,
  smartphone: Lucide.Smartphone,
  timer: Lucide.Timer,
  themeModeDefault: Lucide.Palette,
  themeModeHover: Lucide.Palette,
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
}

export function Icon({ name, className, ...props }: IconProps) {
  // Check if there is a custom SVG override registered
  const customSvg = CUSTOM_ICONS[name];
  
  if (customSvg) {
    // Render custom raw SVG string safely in React
    return (
      <span 
        className={className} 
        dangerouslySetInnerHTML={{ __html: customSvg }} 
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      />
    );
  }

  // Fallback to default Lucide React icon
  const LucideIcon = DEFAULT_LUCIDE_MAP[name] || Lucide.HelpCircle;
  return <LucideIcon className={className} {...props} />;
}
