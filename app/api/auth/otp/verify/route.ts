import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const token = await prisma.verificationToken.findFirst({
      where: {
        email: body.email.toLowerCase(),
        tokenHash: sha256(body.code),
        purpose: "OTP",
        consumedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
    if (!token) {
      return fail("Invalid or expired OTP", 401, "INVALID_OTP");
    }
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() }
    });
    return ok({ verified: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to verify OTP", 400);
  }
}
