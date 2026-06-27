import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, isPrimaryAdminEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  // Clear state cookie immediately
  cookieStore.delete("google_oauth_state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/auth?error=csrf_error`);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  try {
    // 1. Exchange auth code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId!,
        client_secret: googleClientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Google token exchange error:", tokenData);
      return NextResponse.redirect(`${appUrl}/auth?error=token_error`);
    }

    const { access_token } = tokenData;

    // 2. Fetch user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.error("Google profile fetch error:", profileData);
      return NextResponse.redirect(`${appUrl}/auth?error=profile_error`);
    }

    const { id: googleId, email, name, picture } = profileData;
    const lowerEmail = email.toLowerCase();

    // 3. Find or Create User
    let user = await prisma.user.findUnique({
      where: { email: lowerEmail },
      include: { accounts: true }
    });

    if (user) {
      // User exists. Ensure Google account is linked
      const hasGoogleLink = user.accounts.some(acc => acc.provider === "google");
      if (!hasGoogleLink) {
        await prisma.authAccount.create({
          data: {
            userId: user.id,
            provider: "google",
            providerAccountId: googleId
          }
        });
      }
    } else {
      // Create new user (skip verification because Google email is already verified)
      const firstLetter = (name || email)[0].toUpperCase();
      const isSystemAdmin = isPrimaryAdminEmail(lowerEmail);

      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          role: isSystemAdmin ? "ADMIN" : "READER",
          displayName: name || null,
          avatarLetter: firstLetter,
          profileImage: picture || null,
          image: picture || null,
          registrationStep: 3, // Directly go to Complete Profile step
          wallet: { create: { balance: 0 } },
          accounts: {
            create: {
              provider: "google",
              providerAccountId: googleId
            }
          }
        },
        include: { accounts: true }
      });
    }

    // 4. Log the user in (create session and set session cookie)
    const { token } = await createSession(user, request.headers);

    // Redirect to home if completed, otherwise back to auth to continue profile setup
    const response = NextResponse.redirect(user.registrationStep >= 6 ? `${appUrl}/` : `${appUrl}/auth`);
    response.cookies.set("velora_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;

  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    return NextResponse.redirect(`${appUrl}/auth?error=server_error`);
  }
}
