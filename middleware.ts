import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/chapters") || pathname.startsWith("/api/studio")) {
    response.headers.set("Cache-Control", "no-store");
  }

  // Session route protection for incomplete profiles
  const sessionCookie = request.cookies.get("velora_session")?.value;

  if (sessionCookie) {
    try {
      const payload = await verifySessionToken(sessionCookie);

      // If registration step is incomplete (< 6), protect all pages except auth, api, and assets
      if (payload.registrationStep && payload.registrationStep < 6) {
        const isAuthPage = pathname === "/auth";
        const isApiRoute = pathname.startsWith("/api/");
        const isAsset =
          pathname.startsWith("/_next/") ||
          pathname.includes(".") ||
          pathname === "/favicon.ico";

        if (!isAuthPage && !isApiRoute && !isAsset) {
          const redirectUrl = new URL("/auth", request.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (err) {
      // Invalid token, let normal flow handle it (user will be treated as guest)
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
