import { Prisma, PrismaClient } from "@prisma/client";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";

type Database = PrismaClient | Prisma.TransactionClient;

type UnifiedInventoryInput = {
  id?: string;
  sku?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  detailsDescription?: string | null;
  imageUrl?: string | null;
  previewImageUrl?: string | null;
  fulfillmentType?: string;
  active?: boolean;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  shopTags?: unknown[];
  categoryTags?: unknown[];
  shopListings?: unknown[];
  options?: unknown[];
  metadata?: Record<string, unknown>;
};

export async function ensureUnifiedInventoryTable(db: Database) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "UnifiedInventoryItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sku" TEXT,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "detailsDescription" TEXT,
      "imageUrl" TEXT,
      "previewImageUrl" TEXT,
      "fulfillmentType" TEXT NOT NULL DEFAULT 'physical',
      "active" BOOLEAN NOT NULL DEFAULT true,
      "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
      "quantityReserved" INTEGER NOT NULL DEFAULT 0,
      "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
      "shopTags" JSONB,
      "categoryTags" JSONB,
      "shopListings" JSONB,
      "options" JSONB,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "UnifiedInventoryItem_sku_idx"
      ON "UnifiedInventoryItem" ("sku")
  `;

  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "UnifiedInventoryItem_active_title_idx"
      ON "UnifiedInventoryItem" ("active", "title")
  `;
}

export async function getUnifiedInventoryItems(db: Database) {
  await ensureUnifiedInventoryTable(db);

  return db.$queryRaw<any[]>`
    SELECT *
    FROM "UnifiedInventoryItem"
    ORDER BY "title" ASC, "updatedAt" DESC
  `;
}

export async function upsertUnifiedInventoryItem(
  db: Database,
  input: UnifiedInventoryInput
) {
  await ensureUnifiedInventoryTable(db);

  const slug = sanitizeSlug(input.slug || input.title);
  const id = input.id || `inventory-${slug}`;
  const quantityOnHand = toInt(input.quantityOnHand);
  const quantityReserved = toInt(input.quantityReserved);
  const quantityAvailable =
    input.quantityAvailable === undefined
      ? Math.max(0, quantityOnHand - quantityReserved)
      : toInt(input.quantityAvailable);

  await db.$executeRaw`
    INSERT INTO "UnifiedInventoryItem" (
      "id",
      "sku",
      "slug",
      "title",
      "description",
      "detailsDescription",
      "imageUrl",
      "previewImageUrl",
      "fulfillmentType",
      "active",
      "quantityOnHand",
      "quantityReserved",
      "quantityAvailable",
      "shopTags",
      "categoryTags",
      "shopListings",
      "options",
      "metadata",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${cleanText(input.sku)},
      ${slug},
      ${input.title.trim()},
      ${cleanText(input.description)},
      ${cleanText(input.detailsDescription)},
      ${cleanText(input.imageUrl)},
      ${cleanText(input.previewImageUrl)},
      ${cleanText(input.fulfillmentType) || "physical"},
      ${input.active !== false},
      ${quantityOnHand},
      ${quantityReserved},
      ${quantityAvailable},
      CAST(${JSON.stringify(input.shopTags || [])} AS jsonb),
      CAST(${JSON.stringify(input.categoryTags || [])} AS jsonb),
      CAST(${JSON.stringify(input.shopListings || [])} AS jsonb),
      CAST(${JSON.stringify(input.options || [])} AS jsonb),
      CAST(${JSON.stringify(input.metadata || {})} AS jsonb),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "sku" = EXCLUDED."sku",
      "title" = EXCLUDED."title",
      "description" = EXCLUDED."description",
      "detailsDescription" = EXCLUDED."detailsDescription",
      "imageUrl" = EXCLUDED."imageUrl",
      "previewImageUrl" = EXCLUDED."previewImageUrl",
      "fulfillmentType" = EXCLUDED."fulfillmentType",
      "active" = EXCLUDED."active",
      "quantityOnHand" = EXCLUDED."quantityOnHand",
      "quantityReserved" = EXCLUDED."quantityReserved",
      "quantityAvailable" = EXCLUDED."quantityAvailable",
      "shopTags" = EXCLUDED."shopTags",
      "categoryTags" = EXCLUDED."categoryTags",
      "shopListings" = EXCLUDED."shopListings",
      "options" = EXCLUDED."options",
      "metadata" = EXCLUDED."metadata",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function syncLittleOrchardCatalogToUnifiedInventory(db: Database) {
  await ensureUnifiedInventoryTable(db);

  for (const product of littleOrchardShopCatalog.products) {
    const metadata = normalizeObject(product.metadata);
    const category = String(metadata.category || "Uncategorized");
    const options = product.sizeOptions.map((option) => {
      const optionMetadata = normalizeObject(option.metadata);

      return {
        id: option.id,
        sku: option.sku || null,
        label: option.label,
        description: option.description || null,
        price: Number(option.price || 0),
        weight: option.weight ?? null,
        quantityOnHand: Number(optionMetadata.eventQuantityAvailable || 0),
        quantityReserved: 0,
        quantityAvailable: Number(optionMetadata.eventQuantityAvailable || 0),
        metadata: optionMetadata,
      };
    });
    const totalQuantity = options.reduce(
      (sum, option) => sum + toInt(option.quantityAvailable),
      0
    );

    await upsertUnifiedInventoryItem(db, {
      id: `inventory-${product.id}`,
      sku: product.sku,
      slug: product.slug || product.id,
      title: product.title,
      description: product.description,
      detailsDescription: product.detailsDescription,
      imageUrl: product.imageUrl,
      previewImageUrl: (product as any).previewImageUrl || product.imageUrl,
      fulfillmentType: product.fulfillmentType || "physical",
      active: true,
      quantityOnHand: totalQuantity,
      quantityReserved: 0,
      quantityAvailable: totalQuantity,
      shopTags: ["little-orchard-shop"],
      categoryTags: [category],
      shopListings: [
        {
          shopKey: "little-orchard-shop",
          shopLabel: "Little Orchard Shop",
          categoryKey: sanitizeSlug(category),
          categoryLabel: category,
          active: true,
          sortOrder: 0,
        },
      ],
      options,
      metadata: {
        ...metadata,
        source: "littleOrchardShopConfig",
        sourceProductId: product.id,
      },
    });
  }
}

function normalizeObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function sanitizeSlug(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toInt(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}
