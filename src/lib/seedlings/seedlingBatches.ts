import { Prisma } from "@prisma/client";
import { upsertUnifiedInventoryItem } from "@/lib/inventory/unifiedInventory";
import {
  SEEDLING_SHOP_SLUG,
  buildSeedlingTimeline,
  getNextUpcomingDate,
  getSeedlingBatchCurrentPrice,
  getSeedlingProductionTemplate,
  seedlingProductionTemplates,
  toLocalDateTimeIso,
  type SeedlingProductionTemplate,
  type SeedlingTimelineEvent,
} from "./productionTemplates";
import {
  getCanonicalPlantKey,
  getCanonicalPlantName,
} from "@/lib/nursery/plantRecipes";

type DbClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  $executeRaw: <T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>;
  $queryRaw: <T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>;
};

export type SeedlingBatchInput = {
  cropKey?: string;
  cropName?: string;
  propagationType?: string;
  productionDate?: string;
  productionTime?: string;
  quantityStarted?: number;
  retailPrice?: number;
  purposeKey?: string;
  purposeLabel?: string;
  shopKey?: string;
};

export type SeedlingBatchUpdateInput = {
  batchId?: string;
  actionType?: string;
  customActionTitle?: string;
  performedDate?: string;
  performedTime?: string;
  useNow?: boolean;
  quantityTransplanted?: number;
  notes?: string;
  photoUrl?: string;
  metadata?: Record<string, unknown>;
};

export type SeedlingBatchEditInput = {
  batchId?: string;
  batchName?: string;
  purposeKey?: string;
  status?: string;
  quantityStarted?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  retailPrice?: number;
};

