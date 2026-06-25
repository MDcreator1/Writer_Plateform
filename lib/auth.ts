import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { signSessionToken, verifySessionToken } from "@/lib/jwt";

export const SESSION_COOKIE = "velora_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; role: string; registrationStep?: number }, requestHeaders?: Headers) {
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
    sessionId: session.id,
    registrationStep: user.registrationStep ?? 1
  });
  return { session, token };
}

export async function updateSessionStep(userId: string, step: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;
  try {
    const payload = await verifySessionToken(token);
    if (payload.userId !== userId) return;
    const newToken = await signSessionToken({
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      registrationStep: step
    });
    await setSessionCookie(newToken);
  } catch (err) {
    console.error("Failed to update session step:", err);
  }
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

    // Dynamically elevate to ADMIN if configured in .env
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
    if (adminEmail && session.user.email.toLowerCase() === adminEmail && session.user.role !== "ADMIN") {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "ADMIN" }
      });
      return updatedUser;
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
