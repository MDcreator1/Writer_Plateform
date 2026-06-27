import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCoinPackageCards } from "@/lib/content-service";
import { getMonetizationSettings } from "@/lib/monetization-service";
import type { CoinPackage } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coins, Offers & Subscriptions",
  description: "Coin purchase details, refund policy, offers, and subscription passes for Velora Fiction readers."
};

type MonetizationSettings = {
  activeCampaign?: string;
  subCoinsPerDay?: number;
  weeklyBasePrice?: number;
  monthlyBasePrice?: number;
  yearlyBasePrice?: number;
  monthlyUpgradeDiscount?: number;
  yearlyUpgradeDiscount?: number;
  subscriptionsEnabled?: boolean;
  scheduledDiscountTitle?: string;
  scheduledDiscountDescription?: string;
  scheduledDiscountPercent?: number;
  scheduledDiscountEnabled?: boolean;
};

type SubscriptionPlan = {
  name: string;
  period: string;
  days: number;
  dailyCoins: number;
  totalCoins: number;
  price: number;
  badge: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getSubscriptionPlans(settings: MonetizationSettings | null): SubscriptionPlan[] {
  const dailyCoins = settings?.subCoinsPerDay ?? 10;
  const weeklyPrice = settings?.weeklyBasePrice ?? 99;
  const monthlyBasePrice = settings?.monthlyBasePrice ?? 299;
  const yearlyBasePrice = settings?.yearlyBasePrice ?? 2999;
  const monthlyDiscount = settings?.monthlyUpgradeDiscount ?? 15;
  const yearlyDiscount = settings?.yearlyUpgradeDiscount ?? 25;

  return [
    {
      name: "Weekly Pass",
      period: "7 days",
      days: 7,
      dailyCoins,
      totalCoins: dailyCoins * 7,
      price: weeklyPrice,
      badge: "Starter"
    },
    {
      name: "Monthly Pass",
      period: "30 days",
      days: 30,
      dailyCoins,
      totalCoins: dailyCoins * 30,
      price: Math.round(monthlyBasePrice * (1 - monthlyDiscount / 100)),
      badge: `${monthlyDiscount}% off`
    },
    {
      name: "Yearly Pass",
      period: "365 days",
      days: 365,
      dailyCoins,
      totalCoins: dailyCoins * 365,
      price: Math.round(yearlyBasePrice * (1 - yearlyDiscount / 100)),
      badge: `${yearlyDiscount}% off`
    }
  ];
}

function getPackageDiscount(pack: CoinPackage) {
  const parts = (pack.campaign || "").split("|");
  return (Number(parts[1]) || 0) + (Number(parts[2]) || 0);
}

function DetailCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/65 p-5 shadow-soft backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent/30 bg-accent-soft/70 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4 text-sm leading-7 text-soft-ink">{children}</div>
    </div>
  );
}

