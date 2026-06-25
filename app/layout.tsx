import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_THEME } from "@/lib/themes";
import { ToastProvider } from "@/components/toast-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Velora Fiction | Premium Serialized Stories",
    template: "%s | Velora Fiction"
  },
  description:
    "A premium fiction platform for monetized original stories, chapter unlocking, virtual coins, and protected reading.",
  openGraph: {
    title: "Velora Fiction",
    description:
      "Discover premium fiction, unlock chapters with coins, and read in a protected luxury reader.",
    type: "website",
    images: ["/opengraph-image"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${DEFAULT_THEME}`} suppressHydrationWarning>
      <body className={DEFAULT_THEME}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
