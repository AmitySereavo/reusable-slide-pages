import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/auth/rateLimit";
import { validatePasswordPolicy } from "@/customerAccess/utils/passwordPolicy";
import { enrollEmailSequencesForTrigger } from "@/lib/verification/emailSequences";
import {
  ITASL_LEAD_TAG,
  normalizeUserTagKey,
  normalizeUserTagKeys,
  upsertUserTag,
} from "@/lib/userTags";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeSignupTags(input) {
  return normalizeUserTagKeys(input);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      identifier,
      password,
      fullName,
      country,
      city,
      signupSource,
    } = body;
    const signupTags = normalizeSignupTags(body.signupTags);
    const normalizedSignupSource = normalizeUserTagKey(signupSource);
    const effectiveSignupTags = [
      ...new Set([
        ...signupTags,
        ...(normalizedSignupSource === "invitation" ? [ITASL_LEAD_TAG] : []),
      ]),
    ];

    const rateLimit = checkRateLimit({
      key: getRateLimitKey(request, "signup", identifier),
      ...AUTH_RULES.rateLimit.signup,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit);
    }

    if (!identifier || !password) {
      return Response.json(
        { error: AUTH_MESSAGES.common.identifierAndPasswordRequired },
        { status: 400 }
      );
    }

    const passwordPolicyError = validatePasswordPolicy(password);

    if (passwordPolicyError) {
      return Response.json(
        {
          error: passwordPolicyError,
        },
        { status: 400 }
      );
    }

    const parsed = parseIdentifier(identifier);

    if (!parsed.valid) {
      return Response.json(
        { error: "Enter a valid email or phone number." },
        { status: 400 }
      );
    }

    const { email, phone } = parsed;
    const normalizedEmail = email ? normalizeEmail(email) : null;

    if (normalizedEmail) {
      const reservedEmail = await prisma.userEmailAddress.findUnique({
        where: { normalizedEmail },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              emailVerifiedAt: true,
            },
          },
        },
      });

      if (reservedEmail?.user) {
        if (!reservedEmail.isVerified && !reservedEmail.user.emailVerifiedAt) {
          return Response.json({
            message:
              AUTH_MESSAGES.signup.accountNeedsVerification ||
              "Account already exists but still needs verification.",
            user: {
              id: reservedEmail.user.id,
              name: reservedEmail.user.name,
              email: reservedEmail.user.email,
              phone: reservedEmail.user.phone,
            },
            shouldStartVerification: true,
            needsVerification: true,
          });
        }

        return Response.json(
          { error: AUTH_MESSAGES.signup.userExists },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    });

    if (existingUser) {
      const submittedChannelIsVerified = email
        ? Boolean(existingUser.emailVerifiedAt)
        : Boolean(existingUser.phoneVerifiedAt);

      if (!submittedChannelIsVerified) {
        return Response.json({
          message:
            AUTH_MESSAGES.signup.accountNeedsVerification ||
            "Account already exists but still needs verification.",
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
          },
          shouldStartVerification: true,
          needsVerification: true,
        });
      }

      return Response.json(
        { error: AUTH_MESSAGES.signup.userExists },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await prisma.user.count();
    const adminLevel = userCount === 0 ? 1 : 0;

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          passwordUpdatedAt: new Date(),
          name: fullName || null,
          country: country || null,
          city: city || null,
          adminLevel,
          createdBy: "user",
        },
      });

      if (email && normalizedEmail) {
        await tx.userEmailAddress.create({
          data: {
            userId: createdUser.id,
            email,
            normalizedEmail,
            isActive: true,
            isVerified: false,
          },
        });
      }

      for (const tagKey of effectiveSignupTags) {
        await upsertUserTag(tx, {
          userId: createdUser.id,
          tagKey,
          source: String(signupSource || "signup").trim() || "signup",
          metadata: {
            signupSource: signupSource || null,
          },
        });
      }

      return createdUser;
    });

    if (email) {
      try {
        await enrollEmailSequencesForTrigger({
          triggerEvent: "signup",
          user,
          email,
          name: fullName || user.name,
          context: {
            source: "account-signup",
            country: country || null,
            city: city || null,
          },
        });
      } catch (sequenceError) {
        console.error("EMAIL SEQUENCE SIGNUP ENROLLMENT ERROR:", sequenceError);
      }

    }

    return Response.json({
      message: AUTH_MESSAGES.signup.accountCreated,
      user,
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    return Response.json(
      {
        error: AUTH_MESSAGES.common.serverError,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
