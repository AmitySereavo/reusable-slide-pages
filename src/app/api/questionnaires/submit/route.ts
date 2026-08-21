import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { mirrorSubmissionToGoogleSheets } from "@/lib/googleSheets";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import {
  buildWhatsAppUrl,
  createAdminNotification,
} from "@/lib/adminNotifications";
import {
  PERMANENT_WEBSITE_OP_TAG,
  getWebsiteOperationEmailTemplate,
} from "@/lib/verification/websiteOperationEmailTemplates";
import { getEmailSenderForContext } from "@/config/siteBrands";

type SubmitPayload = {
  questionnaireSlug?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  answers?: Record<string, unknown>;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const PLANT_GIVEAWAY_SLUG = "home-gardener-plant-giveaway";
const AFFILIATE_SIGNUP_SLUG = "affiliate-sign-up";
const GATED_LEAD_ACCESS_TARGET = "gatedLeadAccess";
const AFFILIATE_EMAIL_VERIFICATION_TARGET_PREFIX =
  "affiliateEmailVerification";
const DEFAULT_PLANT_GIVEAWAY_ADMIN_EMAIL = "paralifetrees@gmail.com";
const PLANT_GIVEAWAY_ADMIN_SEQUENCE_KEY =
  "website-op-plant-giveaway-admin-notification-email";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateRawToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePhoneIdentifier(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function getPlantGiveawayNotificationEmail() {
  return (
    process.env.PLANT_GIVEAWAY_ADMIN_EMAIL ||
    process.env.QUESTIONNAIRE_NOTIFICATION_EMAIL ||
    DEFAULT_PLANT_GIVEAWAY_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();
}

function getSubmissionEmailSender({
  request,
  questionnaireSlug,
}: {
  request: Request;
  questionnaireSlug: string;
}) {
  return getEmailSenderForContext({
    request,
    questionnaireSlug,
  });
}

function formatAnswerValue(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.map(formatAnswerValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).trim();
}

function getAnswer(answers: Record<string, unknown>, key: string) {
  return formatAnswerValue(answers[key]);
}

function labelSelection(
  value: string,
  labels: Record<string, string>
): string {
  return labels[value] || value;
}

function renderTemplate(value: string, context: Record<string, string>) {
  return String(value || "").replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_, key) => context[String(key)] ?? ""
  );
}

function buildHtmlFromText(text: string) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

async function getPlantGiveawayAdminTemplate() {
  const defaultTemplate = getWebsiteOperationEmailTemplate(
    PLANT_GIVEAWAY_ADMIN_SEQUENCE_KEY
  );

  try {
    const sequence = await prisma.emailSequence.findUnique({
      where: { sequenceKey: PLANT_GIVEAWAY_ADMIN_SEQUENCE_KEY },
      include: {
        steps: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });

    const metadata =
      sequence?.metadata && typeof sequence.metadata === "object"
        ? (sequence.metadata as Record<string, unknown>)
        : {};
    const step =
      metadata.systemTag === PERMANENT_WEBSITE_OP_TAG
        ? sequence?.steps?.[0]
        : null;
    const subject =
      String(step?.subject || "").trim() || defaultTemplate?.subject || "";
    const bodyText =
      String(step?.bodyText || "").trim() || defaultTemplate?.bodyText || "";

    if (subject && bodyText) {
      return { subject, bodyText };
    }
  } catch (error) {
    console.warn("Plant giveaway admin template lookup failed.", error);
  }

  return defaultTemplate
    ? {
        subject: defaultTemplate.subject,
        bodyText: defaultTemplate.bodyText,
      }
    : null;
}

async function buildPlantGiveawayAdminNotification({
  submissionId,
  createdAt,
  fullName,
  email,
  phone,
  whatsappOptIn,
  answers,
}: {
  submissionId: string;
  createdAt: Date;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
  answers: Record<string, unknown>;
}) {
  const receivingPreference = labelSelection(
    getAnswer(answers, "receivingPreference"),
    {
      earth_sovereign: "Earth (Sovereign Center Liguanea)",
      barbican_132: "One32 Guest House (Barbican)",
      linstead: "Redwood Taxi Stand (Linstead)",
      paid_delivery: "Paid delivery to an address",
    }
  );

  const gardenerLevel = labelSelection(getAnswer(answers, "gardenerLevel"), {
    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",
  });

  const growCategories = [
    ["growsHerbs", "Herbs"],
    ["growsVegetables", "Vegetables"],
    ["growsFruitTrees", "Fruit trees"],
    ["growsFlowers", "Flowers"],
    ["growsHouseplants", "Houseplants"],
    ["growsSucculentsCacti", "Succulents and cacti"],
  ]
    .filter(([key]) => answers[key] === true)
    .map(([, label]) => label);

  const growsOther = getAnswer(answers, "growsOther");
  if (growsOther) growCategories.push(growsOther);

  const challengeLabels = [
    ["challengeTime", "Time to garden"],
    ["challengeSpace", "Space"],
    ["challengeKnowledge", "Knowledge"],
    ["challengeSoil", "Soil"],
    ["challengeWater", "Water issues"],
    ["challengeClimate", "Climatic issues"],
    ["challengePests", "Pests"],
    ["challengePlantAccess", "Access to plants"],
    ["challengeOther", "Other"],
  ]
    .filter(([key]) => answers[key] === true)
    .map(([, label]) => label);

  const updateChoices = [
    ["updatesByWhatsapp", "WhatsApp"],
    ["updatesByEmail", "Email"],
    ["updatesByPhoneSms", "Phone call / SMS"],
  ]
    .filter(([key]) => answers[key] === true)
    .map(([, label]) => label);

  const addressParts = [
    getAnswer(answers, "deliveryStreetAddress"),
    getAnswer(answers, "deliveryCityTown"),
    getAnswer(answers, "deliveryRegion"),
    getAnswer(answers, "deliveryCountry"),
    getAnswer(answers, "deliveryPostalCode"),
  ].filter(Boolean);

  const subscriberName = fullName || email || phone || "Unknown";
  const rows = [
    ["Submission ID", submissionId],
    ["Submitted", createdAt.toISOString()],
    ["Name", fullName || "Not provided"],
    ["Email", email || "Not provided"],
    ["Phone", phone || "Not provided"],
    ["Network", getAnswer(answers, "primaryNetwork") || "Not provided"],
    ["WhatsApp", whatsappOptIn || answers.primaryHasWhatsapp === true ? "Yes" : "No"],
    ["Dream plant", getAnswer(answers, "dreamPlant") || "Not provided"],
    ["Gardening level", gardenerLevel || "Not provided"],
    ["Currently grows", growCategories.join(", ") || "Not provided"],
    ["Challenges", challengeLabels.join(", ") || "Not provided"],
    [
      "Challenge details",
      getAnswer(answers, "biggestGardeningChallenge") || "Not provided",
    ],
    ["Preferred updates", updateChoices.join(", ") || "Not provided"],
    ["Receiving plants", receivingPreference || "Not provided"],
    ["Delivery address", addressParts.join(", ") || "Not provided"],
  ];
  const details = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const context: Record<string, string> = {
    submissionId,
    submittedAt: createdAt.toISOString(),
    subscriberName,
    fullName: fullName || "",
    email: email || "",
    phone: phone || "",
    network: getAnswer(answers, "primaryNetwork"),
    whatsapp: whatsappOptIn || answers.primaryHasWhatsapp === true ? "Yes" : "No",
    dreamPlant: getAnswer(answers, "dreamPlant"),
    gardenerLevel,
    currentlyGrows: growCategories.join(", "),
    challenges: challengeLabels.join(", "),
    challengeDetails: getAnswer(answers, "biggestGardeningChallenge"),
    preferredUpdates: updateChoices.join(", "),
    receivingPreference,
    deliveryAddress: addressParts.join(", "),
    details,
  };
  const template = await getPlantGiveawayAdminTemplate();

  if (template) {
    const text = renderTemplate(template.bodyText, context);

    return {
      subject: renderTemplate(template.subject, context),
      text,
      html: buildHtmlFromText(text),
    };
  }

  const text = [
    "New Para-life Trees plant giveaway signup",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 10px;border-bottom:1px solid #e7e0d4;">${escapeHtml(
          label
        )}</th><td style="padding:6px 10px;border-bottom:1px solid #e7e0d4;">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#231f20;line-height:1.45;">
      <h2 style="margin:0 0 12px;color:#1f6b3a;">New Para-life Trees plant giveaway signup</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">
        ${htmlRows}
      </table>
    </div>
  `;

  return {
    subject: `New plant giveaway signup: ${subscriberName}`,
    text,
    html,
  };
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildGatedLeadSuccessRedirect({
  questionnaireSlug,
  goto,
}: {
  questionnaireSlug: string;
  goto: string;
}) {
  return `/questionnaire/${encodeURIComponent(
    questionnaireSlug || "invitation"
  )}?leadAccess=verified&goto=${encodeURIComponent(goto || "second-video")}`;
}

async function notifyAdminForWhatsappContactMethod({
  request,
  submission,
  answers,
}: {
  request: Request;
  submission: {
    id: string;
    questionnaireSlug: string;
    fullName: string | null;
    phone: string | null;
  };
  answers: Record<string, unknown>;
}) {
  const contactMethod = String(
    answers.invitationContactMethod ?? answers.contactMethod ?? ""
  )
    .trim()
    .toLowerCase();

  if (contactMethod !== "whatsapp") {
    return null;
  }

  const phone = String(submission.phone || answers.primaryPhone || "").trim();
  const phoneIdentifier = normalizePhoneIdentifier(phone);

  if (!phoneIdentifier) {
    return null;
  }

  const goto =
    submission.questionnaireSlug === "invitation" ? "second-video" : "home";
  const baseUrl = getBaseUrl(request);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const successRedirect = buildGatedLeadSuccessRedirect({
    questionnaireSlug: submission.questionnaireSlug || "invitation",
    goto,
  });

  const leadMetadata = {
    questionnaireSlug: submission.questionnaireSlug,
    source: "whatsapp-contact-method",
    goto,
    submissionId: submission.id,
    lastSubmittedAt: new Date().toISOString(),
    answers,
  };

  await prisma.lead.upsert({
    where: {
      id: `whatsapp-${phoneIdentifier}-${GATED_LEAD_ACCESS_TARGET}`,
    },
    create: {
      id: `whatsapp-${phoneIdentifier}-${GATED_LEAD_ACCESS_TARGET}`,
      fullName: submission.fullName,
      phone: phoneIdentifier,
      source: "whatsapp-contact-method",
      target: GATED_LEAD_ACCESS_TARGET,
      metadata: {
        ...leadMetadata,
        signupCount: 1,
      } as any,
    },
    update: {
      fullName: submission.fullName || undefined,
      phone: phoneIdentifier,
      source: "whatsapp-contact-method",
      target: GATED_LEAD_ACCESS_TARGET,
      metadata: {
        ...leadMetadata,
        signupCount: 1,
      } as any,
    },
  });

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: phoneIdentifier,
      target: GATED_LEAD_ACCESS_TARGET,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: phoneIdentifier,
      tokenHash,
      target: GATED_LEAD_ACCESS_TARGET,
      expiresAt,
      successRedirect,
    },
  });

  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;
  const name = submission.fullName?.trim() || "there";
  const sender = getSubmissionEmailSender({
    request,
    questionnaireSlug: submission.questionnaireSlug,
  });
  const message = [
    `Hi ${name},`,
    "",
    "Here is your private link to continue watching:",
    verifyUrl,
    "",
    sender.displayName,
  ].join("\n");
  const whatsappUrl = buildWhatsAppUrl({ phone: phoneIdentifier, message });

  if (!whatsappUrl) {
    return null;
  }

  return createAdminNotification({
    type: "whatsapp_contact_method",
    title: `WhatsApp follow-up: ${submission.fullName || phoneIdentifier}`,
    body: `${submission.fullName || "A visitor"} chose WhatsApp. Tap to send the prepared private link to ${phoneIdentifier}.`,
    actionUrl: whatsappUrl,
    source: "questionnaire-submission",
    sourceId: submission.id,
    metadata: {
      questionnaireSlug: submission.questionnaireSlug,
      brandKey: sender.brandKey,
      phone: phoneIdentifier,
      verifyUrl,
      successRedirect,
      contactMethod,
    },
  });
}

async function notifyPlantGiveawayAdmin({
  request,
  submission,
  answers,
}: {
  request: Request;
  submission: {
    id: string;
    createdAt: Date;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    whatsappOptIn: boolean;
  };
  answers: Record<string, unknown>;
}) {
  const to = getPlantGiveawayNotificationEmail();

  if (!to || !isValidEmail(to)) {
    return {
      ok: false,
      status: "skipped",
      skipped: true,
      reason: "No valid notification email.",
    };
  }

  const message = await buildPlantGiveawayAdminNotification({
    submissionId: submission.id,
    createdAt: submission.createdAt,
    fullName: submission.fullName,
    email: submission.email,
    phone: submission.phone,
    whatsappOptIn: submission.whatsappOptIn,
    answers,
  });
  const sender = getSubmissionEmailSender({
    request,
    questionnaireSlug: PLANT_GIVEAWAY_SLUG,
  });

  return sendEmailMessage({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: submission.email || null,
    fromEmail: sender.fromEmail,
    fromName: `${sender.fromName} Website`,
    purpose: "plant-giveaway-admin-notification",
  });
}

function buildAffiliateEmailVerificationMessage({
  fullName,
  verifyUrl,
}: {
  fullName: string | null;
  verifyUrl: string;
}) {
  const applicantName = fullName?.trim() || "there";
  const text = [
    `Hi ${applicantName},`,
    "",
    "We received your Para-life Trees affiliate application.",
    "",
    "Please confirm your email address using this link:",
    verifyUrl,
    "",
    "Verified emails get priority in our review process.",
    "",
    "Para-life Trees - Planting a Life in Paradise.",
  ].join("\n");

  return {
    subject: "Confirm your Para-life Trees affiliate application",
    text,
    html: buildHtmlFromText(text),
  };
}

async function sendAffiliateEmailVerification({
  request,
  submission,
  answers,
}: {
  request: Request;
  submission: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
  answers: Record<string, unknown>;
}) {
  const email = String(submission.email || "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return {
      ok: false,
      status: "skipped",
      skipped: true,
      reason: "No valid applicant email.",
    };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const target = `${AFFILIATE_EMAIL_VERIFICATION_TARGET_PREFIX}:${submission.id}`;
  const baseUrl = getBaseUrl(request);
  const successRedirect = `${baseUrl}/questionnaire/affiliate-sign-up?slide=affiliate-thank-you&emailVerified=1`;
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
      target,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      tokenHash,
      expiresAt,
      target,
      successRedirect,
    },
  });

  await prisma.questionnaireSubmission.update({
    where: { id: submission.id },
    data: {
      answers: {
        ...answers,
        affiliateEmailVerification: {
          status: "pending",
          sentAt: new Date().toISOString(),
          email,
          expiresAt: expiresAt.toISOString(),
        },
      } as any,
    },
  });

  const message = buildAffiliateEmailVerificationMessage({
    fullName: submission.fullName,
    verifyUrl,
  });
  const sender = getSubmissionEmailSender({
    request,
    questionnaireSlug: AFFILIATE_SIGNUP_SLUG,
  });

  return sendEmailMessage({
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    fromEmail: sender.fromEmail,
    fromName: sender.fromName,
    purpose: "affiliate-email-verification",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitPayload;

    const questionnaireSlug = String(body.questionnaireSlug ?? "").trim();
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};
    const fullName = String(body.fullName ?? answers.fullName ?? "").trim();
    const email = String(body.email ?? answers.email ?? "").trim();
    const phone = String(
      body.phone ?? answers.phone ?? answers.primaryPhone ?? ""
    ).trim();
    const whatsappOptIn = body.whatsappOptIn === true;

    if (!questionnaireSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing questionnaireSlug." },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const prismaAnswers =
      toJsonValue(answers) as Parameters<
        typeof prisma.questionnaireSubmission.create
      >[0]["data"]["answers"];
    const duplicateWindowStart = new Date(Date.now() - 1000 * 60 * 10);
    const recentCandidates = await prisma.questionnaireSubmission.findMany({
      where: {
        questionnaireSlug,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        createdAt: {
          gte: duplicateWindowStart,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
    const requestAnswerSnapshot = stableStringify(prismaAnswers);
    const duplicateSubmission = recentCandidates.find(
      (candidate) => stableStringify(candidate.answers) === requestAnswerSnapshot
    );

    if (duplicateSubmission) {
      return NextResponse.json({
        ok: true,
        message: "Submission already received.",
        submissionId: duplicateSubmission.id,
        duplicate: true,
        sheetsMirrored: false,
      });
    }

    const submission = await prisma.questionnaireSubmission.create({
      data: {
        questionnaireSlug,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        whatsappOptIn,
        answers: prismaAnswers,
      },
    });

    let sheetsMirrored = false;
    let adminNotificationSent = false;
    let adminWhatsappNotificationCreated = false;
    let affiliateEmailVerificationSent = false;

    try {
      const mirrorResult = await mirrorSubmissionToGoogleSheets({
        submissionId: submission.id,
        createdAt: submission.createdAt.toISOString(),
        questionnaireSlug: submission.questionnaireSlug,
        fullName: submission.fullName,
        email: submission.email,
        phone: submission.phone,
        whatsappOptIn: submission.whatsappOptIn,
        answers,
      });

      sheetsMirrored = mirrorResult.ok;
    } catch (mirrorError) {
      console.error("Google Sheets mirror error:", mirrorError);
    }

    if (questionnaireSlug === PLANT_GIVEAWAY_SLUG) {
      try {
        const notificationResult = await notifyPlantGiveawayAdmin({
          request: req,
          submission: {
            id: submission.id,
            createdAt: submission.createdAt,
            fullName: submission.fullName,
            email: submission.email,
            phone: submission.phone,
            whatsappOptIn: submission.whatsappOptIn,
          },
          answers,
        });

        adminNotificationSent =
          notificationResult?.ok === true ||
          notificationResult?.status === "sent" ||
          notificationResult?.status === "simulated";
      } catch (notificationError) {
        console.error("Plant giveaway admin notification error:", notificationError);
      }
    }

    try {
      const whatsappNotification =
        await notifyAdminForWhatsappContactMethod({
          request: req,
          submission: {
            id: submission.id,
            questionnaireSlug: submission.questionnaireSlug,
            fullName: submission.fullName,
            phone: submission.phone,
          },
          answers,
        });

      adminWhatsappNotificationCreated = Boolean(whatsappNotification?.id);
    } catch (notificationError) {
      console.error(
        "WhatsApp contact method admin notification error:",
        notificationError
      );
    }

    if (questionnaireSlug === AFFILIATE_SIGNUP_SLUG) {
      try {
        const verificationResult = await sendAffiliateEmailVerification({
          request: req,
          submission: {
            id: submission.id,
            fullName: submission.fullName,
            email: submission.email,
          },
          answers,
        });

        affiliateEmailVerificationSent =
          verificationResult?.ok === true ||
          verificationResult?.status === "sent" ||
          verificationResult?.status === "simulated";
      } catch (verificationError) {
        console.error(
          "Affiliate email verification notification error:",
          verificationError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Submission received.",
      submissionId: submission.id,
      sheetsMirrored,
      adminNotificationSent,
      adminWhatsappNotificationCreated,
      affiliateEmailVerificationSent,
    });
  } catch (error) {
    console.error("Submit route error:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 500 }
    );
  }
}
