import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getCurrentUser, isPrimaryAdminEmail, isPrimaryAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { userId } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      }
    });

    if (!user) {
      return fail("User not found", 404, "NOT_FOUND");
    }

    const [transactions, purchases, bookmarks, readingHistory] = await Promise.all([
      prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.purchase.findMany({
        where: { userId },
        include: {
          chapter: {
            select: {
              title: true,
              number: true,
              story: { select: { title: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.bookmark.findMany({
        where: { userId },
        include: {
          story: { select: { title: true } },
          chapter: { select: { title: true, number: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.readingHistory.findMany({
        where: { userId },
        include: {
          story: { select: { title: true } },
          chapter: { select: { title: true, number: true } }
        },
        orderBy: { lastReadAt: "desc" },
        take: 50
      })
    ]);

    return ok({
      user: { ...user, isPrimaryAdmin: isPrimaryAdminEmail(user.email) },
      transactions,
      purchases,
      bookmarks,
      readingHistory
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Unable to fetch user details", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { userId } = await params;
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return fail("User not found", 404, "NOT_FOUND");
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return fail("Action is required", 400);
    }

    if (action === "promote-writer" || action === "demote-writer") {
      const nextRole = action === "promote-writer" ? "WRITER" : "READER";
      const actionName = action === "promote-writer" ? "PROMOTE_USER_TO_WRITER" : "DEMOTE_WRITER_TO_READER";
      const resultMessage = action === "promote-writer" ? "User promoted to writer successfully" : "Writer access removed successfully";

      if (targetUser.role === nextRole) {
        return ok({ message: resultMessage });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { role: nextRole }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: actionName,
            target: userId,
            metadata: {
              username: targetUser.username,
              email: targetUser.email,
              previousRole: targetUser.role,
              nextRole
            }
          }
        });
      });

      return ok({ message: resultMessage });
    }

    if (action === "promote-admin" || action === "demote-admin") {
      if (!isPrimaryAdminUser(admin)) {
        return fail("Only the primary admin configured in environment variables can manage admin roles", 403, "PRIMARY_ADMIN_REQUIRED");
      }

      if (isPrimaryAdminEmail(targetUser.email)) {
        return fail("Primary admin role is locked to environment variables", 400, "PRIMARY_ADMIN_ENV_LOCKED");
      }

      const nextRole = action === "promote-admin" ? "ADMIN" : "READER";
      const actionName = action === "promote-admin" ? "PROMOTE_USER_TO_ADMIN" : "DEMOTE_ADMIN_TO_READER";
      const resultMessage = action === "promote-admin" ? "User promoted to admin successfully" : "Admin access removed successfully";

      if (targetUser.role === nextRole) {
        return ok({ message: resultMessage });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { role: nextRole }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: actionName,
            target: userId,
            metadata: {
              username: targetUser.username,
              email: targetUser.email,
              previousRole: targetUser.role,
              nextRole
            }
          }
        });
      });

      return ok({ message: resultMessage });
    }

    return await prisma.$transaction(async (tx) => {
      let resultMessage = "";

      if (action === "suspend") {
        await tx.user.update({
          where: { id: userId },
          data: { status: "SUSPENDED" }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "SUSPEND_USER",
            target: userId,
            metadata: { username: targetUser.username, previousStatus: targetUser.status }
          }
        });
        resultMessage = "User suspended successfully";
      } else if (action === "unsuspend") {
        await tx.user.update({
          where: { id: userId },
          data: { status: "ACTIVE" }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "UNSUSPEND_USER",
            target: userId,
            metadata: { username: targetUser.username, previousStatus: targetUser.status }
          }
        });
        resultMessage = "User unsuspended successfully";
      } else if (action === "ban") {
        await tx.user.update({
          where: { id: userId },
          data: { status: "BANNED" }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "BAN_USER",
            target: userId,
            metadata: { username: targetUser.username, previousStatus: targetUser.status }
          }
        });
        resultMessage = "User blocked successfully";
      } else if (action === "force-logout") {
        await tx.session.deleteMany({
          where: { userId }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "FORCE_LOGOUT_USER",
            target: userId,
            metadata: { username: targetUser.username }
          }
        });
        resultMessage = "User sessions revoked successfully";
      } else if (action === "reset-verification") {
        await tx.user.update({
          where: { id: userId },
          data: {
            emailVerifiedAt: null,
            phoneVerifiedAt: null
          }
        });
        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "RESET_VERIFICATION_USER",
            target: userId,
            metadata: { username: targetUser.username }
          }
        });
        resultMessage = "User verification reset successfully";
      } else {
        throw new Error("INVALID_ACTION");
      }

      return ok({ message: resultMessage });
    });
  } catch (err) {
    return fail(err instanceof Error && err.message === "INVALID_ACTION" ? "Invalid action specified" : "Action execution failed", 400);
  }
}