export async function ensureSeedlingBatchTables(db: DbClient) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SeedlingProductionBatch" (
      "id" TEXT PRIMARY KEY,
      "cropKey" TEXT NOT NULL,
      "cropName" TEXT NOT NULL,
      "propagationType" TEXT NOT NULL DEFAULT 'seedling',
      "batchName" TEXT NOT NULL,
      "productionAt" TIMESTAMP(3) NOT NULL,
      "germinationAt" TIMESTAMP(3),
      "availabilityAt" TIMESTAMP(3) NOT NULL,
      "priceIncreaseDates" JSONB NOT NULL DEFAULT '[]',
      "quantityStarted" INTEGER NOT NULL DEFAULT 0,
      "quantityReserved" INTEGER NOT NULL DEFAULT 0,
      "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
      "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "timeline" JSONB NOT NULL DEFAULT '[]',
      "publicUpdates" JSONB NOT NULL DEFAULT '[]',
      "metadata" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SeedlingBatchActivity" (
      "id" TEXT PRIMARY KEY,
      "batchId" TEXT NOT NULL REFERENCES "SeedlingProductionBatch"("id") ON DELETE CASCADE,
      "actionType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "performedAt" TIMESTAMP(3) NOT NULL,
      "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" TEXT,
      "photoUrl" TEXT,
      "metadata" JSONB NOT NULL DEFAULT '{}'
    );
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SeedlingProductionBatch_cropKey_idx"
      ON "SeedlingProductionBatch" ("cropKey");
  `);
}

export async function listSeedlingBatches(db: DbClient) {
  await ensureSeedlingBatchTables(db);
  const rows = await db.$queryRaw<any[]>`
    SELECT *
    FROM "SeedlingProductionBatch"
    ORDER BY "availabilityAt" ASC, "productionAt" DESC
  `;
  const activities = await db.$queryRaw<any[]>`
    SELECT *
    FROM "SeedlingBatchActivity"
    ORDER BY "performedAt" DESC, "enteredAt" DESC
  `;
  const activitiesByBatch = activities.reduce((groups, activity) => {
    const batchId = String(activity.batchId || "");
    groups.set(batchId, [...(groups.get(batchId) || []), serializeBatchActivity(activity)]);
    return groups;
  }, new Map<string, any[]>());

  return rows.map((row) => ({
    ...serializeSeedlingBatch(row),
    activities: activitiesByBatch.get(String(row.id)) || [],
  }));
}

export async function createSeedlingBatch(db: DbClient, input: SeedlingBatchInput) {
  await ensureSeedlingBatchTables(db);
  const template = getBatchProductionTemplate(input);
  if (!template) {
    throw new Error("Choose a plant from the Plant Production Timeline catalog.");
  }

  const quantityStarted = Math.max(
    0,
    Math.floor(Number(input.quantityStarted || template.defaultQuantity))
  );
  if (!quantityStarted) {
    throw new Error("Enter the batch quantity.");
  }

  const productionDate = String(input.productionDate || "").trim();
  if (!productionDate) {
    throw new Error("Choose the production date.");
  }

  const productionAt = toLocalDateTimeIso(
    productionDate,
    String(input.productionTime || "08:00")
  );
  const timeline = buildSeedlingTimeline({ productionAt, template });
  const id = `seedling-batch-${template.key}-${productionDate}-${Date.now()
    .toString(36)
    .toLowerCase()}`;
  const batchName = getBatchTitle(template.cropName);
  const retailPrice = Math.max(
    0,
    Number(input.retailPrice || template.retailPrice)
  );
  const purposeKey = normalizePurposeKey(input.purposeKey || input.shopKey);
  const purpose = getProductionPurpose(purposeKey);

  await db.$executeRaw`
    INSERT INTO "SeedlingProductionBatch" (
      "id",
      "cropKey",
      "cropName",
      "propagationType",
      "batchName",
      "productionAt",
      "germinationAt",
      "availabilityAt",
      "priceIncreaseDates",
      "quantityStarted",
      "quantityReserved",
      "quantityAvailable",
      "retailPrice",
      "status",
      "timeline",
      "metadata",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${template.key},
      ${getBatchTitle(template.cropName)},
      ${template.propagationType},
      ${batchName},
      ${new Date(productionAt)},
      ${new Date(timeline.germinationAt)},
      ${new Date(timeline.availabilityAt)},
      CAST(${JSON.stringify(timeline.priceIncreaseDates)} AS jsonb),
      ${quantityStarted},
      0,
      ${quantityStarted},
      ${retailPrice},
      'planned',
      CAST(${JSON.stringify(timeline.events)} AS jsonb),
      CAST(${JSON.stringify({
        template,
        productionPurposeKey: purpose.key,
        productionPurposeLabel:
          String(input.purposeLabel || "").trim() || purpose.label,
        productionPurposeType: purpose.type,
        shopKey: purpose.shopKey,
        quantityAtTransplant: null,
        transplantAt: null,
      })} AS jsonb),
      CURRENT_TIMESTAMP
    )
  `;

  const batch = (await listSeedlingBatches(db)).find((item) => item.id === id);
  if (!batch) {
    throw new Error("Seedling batch could not be created.");
  }

  await upsertSeedlingBatchInventoryItem(db, batch);
  return batch;
}

function getBatchProductionTemplate(input: SeedlingBatchInput): SeedlingProductionTemplate | null {
  const existingTemplate = getSeedlingProductionTemplate(input.cropKey);
  if (existingTemplate) return existingTemplate;

  const cropName = getCanonicalPlantName(input.cropName || input.cropKey);
  const cropKey = getCanonicalPlantKey(input.cropKey || cropName);
  if (!cropName || !cropKey) return null;

  const propagationType = normalizeStartMethod(input.propagationType);

  return {
    key: cropKey,
    cropName,
    propagationType,
    retailPrice: 0,
    estimatedGerminationDays: propagationType === "cutting" ? 14 : 7,
    readyWeeksAfterGermination: 4,
    defaultQuantity: 1,
  };
}

function getBatchTitle(value: unknown) {
  return getCanonicalPlantName(value) || String(value || "").trim() || "Plant batch";
}

function cleanBatchQuantityLabel(value: unknown) {
  return String(value || "")
    .replace(/\s*seeds\s*\/\s*cells\s*/gi, " seeds")
    .replace(/\s*cells?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeStartMethod(value: unknown): SeedlingProductionTemplate["propagationType"] {
  const normalized = String(value || "seedling").trim();
  if (
    [
      "seedling",
      "cutting",
      "air_layer",
      "division",
      "sucker",
      "grafting",
      "existing_stock",
      "other",
    ].includes(normalized)
  ) {
    return normalized as SeedlingProductionTemplate["propagationType"];
  }

  return "seedling";
}

export async function syncStarterSeedlingBatches(db: DbClient) {
  await ensureSeedlingBatchTables(db);
  const existingRows = await db.$queryRaw<Array<{ cropKey: string }>>`
    SELECT DISTINCT "cropKey"
    FROM "SeedlingProductionBatch"
    WHERE "quantityAvailable" > 0
      AND "status" NOT IN ('sold_out', 'cancelled')
  `;
  const existingCropKeys = new Set(existingRows.map((row) => row.cropKey));
  const today = new Date().toISOString().slice(0, 10);
  const created = [];

  for (const template of seedlingProductionTemplates) {
    if (existingCropKeys.has(template.key)) {
      continue;
    }

    created.push(
      await createSeedlingBatch(db, {
        cropKey: template.key,
        productionDate: today,
        productionTime: "08:00",
        quantityStarted: template.defaultQuantity,
        retailPrice: template.retailPrice,
      })
    );
  }

  return created;
}

export async function syncCurrentSeedlingShopBatches(db: DbClient) {
  await ensureSeedlingBatchTables(db);

  for (const template of seedlingProductionTemplates) {
    const currentBatch = template.currentBatch;

    if (!currentBatch) {
      continue;
    }

    const productionDate = currentBatch.dateStarted;
    const productionAt = toLocalDateTimeIso(productionDate, "08:00");
    const timeline = buildSeedlingTimeline({ productionAt, template });
    const id = `seedling-batch-current-${template.key}-${productionDate}`;
    const batchName = getBatchTitle(template.cropName);
    const purpose = getProductionPurpose("seedling-shop");

    await db.$executeRaw`
      INSERT INTO "SeedlingProductionBatch" (
        "id",
        "cropKey",
        "cropName",
        "propagationType",
        "batchName",
        "productionAt",
        "germinationAt",
        "availabilityAt",
        "priceIncreaseDates",
        "quantityStarted",
        "quantityReserved",
        "quantityAvailable",
        "retailPrice",
        "status",
        "timeline",
        "metadata",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${template.key},
        ${getBatchTitle(template.cropName)},
        ${template.propagationType},
        ${batchName},
        ${new Date(productionAt)},
        ${new Date(timeline.germinationAt)},
        ${new Date(timeline.availabilityAt)},
        CAST(${JSON.stringify(timeline.priceIncreaseDates)} AS jsonb),
        ${template.defaultQuantity},
        0,
        ${template.defaultQuantity},
        ${template.retailPrice},
        'planned',
        CAST(${JSON.stringify(timeline.events)} AS jsonb),
        CAST(${JSON.stringify({
          template,
          currentSeedlingShopBatch: true,
          productionPurposeKey: purpose.key,
          productionPurposeLabel: purpose.label,
          productionPurposeType: purpose.type,
          shopKey: purpose.shopKey,
          quantityAtTransplant: null,
          transplantAt: null,
          quantityLabel: currentBatch.quantityLabel,
          estimatedPlantsLabel: currentBatch.estimatedPlantsLabel,
          germinationTimeLabel: currentBatch.germinationTimeLabel,
        })} AS jsonb),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "cropKey" = EXCLUDED."cropKey",
        "cropName" = EXCLUDED."cropName",
        "propagationType" = EXCLUDED."propagationType",
        "batchName" = EXCLUDED."batchName",
        "productionAt" = EXCLUDED."productionAt",
        "germinationAt" = EXCLUDED."germinationAt",
        "availabilityAt" = EXCLUDED."availabilityAt",
        "priceIncreaseDates" = EXCLUDED."priceIncreaseDates",
        "quantityStarted" = EXCLUDED."quantityStarted",
        "quantityAvailable" = GREATEST(0, EXCLUDED."quantityStarted" - "SeedlingProductionBatch"."quantityReserved"),
        "retailPrice" = EXCLUDED."retailPrice",
        "status" = EXCLUDED."status",
        "timeline" = EXCLUDED."timeline",
        "metadata" = EXCLUDED."metadata",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    const rows = await db.$queryRaw<any[]>`
      SELECT *
      FROM "SeedlingProductionBatch"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const batch = rows[0] ? serializeSeedlingBatch(rows[0]) : null;

    if (batch) {
      await upsertSeedlingBatchInventoryItem(db, batch);
    }
  }
}

export async function recordSeedlingBatchActivity(
  db: DbClient,
  input: SeedlingBatchUpdateInput
) {
  await ensureSeedlingBatchTables(db);
  const batchId = String(input.batchId || "").trim();
  if (!batchId) {
    throw new Error("Choose a batch to update.");
  }

  const title =
    String(input.customActionTitle || "").trim() ||
    getActionLabel(input.actionType);
  const quantityTransplanted = Math.max(
    0,
    Math.floor(Number(input.quantityTransplanted || 0))
  );
  const performedAt = input.useNow
    ? new Date()
    : new Date(
        toLocalDateTimeIso(
          String(input.performedDate || "").trim(),
          String(input.performedTime || "08:00").trim()
        )
      );

  if (Number.isNaN(performedAt.getTime())) {
    throw new Error("Choose a valid action date and time.");
  }

  const id = `seedling-activity-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  await db.$executeRaw`
    INSERT INTO "SeedlingBatchActivity" (
      "id",
      "batchId",
      "actionType",
      "title",
      "performedAt",
      "enteredAt",
      "notes",
      "photoUrl",
      "metadata"
    )
    VALUES (
      ${id},
      ${batchId},
      ${String(input.actionType || "custom_action")},
      ${title},
      ${performedAt},
      CURRENT_TIMESTAMP,
      ${String(input.notes || "").trim() || null},
      ${String(input.photoUrl || "").trim() || null},
      CAST(${JSON.stringify({
        source: "dashboard",
        ...normalizeObject(input.metadata),
        quantityTransplanted: quantityTransplanted || null,
      })} AS jsonb)
    )
  `;

  if (
    quantityTransplanted > 0 &&
    ["transplanted", "transplant_session"].includes(
      String(input.actionType || "").trim()
    )
  ) {
    const rows = await db.$queryRaw<any[]>`
      SELECT "metadata"
      FROM "SeedlingProductionBatch"
      WHERE "id" = ${batchId}
      LIMIT 1
    `;
    const metadata = normalizeObject(rows[0]?.metadata);
    const transplantSessions = normalizeArray(metadata.transplantSessions);
    const currentTotal = Math.max(
      0,
      Math.floor(Number(metadata.quantityAtTransplant || 0))
    );
    const nextTotal = currentTotal + quantityTransplanted;

    await db.$executeRaw`
      UPDATE "SeedlingProductionBatch"
      SET
        "metadata" = CAST(${JSON.stringify({
          ...metadata,
          quantityAtTransplant: nextTotal,
          lastTransplantSessionAt: performedAt.toISOString(),
          transplantSessions: [
            ...transplantSessions,
            {
              performedAt: performedAt.toISOString(),
              quantityTransplanted,
              activityId: id,
              notes: String(input.notes || "").trim() || null,
            },
          ],
        })} AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${batchId}
    `;
  }

  const batches = await listSeedlingBatches(db);
  return batches.find((batch) => batch.id === batchId);
}

