import {
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpen,
  Bot,
  CreditCard,
  Crown,
  Fingerprint,
  Gauge,
  Heart,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

import coverImage from "@/lib/story_covers/image.png";

export type ChapterState = "free" | "locked" | "unlocked";

export type Chapter = {
  id: string;
  number: number;
  title: string;
  state: ChapterState;
  coinPrice: number;
  readTime: string;
  excerpt: string;
  content: string[];
};

export type Story = {
  id: string;
  slug: string;
  title: string;
  genre: string;
  rating: number;
  reads: string;
  chapters: number;
  freeChapters: number;
  paidChapters: number;
  description: string;
  author: string;
  cover: string;
  accent: string;
  tags: string[];
  chapterList: Chapter[];
  totalChapter: number;
};

export type CoinPackage = {
  id: string;
  coins: number;
  bonus: number;
  price: number;
  badge: string;
};

export const platformStats = [
  { label: "Active readers", value: "84K+" },
  { label: "Premium chapters unlocked", value: "1.2M" },
  { label: "Average rating", value: "4.8" },
  { label: "Creator revenue share", value: "82%" }
];

const commonChapterText = [
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light. Mira kept to the covered arcade, counting the spaces between the patrol bells and the pulse under her glove.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence. Mira called it the only door still willing to open.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance. Somewhere above, a train crossed a bridge that no map admitted was there.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price.",
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light. Mira kept to the covered arcade, counting the spaces between the patrol bells and the pulse under her glove.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence. Mira called it the only door still willing to open.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance. Somewhere above, a train crossed a bridge that no map admitted was there.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price.",
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light. Mira kept to the covered arcade, counting the spaces between the patrol bells and the pulse under her glove.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence. Mira called it the only door still willing to open.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance. Somewhere above, a train crossed a bridge that no map admitted was there.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price.",
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light. Mira kept to the covered arcade, counting the spaces between the patrol bells and the pulse under her glove.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence. Mira called it the only door still willing to open.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance. Somewhere above, a train crossed a bridge that no map admitted was there.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price.",
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light. Mira kept to the covered arcade, counting the spaces between the patrol bells and the pulse under her glove.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence. Mira called it the only door still willing to open.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance. Somewhere above, a train crossed a bridge that no map admitted was there.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price.",
];

export const stories: Story[] = [
  {
    id: "story_ember-archive",
    slug: "ember-archive",
    title: "The Ember Archive",
    genre: "Romantic Fantasy",
    rating: 4.9,
    reads: "612K",
    chapters: 42,
    freeChapters: 10,
    paidChapters: 32,
    description:
      "A royal archivist discovers that forbidden love letters are actually maps to a vanished kingdom.",
    author: "Aarohi Vane",
    cover: coverImage.src,
    accent: "from-wine to-velvet",
    tags: ["Royal intrigue", "Slow burn", "Mystery"],
    chapterList: Array.from({ length: 14 }).map((_, index) => {
      const number = index + 1;
      const free = number <= 10;
      const prices = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 8, 10];
      return {
        id: `ember-${number}`,
        number,
        title:
          number === 1
            ? "A Letter Written in Ash"
            : number === 11
              ? "The Locked Gallery"
              : `Chapter ${number}: The Archive Breathes`,
        state: free ? "free" : number === 11 ? "unlocked" : "locked",
        coinPrice: prices[index],
        readTime: `${8 + (number % 5)} min`,
        excerpt: commonChapterText[0],
        content: commonChapterText
      };
    }),
    totalChapter: 42
  },
  {
    id: "story-neon-oracle",
    slug: "neon-oracle",
    title: "Neon Oracle",
    genre: "Cyberpunk Thriller",
    rating: 4.7,
    reads: "388K",
    chapters: 31,
    freeChapters: 8,
    paidChapters: 23,
    description:
      "A memory broker sells impossible futures until one prediction names her as the next citywide threat.",
    author: "Dev Arlen",
    cover:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    accent: "from-fuchsia-700 to-sky-700",
    tags: ["AI crime", "Found family", "High stakes"],
    chapterList: Array.from({ length: 12 }).map((_, index) => {
      const number = index + 1;
      return {
        id: `neon-${number}`,
        number,
        title: number <= 8 ? `Chapter ${number}: Signal Ghost` : `Chapter ${number}: Paywall Protocol`,
        state: number <= 8 ? "free" : "locked",
        coinPrice: number <= 10 ? 5 : 8,
        readTime: `${7 + (number % 4)} min`,
        excerpt: commonChapterText[1],
        content: commonChapterText
      };
    }),
    totalChapter: 31
  },
  {
    id: "story-monsoon-court",
    slug: "monsoon-court",
    title: "The Monsoon Court",
    genre: "Historical Drama",
    rating: 4.8,
    reads: "451K",
    chapters: 36,
    freeChapters: 9,
    paidChapters: 27,
    description:
      "A courtroom poet challenges an empire with a verse that can either free a nation or destroy her family.",
    author: "Meera Sable",
    cover:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    accent: "from-amber-700 to-red-800",
    tags: ["Court politics", "Literary", "Epic"],
    chapterList: Array.from({ length: 13 }).map((_, index) => {
      const number = index + 1;
      return {
        id: `monsoon-${number}`,
        number,
        title: number <= 9 ? `Chapter ${number}: The First Petition` : `Chapter ${number}: Verdict Rain`,
        state: number <= 9 ? "free" : "locked",
        coinPrice: number < 12 ? 5 : 10,
        readTime: `${9 + (number % 3)} min`,
        excerpt: commonChapterText[2],
        content: commonChapterText
      };
    }),
    totalChapter: 36
  }
];

