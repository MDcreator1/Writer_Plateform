import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateStoryPage } from "@/components/create-story-page";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Story",
  description: "Create a new story as a writer."
};

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "WRITER" && user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  return <CreateStoryPage redirectPath="/writer" />;
}
