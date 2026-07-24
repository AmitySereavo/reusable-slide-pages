import { Prisma, PrismaClient } from "@prisma/client";

export const plantShopStockAdjustmentReasons = {
  test: "Test adjustment",
  technical_fumble: "Correction after a technical fumble",
  replenishment: "Actual stock replenishment",
} as const;

export type PlantShopStockAdjustmentReason =
  keyof typeof plantShopStockAdjustmentReasons;

type PrismaLike = PrismaClient | Prisma.TransactionClient | any;

export async function ensurePlantShopStockAdjustmentTable(prisma: PrismaLike) {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlantShopStockAdjustment" (
      "id" TEXT PRIMARY KEY,
      "shopSlug" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productTitle" TEXT NOT NULL,
      "variationId" TEXT NOT NULL,
      "variationLabel" TEXT NOT NULL,
      "inventorySource" TEXT NOT NULL,
      "previousQuantity" INTEGER NOT NULL,
      "newQuantity" INTEGER NOT NULL,
      "quantityDifference" INTEGER NOT NULL,
      "direction" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "reasonLabel" TEXT NOT NULL,
      "notes" TEXT,
      "adjustedByUserId" TEXT,
      "adjustedByName" TEXT,
      "relatedOrderId" TEXT,
      "technicalIncidentId" TEXT,
      "isTestAdjustment" BOOLEAN NOT NULL DEFAULT false,
      "affectedAvailability" BOOLEAN NOT NULL DEFAULT false,
      "causedSoldOut" BOOLEAN NOT NULL DEFAULT false,
      "restoredSoldOutItem" BOOLEAN NOT NULL DEFAULT false,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "PlantShopStockAdjustment_shop_created_idx"
    ON "PlantShopStockAdjustment" ("shopSlug", "createdAt")
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "PlantShopStockAdjustment_line_idx"
    ON "PlantShopStockAdjustment" ("productId", "variationId")
  `;
}

export function normalizeStockAdjustmentReason(
  value: unknown
): PlantShopStockAdjustmentReason | null {
  const reason = String(value ?? "").trim();

  return reason in plantShopStockAdjustmentReasons
    ? (reason as PlantShopStockAdjustmentReason)
    : null;
}

export async function recordPlantShopStockAdjustment(
  prisma: PrismaLike,
  {
    shopSlug,
    productId,
    productTitle,
    variationId,
    variationLabel,
    inventorySource = "event",
    previousQuantity,
    newQuantity,
    reason,
    notes = null,
    adjustedByUserId = null,
    adjustedByName = null,
    relatedOrderId = null,
    technicalIncidentId = null,
    metadata = {},
  }: {
    shopSlug: string;
    productId: string;
    productTitle: string;
    variationId: string;
    variationLabel: string;
    inventorySource?: string;
    previousQuantity: number;
    newQuantity: number;
    reason: PlantShopStockAdjustmentReason;
    notes?: string | null;
    adjustedByUserId?: string | null;
    adjustedByName?: string | null;
    relatedOrderId?: string | null;
    technicalIncidentId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await ensurePlantShopStockAdjustmentTable(prisma);

  const quantityDifference = newQuantity - previousQuantity;
  const id = `${shopSlug}:${productId}:${variationId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const affectedAvailability =
    previousQuantity !== newQuantity ||
    (previousQuantity <= 0 && newQuantity > 0) ||
    (previousQuantity > 0 && newQuantity <= 0);

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "PlantShopStockAdjustment"
        (
          "id",
          "shopSlug",
          "productId",
          "productTitle",
          "variationId",
          "variationLabel",
          "inventorySource",
          "previousQuantity",
          "newQuantity",
          "quantityDifference",
          "direction",
          "reason",
          "reasonLabel",
          "notes",
          "adjustedByUserId",
          "adjustedByName",
          "relatedOrderId",
          "technicalIncidentId",
          "isTestAdjustment",
          "affectedAvailability",
          "causedSoldOut",
          "restoredSoldOutItem",
          "metadata"
        )
      VALUES (
        ${id},
        ${shopSlug},
        ${productId},
        ${productTitle},
        ${variationId},
        ${variationLabel},
        ${inventorySource},
        ${previousQuantity},
        ${newQuantity},
        ${quantityDifference},
        ${
          quantityDifference > 0
            ? "increase"
            : quantityDifference < 0
              ? "decrease"
              : "no_change"
        },
        ${reason},
        ${plantShopStockAdjustmentReasons[reason]},
        ${notes},
        ${adjustedByUserId},
        ${adjustedByName},
        ${relatedOrderId},
        ${technicalIncidentId},
        ${reason === "test"},
        ${affectedAvailability},
        ${previousQuantity > 0 && newQuantity <= 0},
        ${previousQuantity <= 0 && newQuantity > 0},
        ${JSON.stringify(metadata)}::jsonb
      )
    `
  );
}