export async function updateSeedlingBatch(
  db: DbClient,
  input: SeedlingBatchEditInput
) {
  await ensureSeedlingBatchTables(db);
  const batchId = String(input.batchId || "").trim();
  if (!batchId) {
    throw new Error("Choose a batch to update.");
  }

  const rows = await db.$queryRaw<any[]>`
    SELECT *
    FROM "SeedlingProductionBatch"
    WHERE "id" = ${batchId}
    LIMIT 1
  `;
  const existing = rows[0] ? serializeSeedlingBatch(rows[0]) : null;
  if (!existing) {
    throw new Error("Batch not found.");
  }

  const existingMetadata = normalizeObject(existing.metadata);
  const purpose = getProductionPurpose(
    input.purposeKey || existing.productionPurpose?.key
  );
  const quantityStarted = Math.max(
    0,
    Math.floor(Number(input.quantityStarted ?? existing.quantityStarted))
  );
  const quantityReserved = Math.max(
    0,
    Math.floor(Number(input.quantityReserved ?? existing.quantityReserved))
  );
  const quantityAvailable = Math.max(
    0,
    Math.floor(
      Number(
        input.quantityAvailable ??
          Math.max(0, quantityStarted - quantityReserved)
      )
    )
  );
  const retailPrice = Math.max(0, Number(input.retailPrice ?? existing.retailPrice));
  const status = String(input.status || existing.status || "planned").trim();
  const batchName =
    String(input.batchName || "").trim() || existing.batchName || existing.cropName;
  const metadata = {
    ...existingMetadata,
    productionPurposeKey: purpose.key,
    productionPurposeLabel: purpose.label,
    productionPurposeType: purpose.type,
    shopKey: purpose.shopKey,
  };

  await db.$executeRaw`
    UPDATE "SeedlingProductionBatch"
    SET
      "batchName" = ${batchName},
      "quantityStarted" = ${quantityStarted},
      "quantityReserved" = ${quantityReserved},
      "quantityAvailable" = ${quantityAvailable},
      "retailPrice" = ${retailPrice},
      "status" = ${status},
      "metadata" = CAST(${JSON.stringify(metadata)} AS jsonb),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${batchId}
  `;

  const updated = (await listSeedlingBatches(db)).find(
    (batch) => batch.id === batchId
  );
  if (updated) {
    await upsertSeedlingBatchInventoryItem(db, updated);
  }

  return updated;
}

