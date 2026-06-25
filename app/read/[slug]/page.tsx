import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReaderPage } from "@/components/reader-page";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedStoryCardBySlug, getPublishedStoryCards, getReaderStoryBySlug, getStoryStudioData } from "@/lib/content-service";
import { hashEmail } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedStoryCardBySlug(slug);

  if (!story) {
    return { title: "Story not found" };
  }

  return {
    title: `${story.title} Reader`,
    description: story.description,
    openGraph: {
      title: story.title,
      description: story.description,
      images: story.cover ? [story.cover] : []
    }
  };
}

export default async function Page({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const { slug } = await params;
  
  const [readerStory, allStories, layoutConfig] = await Promise.all([
    getReaderStoryBySlug(slug, user.id),
    getPublishedStoryCards(),
    prisma.pageLayout.findUnique({ where: { pageName: "reader" } })
  ]);

  if (!readerStory) {
    notFound();
  }

  const studioData = await getStoryStudioData(readerStory.story.id);
  const recommendations = allStories.filter((s) => s.id !== readerStory.story.id);

  return (
    <ReaderPage
      story={readerStory.story}
      initialCoinBalance={readerStory.walletBalance}
      activeLayout={layoutConfig?.layoutName ?? "classic"}
      recommendations={recommendations}
      studioData={studioData}
      currentUser={{
        id: user.id,
        username: user.username || user.displayName || "Reader",
        emailHash: hashEmail(user.email),
        sessionId: crypto.randomUUID()
      }}
    />
  );
}