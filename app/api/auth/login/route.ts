import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    // 1. Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // User not found. Prompt them to register first.
      return fail("यह ईमेल पंजीकृत नहीं है। कृपया पहले पंजीकरण करें।", 404, "USER_NOT_FOUND");
    }

    // 2. Check if user has password login enabled
    if (!user.passwordHash) {
      return fail("इस खाते के लिए कोई पासवर्ड सेट नहीं है। कृपया OTP या गूगल से लॉगिन करें।", 400, "NO_PASSWORD");
    }

    // 3. Verify password
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return fail("गलत पासवर्ड। क्या आप OTP से लॉगिन करना चाहते हैं?", 401, "PASSWORD_INCORRECT");
    }

    // 4. Check account status
    if (user.status !== "ACTIVE") {
      return fail("आपका खाता सक्रिय नहीं है। कृपया व्यवस्थापक से संपर्क करें।", 403, "ACCOUNT_INACTIVE");
    }

    // 5. Create Session & Cookie
    const { token } = await createSession(user, request.headers);
    await setSessionCookie(token);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return ok({
      user: { id: user.id, username: user.username, role: user.role },
      nextStep: user.registrationStep
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("कृपया एक मान्य ईमेल और पासवर्ड दर्ज करें।", 400, "VALIDATION_ERROR");
    }
    console.error("Login route error:", error);
    return fail("लॉगिन करने में असमर्थ। कृपया पुनः प्रयास करें।", 500);
  }
}
