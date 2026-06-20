import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

const policies: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms & Conditions",
    body: [
      "Readers may access free chapters and use purchased coins to permanently unlock paid chapters for their own account.",
      "Accounts may be suspended for payment abuse, scraping, sharing protected content, or attempting to bypass reader safeguards."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "The platform stores account, wallet, reading history, device, and payment metadata required to provide secure paid reading.",
      "Security logs and fingerprints are used for fraud prevention, abuse investigation, and content-protection enforcement."
    ]
  },
  refunds: {
    title: "Refund Policy",
    body: [
      "Eligible coin purchases can be reviewed by admins through the refund console before coins are spent.",
      "Unlocked chapter purchases are generally final because access is granted immediately and permanently."
    ]
  },
  dmca: {
    title: "DMCA Notice",
    body: [
      "Copyright takedown requests should include ownership proof, the infringing URL, contact details, and a good-faith statement.",
      "The platform can use forensic markers to investigate leaked paid chapters."
    ]
  },
  "anti-piracy": {
    title: "Anti-Piracy Policy",
    body: [
      "Chapter pages include visible and invisible watermarks, session identifiers, email hashes, and unique fingerprint markers.",
      "Copy, selection, print, screenshot shortcuts, suspicious devices, and excessive access patterns may be logged and challenged."
    ]
  }
};

type PageProps = {
  params: Promise<{ policy: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { policy } = await params;
  const page = policies[policy];
  return {
    title: page?.title ?? "Policy",
    description: page?.body[0] ?? "Platform policy"
  };
}

export default async function Page({ params }: PageProps) {
  const { policy } = await params;
  const page = policies[policy];
  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <section className="lm-card mx-auto max-w-3xl p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-accent2 transition hover:text-accent">
            Back to marketplace
          </Link>
          <ThemeSwitcher compact />
        </div>
        <h1 className="mt-6 font-display text-5xl font-semibold text-ink">{page.title}</h1>
        <div className="mt-6 space-y-4 text-base leading-8 text-soft-ink">
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
