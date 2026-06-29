import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { requireUser } from "@/lib/auth";

const verifyOtpSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("email"),
    value: z.string().email(),
    code: z.string().length(6)
  }),
  z.object({
    field: z.literal("phone"),
    value: z.string().regex(/^\+?[1-9]\d{9,14}$/),
    code: z.string().length(6)
  })
]);

export async function POST(request: Request) {
  try {
    const currentUser = await requireUser();
    const json = await request.json();
    const body = verifyOtpSchema.parse(json);

    if (body.field === "email") {
      const email = body.value.toLowerCase();
      const codeHash = sha256(body.code);

      // Prevent duplicate email
      if (email !== currentUser.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json(
            { ok: false, error: { message: "यह ईमेल पहले से किसी अन्य खाते से जुड़ा हुआ है।" } },
            { status: 409 }
          );
        }
      }

      const activeOtp = await prisma.otp.findFirst({
        where: {
          email,
          type: "PROFILE_EMAIL_CHANGE",
          consumedAt: null,
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });

      if (!activeOtp) {
        return NextResponse.json(
          { ok: false, error: { message: "सत्यापन कोड समाप्त हो चुका है या अमान्य है। कृपया नया कोड प्राप्त करें।" } },
          { status: 400 }
        );
      }

      if (activeOtp.attempts >= 5) {
        await prisma.otp.update({
          where: { id: activeOtp.id },
          data: { consumedAt: new Date() }
        });
        return NextResponse.json(
          { ok: false, error: { message: "अत्यधिक असफल प्रयास। कृपया नया OTP मंगवाएं।" } },
          { status: 429 }
        );
      }

      if (activeOtp.codeHash !== codeHash) {
        await prisma.otp.update({
          where: { id: activeOtp.id },
          data: { attempts: { increment: 1 } }
        });
        return NextResponse.json(
          { ok: false, error: { message: `गलत OTP कोड। आपके पास ${5 - activeOtp.attempts - 1} प्रयास शेष हैं।` } },
          { status: 400 }
        );
      }

      // OTP matches — consume and update user
      await prisma.otp.update({
        where: { id: activeOtp.id },
        data: { consumedAt: new Date() }
      });

      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          email,
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      });

      return NextResponse.json({ ok: true, message: "ईमेल सफलतापूर्वक अपडेट हो गया।" });
    } else {
      // phone field
      const phone = body.value;
      const codeHash = sha256(body.code);

      const verification = await prisma.phoneVerification.findFirst({
        where: {
          phoneNumber: phone,
          userId: currentUser.id,
          type: "PROFILE_PHONE_CHANGE",
          verified: false,
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });

      if (!verification) {
        return NextResponse.json(
          { ok: false, error: { message: "सत्यापन कोड समाप्त हो चुका है या अमान्य है। कृपया नया कोड प्राप्त करें।" } },
          { status: 400 }
        );
      }

      if (verification.attempts >= 5) {
        return NextResponse.json(
          { ok: false, error: { message: "अत्यधिक असफल प्रयास। कृपया नया OTP प्राप्त करें।" } },
          { status: 429 }
        );
      }

      if (verification.codeHash !== codeHash) {
        await prisma.phoneVerification.update({
          where: { id: verification.id },
          data: { attempts: { increment: 1 } }
        });
        return NextResponse.json(
          { ok: false, error: { message: `गलत OTP कोड। आपके पास ${5 - verification.attempts - 1} प्रयास शेष हैं।` } },
          { status: 400 }
        );
      }

      // Successful verification
      await prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { verified: true }
      });

      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          phone,
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        }
      });

      return NextResponse.json({ ok: true, message: "मोबाइल नंबर सफलतापूर्वक अपडेट हो गया।" });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: { message: "अनधिकृत पहुंच (सत्र समाप्त)।" } },
        { status: 401 }
      );
    }
    if (error instanceof z.ZodError) {
      const msg = error.errors[0]?.message || "अमान्य फ़ील्ड्स";
      return NextResponse.json(
        { ok: false, error: { message: msg } },
        { status: 400 }
      );
    }
    console.error("Profile OTP verify error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "OTP सत्यापन में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
