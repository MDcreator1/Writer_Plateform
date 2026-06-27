import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getCurrentUser, isPrimaryAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";

  const where: Prisma.UserWhereInput = {};

  if (query) {
    where.OR = [
      { email: { contains: query, mode: "insensitive" } },
      { username: { contains: query, mode: "insensitive" } },
      { displayName: { contains: query, mode: "insensitive" } }
    ];
  }

  if (role === "READER" || role === "AUTHOR" || role === "ADMIN") {
    where.role = role;
  }

  if (status === "ACTIVE" || status === "SUSPENDED" || status === "BANNED") {
    where.status = status;
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        phone: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(users.map((user) => ({ ...user, isPrimaryAdmin: isPrimaryAdminEmail(user.email) })));
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to fetch users", 500);
  }
}
