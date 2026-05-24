import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";

const EMAIL_UPDATE_TARGET = "accountEmailUpdate";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateCode() {
  const length = Number(AUTH_RULES?.verification?.codeLength) || 6;
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function getExpiresAt() {
  const minutes = Number(AUTH_RULES?.verification?.defaultExpiryMinutes) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
}

function getCooldownMessage(secondsRemaining) {
  return `Please wait ${secondsRemaining} seconds before requesting a new email verification code.`;
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

    const parsed = parseIdentifier(rawEmail);

    if (!parsed.valid || !parsed.email) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const email = parsed.email;
    const normalizedEmail = normalizeEmail(email);

    const existingEmail = await prisma.userEmailAddress.findUnique({
      where: { normalizedEmail },
    });

    if (existingEmail && existingEmail.userId !== session.userId) {
      return Response.json(
        { error: "This email is already attached to another account." },
        { status: 409 }
      );
    }

    let emailAddress = existingEmail;

    if (!emailAddress) {
      emailAddress = await prisma.userEmailAddress.create({
        data: {
          userId: session.userId,
          email,
          normalizedEmail,
          isActive: false,
          isVerified: false,
        },
      });
    }

    if (emailAddress.isVerified) {
      return Response.json({
        ok: true,
        alreadyVerified: true,
        canActivate: true,
        message:
          "This email is already verified on your account. You can make it the active email.",
        emailAddress,
      });
    }

    const latestCode = await prisma.verificationCode.findFirst({
      where: {
        identifier: normalizedEmail,
        userId: session.userId,
        target: EMAIL_UPDATE_TARGET,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestCode) {
      const cooldownSeconds =
        Number(AUTH_RULES?.verification?.resendCooldownSeconds) || 60;

      const secondsSinceLastCode = Math.floor(
        (Date.now() - new Date(latestCode.createdAt).getTime()) / 1000
      );

      if (secondsSinceLastCode < cooldownSeconds) {
        const secondsRemaining = cooldownSeconds - secondsSinceLastCode;

        return Response.json(
          {
            error: getCooldownMessage(secondsRemaining),
            retryAfterSeconds: secondsRemaining,
          },
          { status: 429 }
        );
      }
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = getExpiresAt();

    await prisma.verificationCode.deleteMany({
      where: {
        identifier: normalizedEmail,
        userId: session.userId,
        target: EMAIL_UPDATE_TARGET,
      },
    });

    const verificationCode = await prisma.verificationCode.create({
      data: {
        identifier: normalizedEmail,
        code: codeHash,
        target: EMAIL_UPDATE_TARGET,
        userId: session.userId,
        expiresAt,
      },
    });

    const deliveryResult = await sendVerificationDelivery({
      identifier: normalizedEmail,
      delivery: "code",
      code,
      target: EMAIL_UPDATE_TARGET,
      verificationCodeId: verificationCode.id,
      contextMetadata: {
        purpose: "account-email-update",
        userId: session.userId,
        emailAddressId: emailAddress.id,
      },
    });

    if (!deliveryResult.ok) {
      return Response.json(
        {
          error:
            deliveryResult.error?.message ||
            "Failed to send email verification code.",
          provider: deliveryResult.provider,
          deliveryResult,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      message: "Verification code sent. Check the new email address.",
      emailAddress: {
        id: emailAddress.id,
        email: emailAddress.email,
        isActive: emailAddress.isActive,
        isVerified: emailAddress.isVerified,
      },
      deliveryResult,
    });
  } catch (error) {
    console.error("ACCOUNT REQUEST EMAIL ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}