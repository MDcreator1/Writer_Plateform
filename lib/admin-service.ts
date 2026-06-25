import { getSubscriptionStats } from "@/lib/subscription-service";
import "server-only";
import { Prisma } from "@prisma/client";
import { mapDbStoryToCard } from "@/lib/content-service";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
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
    payments,
    stories,
    coinPackages,
    studioProjects,
    subscriptionPayments,
    monthlyRevenuePayments,
    pendingRefundsCount,
    newRegistrationsCount,
    totalUsersCount,
    purchasingUsersCount,
    paymentsIn30Days,
    purchasesIn30Days,
    usersIn30Days,
    storyPopularityData,
    mostViewedChaptersData,
    subscriptionStats
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { phoneVerifiedAt: { not: null } } }),
    prisma.story.count(),
    prisma.chapter.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true, coinsAdded: true } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.findMany({
      where: searchWhere,
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.story.findMany({
      include: { chapters: { where: { status: { not: "TRASH" } }, orderBy: { number: "asc" } } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }).then(dbStories => dbStories.map(s => mapDbStoryToCard(s))),
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
    prisma.story.findMany({
      select: {
        id: true,
        title: true,
        readsCount: true,
        _count: { select: { bookmarks: true, comments: true } }
      },
      orderBy: { readsCount: "desc" },
      take: 5
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
      storyPopularity: storyPopularityData.map(s => ({
        id: s.id,
        title: s.title,
        reads: s.readsCount,
        bookmarks: s._count.bookmarks,
        comments: s._count.comments
      })),
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

  const storyPurchases = await prisma.purchase.findMany({
    where: { storyId },
    select: { coinCost: true }
  });

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
      ratingAverage: story.ratingAverage,
      readsCount: story.readsCount,
      defaultChapterCoinPrice: story.defaultChapterCoinPrice,
      freeChapterCap: story.freeChapterCap,
      origin: story.origin,
      createdAt: story.createdAt,
      visibility: story.visibility,
      publicationStatus: story.publicationStatus,
      scheduledAt: story.scheduledAt,
      bookmarksCount: story._count.bookmarks,
      commentsCount: story._count.comments,
      ratingsCount: story._count.ratings
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