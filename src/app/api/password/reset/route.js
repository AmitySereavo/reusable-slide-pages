import bcrypt from "bcrypt";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { prisma } from "@/lib/prisma";
import {
  clearPasswordResetAccessCookie,
  consumePasswordResetAccessGrant,
  consumePasswordResetToken,
  getPasswordResetAccessGrantFromCookie,
  getValidPasswordResetToken,
  revokeAllUserSessions,
} from "@/lib/auth/passwordReset";
import { validatePasswordPolicy } from "@/customerAccess/utils/passwordPolicy";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const { token, password, confirmPassword } = await request.json();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "password-reset", token || "reset"),
      ...AUTH_RULES.rateLimit.passwordReset,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (!password || !confirmPassword) {
      return Response.json(
        { error: AUTH_MESSAGES.passwordReset.passwordRequired },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { error: AUTH_MESSAGES.passwordReset.passwordsDoNotMatch },
        { status: 400 }
      );
    }

    const passwordPolicyError = validatePasswordPolicy(password);

    if (passwordPolicyError) {
      return Response.json(
        { error: passwordPolicyError },
        { status: 400 }
      );
    }

    let userId = null;
    let tokenRecord = null;
    let grantRecord = null;

    if (token) {
      tokenRecord = await getValidPasswordResetToken(token);

      if (!tokenRecord) {
        return Response.json(
          { error: AUTH_MESSAGES.passwordReset.invalidOrExpiredLink },
          { status: 400 }
        );
      }

      userId = tokenRecord.userId;
    } else {
      grantRecord = await getPasswordResetAccessGrantFromCookie();

      if (!grantRecord) {
        return Response.json(
          { error: AUTH_MESSAGES.passwordReset.resetAccessRequired },
          { status: 401 }
        );
      }

      userId = grantRecord.userId;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        passwordUpdatedAt: new Date(),
      },
    });

    if (tokenRecord) {
      await consumePasswordResetToken(tokenRecord.id);
    }

    if (grantRecord) {
      await consumePasswordResetAccessGrant(grantRecord.id);
    }

    await revokeAllUserSessions(userId);
    await clearPasswordResetAccessCookie();

    return Response.json({
      ok: true,
      message: AUTH_MESSAGES.passwordReset.passwordResetSuccess,
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}