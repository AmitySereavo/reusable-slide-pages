import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { enrollVerifiedEmailTagSequencesForUser } from "@/lib/verification/emailSequences";

const EMAIL_UPDATE_TARGET = "accountEmailUpdate";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();
    const rawEmail = String(body.email || "").trim();
    const code = String(body.code || "").trim();

    if (!rawEmail || !code) {
      return Response.json(
        { error: "Email address and verification code are required." },
        { status: 400 }
      );
    }

    const parsed = parseIdentifier(rawEmail);

    if (!parsed.valid || !parsed.email) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const email = parsed.email;
    const normalizedEmail = normalizeEmail(email);

    const latestRecord = await prisma.verificationCode.findFirst({
      where: {
        identifier: normalizedEmail,
        userId: session.userId,
        target: EMAIL_UPDATE_TARGET,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestRecord) {
      return Response.json(
        { error: AUTH_MESSAGES?.verification?.noCodeFound || "No code found." },
        { status: 400 }
      );
    }

    if (latestRecord.expiresAt < new Date()) {
      await prisma.verificationCode.deleteMany({
        where: {
          identifier: normalizedEmail,
          userId: session.userId,
          target: EMAIL_UPDATE_TARGET,
        },
      });

      return Response.json(
        { error: AUTH_MESSAGES?.verification?.codeExpired || "Code expired." },
        { status: 400 }
      );
    }

    const maxAttempts = Number(AUTH_RULES?.verification?.maxCodeAttempts) || 5;

    if ((latestRecord.attempts ?? 0) >= maxAttempts) {
      return Response.json(
        {
          error:
            AUTH_MESSAGES?.verification?.tooManyAttempts ||
            "Too many incorrect attempts. Please request a new verification code.",
        },
        { status: 429 }
      );
    }

    const codeMatches = await bcrypt.compare(code, latestRecord.code);

    if (!codeMatches) {
      await prisma.verificationCode.update({
        where: {
          id: latestRecord.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return Response.json(
        {
          error:
            AUTH_MESSAGES?.verification?.invalidCode ||
            "Invalid verification code.",
        },
        { status: 400 }
      );
    }

    const emailAddress = await prisma.userEmailAddress.findUnique({
      where: {
        normalizedEmail,
      },
    });

    if (!emailAddress || emailAddress.userId !== session.userId) {
      return Response.json(
        { error: "Email address not found on this account." },
        { status: 404 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.userEmailAddress.updateMany({
        where: {
          userId: session.userId,
        },
        data: {
          isActive: false,
        },
      });

      const verifiedEmailAddress = await tx.userEmailAddress.update({
        where: {
          id: emailAddress.id,
        },
        data: {
          isVerified: true,
          verifiedAt: now,
          isActive: true,
        },
      });

      const user = await tx.user.update({
        where: {
          id: session.userId,
        },
        data: {
          email: verifiedEmailAddress.email,
          emailVerifiedAt: now,
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
          updatedAt: true,
        },
      });

      await tx.verificationCode.deleteMany({
        where: {
          identifier: normalizedEmail,
          userId: session.userId,
          target: EMAIL_UPDATE_TARGET,
        },
      });

      return {
        user,
        emailAddress: verifiedEmailAddress,
      };
    });

    try {
      await enrollVerifiedEmailTagSequencesForUser({
        user: result.user,
        email: result.user.email,
        source: "account-email-code-verification",
        context: {
          target: EMAIL_UPDATE_TARGET,
        },
      });
    } catch (sequenceError) {
      console.error("VERIFIED EMAIL TAG SEQUENCE ENROLLMENT ERROR:", sequenceError);
    }

    return Response.json({
      ok: true,
      message: "Email verified and set as your active email.",
      user: result.user,
      emailAddress: result.emailAddress,
    });
  } catch (error) {
    console.error("ACCOUNT VERIFY EMAIL ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
