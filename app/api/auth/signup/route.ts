import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupCheckSchema = z.object({
  email: z.string().email("कृपया एक मान्य ईमेल दर्ज करें।")
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = signupCheckSchema.parse(json);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.registrationStep >= 6) {
        return NextResponse.json({
          ok: false,
          code: "ACCOUNT_EXISTS",
          status: "REGISTERED",
          message: "यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।"
        }, { status: 409 });
      } else {
        // Incomplete registration
        return NextResponse.json({
          ok: true,
          status: "INCOMPLETE",
          registrationStep: user.registrationStep,
          message: "आपका पंजीकरण अधूरा है। कृपया इसे पूरा करने के लिए सत्यापित करें।"
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: "NEW",
      message: "ईमेल पंजीकरण के लिए उपलब्ध है।"
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: { message: error.errors[0]?.message || "अमान्य ईमेल" } },
        { status: 400 }
      );
    }
    console.error("Signup check error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "ईमेल जाँच करने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
