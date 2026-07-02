import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import { syncEngagementForUser } from "@/app/api/questionnaires/engagement/sync/route";
import { enrollEmailSequencesForTrigger } from "@/lib/verification/emailSequences";

const TARGET = "gatedLeadAccess";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeTagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSignupTags(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [
    ...new Set(input.map(normalizeTagKey).filter((tagKey) => tagKey.length > 0)),
  ];
}

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
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

function getExpiresAt() {
  const hours = 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildSuccessRedirect({ questionnaireSlug, goto }) {
  const safeSlug = String(questionnaireSlug || "invitation").trim();
  const safeGoto = String(goto || "second-video").trim();

  return `/questionnaire/${encodeURIComponent(
    safeSlug
  )}?leadAccess=verified&goto=${encodeURIComponent(safeGoto)}`;
}

async function createTemporaryPasswordHash() {
  const temporaryPassword = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(temporaryPassword, 10);
}

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const identifier = String(body.identifier || "").trim();
    const questionnaireSlug = String(body.questionnaireSlug || "invitation").trim();
    const goto = String(body.goto || "second-video").trim();
    const defaultStartAtSeconds = Number(body.defaultStartAtSeconds ?? 0);
    const source = String(body.source || "embedded-authform").trim();
    const signupSource = String(body.signupSource || source).trim();
    const signupTags = normalizeSignupTags(body.signupTags);
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    const updatesOptIn = body.updatesOptIn === true;
    const engagementSnapshot =
      body.engagementSnapshot && typeof body.engagementSnapshot === "object"
        ? body.engagementSnapshot
        : null;

    if (!identifier) {
      return Response.json(
        { error: "Email address is required for private video access." },
        { status: 400 }
      );
    }

    const parsed = parseIdentifier(identifier);

    if (!parsed.valid || !parsed.email) {
      return Response.json(
        { error: "Enter a valid email address. Email is required for the private video link." },
        { status: 400 }
      );
    }

    const email = parsed.email;
    const normalizedEmail = normalizeEmail(email);

    const existingReservedEmail = await prisma.userEmailAddress.findUnique({
      where: {
        normalizedEmail,
      },
      include: {
        user: true,
      },
    });

    let user = existingReservedEmail?.user || null;

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      user = existingUser || null;
    }

    const passwordHash = user ? null : await createTemporaryPasswordHash();

    const result = await prisma.$transaction(async (tx) => {
      let workingUser = user;

      if (!workingUser) {
        workingUser = await tx.user.create({
          data: {
            email,
            password: passwordHash,
            passwordUpdatedAt: null,
            name: fullName || null,
            createdBy: "algorithm",
          },
        });
      } else if (fullName && !workingUser.name) {
        workingUser = await tx.user.update({
          where: {
            id: workingUser.id,
          },
          data: {
            name: fullName,
          },
        });
      }

      for (const tagKey of signupTags) {
        await tx.userTag.upsert({
          where: {
            userId_tagKey: {
              userId: workingUser.id,
              tagKey,
            },
          },
          create: {
            userId: workingUser.id,
            tagKey,
            label: tagKey,
            source: signupSource || "embedded-authform",
            metadata: {
              signupSource,
              questionnaireSlug,
              goto,
            },
          },
          update: {
            source: signupSource || "embedded-authform",
          },
        });
      }

      await tx.userEmailAddress.upsert({
        where: {
          normalizedEmail,
        },
        create: {
          userId: workingUser.id,
          email,
          normalizedEmail,
          isActive: true,
          isVerified: false,
        },
        update: {
          userId: workingUser.id,
        },
      });

      const existingLead = await tx.lead.findFirst({
        where: {
          email,
          target: TARGET,
        },
      });

      const leadMetadata = {
        questionnaireSlug,
        source,
        goto,
        updatesOptIn,
        lastSubmittedAt: new Date().toISOString(),
        answers,
      };

      const lead = existingLead
        ? await tx.lead.update({
            where: {
              id: existingLead.id,
            },
            data: {
              fullName: fullName || existingLead.fullName,
              source,
              target: TARGET,
              metadata: {
                ...(existingLead.metadata && typeof existingLead.metadata === "object"
                  ? existingLead.metadata
                  : {}),
                ...leadMetadata,
                signupCount:
                  Number(
                    existingLead.metadata &&
                      typeof existingLead.metadata === "object" &&
                      existingLead.metadata.signupCount
                  ) + 1 || 2,
              },
            },
          })
        : await tx.lead.create({
            data: {
              fullName,
              email,
              source,
              target: TARGET,
              metadata: {
                ...leadMetadata,
                signupCount: 1,
              },
            },
          });

      return {
        user: workingUser,
        lead,
      };
    });

    if (engagementSnapshot) {
      await syncEngagementForUser({
        userId: result.user.id,
        questionnaireSlug,
        snapshot: engagementSnapshot,
        source: "lead-signup",
      });
    }

    if (normalizedEmail) {
      for (const tagKey of signupTags) {
        try {
          await enrollEmailSequencesForTrigger({
            triggerEvent: "tag_added",
            user: result.user,
            email: normalizedEmail,
            name: fullName || result.user.name,
            context: {
              source: signupSource || source,
              tagKey,
              signupTags,
              questionnaireSlug,
              goto,
              leadId: result.lead.id,
            },
          });
        } catch (sequenceError) {
          console.error("EMAIL SEQUENCE TAG ENROLLMENT ERROR:", sequenceError);
        }
      }
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = getExpiresAt();
    const successRedirect = buildSuccessRedirect({
      questionnaireSlug,
      goto,
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        target: TARGET,
      },
    });

    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        tokenHash,
        target: TARGET,
        expiresAt,
        successRedirect,
        userId: result.user.id,
      },
    });

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;

    const deliveryResult = await sendVerificationDelivery({
      identifier: normalizedEmail,
      delivery: "link",
      verifyUrl,
      target: TARGET,
      successRedirect,
      verificationTokenId: verificationToken.id,
      contextMetadata: {
        purpose: "gated-lead-access",
        questionnaireSlug,
        goto,
        userId: result.user.id,
        leadId: result.lead.id,
        recipientName: fullName,
      },
    });

    if (!deliveryResult.ok) {
      return Response.json(
        {
          error:
            deliveryResult.error?.message ||
            "Your details were saved, but the private video link could not be sent.",
          deliveryResult,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      message: "Check your email for the private link to continue watching.",
      userId: result.user.id,
      leadId: result.lead.id,
      target: TARGET,
      successRedirect,
      deliveryResult,
    });
  } catch (error) {
    console.error("TEMPORARY LEAD ACCOUNT ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
