import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminStoryDetails } from "@/components/admin-story-details";
import { getAdminStoryDetails } from "@/lib/admin-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Story Details",
  description: "Manage story chapters, performance, revenue and edit deep-linking."
};

type PageProps = {
  params: Promise<{ storyId: string }>;
};

export default async function Page({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { storyId } = await params;
  const data = await getAdminStoryDetails(storyId);

  if (!data) {
    notFound();
  }

  // Convert Date objects to strings for Client Component serialization
  const serializedData = {
    story: {
      ...data.story,
      createdAt: data.story.createdAt.toISOString(),
      scheduledAt: data.story.scheduledAt ? data.story.scheduledAt.toISOString() : null
    },
    chapters: data.chapters,
    studioProject: data.studioProject
      ? {
          ...data.studioProject,
          workspaceMaterializedAt: data.studioProject.workspaceMaterializedAt?.toISOString() || null
        }
      : null,
    stats: data.stats
  };

  return <AdminStoryDetails data={serializedData} />;
}
