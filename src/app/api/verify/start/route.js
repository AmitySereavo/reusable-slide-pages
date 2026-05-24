import { prisma } from "@/lib/prisma";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";

import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";


const RESEND_COOLDOWN_SECONDS =
  AUTH_RULES.verification.resendCooldownSeconds;

const ALLOWED_PHONE_CHANNELS =
  AUTH_RULES?.verification?.enabledPhoneChannels || ["whatsapp"];

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiresAt(expiresInMinutes, expiresInHours) {
  const defaultExpiryMinutes =
    Number(AUTH_RULES?.verification?.defaultExpiryMinutes) || 10;

  if (expiresInMinutes && expiresInHours) {
    return new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
  }

  if (expiresInHours && Number(expiresInHours) > 0) {
    return new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
  }

  if (expiresInMinutes && Number(expiresInMinutes) > 0) {
    return new Date(Date.now() + Number(expiresInMinutes) * 60 * 1000);
  }

  return new Date(Date.now() + defaultExpiryMinutes * 60 * 1000);
}

function getBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function getCooldownError(delivery, secondsRemaining) {
  return delivery === "link"
    ? `Please wait ${secondsRemaining} seconds before requesting a new verification link.`
    : `Please wait ${secondsRemaining} seconds before requesting a new code.`;
}

function getSuccessMessage(delivery) {
  return delivery === "link"
    ? "Verification link sent"
    : AUTH_MESSAGES?.verification?.codeSent || "Verification code sent";
}

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();
    
    const {
      identifier,
      expiresInMinutes,
      expiresInHours,
      method,
      delivery = "code",
      target = null,
      successRedirect = null,
      contextMetadata = null,
      phoneChannel = null,
    } = await request.json();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "verification-start", identifier),
      ...AUTH_RULES.rateLimit.verificationStart,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (!identifier) {
      return Response.json(
        { error: AUTH_MESSAGES.common.identifierRequired },
        { status: 400 }
      );
    }

    if (!["code", "link"].includes(delivery)) {
      return Response.json(
        { error: "Invalid verification delivery type." },
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

    const resolvedPhoneChannel =
      type === "phone" ? phoneChannel || "sms" : null;

    if (
      resolvedPhoneChannel &&
      !ALLOWED_PHONE_CHANNELS.includes(resolvedPhoneChannel)
    ) {
      return Response.json(
        { error: "Invalid phone verification channel." },
        { status: 400 }
      );
    }

        const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    });

    const lead = await prisma.lead.findFirst({
      where: email ? { email } : { phone },
    });

    const accountEmailAddress =
      target === "accountEmailUpdate" && email
        ? await prisma.userEmailAddress.findUnique({
            where: {
              normalizedEmail: normalizedIdentifier,
            },
          })
        : null;

    if (!user && !lead && !accountEmailAddress) {
      return Response.json(
        {
          error:
            AUTH_MESSAGES?.verification?.noMatchingRecord ||
            "No matching user, lead, or saved account email found.",
        },
        { status: 404 }
      );
    }

    const expiresAt = getExpiresAt(expiresInMinutes, expiresInHours);

    if (delivery === "link") {
      const latestToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: normalizedIdentifier,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (latestToken) {
        const secondsSinceLastLink = Math.floor(
          (Date.now() - new Date(latestToken.createdAt).getTime()) / 1000
        );

        if (secondsSinceLastLink < RESEND_COOLDOWN_SECONDS) {
          const secondsRemaining =
            RESEND_COOLDOWN_SECONDS - secondsSinceLastLink;

          return Response.json(
            {
              error: getCooldownError("link", secondsRemaining),
              retryAfterSeconds: secondsRemaining,
            },
            { status: 429 }
          );
        }
      }

      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);

      await prisma.verificationToken.deleteMany({
        where: {
          identifier: normalizedIdentifier,
        },
      });

      const verificationToken = await prisma.verificationToken.create({
        data: {
          identifier: normalizedIdentifier,
          tokenHash,
          expiresAt,
          target,
          successRedirect,
        },
      });

      const baseUrl = getBaseUrl(request);
      const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;

      const deliveryResult = await sendVerificationDelivery({
        identifier: normalizedIdentifier,
        delivery: "link",
        verifyUrl,
        target,
        successRedirect,
        verificationTokenId: verificationToken.id,
        phoneChannel: resolvedPhoneChannel,
        contextMetadata: {
          ...(contextMetadata || {}),
          parsedIdentifierType: type,
          phoneChannel: resolvedPhoneChannel,
        },
      });

      if (!deliveryResult.ok) {
        return Response.json(
          {
            error:
              deliveryResult.error?.message ||
              "Failed to send verification link.",
            delivery,
            method,
            target,
            successRedirect,
            phoneChannel: resolvedPhoneChannel,
            provider: deliveryResult.provider,
            deliveryResult,
          },
          { status: 502 }
        );
      }

      return Response.json({
        message: getSuccessMessage("link"),
        delivery,
        method,
        target,
        successRedirect,
        phoneChannel: resolvedPhoneChannel,
        provider: deliveryResult.provider,
        deliveryResult,
      });
    }

    const latestCode = await prisma.verificationCode.findFirst({
      where: {
        identifier: normalizedIdentifier,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestCode) {
      const secondsSinceLastCode = Math.floor(
        (Date.now() - new Date(latestCode.createdAt).getTime()) / 1000
      );

      if (secondsSinceLastCode < RESEND_COOLDOWN_SECONDS) {
        const secondsRemaining = RESEND_COOLDOWN_SECONDS - secondsSinceLastCode;

        return Response.json(
          {
            error: getCooldownError("code", secondsRemaining),
            retryAfterSeconds: secondsRemaining,
          },
          { status: 429 }
        );
      }
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.verificationCode.deleteMany({
      where: {
        identifier: normalizedIdentifier,
      },
    });

    const verificationCode = await prisma.verificationCode.create({
      data: {
        identifier: normalizedIdentifier,
        code: codeHash,
        expiresAt,
        target,
        userId: accountEmailAddress?.userId ?? user?.id ?? null,
      },
    });

    const deliveryResult = await sendVerificationDelivery({
      identifier: normalizedIdentifier,
      delivery: "code",
      code,
      target,
      successRedirect,
      verificationCodeId: verificationCode.id,
      phoneChannel: resolvedPhoneChannel,
      contextMetadata: {
        ...(contextMetadata || {}),
        parsedIdentifierType: type,
        phoneChannel: resolvedPhoneChannel,
      },
    });

    if (!deliveryResult.ok) {
      return Response.json(
        {
          error:
            deliveryResult.error?.message ||
            "Failed to send verification code.",
          delivery: "code",
          method,
          target,
          successRedirect,
          phoneChannel: resolvedPhoneChannel,
          provider: deliveryResult.provider,
          deliveryResult,
        },
        { status: 502 }
      );
    }

    return Response.json({
      message: getSuccessMessage("code"),
      delivery: "code",
      method,
      target,
      successRedirect,
      phoneChannel: resolvedPhoneChannel,
      provider: deliveryResult.provider,
      deliveryResult,
    });
  } catch (error) {
    console.error("VERIFY START ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES?.common?.serverError || "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}