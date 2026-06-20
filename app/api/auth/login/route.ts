import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      return fail("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid || user.status !== "ACTIVE") {
      return fail("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    const { token } = await createSession(user, request.headers);
    await setSessionCookie(token);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return ok({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Enter a valid email and password", 400, "VALIDATION_ERROR");
    }
    return fail("Unable to login", 400);
  }
}
