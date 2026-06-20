import "server-only";
import { prisma } from "@/lib/prisma";
import { createFingerprint } from "@/lib/security";

export async function unlockChapterForUser(input: {
  userId: string;
  chapterId: string;
  sessionId: string;
  ipHash?: string;
  deviceHash?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const chapter = await tx.chapter.findUnique({
      where: { id: input.chapterId },
      include: { story: true }
    });
    if (!chapter || chapter.status !== "PUBLISHED") {
      throw new Error("CHAPTER_NOT_AVAILABLE");
    }

    const existing = await tx.purchase.findUnique({
      where: {
        userId_chapterId: {
          userId: input.userId,
          chapterId: input.chapterId
        }
      }
    });
    if (chapter.isFree || existing) {
      return { alreadyUnlocked: true, coinBalance: null, chapter };
    }

    const wallet = await tx.wallet.findUnique({ where: { userId: input.userId } });
    if (!wallet || wallet.balance < chapter.coinPrice) {
      throw new Error("INSUFFICIENT_COINS");
    }

    const walletAfter = wallet.balance - chapter.coinPrice;
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: walletAfter }
    });

    const fingerprint = createFingerprint(input.userId, input.chapterId, input.sessionId);
    await tx.purchase.create({
      data: {
        userId: input.userId,
        chapterId: input.chapterId,
        storyId: chapter.storyId,
        coinCost: chapter.coinPrice,
        fingerprint
      }
    });

    await tx.coinTransaction.create({
      data: {
        userId: input.userId,
        walletId: wallet.id,
        type: "UNLOCK",
        amount: -chapter.coinPrice,
        balanceAfter: walletAfter,
        description: `Unlocked ${chapter.title}`,
        referenceId: chapter.id
      }
    });

    await tx.unlockEvent.create({
      data: {
        userId: input.userId,
        chapterId: input.chapterId,
        walletBefore: wallet.balance,
        walletAfter,
        coinCost: chapter.coinPrice,
        ipHash: input.ipHash,
        deviceHash: input.deviceHash
      }
    });

    return { alreadyUnlocked: false, coinBalance: walletAfter, chapter, fingerprint };
  });
}
