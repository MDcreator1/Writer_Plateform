import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { signSessionToken, verifySessionToken, signChapterAccessToken } from "./jwt";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function hashEmail(email: string) {
  return sha256(email.trim().toLowerCase());
}

export function createFingerprint(userId: string, chapterId: string, sessionId: string) {
  return sha256(`${userId}:${chapterId}:${sessionId}:${Date.now()}`).slice(0, 32);
}

export function embedInvisibleFingerprint(content: string, fingerprint: string) {
  const zeroWidth = fingerprint
    .split("")
    .map((char) => (Number.parseInt(char, 16) % 2 ? "\u200b" : "\u200c"))
    .join("");
  return `${content}${zeroWidth}`;
}

export function encryptChapterContent(plainText: string) {
  const key = createHash("sha256").update(process.env.AUTH_SECRET || "dev-key").digest();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedContent: encrypted.toString("base64"),
    contentNonce: nonce.toString("base64"),
    contentAuthTag: authTag.toString("base64")
  };
}

export function decryptChapterContent(encryptedContent: string, contentNonce: string, contentAuthTag: string) {
  const key = createHash("sha256").update(process.env.AUTH_SECRET || "dev-key").digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(contentNonce, "base64"));
  decipher.setAuthTag(Buffer.from(contentAuthTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedContent, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export { signSessionToken, verifySessionToken, signChapterAccessToken };

export function buildWatermark(input: {
  userId: string;
  username: string;
  email: string;
  sessionId: string;
}) {
  return {
    visible: `${input.username} · ${input.userId} · ${new Date().toISOString()}`,
    invisible: `${hashEmail(input.email)}:${input.sessionId}:${Date.now()}`
  };
}
