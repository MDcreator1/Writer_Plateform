import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const token = crypto.randomUUID();
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (user) {
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash: sha256(token),
          purpose: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 1000 * 60 * 20)
        }
      });
    }
    return ok({ message: "If the account exists, a reset email has been queued." });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to request password reset", 400);
  }
}
