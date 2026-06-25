import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      return fail("emailId is required.", 400);
    }

    const email = await prisma.emailQueue.findUnique({ where: { id: emailId } });
    if (!email) {
      return fail("Email not found in queue.", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.emailQueue.update({
        where: { id: emailId },
        data: {
          status: "PENDING",
          attempts: 0,
          error: null,
          sentAt: null
        }
      });

      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          action: "EMAIL_RESEND",
          target: emailId,
          metadata: { recipient: email.email, subject: email.subject }
        }
      });

      return res;
    });

    return ok({ message: "Email marked as PENDING and queued for resending.", email: updated });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to resend email.", 500);
  }
}