export const coinPackages: CoinPackage[] = [
  { id: "starter", coins: 100, bonus: 0, price: 99, badge: "Starter" },
  { id: "popular", coins: 350, bonus: 0, price: 299, badge: "Popular" },
  { id: "premium", coins: 650, bonus: 0, price: 499, badge: "Premium" },
  { id: "vip", coins: 1400, bonus: 0, price: 999, badge: "VIP" }
];

export const featurePillars = [
  {
    title: "Monetized chapters",
    description: "Free samples, coin-priced premium chapters, permanent access, and campaign pricing.",
    icon: Banknote
  },
  {
    title: "Protected reading",
    description: "Dynamic watermarking, short-lived chapter tokens, fingerprint markers, and copy deterrence.",
    icon: ShieldCheck
  },
  {
    title: "Reader retention",
    description: "Bookmarks, favorites, history, ratings, comments, continue reading, and smart chapter UX.",
    icon: Heart
  },
  {
    title: "Admin intelligence",
    description: "Revenue, coin sales, users, story performance, refunds, and suspicious activity logs.",
    icon: BarChart3
  }
];

export const securityLayers = [
  { label: "Visible and invisible dynamic watermark", icon: Fingerprint },
  { label: "Print Screen blur and warning hooks", icon: ShieldCheck },
  { label: "Copy, cut, drag, selection, and context-menu deterrence", icon: Lock },
  { label: "One chapter per secure tokenized request", icon: BookOpen },
  { label: "CAPTCHA, rate limiting, and bot heuristics", icon: Bot },
  { label: "Device monitoring and suspicious activity logging", icon: Gauge }
];

export const adminModules = [
  { label: "Story management", detail: "Create, edit, delete, upload covers, manage chapters, pricing, and free limits.", icon: BookOpen },
  { label: "User management", detail: "View readers, ban accounts, inspect wallets, and review device history.", icon: Users },
  { label: "Payments", detail: "Razorpay, Stripe, PayPal transactions, refunds, package prices, and campaigns.", icon: CreditCard },
  { label: "Analytics", detail: "Revenue, active users, coin sales, most read stories, ratings, and retention.", icon: BarChart3 },
  { label: "Protection logs", detail: "Unlock logs, reading sessions, fingerprint traces, and leak investigations.", icon: Fingerprint },
  { label: "Creator tools", detail: "Author profile, newsletter, review moderation, and editorial publishing workflow.", icon: Crown }
];

export const paymentProviders = [
  { name: "Razorpay", detail: "UPI, cards, wallets, netbanking, and INR-first checkout." },
  { name: "Stripe", detail: "Cards, wallets, tax-ready metadata, and global reader payments." },
  { name: "PayPal", detail: "International checkout, payment capture, and sandbox-ready setup." }
];

export const faqs = [
  {
    q: "How do coins work?",
    a: "Coins are a virtual wallet balance used to permanently unlock paid chapters on the account that purchased them."
  },
  {
    q: "Are unlocked chapters permanent?",
    a: "Yes. Once a chapter is unlocked, the purchase record grants permanent access for that user account."
  },
  {
    q: "Can I refund a purchase?",
    a: "Admins can review transactions and issue eligible refunds through the payment management console."
  },
  {
    q: "How is story content protected?",
    a: "The reader combines watermarking, fingerprinting, one-chapter delivery, short-lived tokens, rate limits, and suspicious-session logs."
  }
];

export const transactions = [
  { id: "txn_4312", label: "Unlocked The Locked Gallery", amount: -5, date: "13 Jun 2026" },
  { id: "txn_4311", label: "Purchased 250 Coin Pack", amount: 280, date: "12 Jun 2026" },
  { id: "txn_4310", label: "Launch campaign bonus", amount: 25, date: "12 Jun 2026" },
  { id: "txn_4309", label: "Unlocked The Locked Gallery", amount: -5, date: "13 Jun 2026" },
  { id: "txn_4308", label: "Purchased 250 Coin Pack", amount: 280, date: "12 Jun 2026" },
  { id: "txn_4307", label: "Launch campaign bonus", amount: 25, date: "12 Jun 2026" },
  { id: "txn_4306", label: "Unlocked The Locked Gallery", amount: -5, date: "13 Jun 2026" },
  { id: "txn_4305", label: "Purchased 250 Coin Pack", amount: 280, date: "12 Jun 2026" },
  { id: "txn_4304", label: "Launch campaign bonus", amount: 25, date: "12 Jun 2026" }
];

export const readerControls = [
  "Dark mode",
  "Light mode",
  "Font size",
  "Font family",
  "Progress tracker",
  "Bookmark",
  "Continue reading",
  "Previous and next chapter"
];

export const trustBadges = [
  { label: "Verified payments", icon: BadgeCheck },
  { label: "SEO ready", icon: Sparkles },
  { label: "Email and OTP flows", icon: Mail }
];

export function getStoryBySlug(slug: string) {
  return stories.find((story) => story.slug === slug) ?? stories[0];
}
