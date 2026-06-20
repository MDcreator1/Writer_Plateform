import { HomePage } from "@/components/home-page";
import { getCurrentUser } from "@/lib/auth";
import { platformStats } from "@/lib/content";
import { getActiveCoinPackageCards, getPublishedStoryCards } from "@/lib/content-service";

export default async function Page() {
  const [user, stories, coinPackages] = await Promise.all([
    getCurrentUser(),
    getPublishedStoryCards(),
    getActiveCoinPackageCards()
  ]);

  return (
    <HomePage
      coinPackages={coinPackages}
      isAuthenticated={Boolean(user)}
      currentUser={
        user
          ? {
              displayName: user.displayName,
              email: user.email,
              role: user.role,
              username: user.username
            }
          : null
      }
      platformStats={platformStats}
      stories={stories}
      userRole={user?.role ?? null}
    />
  );
}