import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({
        where: { tokenHash },
      });

      return NextResponse.json(
        { error: "Verification link has expired." },
        { status: 400 }
      );
    }

    const identifier = record.identifier;
    const isEmail = identifier.includes("@");

    const verificationData = isEmail
      ? { emailVerifiedAt: new Date() }
      : { phoneVerifiedAt: new Date() };

    const userResult = await prisma.user.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: verificationData,
    });

    const leadResult = await prisma.lead.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      data: verificationData,
    });

    if (userResult.count === 0 && leadResult.count === 0) {
      await prisma.verificationToken.delete({
        where: { tokenHash },
      });

      return NextResponse.json(
        {
          error:
            AUTH_MESSAGES?.verification?.noMatchingRecord ||
            "No matching user or lead found.",
        },
        { status: 404 }
      );
    }

    const redirectTo = record.successRedirect || null;
    const target = record.target || null;

    await prisma.verificationToken.delete({
      where: { tokenHash },
    });

    return NextResponse.json({
      success: true,
      message:
        AUTH_MESSAGES?.verification?.verificationSuccess ||
        "Verification successful.",
      identifier,
      successRedirect: redirectTo,
      target,
    });
  } catch (error) {
    console.error("VERIFY CONSUME LINK ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to verify link.",
      },
      { status: 500 }
    );
  }
}