export default async function CoinsPage() {
  const [user, coinPackages, rawSettings] = await Promise.all([
    getCurrentUser(),
    getActiveCoinPackageCards(),
    getMonetizationSettings()
  ]);
  const settings = rawSettings as MonetizationSettings | null;
  const subscriptionPlans = getSubscriptionPlans(settings);
  const subscriptionsEnabled = settings?.subscriptionsEnabled ?? true;
  const activeCampaignTitle = settings?.scheduledDiscountEnabled
    ? settings?.scheduledDiscountTitle || "Scheduled reader offer"
    : settings?.activeCampaign || "Reader coin offers";

  const checkoutHref = user ? "/#coins" : "/auth";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-border/70 bg-surface-raised/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-soft-ink transition hover:border-accent/45 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link href={checkoutHref} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-accent shadow-soft transition hover:brightness-105">
            Buy Coins
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 md:py-12 md:pb-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              <Wallet className="h-3.5 w-3.5" />
              Coins Center
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl md:text-6xl">
              Coins, refunds, offers, and subscription details.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-soft-ink">
              Review package value, subscription passes, refund rules, and active reader offers before opening checkout.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface/65 p-5 shadow-luxury backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">Current Offer</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{activeCampaignTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-soft-ink">
              {settings?.scheduledDiscountDescription || "Any live discount configured by admin is reflected in checkout package pricing."}
            </p>
            {settings?.scheduledDiscountPercent ? (
              <span className="mt-4 inline-flex rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-bold text-success">
                Up to {settings.scheduledDiscountPercent}% off
              </span>
            ) : null}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">Instant Top-up</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Coin Packages</h2>
            </div>
            <Link href={checkoutHref} className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-accent transition hover:bg-accent-soft">
              Open checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {coinPackages.map((pack) => {
              const discount = getPackageDiscount(pack);
              const payable = Math.max(0, Math.round(pack.price * (1 - discount / 100)));
              const totalCoins = pack.coins + pack.bonus;
              return (
                <div key={pack.id} className="rounded-lg border border-border/70 bg-surface/65 p-5 shadow-soft backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">{pack.badge}</span>
                    {discount > 0 ? (
                      <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                        Save {discount}%
                      </span>
                    ) : null}
                  </div>
                  <strong className="mt-5 block font-display text-4xl font-semibold text-ink">{formatNumber(pack.coins)}</strong>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">base coins</span>
                  {pack.bonus > 0 ? <p className="mt-2 text-sm font-semibold text-accent">+ {formatNumber(pack.bonus)} bonus coins</p> : null}
                  <div className="mt-5 rounded-lg bg-surface-soft/70 p-3 text-sm text-soft-ink">
                    <div className="flex justify-between gap-3">
                      <span>Total coins</span>
                      <b className="text-ink">{formatNumber(totalCoins)}</b>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <span>Payable</span>
                      <b className="text-ink">{formatCurrency(payable)}</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent2">Daily Coins</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Subscription Passes</h2>
            </div>
            <span className="rounded-full border border-border/70 bg-surface/55 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              {subscriptionsEnabled ? "Available" : "Currently paused"}
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} className="rounded-lg border border-border/70 bg-surface/65 p-5 shadow-soft backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <Crown className="h-6 w-6 text-accent2" />
                  <span className="rounded-full border border-accent2/30 bg-accent2/10 px-3 py-1 text-xs font-bold text-accent2">{plan.badge}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.period}</p>
                <div className="mt-4 rounded-lg bg-surface-soft/70 p-3 text-sm text-soft-ink">
                  <div className="flex justify-between gap-3">
                    <span>Daily credit</span>
                    <b className="text-ink">{plan.dailyCoins} coins</b>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span>Total value</span>
                    <b className="text-ink">{formatNumber(plan.totalCoins)} coins</b>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span>Price</span>
                    <b className="text-ink">{formatCurrency(plan.price)}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <DetailCard icon={CreditCard} title="Purchasing">
            Payments are opened from the checkout on the home page. Successful payments credit coins to your wallet and create a transaction record in your reader dashboard.
          </DetailCard>
          <DetailCard icon={RefreshCw} title="Refunds">
            Failed or duplicate payments are reviewed against the payment provider record. Consumed coins or unlocked paid chapters are handled under the refund policy.
            <Link href="/refunds" className="mt-3 inline-flex items-center gap-1 font-bold text-accent">
              Read refund policy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </DetailCard>
          <DetailCard icon={BadgePercent} title="Offers">
            Admin configured package discounts, campaign badges, and scheduled offers are applied to available packages. The payable amount is always shown before payment.
          </DetailCard>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <DetailCard icon={ReceiptText} title="Receipts">
            Payments, coins received, package names, and provider status are stored in the dashboard payment history for signed-in readers.
          </DetailCard>
          <DetailCard icon={ShieldCheck} title="Security">
            Checkout uses provider hosted payment screens. Velora stores payment status and coin transactions, not card or banking credentials.
          </DetailCard>
          <DetailCard icon={Sparkles} title="Chapter Unlocks">
            Purchased coins can unlock premium chapters. Once unlocked, a chapter remains available from your reader account and library signals.
          </DetailCard>
        </section>

        <div className="mt-10 flex flex-col gap-3 rounded-lg border border-border/70 bg-surface-raised/70 p-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-warning/30 bg-warning/10 text-warning">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Ready to add coins?</h2>
              <p className="text-sm text-soft-ink">Open checkout, choose a package, and confirm the payable amount.</p>
            </div>
          </div>
          <Link href={checkoutHref} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-on-accent shadow-soft transition hover:brightness-105">
            {user ? "Go to checkout" : "Sign in to buy"}
            <CheckCircle2 className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

