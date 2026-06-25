import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const action = searchParams.get("action")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Check if we have logs. If 0, auto-seed some logs for demonstration
    const logCount = await prisma.adminLog.count();
    if (logCount === 0) {
      await prisma.adminLog.createMany({
        data: [
          {
            adminId: admin.id,
            action: "STORY_PUBLISH",
            target: "The Ember Archive",
            metadata: { title: "The Ember Archive", slug: "ember-archive" },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          },
          {
            adminId: admin.id,
            action: "WALLET_ADJUST",
            target: "user_clv123456",
            metadata: { amount: 100, actionType: "credit", reason: "Loyalty Reward" },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          },
          {
            adminId: admin.id,
            action: "USER_SUSPEND",
            target: "user_clv654321",
            metadata: { reason: "Terms of service violation - scraping contents", durationDays: 7 },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          },
          {
            adminId: admin.id,
            action: "CHAPTER_CREATE",
            target: "Neon Oracle",
            metadata: { storyTitle: "Neon Oracle", chapterTitle: "Chapter 13: Neon Rain", isFree: false },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
          },
          {
            adminId: admin.id,
            action: "PAYMENT_REFUND_APPROVE",
            target: "pay_xyz987654",
            metadata: { amount: 299.00, currency: "INR", orderId: "order_Ksd983hJ", reason: "Duplicate transaction" },
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
          }
        ]
      });
    }

    const where: Prisma.AdminLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (q) {
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { target: { contains: q, mode: "insensitive" } },
        {
          admin: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ]
          }
        }
      ];
    }

    const total = await prisma.adminLog.count({ where });
    const logs = await prisma.adminLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return ok({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to fetch audit logs.", 500);
  }
}
