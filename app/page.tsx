import { HomePage } from "@/components/home-page";
import { getCurrentUser } from "@/lib/auth";
import { platformStats } from "@/lib/content";
import { getActiveCoinPackageCards, getPublishedStoryCards } from "@/lib/content-service";
import { getMonetizationSettings } from "@/lib/monetization-service";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const [user, stories, coinPackages, monetizationSettings, dbWriterNote, layoutConfig] = await Promise.all([
    getCurrentUser(),
    getPublishedStoryCards(),
    getActiveCoinPackageCards(),
    getMonetizationSettings(),
    prisma.writerNote.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.pageLayout.findUnique({ where: { pageName: "home" } })
  ]);

  return (
    <HomePage
      activeLayout={layoutConfig?.layoutName ?? "classic"}
      coinPackages={coinPackages}
      isAuthenticated={Boolean(user)}
      currentUser={
        user
          ? {
              displayName: user.displayName,
              email: user.email,
              role: user.role,
              username: user.username || ""
            }
          : null
      }
      platformStats={platformStats}
      stories={stories}
      userRole={user?.role ?? null}
      monetizationSettings={monetizationSettings}
      writerNote={
        dbWriterNote
          ? {
              content: dbWriterNote.content,
              twitter: dbWriterNote.twitter,
              instagram: dbWriterNote.instagram,
              facebook: dbWriterNote.facebook,
              youtube: dbWriterNote.youtube,
              linkedin: dbWriterNote.linkedin
            }
          : null
      }
    />
  );
}