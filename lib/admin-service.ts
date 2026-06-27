import { getSubscriptionStats } from "@/lib/subscription-service";
import "server-only";
import { Prisma } from "@prisma/client";
import { mapDbStoryToCard } from "@/lib/content-service";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

type StoryEngagementMetrics = {
  readsCount: number;
  ratingAverage: number;
  ratingsCount: number;
};

function emptyStoryEngagement(): StoryEngagementMetrics {
  return {
    readsCount: 0,
    ratingAverage: 0,
    ratingsCount: 0
  };
}

async function getStoryEngagementMetrics(storyIds: string[]) {
  const metrics = new Map<string, StoryEngagementMetrics>();
  storyIds.forEach((storyId) => metrics.set(storyId, emptyStoryEngagement()));

  if (storyIds.length === 0) {
    return metrics;
  }

  const [readsByStory, ratingsByStory] = await Promise.all([
    prisma.readingHistory.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds } },
      _count: { _all: true }
    }),
    prisma.rating.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds } },
      _avg: { value: true },
      _count: { _all: true }
    })
  ]);

  readsByStory.forEach((row) => {
    const current = metrics.get(row.storyId) ?? emptyStoryEngagement();
    metrics.set(row.storyId, {
      ...current,
      readsCount: row._count._all
    });
  });

  ratingsByStory.forEach((row) => {
    const current = metrics.get(row.storyId) ?? emptyStoryEngagement();
    metrics.set(row.storyId, {
      ...current,
      ratingAverage: row._avg.value ?? 0,
      ratingsCount: row._count._all
    });
  });

  return metrics;
}

