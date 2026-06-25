import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
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
const sendOtpSchema = z.object({
  email: z.string().email(),
  type: z.enum(["REGISTRATION", "LOGIN"])
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = sendOtpSchema.parse(json);
    const email = body.email.toLowerCase();

    // 1. Cooldown rate-limit check: Has an OTP been sent in the last 60 seconds?
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentOtp = await prisma.otp.findFirst({
      where: {
        email,
        type: body.type,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentOtp) {
      return NextResponse.json(
        { ok: false, error: { message: "कृपया दोबारा OTP भेजने से पहले 1 मिनट प्रतीक्षा करें।" } },
        { status: 429 }
      );
    }

    // 2. Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 3. Save hashed OTP to Database
    await prisma.otp.create({
      data: {
        email,
        codeHash,
        type: body.type,
        expiresAt
      }
    });

    // 4. Send Email
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
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        if (!transporter) {
          throw new Error("Nodemailer package is not installed.");
        }

        const subject = body.type === "REGISTRATION" ? "Velora Fiction - पंजीकरण OTP सत्यापन" : "Velora Fiction - लॉगिन OTP सत्यापन";
        const text = `आपका OTP कोड ${code} है। यह कोड 10 मिनट के लिए वैध है।`;
        const html = `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #11b8aa;">Velora Fiction</h2>
            <p>नमस्ते,</p>
            <p>आपके द्वारा अनुरोधित OTP कोड नीचे दिया गया है:</p>
            <div style="font-size: 24px; font-weight: bold; color: #f5509d; padding: 15px 0; letter-spacing: 4px;">
              ${code}
            </div>
            <p>यह OTP कोड केवल 10 मिनट के लिए वैध है। इसे किसी के साथ साझा न करें।</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">यदि आपने यह अनुरोध नहीं किया था, तो कृपया इस ईमेल को अनदेखा करें।</p>
          </div>
        `;

        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject,
          text,
          html
        });

        // Queue in EmailQueue database model for logging/history
        await prisma.emailQueue.create({
          data: {
            email,
            subject,
            body: text,
            status: "SENT",
            sentAt: new Date()
          }
        });

      } catch (emailErr) {
        console.error("Failed to send SMTP email. Falling back to console log.", emailErr);
        console.log(`\n=======================================================\n[OTP DEV FALLBACK] Email OTP to: ${email}\nAction: ${body.type}\nCode: ${code}\n=======================================================\n`);
      }
    } else {
      // Local Development Console Fallback
      console.log(`\n=======================================================\n[OTP DEV FALLBACK] Email OTP to: ${email}\nAction: ${body.type}\nCode: ${code}\n=======================================================\n`);
    }

    return NextResponse.json({ ok: true, message: "OTP सफलतापूर्वक भेजा गया।" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: { message: "कृपया एक मान्य ईमेल प्रदान करें।" } },
        { status: 400 }
      );
    }
    console.error("OTP send error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "OTP भेजने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
