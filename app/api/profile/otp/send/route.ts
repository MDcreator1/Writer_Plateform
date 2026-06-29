import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { requireUser } from "@/lib/auth";

type MailTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
};

type MailTransporter = {
  sendMail(input: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
};

type NodemailerLike = {
  createTransport(config: MailTransportConfig): MailTransporter;
};

async function createOptionalMailTransport(config: MailTransportConfig) {
  try {
    const importModule = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<({ default?: NodemailerLike } & Partial<NodemailerLike>)>;
    const mod = await importModule("nodemailer");
    const mailer = mod.default ?? mod;

    if (!mailer.createTransport) {
      return null;
    }

    return mailer.createTransport(config);
  } catch (error) {
    console.warn("Nodemailer is not available. Falling back to console OTP.", error);
    return null;
  }
}

const sendOtpSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("email"), value: z.string().email() }),
  z.object({
    field: z.literal("phone"),
    value: z.string().regex(/^\+?[1-9]\d{9,14}$/, "कृपया एक मान्य मोबाइल नंबर दर्ज करें।")
  })
]);

export async function POST(request: Request) {
  try {
    const currentUser = await requireUser();
    const json = await request.json();
    const body = sendOtpSchema.parse(json);

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    if (body.field === "email") {
      const email = body.value.toLowerCase();

      // Prevent changing to an email already owned by another user
      if (email !== currentUser.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json(
            { ok: false, error: { message: "यह ईमेल पहले से किसी अन्य खाते से जुड़ा हुआ है।" } },
            { status: 409 }
          );
        }
      }

      // Rate limit check
      const recentOtp = await prisma.otp.findFirst({
        where: {
          email,
          type: "PROFILE_EMAIL_CHANGE",
          createdAt: { gte: oneMinuteAgo }
        }
      });

      if (recentOtp) {
        return NextResponse.json(
          { ok: false, error: { message: "कृपया दोबारा OTP भेजने से पहले 1 मिनट प्रतीक्षा करें।" } },
          { status: 429 }
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = sha256(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.otp.create({
        data: {
          email,
          codeHash,
          type: "PROFILE_EMAIL_CHANGE",
          expiresAt
        }
      });

      // Send email
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT || "587";
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASSWORD;
      const smtpFrom = process.env.SMTP_FROM || "no-reply@example.com";
      const isSmtpConfigured = smtpHost && smtpUser && smtpPass;

      if (isSmtpConfigured) {
        try {
          const transporter = await createOptionalMailTransport({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: smtpPort === "465",
            auth: { user: smtpUser, pass: smtpPass }
          });

          if (transporter) {
            const subject = "Velora Fiction - ईमेल बदलाव OTP सत्यापन";
            const text = `आपका OTP कोड ${code} है। यह कोड 10 मिनट के लिए वैध है।`;
            const html = `
              <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #11b8aa;">Velora Fiction</h2>
                <p>नमस्ते,</p>
                <p>आपके प्रोफाइल ईमेल बदलाव अनुरोध के लिए OTP कोड नीचे दिया गया है:</p>
                <div style="font-size: 24px; font-weight: bold; color: #f5509d; padding: 15px 0; letter-spacing: 4px;">
                  ${code}
                </div>
                <p>यह OTP कोड केवल 10 मिनट के लिए वैध है। इसे किसी के साथ साझा न करें।</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666;">यदि आपने यह अनुरोध नहीं किया था, तो कृपया इस ईमेल को अनदेखा करें।</p>
              </div>
            `;

            await transporter.sendMail({ from: smtpFrom, to: email, subject, text, html });

            await prisma.emailQueue.create({
              data: { email, subject, body: text, status: "SENT", sentAt: new Date() }
            });
          }
        } catch (emailErr) {
          console.error("Failed to send SMTP email. Falling back to console log.", emailErr);
          console.log(`\n=======================================================\n[PROFILE EMAIL OTP DEV FALLBACK] Email: ${email}\nCode: ${code}\n=======================================================\n`);
        }
      } else {
        console.log(`\n=======================================================\n[PROFILE EMAIL OTP DEV FALLBACK] Email: ${email}\nCode: ${code}\n=======================================================\n`);
      }

      return NextResponse.json({ ok: true, message: "OTP सफलतापूर्वक भेजा गया।" });
    } else {
      // phone field
      const phone = body.value;

      if (phone === currentUser.phone) {
        return NextResponse.json(
          { ok: false, error: { message: "यह नंबर आपका वर्तमान नंबर है।" } },
          { status: 400 }
        );
      }

      // Rate limit check
      const recentVerification = await prisma.phoneVerification.findFirst({
        where: {
          phoneNumber: phone,
          userId: currentUser.id,
          type: "PROFILE_PHONE_CHANGE",
          createdAt: { gte: oneMinuteAgo }
        }
      });

      if (recentVerification) {
        return NextResponse.json(
          { ok: false, error: { message: "कृपया दोबारा OTP भेजने से पहले 1 मिनट प्रतीक्षा करें।" } },
          { status: 429 }
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = sha256(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.phoneVerification.create({
        data: {
          phoneNumber: phone,
          codeHash,
          type: "PROFILE_PHONE_CHANGE",
          expiresAt,
          userId: currentUser.id
        }
      });

      console.log(`\n=======================================================\n[PROFILE PHONE OTP DEV FALLBACK] Phone: ${phone}\nCode: ${code}\n=======================================================\n`);

      return NextResponse.json({ ok: true, message: "OTP सफलतापूर्वक भेजा गया।" });
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
    console.error("Profile OTP send error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "OTP भेजने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
