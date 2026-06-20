import { fail, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { sha256 } from "@/lib/security";
import { unlockChapterForUser } from "@/lib/wallet";

type Params = {
  params: Promise<{ chapterId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { chapterId } = await params;
    const ip = request.headers.get("x-forwarded-for") || "local";
    const device = request.headers.get("user-agent") || "unknown";
    const result = await unlockChapterForUser({
      userId: user.id,
      chapterId,
      sessionId: crypto.randomUUID(),
      ipHash: sha256(ip),
      deviceHash: sha256(device)
    });
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to unlock chapter";
    return fail(message, message === "INSUFFICIENT_COINS" ? 402 : 400);
  }
}
