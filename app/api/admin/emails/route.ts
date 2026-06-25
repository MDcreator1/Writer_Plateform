import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const query = searchParams.get("q")?.trim() || "";

    const where: Prisma.EmailQueueWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (query) {
      where.email = { contains: query, mode: "insensitive" };
    }

    const emails = await prisma.emailQueue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formatted = emails.map((e) => ({
      id: e.id,
      email: e.email,
      subject: e.subject,
      bodyExcerpt: e.body.slice(0, 100),
      status: e.status,
      attempts: e.attempts,
      error: e.error || "-",
      date: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(e.createdAt),
      sentAt: e.sentAt ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(e.sentAt) : "-"
    }));

    return ok(formatted);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to list email queue.", 500);
  }
}
