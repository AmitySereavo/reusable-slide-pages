import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import {
  createPasswordResetAccessGrant,
  setPasswordResetAccessCookie,
  verifyPhonePasswordResetCode,
} from "@/lib/auth/passwordReset";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";

export async function POST(request) {
  try {
    const { identifier, code, phoneChannel } = await request.json();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "password-verify-code", identifier),
      ...AUTH_RULES.rateLimit.passwordVerifyCode,
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

    if (!parsed.valid || parsed.type !== "phone") {
      return Response.json(
        { error: AUTH_MESSAGES.common.invalidIdentifier },
        { status: 400 }
      );
    }

    const result = await verifyPhonePasswordResetCode({
      identifier: parsed.phone,
      code: String(code).trim(),
      channel: phoneChannel || null,
    });

    if (!result.ok) {
      let error = AUTH_MESSAGES.passwordReset.invalidCode;

      if (result.reason === "expired") {
        error = AUTH_MESSAGES.passwordReset.codeExpired;
      } else if (result.reason === "too_many_attempts") {
        error = AUTH_MESSAGES.passwordReset.tooManyCodeAttempts;
      }

      return Response.json({ error }, { status: 400 });
    }

    const grant = await createPasswordResetAccessGrant(result.user.id);
    await setPasswordResetAccessCookie(grant.rawGrant, grant.expiresAt);

    return Response.json({
      ok: true,
      message: AUTH_MESSAGES.passwordReset.codeVerified,
      redirectTo: "/reset-password",
    });
  } catch (error) {
    console.error("VERIFY RESET CODE ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}