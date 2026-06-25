import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET || "development-secret-change-before-production";
  return encoder.encode(secret.padEnd(32, "0").slice(0, 64));
}

export async function signSessionToken(payload: {
  userId: string;
  role: string;
  sessionId: string;
  registrationStep?: number;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const verified = await jwtVerify(token, getSecret());
  return verified.payload as {
    userId: string;
    role: string;
    sessionId: string;
    registrationStep?: number;
    exp: number;
  };
}

export async function signChapterAccessToken(payload: {
  userId: string;
  chapterId: string;
  sessionId: string;
  fingerprint: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}
