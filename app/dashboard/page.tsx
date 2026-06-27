import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { getCurrentUser } from "@/lib/auth";
import { getReaderDashboardData } from "@/lib/dashboard-service";

export const metadata: Metadata = {
  title: "Reader Dashboard",
  description: "Reader wallet, purchases, history, favorites, ratings, and security settings."
};

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const data = await getReaderDashboardData(user.id);

  return (
    <DashboardPage
      user={{
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        hasPhone: Boolean(user.phone),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString()
      }}
      data={data}
    />
  );
}