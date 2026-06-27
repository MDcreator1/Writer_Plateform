import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { getCurrentUser, isPrimaryAdminUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-service";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Story, user, wallet, payment, analytics, and anti-piracy administration."
};

export default async function Page({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const searchQuery = params?.q ?? "";
  const data = await getAdminDashboardData(searchQuery);

  return <AdminPage searchQuery={searchQuery} data={data} currentAdmin={{ id: user.id, email: user.email, role: user.role, isPrimaryAdmin: isPrimaryAdminUser(user) }} />;
}