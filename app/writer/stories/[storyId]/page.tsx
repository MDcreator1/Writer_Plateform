import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WriterStoryDetails } from "@/components/writer-story-details";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ storyId: string }> }): Promise<Metadata> {
  const { storyId } = await params;
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  return { title: story?.title ?? "Story Details" };
}

export default async function Page({ params }: { params: Promise<{ storyId: string }> }>) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "WRITER" && user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const { storyId } = await params;
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: { orderBy: { number: "asc" } },
      studioProject: true
    }
  });

  if (!story || (user.role !== "ADMIN" && story.authorId !== user.id)) {
    redirect("/writer");
  }

  const [realReadsCount, ratingMetrics] = await Promise.all([
    prisma.readingHistory.count({ where: { storyId } }),
    prisma.rating.aggregate({ where: { storyId }, _avg: { value: true }, _count: { _all: true } })
  ]);

  return (
    <WriterStoryDetails
      story={{
        ...story,
        readsCount: realReadsCount,
        ratingAverage: ratingMetrics._avg.value ?? 0,
        ratingsCount: ratingMetrics._count._all
      }}
    />
  );
}
