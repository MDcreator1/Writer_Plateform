import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  Coins,
  CreditCard,
  Edit3,
  Fingerprint,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { adminModules } from "@/lib/content";
import type { CoinPackage, Story } from "@/lib/content";

type AdminPageProps = {
  searchQuery: string;
  data: {
    analytics: {
      totalUsers: number;
      activeUsers: number;
      totalRevenue: number;
      totalCoinSales: number;
      successfulPayments: number;
      failedPayments: number;
    };
    payments: Array<{
      id: string;
      user: string;
      email: string;
      orderId: string;
      paymentId: string;
      packageName: string;
      amountPaid: number;
      coinsReceived: number;
      method: string;
      status: string;
      date: string;
    }>;
    stories: Story[];
    coinPackages: CoinPackage[];
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function AdminPage({ searchQuery, data }: AdminPageProps) {
  const analytics = [
    { label: "Total users", value: formatNumber(data.analytics.totalUsers), icon: Users },
    { label: "Active users", value: formatNumber(data.analytics.activeUsers), icon: BarChart3 },
    { label: "Revenue", value: `Rs. ${formatNumber(data.analytics.totalRevenue)}`, icon: CreditCard },
    { label: "Coin sales", value: formatNumber(data.analytics.totalCoinSales), icon: Coins },
    { label: "Successful payments", value: formatNumber(data.analytics.successfulPayments), icon: ShieldCheck },
    { label: "Failed payments", value: formatNumber(data.analytics.failedPayments), icon: AlertTriangle }
  ];

  return (
    <main className="min-h-screen">
      <header className="lm-topbar admin-header">
        <nav className="admin-nav mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="admin-back-to-marketplace inline-flex items-center gap-2 text-sm font-semibold text-soft-ink transition hover:text-accent">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <div className="admin-header-actions flex items-center gap-3">
            <span className="admin-mfa-badge rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              Admin protected
            </span>
            <ThemeSwitcher compact />
            <Link href="/auth" className="lm-btn-secondary admin-auth-console-link py-2">
              Auth Console
            </Link>
          </div>
        </nav>
      </header>

      <section className="admin-main-section mx-auto max-w-7xl px-5 py-10">
        <div className="admin-hero-layout grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="admin-hero-info">
            <p className="lm-eyebrow admin-hero-eyebrow">Admin Panel</p>
            <h1 className="admin-hero-title mt-2 font-display text-5xl font-semibold text-ink">Publishing, payments, users, analytics</h1>
            <p className="admin-hero-desc mt-4 max-w-2xl text-lg leading-8 text-soft-ink">
              Live payment analytics, story management, coin packages, user purchase history, and secure Razorpay transaction tracking.
            </p>
            <div className="admin-quick-actions mt-7 flex flex-wrap gap-3">
              <Link href="/admin/create-story" className="lm-btn-primary admin-action-add-story">
                <Plus className="h-4 w-4" />
                Add story
              </Link>
              <button className="lm-btn-secondary admin-action-upload-cover">
                <Upload className="h-4 w-4" />
                Upload cover
              </button>
              <button className="lm-btn-secondary admin-action-refund">
                <RotateCcw className="h-4 w-4" />
                Issue refund
              </button>
            </div>
          </div>
          <div className="admin-analytics-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.map((item) => (
              <div key={item.label} className="admin-analytics-card lm-card p-5 transition hover:shadow-luxury">
                <item.icon className="h-6 w-6 text-accent" />
                <strong className="admin-analytic-value mt-5 block font-display text-3xl text-ink">{item.value}</strong>
                <div className="admin-analytic-footer mt-1 flex items-center justify-between text-sm">
                  <span className="admin-analytic-label text-muted">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="admin-payment-history lm-card mt-8 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="admin-card-heading font-display text-3xl font-semibold text-ink">User Purchase History</h2>
              <p className="mt-1 text-sm text-muted">Search by user, order ID, or payment ID.</p>
            </div>
            <form className="flex min-w-0 gap-2" action="/admin">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input name="q" defaultValue={searchQuery} className="lm-input min-w-0 pl-9" placeholder="User, order ID, payment ID" />
              </div>
              <button className="lm-btn-primary py-2" type="submit">Search</button>
            </form>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Package</th>
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Payment</th>
                  <th className="py-3 pr-4">Method</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Coins</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payments.length ? data.payments.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="py-4 pr-4"><b className="block text-ink">{payment.user}</b><span className="text-xs text-muted">{payment.email}</span></td>
                    <td className="py-4 pr-4">{payment.packageName}<span className="block text-xs text-muted">{payment.date}</span></td>
                    <td className="py-4 pr-4 font-mono text-xs">{payment.orderId}</td>
                    <td className="py-4 pr-4 font-mono text-xs">{payment.paymentId}</td>
                    <td className="py-4 pr-4">{payment.method}</td>
                    <td className="py-4 pr-4">Rs. {payment.amountPaid}</td>
                    <td className="py-4 pr-4">{payment.coinsReceived}</td>
                    <td className="py-4 pr-4"><span className={payment.status === "paid" ? "text-success" : payment.status === "failed" ? "text-danger" : "text-warning"}>{payment.status}</span></td>
                  </tr>
                )) : (
                  <tr><td className="py-5 text-muted" colSpan={8}>No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="admin-management-row mt-8 grid gap-5 lg:grid-cols-3">
          <section className="admin-story-management lm-card p-5 lg:col-span-2">
            <div className="admin-card-header flex items-center justify-between">
              <h2 className="admin-card-heading font-display text-3xl font-semibold text-ink">Story Management</h2>
              <button className="lm-btn-secondary admin-bulk-edit-btn py-2 text-sm">
                <Edit3 className="h-4 w-4" />
                Bulk edit
              </button>
            </div>
            <div className="admin-story-list mt-5 divide-y divide-border">
              {data.stories.map((story) => (
                <div key={story.id} className="admin-story-item grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="admin-story-title font-semibold text-ink">{story.title}</h3>
                    <p className="admin-story-details mt-1 text-sm text-muted">
                      {story.genre} · {story.chapters} chapters · {story.freeChapters} free · {story.paidChapters} paid
                    </p>
                  </div>
                  <div className="admin-story-actions flex flex-wrap gap-2">
                    <button className="lm-btn-secondary admin-story-pricing-btn py-2 text-sm">Set pricing</button>
                    <button className="lm-btn-secondary admin-story-chapters-btn py-2 text-sm">Manage chapters</button>
                    <button className="admin-story-delete-btn rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-coin-packages lm-card p-5">
            <h2 className="admin-card-heading font-display text-3xl font-semibold text-ink">Coin Packages</h2>
            <div className="admin-package-list mt-5 space-y-3">
              {data.coinPackages.map((pack) => (
                <div key={pack.id} className="admin-package-item rounded-lg bg-surface-soft p-4">
                  <div className="admin-package-details flex items-center justify-between">
                    <b className="admin-package-name text-ink">{pack.coins + pack.bonus} coins</b>
                    <span className="admin-package-price text-accent">Rs. {pack.price}</span>
                  </div>
                  <p className="admin-package-badge mt-1 text-xs text-muted">{pack.badge} · active package</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="admin-security-row mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="admin-user-management lm-card p-5">
            <h2 className="admin-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <Users className="h-6 w-6 text-accent" />
              User Management
            </h2>
            <div className="admin-users-list mt-5 space-y-3">
              {data.payments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="admin-user-item flex items-center justify-between rounded-lg bg-surface-soft px-4 py-3">
                  <span>
                    <b className="admin-user-name block text-ink">{payment.user}</b>
                    <span className="admin-user-device-status text-xs text-muted">Last payment: {payment.status}</span>
                  </span>
                  <button className="admin-ban-btn inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                    <Ban className="h-4 w-4" />
                    Ban
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-protection-logs lm-card p-5">
            <h2 className="admin-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
              <Fingerprint className="h-6 w-6 text-accent" />
              Payment Guardrails
            </h2>
            <div className="admin-logs-list mt-5 divide-y divide-border text-sm text-muted">
              <p className="py-3">Razorpay payment signatures are verified server-side.</p>
              <p className="py-3">Webhooks are stored by unique event id and processed once.</p>
              <p className="py-3">Wallet coins are credited only inside a database transaction.</p>
              <p className="py-3">Frontend payment success never directly changes wallet balance.</p>
            </div>
          </section>
        </div>

        <section className="admin-modules-list lm-card mt-8 p-5">
          <h2 className="admin-card-heading flex items-center gap-2 font-display text-3xl font-semibold text-ink">
            <ShieldCheck className="h-6 w-6 text-accent" />
            Admin Modules
          </h2>
          <div className="admin-modules-subgrid mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminModules.map((module) => (
              <div key={module.label} className="admin-module-subcard rounded-lg bg-surface-soft p-4">
                <module.icon className="h-5 w-5 text-accent2" />
                <h3 className="admin-module-title mt-3 font-semibold text-ink">{module.label}</h3>
                <p className="admin-module-desc mt-2 text-sm leading-6 text-muted">{module.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-production-guardrail mt-8 rounded-xl border border-warning/30 bg-warning/10 p-5">
          <h2 className="admin-guardrail-heading flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle className="h-5 w-5" />
            Production guardrail
          </h2>
          <p className="admin-guardrail-desc mt-2 text-sm leading-6 text-soft-ink">
            Add RAZORPAY_WEBHOOK_SECRET before enabling live webhooks. Razorpay dashboard should point to /api/payments/webhook.
          </p>
        </section>
      </section>
    </main>
  );
}