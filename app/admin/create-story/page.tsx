import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateStoryPage } from "@/components/create-story-page";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Story",
  description: "Admin-only story creation form for Story Studio."
};

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <CreateStoryPage />;
}
