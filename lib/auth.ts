import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256, signSessionToken, verifySessionToken } from "@/lib/security";

export const SESSION_COOKIE = "velora_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; role: string }, requestHeaders?: Headers) {
  const headerStore = requestHeaders ?? (await headers());
  const userAgent = headerStore.get("user-agent") || "unknown";
  const ip = headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || "local";
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: crypto.randomUUID(),
      ipHash: sha256(ip),
      userAgentHash: sha256(userAgent),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  });
  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    sessionId: session.id
  });
  return { session, token };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const payload = await verifySessionToken(token);
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true }
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
