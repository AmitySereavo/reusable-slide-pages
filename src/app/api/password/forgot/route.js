import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { prisma } from "@/lib/prisma";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import {
  createEmailPasswordResetToken,
  createPhonePasswordResetChallenge,
} from "@/lib/auth/passwordReset";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";

import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS =
  Number(AUTH_RULES?.passwordReset?.resendCooldownSeconds) || 60;

function getPasswordResetCooldownError(secondsRemaining) {
  return `${AUTH_MESSAGES?.passwordReset?.resendCooldown || "Please wait before requesting another password reset."} Try again in ${secondsRemaining} seconds.`;
}

function getSecondsSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 1000);
}

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const { identifier, phoneChannel } = await request.json();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "password-forgot", identifier),
      ...AUTH_RULES.rateLimit.passwordForgot,
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

    const parsed = parseIdentifier(identifier);

    if (!parsed.valid) {
      return Response.json(
        { error: AUTH_MESSAGES.common.invalidIdentifier },
        { status: 400 }
      );
    }

    if (parsed.type === "email") {
      const user = await prisma.user.findFirst({
        where: {
          email: parsed.email,
          emailVerifiedAt: { not: null },
        },
      });

      if (user?.email) {
        const latestToken = await prisma.passwordResetToken.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (latestToken) {
          const secondsSinceLastRequest = getSecondsSince(
            latestToken.createdAt
          );

          if (
            secondsSinceLastRequest <
            PASSWORD_RESET_RESEND_COOLDOWN_SECONDS
          ) {
            const secondsRemaining =
              PASSWORD_RESET_RESEND_COOLDOWN_SECONDS -
              secondsSinceLastRequest;

            return Response.json(
              {
                error: getPasswordResetCooldownError(secondsRemaining),
                retryAfterSeconds: secondsRemaining,
              },
              { status: 429 }
            );
          }
        }

        const { rawToken } = await createEmailPasswordResetToken(user);

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const verifyUrl = `${baseUrl}/reset-password?token=${rawToken}`;

        await sendVerificationDelivery({
          identifier: user.email,
          delivery: "link",
          verifyUrl,
          target: "passwordReset",
          contextMetadata: {
            purpose: "password-reset",
          },
        });
      }

      return Response.json({
        ok: true,
        nextStep: "done",
        message: AUTH_MESSAGES.passwordReset.emailLinkSentNeutral,
      });
    }

    if (!phoneChannel || !["sms", "whatsapp"].includes(phoneChannel)) {
      return Response.json(
        { error: AUTH_MESSAGES.passwordReset.choosePhoneChannel },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        phone: parsed.phone,
        phoneVerifiedAt: { not: null },
      },
    });

    if (user?.phone) {
      const latestChallenge = await prisma.passwordResetChallenge.findFirst({
        where: {
          userId: user.id,
          channel: phoneChannel,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (latestChallenge) {
        const secondsSinceLastRequest = getSecondsSince(
          latestChallenge.createdAt
        );

        if (
          secondsSinceLastRequest <
          PASSWORD_RESET_RESEND_COOLDOWN_SECONDS
        ) {
          const secondsRemaining =
            PASSWORD_RESET_RESEND_COOLDOWN_SECONDS -
            secondsSinceLastRequest;

          return Response.json(
            {
              error: getPasswordResetCooldownError(secondsRemaining),
              retryAfterSeconds: secondsRemaining,
            },
            { status: 429 }
          );
        }
      }

      const { code } = await createPhonePasswordResetChallenge({
        user,
        identifier: user.phone,
        channel: phoneChannel,
      });

      await sendVerificationDelivery({
        identifier: user.phone,
        delivery: "code",
        code,
        phoneChannel,
        target: "passwordReset",
        contextMetadata: {
          purpose: "password-reset",
        },
      });

      return Response.json({
        ok: true,
        nextStep: "enter-code",
        identifier: user.phone,
        phoneChannel,
        message: AUTH_MESSAGES.passwordReset.codeSent,
      });
    }

    return Response.json({
      ok: true,
      nextStep: "done",
      message: AUTH_MESSAGES.passwordReset.phoneCodeSentNeutral,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}