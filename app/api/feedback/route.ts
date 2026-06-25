import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  rating: z.number().int().min(3, "Feedback rating must be at least 3 stars").max(5),
  comment: z.string().min(1, "Review or suggestion is required").max(1000)
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local";
    const limit = rateLimit(`feedback:${ip}`, 5, 60_000); // 5 submissions per minute
    if (!limit.allowed) {
      return fail("Too many submissions. Please wait a minute.", 429, "RATE_LIMITED");
    }
    const body = schema.parse(await request.json());
    const feedback = await prisma.feedback.create({
      data: {
        name: body.name,
        rating: body.rating,
        comment: body.comment
      }
    });
    return ok(feedback);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to submit feedback", 400);
  }
}
