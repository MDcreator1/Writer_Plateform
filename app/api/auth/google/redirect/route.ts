import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "गूगल लॉगिन कॉन्फ़िगर नहीं है (.env में GOOGLE_CLIENT_ID/SECRET अनुपलब्ध है)। कृपया डेवलपर से संपर्क करें।"
        }
      },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  // Generate random state
  const state = crypto.randomUUID();

  // Store state in a cookie
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5 // 5 minutes
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(googleClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid%20email%20profile` +
    `&state=${state}` +
    `&prompt=select_account`;

  return NextResponse.redirect(authUrl);
}
