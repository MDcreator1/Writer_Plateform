import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || ""; // "reported", "hidden", "all"
    const query = searchParams.get("q")?.trim() || "";

    const where: Prisma.CommentWhereInput = {};

    if (query) {
      where.body = { contains: query, mode: "insensitive" };
    }

    if (filter === "hidden") {
      where.hidden = true;
    } else if (filter === "reported") {
      where.reports = { some: {} };
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
        story: { select: { id: true, title: true } },
        chapter: { select: { id: true, title: true, number: true } },
        reports: { include: { user: { select: { username: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return ok(comments);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to list comments.", 500);
  }
}
