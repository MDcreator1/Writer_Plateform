import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Email login, Google login, password reset, OTP, and email verification flows."
};

export default async function Page() {
  const user = await getCurrentUser();

  if (user) {
    if (user.registrationStep >= 6) {
      redirect("/");
    }
  }

  const defaultStep = user?.registrationStep ?? 1;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-ink gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="text-sm text-muted">लोड हो रहा है...</span>
      </div>
    }>
      <AuthPage defaultStep={defaultStep} />
    </Suspense>
  );
}
