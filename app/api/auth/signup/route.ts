import { Prisma } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEmail, sha256 } from "@/lib/security";

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json());
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        username: body.username,
        passwordHash,
        wallet: { create: { balance: 0 } },
        verificationTokens: {
          create: {
            email: body.email.toLowerCase(),
            tokenHash: sha256(crypto.randomUUID()),
            purpose: "EMAIL_VERIFY",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
          }
        }
      }
    });
    const { token } = await createSession(user, request.headers);
    await setSessionCookie(token);
    return ok({
      user: { id: user.id, username: user.username, emailHash: hashEmail(user.email) },
      nextStep: "VERIFY_EMAIL"
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Enter a valid email, username, and password", 400, "VALIDATION_ERROR");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" or ") : "account";
      return fail(`${target} already exists`, 409, "ACCOUNT_EXISTS");
    }

    return fail("Unable to sign up", 400);
  }
}
