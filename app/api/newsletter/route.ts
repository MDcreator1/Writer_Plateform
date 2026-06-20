import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local";
    const limit = rateLimit(`newsletter:${ip}`, 8, 60_000);
    if (!limit.allowed) {
      return fail("Too many newsletter attempts.", 429, "RATE_LIMITED");
    }
    const body = schema.parse(await request.json());
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: body.email.toLowerCase() },
      create: { email: body.email.toLowerCase(), source: body.source },
      update: { source: body.source }
    });
    return ok(subscriber);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to subscribe", 400);
  }
}
