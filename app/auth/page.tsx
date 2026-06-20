import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Email login, Google login, password reset, OTP, and email verification flows."
};

export default function Page() {
  return <AuthPage />;
}
