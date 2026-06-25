import "server-only";
import type { Chapter as DbChapter, CoinPackage as DbCoinPackage, Story as DbStory } from "@prisma/client";
import { coinPackages as fallbackPackages, stories as fallbackStories, type CoinPackage, type Story } from "@/lib/content";
import { prisma } from "@/lib/prisma";

type StoryWithChapters = DbStory & { chapters: DbChapter[] };

function formatReads(count: number) {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  }

  if (count >= 1_000) {
    return `${Math.round(count / 100) / 10}K`;
  }

  return String(count);
}

function mapChapter(chapter: DbChapter, unlockedChapterIds = new Set<string>()) {
  const state = chapter.isFree ? "free" as const : unlockedChapterIds.has(chapter.id) ? "unlocked" as const : "locked" as const;

  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    state,
    coinPrice: chapter.coinPrice,
    readTime: `${Math.max(6, Math.min(14, Math.round((chapter.excerpt?.length || 600) / 90)))} min`,
    excerpt: chapter.excerpt || "A premium chapter from this serialized story.",
    content: [],
    publishedAt: chapter.publishedAt || chapter.createdAt
  };
}

export function mapDbStoryToCard(story: StoryWithChapters, unlockedChapterIds = new Set<string>()): Story {
  const publishedChapters = story.chapters.filter((chapter) => chapter.status === "PUBLISHED");
  const chapterList = publishedChapters.length ? publishedChapters.map((chapter) => mapChapter(chapter, unlockedChapterIds)) : [];
  const totalChapters = publishedChapters.length || story.freeChapterCap;
  const freeChapters = publishedChapters.filter((chapter) => chapter.isFree).length || Math.min(story.freeChapterCap, totalChapters);
  const paidChapters = Math.max(totalChapters - freeChapters, 0);

  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    genre: story.genre,
    rating: Number(story.ratingAverage || 0),
    reads: formatReads(story.readsCount),
    chapters: totalChapters,
    freeChapters,
    paidChapters,
    description: story.description,
    author: story.authorName,
    cover: story.coverUrl || "",
    accent: "from-accent to-accent2",
    tags: story.tags.length ? story.tags : [story.genre, story.storyType, story.language].filter(Boolean),
    chapterList,
    totalChapter: totalChapters,
    storyType: story.storyType || "novel",
    published: story.published,
    publicationStatus: story.publicationStatus,
    defaultChapterCoinPrice: story.defaultChapterCoinPrice,
    freeChapterCap: story.freeChapterCap
  };
}

export function mapDbCoinPackage(pack: DbCoinPackage): CoinPackage {
  return {
    id: pack.id,
    coins: pack.coins,
    bonus: pack.bonusCoins,
    price: pack.priceCents / 100,
    badge: pack.name,
    campaign: pack.campaign
  };
}

export async function getPublishedStoryCards(limit?: number) {
  try {
    const dbStories = await prisma.story.findMany({
      where: { published: true },
      include: { chapters: { where: { status: "PUBLISHED" }, orderBy: { number: "asc" } } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    return dbStories.length ? dbStories.map((story) => mapDbStoryToCard(story)) : fallbackStories.slice(0, limit ?? fallbackStories.length);
  } catch {
    return fallbackStories.slice(0, limit ?? fallbackStories.length);
  }
}

export async function getActiveCoinPackageCards() {
  try {
    const dbPackages = await prisma.coinPackage.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" }
    });

    return dbPackages.length ? dbPackages.map(mapDbCoinPackage) : fallbackPackages;
  } catch {
    return fallbackPackages;
  }
}

export async function getPublishedStoryCardBySlug(slug: string) {
  try {
    const dbStory = await prisma.story.findFirst({
      where: { slug, published: true },
      include: { chapters: { where: { status: "PUBLISHED" }, orderBy: { number: "asc" } } }
    });

    if (dbStory) {
      return mapDbStoryToCard(dbStory);
    }
  } catch {
    // Fall through to local fallback content.
  }

  return fallbackStories.find((story) => story.slug === slug) ?? null;
}

export async function getReaderStoryBySlug(slug: string, userId: string) {
  try {
    const dbStory = await prisma.story.findFirst({
      where: { slug, published: true },
      include: { chapters: { where: { status: "PUBLISHED" }, orderBy: { number: "asc" } } }
    });

    if (!dbStory) {
      return null;
    }

    const [wallet, purchases] = await Promise.all([
      prisma.wallet.upsert({ where: { userId }, create: { userId, balance: 0 }, update: {} }),
      prisma.purchase.findMany({ where: { userId, storyId: dbStory.id }, select: { chapterId: true } })
    ]);
    const unlockedChapterIds = new Set(purchases.map((purchase) => purchase.chapterId));

    return {
      story: mapDbStoryToCard(dbStory, unlockedChapterIds),
      walletBalance: wallet.balance
    };
  } catch {
    const fallback = fallbackStories.find((story) => story.slug === slug) ?? null;
    return fallback ? { story: fallback, walletBalance: 0 } : null;
  }
}

export async function getStoryStudioData(storyId: string) {
  try {
    const link = await prisma.studioProjectLink.findUnique({
      where: { storyId: storyId }
    });
    if (!link) return null;

    const [namingFile, manifestFile] = await Promise.all([
      prisma.studioProjectFile.findUnique({
        where: { studioProjectId_path: { studioProjectId: link.id, path: "Story_Naming.json" } }
      }),
      prisma.studioProjectFile.findUnique({
        where: { studioProjectId_path: { studioProjectId: link.id, path: "Chapters_info.json" } }
      })
    ]);

    const naming = namingFile && namingFile.jsonContent ? (namingFile.jsonContent as any) : null;
    const manifest = manifestFile && manifestFile.jsonContent ? (manifestFile.jsonContent as any) : null;

    return {
      naming,
      manifest
    };
  } catch (err) {
    console.error("Error fetching story studio data", err);
    return null;
  }
}