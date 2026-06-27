import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { createSession, isPrimaryAdminEmail, setSessionCookie } from "@/lib/auth";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(["REGISTRATION", "LOGIN"])
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = verifyOtpSchema.parse(json);
    const email = body.email.toLowerCase();
    const codeHash = sha256(body.code);

    // Find the latest active (unconsumed, unexpired) OTP record for this email and type
    const activeOtp = await prisma.otp.findFirst({
      where: {
        email,
        type: body.type,
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

    // Rate-limiting check: Max 5 attempts
    if (activeOtp.attempts >= 5) {
      // Consume the OTP so it cannot be used again
      await prisma.otp.update({
        where: { id: activeOtp.id },
        data: { consumedAt: new Date() }
      });
      return NextResponse.json(
        { ok: false, error: { message: "अत्यधिक असफल प्रयास। कृपया नया OTP कोड मंगवाएं।" } },
        { status: 429 }
      );
    }

    // Check if the hash matches
    if (activeOtp.codeHash !== codeHash) {
      // Increment attempts
      await prisma.otp.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } }
      });

      return NextResponse.json(
        { ok: false, error: { message: `गलत OTP कोड। आपके पास ${5 - activeOtp.attempts - 1} प्रयास शेष हैं।` } },
        { status: 400 }
      );
    }

    // OTP matches! Consume it
    await prisma.otp.update({
      where: { id: activeOtp.id },
      data: { consumedAt: new Date() }
    });

    // Handle flow based on type (REGISTRATION or LOGIN)
    if (body.type === "REGISTRATION") {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        if (existingUser.registrationStep >= 6) {
          return NextResponse.json(
            { ok: false, error: { message: "यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।" } },
            { status: 400 }
          );
        }

        // Incomplete registration: log them in and let them continue from where they left off
        const { token } = await createSession(existingUser, request.headers);
        await setSessionCookie(token);

        return NextResponse.json({
          ok: true,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            username: existingUser.username
          },
          nextStep: existingUser.registrationStep
        });
      }

      const isSystemAdmin = isPrimaryAdminEmail(email);

      // Create draft user
      const user = await prisma.user.create({
        data: {
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          role: isSystemAdmin ? "ADMIN" : "READER",
          registrationStep: 3, // Skip to Complete Profile (Username, Age, Gender)
          wallet: { create: { balance: 0 } }
        }
      });

      const { token } = await createSession(user, request.headers);
      await setSessionCookie(token);

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          username: null
        },
        nextStep: 3
      });

    } else {
      // LOGIN Flow
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return NextResponse.json(
          { ok: false, code: "USER_NOT_FOUND", error: { message: "यह ईमेल पंजीकृत नहीं है। कृपया पहले पंजीकरण करें।" } },
          { status: 404 }
        );
      }

      // Log in
      const { token } = await createSession(user, request.headers);
      await setSessionCookie(token);

      // If user's registration is incomplete, they will redirect to complete profile
      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          username: user.username
        },
        nextStep: user.registrationStep
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: { message: "कृपया एक मान्य 6-अंकीय OTP और ईमेल दर्ज करें।" } },
        { status: 400 }
      );
    }
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "OTP सत्यापन में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