export async function getAdminDashboardData(searchQuery = "") {
  const query = searchQuery.trim();
  const searchWhere: Prisma.PaymentWhereInput = query
    ? {
        OR: [
          { providerOrderId: { contains: query, mode: "insensitive" } },
          { providerPaymentId: { contains: query, mode: "insensitive" } },
          { user: { email: { contains: query, mode: "insensitive" } } },
          { user: { username: { contains: query, mode: "insensitive" } } },
          { user: { displayName: { contains: query, mode: "insensitive" } } }
        ]
      }
    : {};

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [
    usersCount,
    activeUsersCount,
    verifiedUsersCount,
    verifiedPhoneCount,
    storiesCount,
    chaptersCount,
    paidAggregate,
    failedPaymentsCount,
    pendingRefundsCount,
    newRegistrationsCount,
    totalUsersCount,
    purchasingUsersCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { phoneVerifiedAt: { not: null } } }),
    prisma.story.count(),
    prisma.chapter.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true, coinsAdded: true } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.count({
      where: {
        status: "PENDING",
        rawPayload: {
          path: ["refundRequested"],
          equals: true
        }
      }
    }),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        payments: {
          some: { status: "PAID" }
        }
      }
    })
  ]);

  const [
    payments,
    dbStories,
    coinPackages,
    studioProjects,
    subscriptionPayments,
    monthlyRevenuePayments,
    paymentsIn30Days,
    purchasesIn30Days,
    usersIn30Days,
    mostViewedChaptersData,
    subscriptionStats
  ] = await Promise.all([
    prisma.payment.findMany({
      where: searchWhere,
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.story.findMany({
      include: {
        chapters: { where: { status: { not: "TRASH" } }, orderBy: { number: "asc" } },
        _count: { select: { bookmarks: true, comments: true } }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.coinPackage.findMany({
      orderBy: { priceCents: "asc" }
    }),
    prisma.studioProjectLink.findMany({
      select: {
        id: true,
        projectId: true,
        projectTitle: true,
        source: true,
        workspaceMaterializedAt: true,
        story: { select: { id: true, title: true, published: true } },
        _count: { select: { files: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.payment.aggregate({
      where: {
        status: "PAID",
        coinPackage: {
          OR: [
            { name: { contains: "subscription", mode: "insensitive" } },
            { name: { contains: "membership", mode: "insensitive" } },
            { campaign: { contains: "subscription", mode: "insensitive" } }
          ]
        }
      },
      _sum: { amountCents: true }
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", createdAt: { gte: last30Days } },
      _sum: { amountCents: true }
    }),
    prisma.payment.findMany({
      where: { status: "PAID", createdAt: { gte: last30Days } },
      select: { amountCents: true, coinsAdded: true, createdAt: true }
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { coinCost: true, createdAt: true }
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { createdAt: true }
    }),
    prisma.chapter.findMany({
      orderBy: {
        readingHistory: {
          _count: "desc"
        }
      },
      select: {
        id: true,
        title: true,
        story: { select: { title: true } },
        _count: { select: { readingHistory: true, purchases: true } }
      },
      take: 5
    }),
    getSubscriptionStats()
  ]);

  const dailyData: Record<string, { date: string; revenue: number; coins: number; chapterSales: number; users: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyData[dateStr] = {
      date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(d),
      revenue: 0,
      coins: 0,
      chapterSales: 0,
      users: 0
    };
  }

  paymentsIn30Days.forEach((p) => {
    const dateStr = p.createdAt.toISOString().split("T")[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].revenue += p.amountCents / 100;
      dailyData[dateStr].coins += p.coinsAdded;
    }
  });

  purchasesIn30Days.forEach((p) => {
    const dateStr = p.createdAt.toISOString().split("T")[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].chapterSales += p.coinCost;
    }
  });

  usersIn30Days.forEach((u) => {
    const dateStr = u.createdAt.toISOString().split("T")[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].users += 1;
    }
  });

  const chartTimeline = Object.values(dailyData);
  const conversionRate = totalUsersCount > 0 ? (purchasingUsersCount / totalUsersCount) * 100 : 0;
  const subscriptionRevenue = (subscriptionPayments._sum.amountCents || 0) / 100;
  const monthlyRevenue = (monthlyRevenuePayments._sum.amountCents || 0) / 100;
  const storyEngagementMetrics = await getStoryEngagementMetrics(dbStories.map((story) => story.id));
  const stories = dbStories.map((story) => {
    const metrics = storyEngagementMetrics.get(story.id) ?? emptyStoryEngagement();
    return mapDbStoryToCard({
      ...story,
      readsCount: metrics.readsCount,
      ratingAverage: metrics.ratingAverage
    });
  });
  const storyPopularity = dbStories
    .map((story) => {
      const metrics = storyEngagementMetrics.get(story.id) ?? emptyStoryEngagement();
      return {
        id: story.id,
        title: story.title,
        reads: metrics.readsCount,
        bookmarks: story._count.bookmarks,
        comments: story._count.comments
      };
    })
    .sort((a, b) => b.reads - a.reads || b.bookmarks - a.bookmarks || b.comments - a.comments)
    .slice(0, 5);

  return {
    analytics: {
      totalUsers: usersCount,
      activeUsers: activeUsersCount,
      verifiedUsers: verifiedUsersCount,
      verifiedPhoneUsers: verifiedPhoneCount,
      totalStories: storiesCount,
      totalChapters: chaptersCount,
      totalRevenue: (paidAggregate._sum.amountCents || 0) / 100,
      totalCoinSales: paidAggregate._sum.coinsAdded || 0,
      subscriptionRevenue,
      monthlyRevenue,
      pendingRefunds: pendingRefundsCount,
      failedPayments: failedPaymentsCount,
      newRegistrations: newRegistrationsCount,
      conversionRate
    },
    chartData: {
      timeline: chartTimeline,
      storyPopularity,
      mostViewedChapters: mostViewedChaptersData.map(c => ({
        id: c.id,
        title: c.title,
        storyTitle: c.story?.title || "Unknown Story",
        views: c._count.readingHistory,
        unlocks: c._count.purchases
      }))
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      user: payment.user.displayName || payment.user.username,
      email: payment.user.email,
      orderId: payment.providerOrderId || "-",
      paymentId: payment.providerPaymentId || "-",
      packageName: payment.coinPackage?.name || "Coin package",
      amountPaid: payment.amountCents / 100,
      coinsReceived: payment.coinsAdded || ((payment.coinPackage?.coins || 0) + (payment.coinPackage?.bonusCoins || 0)),
      method: payment.paymentMethod || "Razorpay",
      status: payment.status.toLowerCase(),
      date: formatDate(payment.createdAt)
    })),
    stories,
    coinPackages,
    studioProjects: studioProjects.map((link) => ({
      id: link.id,
      projectId: link.projectId,
      projectTitle: link.projectTitle,
      source: link.source,
      storyId: link.story.id,
      storyTitle: link.story.title,
      published: link.story.published,
      cloudFileCount: link._count.files,
      cloudUpdatedAt: link.workspaceMaterializedAt?.toISOString() || null
    })),
    subscriptionStats
  };
}

export async function getAdminStoryDetails(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: {
          purchases: {
            select: { coinCost: true }
          }
        }
      },
      studioProject: {
        select: {
          id: true,
          projectId: true,
          projectTitle: true,
          source: true,
          workspaceMaterializedAt: true,
          _count: { select: { files: true } }
        }
      },
      _count: {
        select: {
          bookmarks: true,
          comments: true,
          ratings: true
        }
      }
    }
  });

  if (!story) return null;

  const [storyPurchases, realReadsCount, ratingMetrics] = await Promise.all([
    prisma.purchase.findMany({
      where: { storyId },
      select: { coinCost: true }
    }),
    prisma.readingHistory.count({ where: { storyId } }),
    prisma.rating.aggregate({
      where: { storyId },
      _avg: { value: true },
      _count: { _all: true }
    })
  ]);

  const totalPurchases = storyPurchases.length;
  const totalRevenueCoins = storyPurchases.reduce((sum, p) => sum + p.coinCost, 0);

  const chaptersWithStats = story.chapters.map((ch) => {
    const rev = ch.purchases.reduce((sum, p) => sum + p.coinCost, 0);
    return {
      id: ch.id,
      number: ch.number,
      title: ch.title,
      status: ch.status,
      coinPrice: ch.coinPrice,
      isFree: ch.isFree,
      studioDocumentId: ch.studioDocumentId,
      purchaseCount: ch.purchases.length,
      totalRevenueCoins: rev
    };
  });

  return {
    story: {
      id: story.id,
      title: story.title,
      slug: story.slug,
      genre: story.genre,
      description: story.description,
      authorName: story.authorName,
      coverUrl: story.coverUrl,
      storyType: story.storyType,
      ratingAverage: ratingMetrics._avg.value ?? 0,
      readsCount: realReadsCount,
      defaultChapterCoinPrice: story.defaultChapterCoinPrice,
      freeChapterCap: story.freeChapterCap,
      origin: story.origin,
      createdAt: story.createdAt,
      visibility: story.visibility,
      publicationStatus: story.publicationStatus,
      scheduledAt: story.scheduledAt,
      bookmarksCount: story._count.bookmarks,
      commentsCount: story._count.comments,
      ratingsCount: ratingMetrics._count._all
    },
    chapters: chaptersWithStats,
    studioProject: story.studioProject,
    stats: {
      totalChapters: story.chapters.length,
      publishedChapters: story.chapters.filter((c) => c.status === "PUBLISHED").length,
      draftChapters: story.chapters.filter((c) => c.status === "DRAFT").length,
      trashChapters: story.chapters.filter((c) => c.status === "TRASH").length,
      totalPurchases,
      totalRevenueCoins
    }
  };
}