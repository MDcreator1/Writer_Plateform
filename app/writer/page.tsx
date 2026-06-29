import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WriterPage } from "@/components/writer-page";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Writer Studio",
  description: "Manage your stories and chapters."
};

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "WRITER" && user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const stories = await prisma.story.findMany({
    where: { authorId: user.id },
    include: { chapters: { orderBy: { number: "asc" } } },
    orderBy: { updatedAt: "desc" }
  });

  const totalStories = stories.length;
  const publishedChapters = stories.reduce((sum, s) => sum + s.chapters.filter((c) => c.status === "PUBLISHED").length, 0);
  const draftChapters = stories.reduce((sum, s) => sum + s.chapters.filter((c) => c.status === "DRAFT").length, 0);

  return (
    <WriterPage
      user={{ displayName: user.displayName, username: user.username, email: user.email }}
      stories={stories}
      stats={{ totalStories, publishedChapters, draftChapters }}
    />
  );
}
