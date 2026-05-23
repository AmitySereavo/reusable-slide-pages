import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

const RESEND_COOLDOWN_SECONDS =
  Number(AUTH_RULES?.verification?.resendCooldownSeconds) || 60;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDeletionCodeExpiresAt() {
  const expiresInMinutes =
    Number(AUTH_RULES?.accountDeletion?.verificationExpiresInMinutes) ||
    Number(AUTH_RULES?.verification?.defaultExpiryMinutes) ||
    10;

  return new Date(Date.now() + expiresInMinutes * 60 * 1000);
}

function getCooldownSecondsRemaining(latestRecord) {
  if (!latestRecord?.createdAt) return 0;

  const secondsSinceLastCode = Math.floor(
    (Date.now() - new Date(latestRecord.createdAt).getTime()) / 1000
  );

  return Math.max(0, RESEND_COOLDOWN_SECONDS - secondsSinceLastCode);
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const confirmation = String(body.confirmation || "").trim();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "account-delete-start", session.userId),
      ...AUTH_RULES.rateLimit.verificationStart,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (confirmation !== "DELETE") {
      return Response.json(
        { error: "Type DELETE to confirm account deletion." },
        { status: 400 }
      );
    }

    const requireVerificationCode =
      AUTH_RULES?.accountDeletion?.requireVerificationCode === true;

    if (!requireVerificationCode) {
      return Response.json({
        ok: true,
        verificationRequired: false,
        message: "Delete confirmation accepted.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user?.email) {
      return Response.json(
        {
          error:
            "This account does not have an email address available for deletion verification.",
        },
        { status: 400 }
      );
    }

    const latestDeletionCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        identifier: user.email,
        target: "accountDeletion",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const cooldownSecondsRemaining =
      getCooldownSecondsRemaining(latestDeletionCode);

    if (cooldownSecondsRemaining > 0) {
      return Response.json(
        {
          error: `Please wait ${cooldownSecondsRemaining} seconds before requesting a new deletion code.`,
          retryAfterSeconds: cooldownSecondsRemaining,
        },
        { status: 429 }
      );
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = getDeletionCodeExpiresAt();

    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        target: "accountDeletion",
      },
    });

    const verificationCode = await prisma.verificationCode.create({
      data: {
        identifier: user.email,
        code: codeHash,
        target: "accountDeletion",
        userId: user.id,
        expiresAt,
      },
    });

    const deliveryResult = await sendVerificationDelivery({
      identifier: user.email,
      delivery: "code",
      code,
      target: "accountDeletion",
      verificationCodeId: verificationCode.id,
      contextMetadata: {
        purpose: "account-deletion",
        emailSubject: "Confirm account deletion",
        codeLabel: "account deletion code",
        introText:
          "Use this code to confirm that you want to delete your account.",
      },
    });

    if (!deliveryResult.ok) {
      return Response.json(
        {
          error:
            deliveryResult.error?.message ||
            "Failed to send account deletion code.",
          provider: deliveryResult.provider,
          deliveryResult,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      verificationRequired: true,
      message: "We sent a deletion confirmation code to your email.",
      provider: deliveryResult.provider,
      deliveryResult,
    });
  } catch (error) {
    console.error("START DELETE ACCOUNT ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}