import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const PRODUCT_GUIDE_RULES = [
  {
    guideSlug: "black-pepper-grow-guide",
    guidePath: "/black-pepper",
    labels: ["black pepper"],
  },
  {
    guideSlug: "green-onion-grow-guide",
    guidePath: "/green-onion",
    labels: ["scallion", "green onion"],
  },
  {
    guideSlug: "lemon-balm-grow-guide",
    guidePath: "/lemon-balm",
    labels: ["lemon balm"],
  },
  {
    guideSlug: "slicing-tomato-grow-guide",
    guidePath: "/slicing-tomato",
    labels: ["tomato"],
  },
  {
    guideSlug: "scotch-bonnet-grow-guide",
    guidePath: "/scotch-bonnet",
    labels: ["scotch bonnet"],
  },
  {
    guideSlug: "lettuce-grow-guide",
    guidePath: "/lettuce",
    labels: ["lettuce"],
  },
  {
    guideSlug: "cabbage-grow-guide",
    guidePath: "/cabbage",
    labels: ["cabbage"],
  },
] as const;

export type GrowGuideMatch = {
  guideSlug: string;
  guidePath: string;
};

export function findGrowGuideForProduct(product: {
  productTitle?: string | null;
  sizeLabel?: string | null;
  productId?: string | null;
  sku?: string | null;
  productSku?: string | null;
}) {
  const haystack = [
    product.productTitle,
    product.sizeLabel,
    product.productId,
    product.sku,
    product.productSku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    PRODUCT_GUIDE_RULES.find((rule) =>
      rule.labels.some((label) => haystack.includes(label))
    ) || null
  );
}

export function makeGrowGuideToken() {
  return randomBytes(24).toString("base64url");
}

export async function ensureCustomerGrowGuideTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "CustomerGrowGuideLink" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT NOT NULL UNIQUE,
      "ownerUserId" TEXT,
      "createdByUserId" TEXT,
      "orderCode" TEXT,
      "fulfillmentItemId" TEXT,
      "customerName" TEXT,
      "customerEmail" TEXT,
      "customerPhone" TEXT,
      "ownerIdentityKey" TEXT,
      "productId" TEXT,
      "productSku" TEXT,
      "productTitle" TEXT,
      "sizeLabel" TEXT,
      "guideSlug" TEXT NOT NULL,
      "guidePath" TEXT NOT NULL,
      "openedCount" INTEGER NOT NULL DEFAULT 0,
      "firstOpenedAt" TIMESTAMP(3),
      "lastOpenedAt" TIMESTAMP(3),
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "CustomerGrowGuideVisit" (
      "id" TEXT PRIMARY KEY,
      "linkId" TEXT NOT NULL REFERENCES "CustomerGrowGuideLink"("id") ON DELETE CASCADE,
      "token" TEXT NOT NULL,
      "deviceKey" TEXT,
      "ipHash" TEXT,
      "userAgent" TEXT,
      "location" JSONB,
      "referrer" TEXT,
      "eventType" TEXT NOT NULL DEFAULT 'opened_link',
      "questionnaireSlug" TEXT,
      "slideId" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideLink_orderCode_idx" ON "CustomerGrowGuideLink"("orderCode")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideLink_fulfillmentItemId_idx" ON "CustomerGrowGuideLink"("fulfillmentItemId")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideLink_guideSlug_idx" ON "CustomerGrowGuideLink"("guideSlug")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideLink_ownerIdentityKey_idx" ON "CustomerGrowGuideLink"("ownerIdentityKey")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideVisit_linkId_createdAt_idx" ON "CustomerGrowGuideVisit"("linkId", "createdAt")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideVisit_token_idx" ON "CustomerGrowGuideVisit"("token")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomerGrowGuideVisit_deviceKey_idx" ON "CustomerGrowGuideVisit"("deviceKey")`;
}

export function normalizeIdentityKey({
  email,
  phone,
  name,
}: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;

  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (normalizedPhone) return `phone:${normalizedPhone}`;

  return `name:${String(name || "unknown").trim().toLowerCase()}`;
}

export function makeJson(value: unknown) {
  return (value && typeof value === "object" ? value : {}) as Prisma.InputJsonObject;
}
