import bcrypt from "bcrypt";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

const MAX_VERIFICATION_CODE_ATTEMPTS =
  Number(AUTH_RULES?.verification?.maxCodeAttempts) || 5;

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const { identifier, code } = await request.json();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "verification-check", identifier),
      ...AUTH_RULES.rateLimit.verificationCheck,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (!identifier || !code) {
      return Response.json(
        { error: AUTH_MESSAGES.common.identifierAndCodeRequired },
        { status: 400 }
      );
    }

    const parsed = parseIdentifier(identifier);

    if (!parsed.valid) {
      return Response.json(
        { error: AUTH_MESSAGES.common.invalidIdentifier },
        { status: 400 }
      );
    }

    const { email, phone, normalizedIdentifier, type } = parsed;

    const latestRecord = await prisma.verificationCode.findFirst({
      where: {
        identifier: normalizedIdentifier,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestRecord) {
      return Response.json(
        { error: AUTH_MESSAGES.verification.noCodeFound },
        { status: 400 }
      );
    }

    if (latestRecord.expiresAt < new Date()) {
      await prisma.verificationCode.deleteMany({
        where: {
          identifier: normalizedIdentifier,
        },
      });

      return Response.json(
        { error: AUTH_MESSAGES.verification.codeExpired },
        { status: 400 }
      );
    }

    if ((latestRecord.attempts ?? 0) >= MAX_VERIFICATION_CODE_ATTEMPTS) {
      return Response.json(
        {
          error:
            AUTH_MESSAGES?.verification?.tooManyAttempts ||
            "Too many incorrect attempts. Please request a new verification code.",
        },
        { status: 429 }
      );
    }

    const codeMatches = await bcrypt.compare(String(code), latestRecord.code);

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
        { error: AUTH_MESSAGES.verification.invalidCode },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    });

    const lead = await prisma.lead.findFirst({
      where: email ? { email } : { phone },
    });

    if (!user && !lead) {
      await prisma.verificationCode.deleteMany({
        where: {
          identifier: normalizedIdentifier,
        },
      });

      return Response.json(
        { error: AUTH_MESSAGES.verification.noMatchingRecord },
        { status: 404 }
      );
    }

    const now = new Date();
    const verificationData =
      type === "email"
        ? { emailVerifiedAt: now }
        : { phoneVerifiedAt: now };

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: verificationData,
      });
    }

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: verificationData,
      });
    }

    await prisma.verificationCode.deleteMany({
      where: {
        identifier: normalizedIdentifier,
      },
    });

    return Response.json({
      message: AUTH_MESSAGES.verification.verificationSuccess,
    });
  } catch (error) {
    console.error("VERIFY CHECK ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}