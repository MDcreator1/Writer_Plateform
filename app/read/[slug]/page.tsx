import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReaderPage } from "@/components/reader-page";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedStoryCardBySlug, getReaderStoryBySlug } from "@/lib/content-service";
import { hashEmail } from "@/lib/security";

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
  const readerStory = await getReaderStoryBySlug(slug, user.id);

  if (!readerStory) {
    notFound();
  }

  return (
    <ReaderPage
      story={readerStory.story}
      initialCoinBalance={readerStory.walletBalance}
      currentUser={{
        id: user.id,
        username: user.username || user.displayName || "Reader",
        emailHash: hashEmail(user.email),
        sessionId: crypto.randomUUID()
      }}
    />
  );
}