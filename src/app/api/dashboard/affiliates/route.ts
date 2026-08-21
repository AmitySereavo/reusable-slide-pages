import { NextResponse } from "next/server";
import crypto from "crypto";
import { createRequire } from "module";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import { getEmailSenderForContext } from "@/config/siteBrands";
import { getAffiliateStoreCommissionSetting } from "@/lib/affiliates/storeCommissionSettings";

const AFFILIATE_SIGNUP_SLUG = "affiliate-sign-up";
const require = createRequire(import.meta.url);
const bcrypt = require("bcrypt");
const affiliateLevels = new Set(["bronze", "silver", "gold"]);
const affiliateStatuses = new Set([
  "pending_review",
  "approved",
  "declined",
  "paused",
]);
const statusConfirmations: Record<string, string> = {
  pending_review: "PENDING",
  approved: "APPROVE",
  declined: "DECLINE",
  paused: "PAUSE",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

async function createAccountSetupToken(userId: string, identifier: string) {
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      identifier,
      tokenHash,
      expiresAt,
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}

async function createTemporaryPasswordHash() {
  const temporaryPassword = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(temporaryPassword, 10);
}

function normalizeMetadata(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeCsv(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAffiliateProductSelection(value: unknown) {
  return normalizeCsv(value)
    .filter((item) => item !== "all_commissioned_products")
    .join(",");
}

function serializeApplication(submission: any) {
  const answers = normalizeMetadata(submission.answers);
  const affiliate = normalizeMetadata(answers.affiliateReview);
  const emailVerification = normalizeMetadata(
    answers.affiliateEmailVerification
  );
  const socialLinks = [
    ["Facebook", answers.affiliateFacebookPage],
    ["Instagram", answers.affiliateInstagramPage],
    ["TikTok", answers.affiliateTikTokPage],
    ["LinkedIn", answers.affiliateLinkedInPage],
    ["Website", answers.affiliateWebsite],
  ]
    .filter(([, url]) => String(url ?? "").trim())
    .map(([label, url]) => ({ label, url: String(url).trim() }));

  return {
    id: submission.id,
    submittedAt: submission.createdAt?.toISOString?.() ?? submission.createdAt,
    updatedAt: submission.updatedAt?.toISOString?.() ?? submission.updatedAt,
    fullName: submission.fullName,
    email: submission.email,
    emailVerification: {
      status: emailVerification.status || "not_sent",
      verifiedAt: emailVerification.verifiedAt || null,
      sentAt: emailVerification.sentAt || null,
    },
    phone: submission.phone,
    whatsappOptIn:
      submission.whatsappOptIn === true ||
      answers.affiliatePhoneIsWhatsapp === true,
    network: answers.primaryNetwork || "",
    socialLinks,
    preferredStores:
      answers.affiliatePreferredStores || answers.affiliatePreferredStore || "",
    selectedShopType: answers.affiliateSelectedShopType || "",
    productSkuList:
      answers.affiliateProductSkuList ||
      normalizeCsv(answers.affiliateProductSkuSelection).join(", ") ||
      "",
    audienceType: answers.affiliateAudienceType || "",
    audienceFit: answers.affiliateAudienceFit || "",
    elevatorPitch: answers.affiliateElevatorPitch || "",
    review: {
      status: affiliate.status || "pending_review",
      level: affiliate.level || "bronze",
      scope: affiliate.scope || "entire_store",
      storeKeys: Array.isArray(affiliate.storeKeys)
        ? affiliate.storeKeys
        : normalizeCsv(
            answers.affiliatePreferredStores || answers.affiliatePreferredStore
          ),
      productSkus: Array.isArray(affiliate.productSkus)
        ? affiliate.productSkus
        : normalizeCsv(
            answers.affiliateProductSkuList ||
              normalizeAffiliateProductSelection(
                answers.affiliateProductSkuSelection
              )
          ),
      notes: affiliate.notes || "",
      reviewedAt: affiliate.reviewedAt || null,
      accountSetupEmailSentAt: affiliate.accountSetupEmailSentAt || null,
    },
  };
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getAffiliatePercent(item: any, level: string, shopKey: string) {
  const metadata = normalizeMetadata(item.metadata);
  const itemCommission = normalizeMetadata(metadata.affiliateCommission);
  const levelKey =
    level === "gold"
      ? "goldPercent"
      : level === "silver"
        ? "silverPercent"
        : "bronzePercent";
  const itemPercent = Number(itemCommission[levelKey] ?? 0);
  if (itemPercent > 0) return itemPercent;

  return Number(getAffiliateStoreCommissionSetting(shopKey)?.[levelKey] ?? 0);
}

function getItemPrice(item: any) {
  const options = parseJsonArray(item.options);
  const optionPrices = options
    .map((option) =>
      Number(
        option?.priceJmd ??
          option?.unitPriceJmd ??
          option?.price ??
          option?.discountedPriceJmd ??
          0
      )
    )
    .filter((price) => Number.isFinite(price) && price > 0);

  if (optionPrices.length) return Math.min(...optionPrices);

  const metadata = normalizeMetadata(item.metadata);
  return Number(metadata.priceJmd ?? metadata.unitPriceJmd ?? 0) || 0;
}

function getShopLink(shopKey: string, slug: string) {
  const base =
    shopKey === "garden-package"
      ? "/gardenpackage"
      : shopKey === "seedling-shop"
        ? "/seedlings"
        : "/shop";

  return `${base}?product=${encodeURIComponent(slug)}`;
}

async function serializeAffiliatedProducts(application: any) {
  const review = application.review || {};
  const storeKeys = normalizeCsv(review.storeKeys);
  const productSkus = normalizeCsv(review.productSkus).map((sku) =>
    sku.toLowerCase()
  );
  const level = review.level || "bronze";

  if (!storeKeys.length) return [];

  const items = await prisma.$queryRaw<any[]>`
    SELECT *
    FROM "UnifiedInventoryItem"
    WHERE "active" = true
    ORDER BY "title" ASC, "updatedAt" DESC
  `;

  return items
    .flatMap((item) => {
      const shopListings = parseJsonArray(item.shopListings);
      const shopTags = parseJsonArray(item.shopTags);
      const itemSku = String(item.sku || "").trim();
      const metadata = normalizeMetadata(item.metadata);

      return storeKeys
        .filter((shopKey) => {
          const inShop =
            shopTags.includes(shopKey) ||
            shopListings.some((listing) => listing?.shopKey === shopKey);
          const inScope =
            review.scope !== "specific_products" ||
            !productSkus.length ||
            productSkus.includes(itemSku.toLowerCase());

          return inShop && inScope;
        })
        .map((shopKey) => {
          const price = getItemPrice(item);
          const percent = getAffiliatePercent(item, level, shopKey);
          return {
            id: `${application.id}:${shopKey}:${item.id}`,
            shopKey,
            title: item.title,
            sku: itemSku,
            commissionPercent: percent,
            commissionAmountJmd: Math.round((price * percent) / 100),
            priceJmd: price,
            affiliateLink: getShopLink(shopKey, item.slug),
            associatedLinks: [
              metadata.growGuideUrl,
              metadata.videoUrl,
              metadata.guideUrl,
            ].filter(Boolean),
          };
        });
    })
    .filter((item) => item.commissionPercent > 0);
}

async function sendApprovedAffiliateAccountEmail({
  request,
  application,
  review,
}: {
  request: Request;
  application: any;
  review: Record<string, any>;
}) {
  const email = String(application.email || "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return { ok: false, skipped: true, reason: "No valid email." };
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: application.fullName || null,
        password: await createTemporaryPasswordHash(),
        passwordUpdatedAt: null,
        emailVerifiedAt: new Date(),
        createdBy: "affiliate-approval",
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || application.fullName || null,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
      },
    });
  }

  const resetToken = await createAccountSetupToken(user.id, email);
  const accountDetailsPath = "/questionnaire/auth-account";
  const setupUrl = `${getBaseUrl(request)}/reset-password?token=${encodeURIComponent(
    resetToken.rawToken
  )}&returnTo=${encodeURIComponent(accountDetailsPath)}`;
  const applicantName = application.fullName || "there";
  const level = String(review.level || "bronze").toUpperCase();
  const text = [
    `Hi ${applicantName},`,
    "",
    "Your Para-life Trees affiliate application has been approved.",
    "",
    `Affiliate level: ${level}`,
    "",
    "Use this link to set your password and update your account name:",
    setupUrl,
    "",
    "After that, you can log in and review your affiliate details.",
    "",
    "Para-life Trees - Planting a Life in Paradise.",
  ].join("\n");

  return sendEmailMessage({
    to: email,
    subject: "Your Para-life Trees affiliate request was approved",
    text,
    html: buildHtmlFromText(text),
    fromEmail: getEmailSenderForContext({
      questionnaireSlug: AFFILIATE_SIGNUP_SLUG,
    }).fromEmail,
    fromName: "Para-life Trees",
    purpose: "affiliate-approval-account-setup",
  });
}

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const submissions = await prisma.questionnaireSubmission.findMany({
    where: { questionnaireSlug: AFFILIATE_SIGNUP_SLUG },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const applications = submissions.map(serializeApplication);
  const applicationsWithProducts = await Promise.all(
    applications.map(async (application) => ({
      ...application,
      affiliatedProducts:
        application.review?.status === "approved"
          ? await serializeAffiliatedProducts(application)
          : [],
    }))
  );

  return NextResponse.json({
    applications: applicationsWithProducts,
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "Affiliate application id is required." },
      { status: 400 }
    );
  }

  const existing = await prisma.questionnaireSubmission.findFirst({
    where: { id, questionnaireSlug: AFFILIATE_SIGNUP_SLUG },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Affiliate application not found." },
      { status: 404 }
    );
  }

  const status = affiliateStatuses.has(String(body?.status ?? ""))
    ? String(body.status)
    : "pending_review";
  const requiredConfirmation = statusConfirmations[status] || "";
  const submittedConfirmation = String(body?.statusConfirmation ?? "")
    .trim()
    .toUpperCase();

  if (requiredConfirmation && submittedConfirmation !== requiredConfirmation) {
    return NextResponse.json(
      { error: `Type ${requiredConfirmation} to save this status.` },
      { status: 400 }
    );
  }

  const level = affiliateLevels.has(String(body?.level ?? ""))
    ? String(body.level)
    : "bronze";
  const scope =
    String(body?.scope ?? "") === "specific_products"
      ? "specific_products"
      : "entire_store";
  const currentAnswers = normalizeMetadata(existing.answers);
  const currentAffiliate = normalizeMetadata(currentAnswers.affiliateReview);
  const currentStatus = currentAffiliate.status || "pending_review";
  const nextAnswers = {
    ...currentAnswers,
    affiliateReview: {
      ...currentAffiliate,
      status,
      level,
      scope,
      storeKeys: normalizeCsv(body?.storeKeys),
      productSkus: normalizeCsv(body?.productSkus),
      notes: String(body?.notes ?? "").trim(),
      reviewedAt: new Date().toISOString(),
    },
  };

  let updated = await prisma.questionnaireSubmission.update({
    where: { id },
    data: { answers: nextAnswers as any },
  });

  const approvedNow = currentStatus !== "approved" && status === "approved";
  if (approvedNow) {
    const setupResult = await sendApprovedAffiliateAccountEmail({
      request,
      application: updated,
      review: normalizeMetadata((updated.answers as any)?.affiliateReview),
    });

    if (!setupResult.ok) {
      const setupError = setupResult as any;
      return NextResponse.json(
        {
          error:
            setupError.reason ||
            setupError.error?.message ||
            "Affiliate was approved, but the setup email could not be sent.",
        },
        { status: 502 }
      );
    }

    const refreshedAnswers = normalizeMetadata(updated.answers);
    updated = await prisma.questionnaireSubmission.update({
      where: { id },
      data: {
        answers: {
          ...refreshedAnswers,
          affiliateReview: {
            ...normalizeMetadata(refreshedAnswers.affiliateReview),
            accountSetupEmailSentAt: new Date().toISOString(),
          },
        } as any,
      },
    });
  }

  const submissions = await prisma.questionnaireSubmission.findMany({
    where: { questionnaireSlug: AFFILIATE_SIGNUP_SLUG },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const applications = submissions.map(serializeApplication);
  const applicationsWithProducts = await Promise.all(
    applications.map(async (application) => ({
      ...application,
      affiliatedProducts:
        application.review?.status === "approved"
          ? await serializeAffiliatedProducts(application)
          : [],
    }))
  );

  return NextResponse.json({
    ok: true,
    applications: applicationsWithProducts,
    affiliatedProducts:
      status === "approved"
        ? await serializeAffiliatedProducts(serializeApplication(updated))
        : [],
  });
}
