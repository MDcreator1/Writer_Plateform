import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { requireUser, updateSessionStep } from "@/lib/auth";

const mobileActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "कृपया एक मान्य मोबाइल नंबर दर्ज करें (उदा. +91XXXXXXXXXX या 10-अंकीय संख्या)।")
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/),
    code: z.string().length(6, "OTP 6 अंकों का होना चाहिए।")
  }),
  z.object({
    action: z.literal("skip")
  })
]);

export async function POST(request: Request) {
  try {
    // 1. Ensure authenticated
    const currentUser = await requireUser();

    // 2. Parse request action
    const json = await request.json();
    const body = mobileActionSchema.parse(json);

    if (body.action === "send") {
      const { phone } = body;

      // Rate limiting: check recent requests
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentVerification = await prisma.phoneVerification.findFirst({
        where: {
          phoneNumber: phone,
          createdAt: { gte: oneMinuteAgo }
        }
      });

      if (recentVerification) {
        return NextResponse.json(
          { ok: false, error: { message: "कृपया दोबारा OTP भेजने से पहले 1 मिनट प्रतीक्षा करें।" } },
          { status: 429 }
        );
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = sha256(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save to PhoneVerification table
      await prisma.phoneVerification.create({
        data: {
          phoneNumber: phone,
          codeHash,
          expiresAt,
          userId: currentUser.id
        }
      });

      // Local console fallback (Development)
      console.log(`\n=======================================================\n[MOBILE OTP DEV FALLBACK] SMS OTP to: ${phone}\nCode: ${code}\n=======================================================\n`);

      return NextResponse.json({ ok: true, message: "OTP सफलतापूर्वक भेजा गया।" });

    } else if (body.action === "verify") {
      const { phone, code } = body;
      const codeHash = sha256(code);

      // Find the latest active verification record
      const verification = await prisma.phoneVerification.findFirst({
        where: {
          phoneNumber: phone,
          userId: currentUser.id,
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

      // Check code matching
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

      // Update User table
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          phone,
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          registrationStep: 6 // Fully completed
        }
      });

      // Refresh session token
      await updateSessionStep(currentUser.id, 6);

      return NextResponse.json({ ok: true, message: "मोबाइल नंबर सफलतापूर्वक सत्यापित हुआ।", nextStep: 6 });

    } else {
      // action === "skip"
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          registrationStep: 6 // Fully completed (skipped mobile)
        }
      });

      // Refresh session token
      await updateSessionStep(currentUser.id, 6);

      return NextResponse.json({ ok: true, message: "मोबाइल सत्यापन छोड़ दिया गया।", nextStep: 6 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMsg = error.errors[0]?.message || "अमान्य फ़ील्ड्स";
      return NextResponse.json(
        { ok: false, error: { message: errorMsg } },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: { message: "अनधिकृत पहुंच (सत्र समाप्त)।" } },
        { status: 401 }
      );
    }

    console.error("Mobile verification action error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "मोबाइल सत्यापन के दौरान कोई त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
