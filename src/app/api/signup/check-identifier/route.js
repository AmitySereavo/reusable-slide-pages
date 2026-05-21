import { prisma } from "@/lib/prisma";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";
import { AUTH_RULES } from "@/customerAccess/config/authRules";

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim();

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "signup-check-identifier", identifier),
      ...AUTH_RULES.rateLimit.signup,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (!identifier) {
      return Response.json(
        { error: "Enter an email address or phone number." },
        { status: 400 }
      );
    }

    const parsed = parseIdentifier(identifier);

    if (!parsed.valid) {
      return Response.json(
        { error: "Enter a valid email address or phone number." },
        { status: 400 }
      );
    }

    const { email, phone } = parsed;

    const existingUser = await prisma.user.findFirst({
      where: email ? { email } : { phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });

    if (!existingUser) {
      return Response.json({
        exists: false,
        verified: false,
        needsVerification: false,
        message: "This contact can be used.",
      });
    }

    const submittedChannelIsVerified = email
      ? Boolean(existingUser.emailVerifiedAt)
      : Boolean(existingUser.phoneVerifiedAt);

    if (!submittedChannelIsVerified) {
      return Response.json({
        exists: true,
        verified: false,
        needsVerification: true,
        message:
          AUTH_MESSAGES.signup.accountNeedsVerification ||
          "This account already exists but still needs verification.",
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
        },
      });
    }

    return Response.json({
      exists: true,
      verified: true,
      needsVerification: false,
      message: AUTH_MESSAGES.signup.userExists || "User already exists.",
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
      },
    });
  } catch (error) {
    console.error("SIGNUP IDENTIFIER CHECK ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}