import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, updateSessionStep, hashPassword } from "@/lib/auth";

const completeProfileSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "यूज़रनेम में केवल अक्षर, संख्या और अंडरस्कोर हो सकते हैं।"),
  age: z.coerce.number().int().min(5).max(120),
  gender: z.string().min(1),
  profileImage: z.string().url().optional().nullable(),
  password: z.string().min(10).optional().nullable()
});

export async function POST(request: Request) {
  try {
    // 1. Ensure authenticated
    const currentUser = await requireUser();

    // 2. Parse request body
    const json = await request.json();
    const body = completeProfileSchema.parse(json);

    // 3. Unique username check
    const existingUsername = await prisma.user.findUnique({
      where: { username: body.username.toLowerCase() }
    });

    if (existingUsername && existingUsername.id !== currentUser.id) {
      return NextResponse.json(
        { ok: false, error: { message: "यह यूज़रनेम पहले से लिया जा चुका है। कृपया दूसरा चुनें।" } },
        { status: 409 }
      );
    }

    // 4. Update data object
    const avatarLetter = body.username[0].toUpperCase();
    const updateData: Prisma.UserUpdateInput = {
      username: body.username.toLowerCase(),
      age: body.age,
      gender: body.gender,
      avatarLetter,
      registrationStep: 5 // Move to mobile verification step
    };

    if (body.profileImage) {
      updateData.profileImage = body.profileImage;
      updateData.image = body.profileImage;
    }

    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    // 5. Update Database
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData
    });

    // 6. Refresh session token
    await updateSessionStep(currentUser.id, 5);

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role
      },
      nextStep: 5
    });

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

    console.error("Profile completion error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "प्रोफ़ाइल अपडेट करने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