export async function deleteSeedlingBatch(
  db: DbClient,
  input: { batchId?: string; confirmation?: string }
) {
  await ensureSeedlingBatchTables(db);
  const batchId = String(input.batchId || "").trim();
  if (!batchId) {
    throw new Error("Choose a batch to delete.");
  }

  if (String(input.confirmation || "").trim() !== "delete batch") {
    throw new Error('Type "delete batch" to confirm deletion.');
  }

  const rows = await db.$queryRaw<any[]>`
    SELECT *
    FROM "SeedlingProductionBatch"
    WHERE "id" = ${batchId}
    LIMIT 1
  `;
  const batch = rows[0] ? serializeSeedlingBatch(rows[0]) : null;
  if (!batch) {
    throw new Error("Batch not found.");
  }

  await db.$executeRaw`
    DELETE FROM "SeedlingProductionBatch"
    WHERE "id" = ${batchId}
  `;

  await db.$executeRaw`
    DELETE FROM "UnifiedInventoryItem"
    WHERE "metadata"->>'source' = 'seedling-production-batch'
      AND "metadata"->>'seedlingBatchId' = ${batchId}
  `;

  return batch;
}

export async function reconcileSeedlingBatchShopLinksFromInventory(
  db: DbClient,
  input: { batchId?: string; shopTags?: unknown[]; shopListings?: unknown[] }
) {
  await ensureSeedlingBatchTables(db);
  const batchId = String(input.batchId || "").trim();
  if (!batchId) return null;

  const rows = await db.$queryRaw<any[]>`
    SELECT "metadata"
    FROM "SeedlingProductionBatch"
    WHERE "id" = ${batchId}
    LIMIT 1
  `;
  const existingMetadata = normalizeObject(rows[0]?.metadata);
  if (!rows.length) return null;

  const linkedShopKeys = Array.from(
    new Set(
      [
        ...normalizeArray(input.shopTags),
        ...normalizeArray(input.shopListings).map((listing: any) =>
          listing && typeof listing === "object" ? listing.shopKey : ""
        ),
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  const nextPurpose = linkedShopKeys.length
    ? getProductionPurpose(linkedShopKeys[0])
    : getProductionPurpose("greenhouse-stock");

  await db.$executeRaw`
    UPDATE "SeedlingProductionBatch"
    SET
      "metadata" = CAST(${JSON.stringify({
        ...existingMetadata,
        productionPurposeKey: nextPurpose.key,
        productionPurposeLabel: nextPurpose.label,
        productionPurposeType: nextPurpose.type,
        shopKey: nextPurpose.shopKey,
        linkedShopKeys,
      })} AS jsonb),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${batchId}
  `;

  const batches = await listSeedlingBatches(db);
  return batches.find((batch) => batch.id === batchId) || null;
}

export function serializeSeedlingBatch(row: any) {
  const timeline = normalizeArray(row.timeline) as SeedlingTimelineEvent[];
  const priceIncreaseDates = normalizeArray(row.priceIncreaseDates).map(String);
  const currentPrice = getSeedlingBatchCurrentPrice({
    retailPrice: Number(row.retailPrice || 0),
    productionAt: new Date(row.productionAt).toISOString(),
    availabilityAt: new Date(row.availabilityAt).toISOString(),
    priceIncreaseDates,
  });
  const nextPriceIncreaseAt = getNextUpcomingDate(priceIncreaseDates) || null;
  const available = Math.max(0, Number(row.quantityAvailable || 0));
  const reserved = Math.max(0, Number(row.quantityReserved || 0));

  return {
    id: row.id,
    cropKey: row.cropKey,
    cropName: row.cropName,
    propagationType: row.propagationType,
    batchName: row.batchName,
    productionAt: new Date(row.productionAt).toISOString(),
    germinationAt: row.germinationAt
      ? new Date(row.germinationAt).toISOString()
      : null,
    availabilityAt: new Date(row.availabilityAt).toISOString(),
    priceIncreaseDates,
    nextPriceIncreaseAt,
    quantityStarted: Number(row.quantityStarted || 0),
    quantityAtTransplant: normalizeNumber(row.metadata?.quantityAtTransplant),
    quantityReserved: reserved,
    quantityAvailable: available,
    quantityRemaining: available,
    retailPrice: Number(row.retailPrice || 0),
    currentPrice,
    status: row.status,
    timeline,
    publicUpdates: normalizeArray(row.publicUpdates),
    metadata: normalizeObject(row.metadata),
    productionPurpose: getSerializedPurpose(row.metadata),
    soldOut: available <= 0,
    availableNow: new Date(row.availabilityAt).getTime() <= Date.now(),
  };
}

export async function upsertSeedlingBatchInventoryItem(db: DbClient, batch: any) {
  const dateLabel = batch.productionAt.slice(0, 10);
  const preOrder = !batch.availableNow;
  const batchMetadata = normalizeObject(batch.metadata);
  const purpose = batch.productionPurpose || getSerializedPurpose(batch.metadata);
  const title = getBatchTitle(batch.cropName || batch.batchName);
  const listingShopKey = purpose?.shopKey || SEEDLING_SHOP_SLUG;
  const listingCategory =
    batch.propagationType === "cutting" ? "Cuttings" : "Seedlings";
  const existingRows = await db.$queryRaw<any[]>`
    SELECT "shopListings"
    FROM "UnifiedInventoryItem"
    WHERE "metadata"->>'source' = 'seedling-production-batch'
      AND "metadata"->>'seedlingBatchId' = ${batch.id}
    LIMIT 1
  `;
  const existingShopListings = normalizeArray(existingRows[0]?.shopListings);
  const existingListing = existingShopListings.find(
    (listing: any) =>
      listing &&
      typeof listing === "object" &&
      String(listing.shopKey || "") === String(listingShopKey || "")
  ) as Record<string, unknown> | undefined;
  const shopListingActive =
    typeof existingListing?.active === "boolean" ? existingListing.active : false;
  const shortDescription = preOrder
    ? "Available for pre-order from nursery production."
    : "Available from nursery production.";
  const detailsLines = [
    `Plant: ${title}.`,
    batchMetadata.quantityLabel
      ? `Quantity: ${cleanBatchQuantityLabel(batchMetadata.quantityLabel)}.`
      : "",
    batchMetadata.estimatedPlantsLabel
      ? `Estimated quantity: ${cleanBatchQuantityLabel(
          batchMetadata.estimatedPlantsLabel
        )}.`
      : "",
    batchMetadata.germinationTimeLabel
      ? `Germination / rooting time: ${batchMetadata.germinationTimeLabel}.`
      : "",
    `Production date: ${formatDate(batch.productionAt)}.`,
    `Availability date: ${formatDate(batch.availabilityAt)}.`,
    batch.nextPriceIncreaseAt
      ? `Next price increase: ${formatDate(batch.nextPriceIncreaseAt)}.`
      : "",
    `Reserved / sold: ${batch.quantityReserved} seedlings.`,
    `Remaining: ${batch.quantityAvailable} seedlings.`,
  ]
    .filter(Boolean);
  const detailsDescription = detailsLines.map((line) => `- ${line}`).join("\n");

  await upsertUnifiedInventoryItem(db as any, {
    id: `inventory-${batch.id}`,
    sku: `SEED-${batch.cropKey}-${dateLabel.replace(/-/g, "")}`.toUpperCase(),
    slug: batch.id,
    title,
    description: shortDescription,
    detailsDescription,
    fulfillmentType: "physical",
    active: !batch.soldOut,
    quantityOnHand: batch.quantityStarted,
    quantityReserved: batch.quantityReserved,
    quantityAvailable: batch.quantityAvailable,
    shopTags: listingShopKey ? [listingShopKey] : [],
    categoryTags: [
      listingCategory,
      title,
      "Batch",
    ],
    shopListings: [
      {
        shopKey: listingShopKey,
        categoryLabel: listingCategory,
        active: shopListingActive && !batch.soldOut,
        sortOrder: new Date(batch.availabilityAt).getTime(),
        categorySortOrder: batch.propagationType === "cutting" ? 2 : 1,
      },
    ],
    options: [
      {
        id: "batch",
        sku: `SEED-${batch.cropKey}-${dateLabel.replace(/-/g, "")}`.toUpperCase(),
        label: preOrder ? "Pre-order batch" : "Available batch",
        description: shortDescription,
        price: batch.currentPrice,
        quantityAvailable: batch.quantityAvailable,
        metadata: {
          eventQuantityAvailable: batch.quantityAvailable,
          seedlingBatchId: batch.id,
          productionAt: batch.productionAt,
          availabilityAt: batch.availabilityAt,
          nextPriceIncreaseAt: batch.nextPriceIncreaseAt,
          quantityReserved: batch.quantityReserved,
          quantityRemaining: batch.quantityAvailable,
          quantityLabel: batchMetadata.quantityLabel || null,
          estimatedPlantsLabel: batchMetadata.estimatedPlantsLabel || null,
          germinationTimeLabel: batchMetadata.germinationTimeLabel || null,
          productionPurpose: purpose,
          timeline: batch.timeline,
          primaryActionLabel: preOrder
            ? "Pre-Order Now at Discounted Price"
            : "Order",
        },
      },
    ],
    metadata: {
      source: "seedling-production-batch",
      seedlingBatchId: batch.id,
      defaultStorefrontVisibility: "hidden",
      propagationType: batch.propagationType,
      productionAt: batch.productionAt,
      availabilityAt: batch.availabilityAt,
      nextPriceIncreaseAt: batch.nextPriceIncreaseAt,
      quantityReserved: batch.quantityReserved,
      quantityRemaining: batch.quantityAvailable,
      quantityLabel: batchMetadata.quantityLabel || null,
      estimatedPlantsLabel: batchMetadata.estimatedPlantsLabel || null,
      germinationTimeLabel: batchMetadata.germinationTimeLabel || null,
      productionPurpose: purpose,
      timeline: batch.timeline,
      priceIncreaseDates: batch.priceIncreaseDates,
    },
  });
}

function getActionLabel(value: unknown) {
  const action = String(value || "").trim();
  const labels: Record<string, string> = {
    water: "Water",
    mist: "Mist",
    feed: "Feed",
    pest_control: "Pest Control",
    disease_control: "Disease Control",
    prune: "Prune",
    pinch: "Pinch",
    pot_up: "Pot-up",
    transplant: "Transplant",
    hardening: "Hardening",
    move_to_sun: "Move to Sun",
    move_to_shade: "Move to Shade",
    install_support: "Install Support",
    pest_inspection: "Pest Inspection",
    disease_inspection: "Disease Inspection",
    harvest_ready_check: "Harvest Ready Check",
    propagation_material_check: "Propagation Material Check",
    watered: "Watered",
    transplanted: "Transplanted",
    transplant_session: "Transplant Session",
    seedling_booster_applied: "Seedling Booster Applied",
    insecticidal_soap_applied: "Insecticidal Soap Applied",
    pest_treatment_applied: "Pest Treatment Applied",
    inspected: "Inspected",
    photo_added: "Photo Added",
    marked_available: "Marked Available",
    not_done_rescheduled: "Not Done / Rescheduled",
    custom_action: "Custom Action",
  };

  return labels[action] || "Custom Action";
}

function serializeBatchActivity(row: any) {
  return {
    id: row.id,
    batchId: row.batchId,
    actionType: row.actionType,
    title: row.title,
    performedAt: row.performedAt ? new Date(row.performedAt).toISOString() : null,
    enteredAt: row.enteredAt ? new Date(row.enteredAt).toISOString() : null,
    notes: row.notes || "",
    photoUrl: row.photoUrl || "",
    metadata: normalizeObject(row.metadata),
  };
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePurposeKey(value: unknown) {
  return String(value || "seedling-shop").trim() || "seedling-shop";
}

function getProductionPurpose(value: unknown) {
  const key = normalizePurposeKey(value);
  const purposes: Record<string, {
    key: string;
    label: string;
    type: string;
    shopKey: string | null;
  }> = {
    "seedling-shop": {
      key: "seedling-shop",
      label: "Seedling Shop",
      type: "shop",
      shopKey: "seedling-shop",
    },
    "little-orchard-shop": {
      key: "little-orchard-shop",
      label: "Little Orchard Shop",
      type: "shop",
      shopKey: "little-orchard-shop",
    },
    "garden-package": {
      key: "garden-package",
      label: "Garden Package",
      type: "shop",
      shopKey: "garden-package",
    },
    callaloo: {
      key: "callaloo",
      label: "Callaloo Store",
      type: "shop",
      shopKey: "callaloo",
    },
    "greenhouse-stock": {
      key: "greenhouse-stock",
      label: "General Nursery Stock",
      type: "stock",
      shopKey: null,
    },
    custom: {
      key: "custom",
      label: "Custom Purpose",
      type: "custom",
      shopKey: null,
    },
  };

  return purposes[key] || {
    key,
    label: key
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    type: "custom",
    shopKey: key,
  };
}

function getSerializedPurpose(metadata: unknown) {
  const source = normalizeObject(metadata);
  const purpose = getProductionPurpose(source.productionPurposeKey || source.shopKey);

  return {
    key: String(source.productionPurposeKey || purpose.key),
    label: String(source.productionPurposeLabel || purpose.label),
    type: String(source.productionPurposeType || purpose.type),
    shopKey:
      typeof source.shopKey === "string"
        ? source.shopKey
        : purpose.shopKey,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Jamaica",
  }).format(new Date(value));
}

export { seedlingProductionTemplates };
