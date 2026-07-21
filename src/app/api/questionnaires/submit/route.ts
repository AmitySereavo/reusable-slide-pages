import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorSubmissionToGoogleSheets } from "@/lib/googleSheets";
import { sendEmailMessage } from "@/lib/verification/emailMessage";

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
const DEFAULT_PLANT_GIVEAWAY_ADMIN_EMAIL = "paralifetrees@gmail.com";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function buildPlantGiveawayAdminNotification({
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
    ["updatesByPhone", "Phone call / SMS"],
  ]
    .filter(([key]) => answers[key] === true)
    .map(([, label]) => label);

  const addressParts = [
    getAnswer(answers, "deliveryStreet"),
    getAnswer(answers, "deliveryCity"),
    getAnswer(answers, "deliveryParish"),
    getAnswer(answers, "deliveryCountry"),
    getAnswer(answers, "deliveryPostalCode"),
  ].filter(Boolean);

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
    subject: `New plant giveaway signup: ${fullName || email || phone || "Unknown"}`,
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

async function notifyPlantGiveawayAdmin({
  submission,
  answers,
}: {
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

  const message = buildPlantGiveawayAdminNotification({
    submissionId: submission.id,
    createdAt: submission.createdAt,
    fullName: submission.fullName,
    email: submission.email,
    phone: submission.phone,
    whatsappOptIn: submission.whatsappOptIn,
    answers,
  });

  return sendEmailMessage({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: submission.email || null,
    fromName: "Para-life Trees Website",
    purpose: "plant-giveaway-admin-notification",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitPayload;

    const questionnaireSlug = String(body.questionnaireSlug ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const whatsappOptIn = body.whatsappOptIn === true;
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};

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

    return NextResponse.json({
      ok: true,
      message: "Submission received.",
      submissionId: submission.id,
      sheetsMirrored,
      adminNotificationSent,
    });
  } catch (error) {
    console.error("Submit route error:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 500 }
    );
  }
}
