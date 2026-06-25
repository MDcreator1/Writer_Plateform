import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildWatermark,
  createFingerprint,
  decryptChapterContent,
  embedInvisibleFingerprint,
  hashEmail,
  sha256,
  signChapterAccessToken
} from "@/lib/security";

type Params = {
  params: Promise<{ chapterId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { chapterId } = await params;
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.status !== "PUBLISHED") {
      return fail("Chapter unavailable", 404, "CHAPTER_NOT_FOUND");
    }
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_chapterId: {
          userId: user.id,
          chapterId
        }
      }
    });
    if (!chapter.isFree && !purchase) {
      return fail("Chapter is locked", 402, "CHAPTER_LOCKED");
    }

    const sessionId = crypto.randomUUID();
    const fingerprint = purchase?.fingerprint ?? createFingerprint(user.id, chapterId, sessionId);
    const watermarks = buildWatermark({
      userId: user.id,
      username: user.username || user.displayName || "Reader",
      email: user.email,
      sessionId
    });
    const accessToken = await signChapterAccessToken({
      userId: user.id,
      chapterId,
      sessionId,
      fingerprint
    });
    const content = decryptChapterContent(
      chapter.encryptedContent,
      chapter.contentNonce,
      chapter.contentAuthTag
    );
    const protectedContent = embedInvisibleFingerprint(content, fingerprint);
    await prisma.readingSession.create({
      data: {
        userId: user.id,
        chapterId,
        accessTokenHash: sha256(accessToken),
        watermark: `${watermarks.visible}:${hashEmail(watermarks.invisible)}`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10)
      }
    });
    return ok({
      chapter: {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        content: protectedContent
      },
      accessToken,
      watermark: watermarks.visible,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString()
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to load chapter", 400);
  }
}
