import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePage } from "@/components/profile-page";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your profile, email, phone, and personal details."
};

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <ProfilePage
      initialUser={{
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username,
        displayName: user.displayName,
        age: user.age,
        gender: user.gender,
        profileImage: user.profileImage,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null
      }}
    />
  );
}
