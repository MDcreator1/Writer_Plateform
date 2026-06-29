import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/, "Username में केवल अक्षर, अंक और underscore (_) हो सकते हैं।").optional(),
  age: z.number().int().min(13).max(120).optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  profileImage: z.string().url().max(2000).optional().nullable()
});

export async function GET() {
  try {
    const user = await requireUser();

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username,
        displayName: user.displayName,
        age: user.age,
        gender: user.gender,
        profileImage: user.profileImage,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: { message: "कृपया लॉगिन करें।" } },
        { status: 401 }
      );
    }
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "प्रोफाइल लोड करने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const json = await request.json();
    const body = updateProfileSchema.parse(json);

    // If username is being changed, check uniqueness
    if (body.username && body.username !== user.username) {
      const existing = await prisma.user.findUnique({
        where: { username: body.username }
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: { message: "यह username पहले से किसी अन्य उपयोगकर्ता द्वारा लिया गया है।" } },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.username !== undefined && { username: body.username }),
        ...(body.age !== undefined && { age: body.age }),
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.profileImage !== undefined && { profileImage: body.profileImage })
      }
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        age: updatedUser.age,
        gender: updatedUser.gender,
        profileImage: updatedUser.profileImage,
        phone: updatedUser.phone,
        phoneVerified: updatedUser.phoneVerified,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: { message: "कृपया लॉगिन करें।" } },
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
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "प्रोफाइल अपडेट करने में त्रुटि हुई।" } },
      { status: 500 }
    );
  }
}
