import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/security";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const payload = await verifySessionToken(token);
      await prisma.session.update({
        where: { id: payload.sessionId },
        data: { revokedAt: new Date() }
      });
    } catch {
      // Invalid or already-removed sessions still get a cleared cookie below.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
