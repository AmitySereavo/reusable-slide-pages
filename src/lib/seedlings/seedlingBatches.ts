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
  type SeedlingTimelineEvent,
} from "./productionTemplates";

type DbClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  $executeRaw: <T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>;
  $queryRaw: <T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>;
};

export type SeedlingBatchInput = {
  cropKey?: string;
  productionDate?: string;
  productionTime?: string;
  quantityStarted?: number;
  retailPrice?: number;
};

export type SeedlingBatchUpdateInput = {
  batchId?: string;
  actionType?: string;
  customActionTitle?: string;
  performedDate?: string;
  performedTime?: string;
  useNow?: boolean;
  notes?: string;
  photoUrl?: string;
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

  return rows.map(serializeSeedlingBatch);
}

export async function createSeedlingBatch(db: DbClient, input: SeedlingBatchInput) {
  await ensureSeedlingBatchTables(db);
  const template = getSeedlingProductionTemplate(input.cropKey);
  if (!template) {
    throw new Error("Choose a supported seedling or cutting crop.");
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
  const batchName = `${template.cropName} Seedlings - Batch - ${productionDate}`;
  const retailPrice = Math.max(
    0,
    Number(input.retailPrice || template.retailPrice)
  );

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
      ${template.cropName},
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
      CAST(${JSON.stringify({ template })} AS jsonb),
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
      CAST(${JSON.stringify({ source: "dashboard" })} AS jsonb)
    )
  `;

  const batches = await listSeedlingBatches(db);
  return batches.find((batch) => batch.id === batchId);
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
    quantityReserved: reserved,
    quantityAvailable: available,
    retailPrice: Number(row.retailPrice || 0),
    currentPrice,
    status: row.status,
    timeline,
    publicUpdates: normalizeArray(row.publicUpdates),
    metadata: normalizeObject(row.metadata),
    soldOut: available <= 0,
    availableNow: new Date(row.availabilityAt).getTime() <= Date.now(),
  };
}

export async function upsertSeedlingBatchInventoryItem(db: DbClient, batch: any) {
  const dateLabel = batch.productionAt.slice(0, 10);
  const preOrder = !batch.availableNow;
  const description = [
    `${batch.batchName}.`,
    `Production date: ${formatDate(batch.productionAt)}.`,
    `Availability date: ${formatDate(batch.availabilityAt)}.`,
    batch.nextPriceIncreaseAt
      ? `Next price increase: ${formatDate(batch.nextPriceIncreaseAt)}.`
      : "",
    `Reserved: ${batch.quantityReserved} seedlings.`,
    `Remaining: ${batch.quantityAvailable} seedlings.`,
  ]
    .filter(Boolean)
    .join(" ");

  await upsertUnifiedInventoryItem(db as any, {
    id: `inventory-${batch.id}`,
    sku: `SEED-${batch.cropKey}-${dateLabel.replace(/-/g, "")}`.toUpperCase(),
    slug: batch.id,
    title: batch.batchName,
    description,
    detailsDescription: description,
    fulfillmentType: "physical",
    active: !batch.soldOut,
    quantityOnHand: batch.quantityStarted,
    quantityReserved: batch.quantityReserved,
    quantityAvailable: batch.quantityAvailable,
    shopTags: [SEEDLING_SHOP_SLUG],
    categoryTags: [
      batch.propagationType === "cutting" ? "Cuttings" : "Seedlings",
      batch.cropName,
      "Batch",
    ],
    shopListings: [
      {
        shopKey: SEEDLING_SHOP_SLUG,
        categoryLabel: batch.propagationType === "cutting" ? "Cuttings" : "Seedlings",
        active: !batch.soldOut,
        sortOrder: new Date(batch.availabilityAt).getTime(),
        categorySortOrder: batch.propagationType === "cutting" ? 2 : 1,
      },
    ],
    options: [
      {
        id: "batch",
        sku: `SEED-${batch.cropKey}-${dateLabel.replace(/-/g, "")}`.toUpperCase(),
        label: preOrder ? "Pre-order batch" : "Available batch",
        description,
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
      propagationType: batch.propagationType,
      productionAt: batch.productionAt,
      availabilityAt: batch.availabilityAt,
      nextPriceIncreaseAt: batch.nextPriceIncreaseAt,
      quantityReserved: batch.quantityReserved,
      quantityRemaining: batch.quantityAvailable,
      timeline: batch.timeline,
      priceIncreaseDates: batch.priceIncreaseDates,
    },
  });
}

function getActionLabel(value: unknown) {
  const action = String(value || "").trim();
  const labels: Record<string, string> = {
    watered: "Watered",
    transplanted: "Transplanted",
    seedling_booster_applied: "Seedling Booster Applied",
    insecticidal_soap_applied: "Insecticidal Soap Applied",
    pest_treatment_applied: "Pest Treatment Applied",
    inspected: "Inspected",
    photo_added: "Photo Added",
    marked_available: "Marked Available",
    custom_action: "Custom Action",
  };

  return labels[action] || "Custom Action";
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Jamaica",
  }).format(new Date(value));
}

export { seedlingProductionTemplates };
