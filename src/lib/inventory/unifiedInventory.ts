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

const littleOrchardCategorySortOrder = new Map([
  ["Fruit Trees", 10],
  ["Herbs and Seasoning Plants", 20],
  ["Herbs", 30],
  ["Leafy Vegetables", 40],
  ["Seedlings", 50],
  ["Fruiting Vegetables", 60],
  ["Vegetable Plants", 70],
  ["Root, Vine and Perennial Crops", 80],
  ["Ornamental Plants", 90],
  ["Apparel", 100],
]);

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

export async function updateUnifiedInventoryShopOrder(
  db: Database,
  shopKey: string,
  orderedIds: string[]
) {
  await ensureUnifiedInventoryTable(db);

  const normalizedShopKey = String(shopKey || "").trim();

  if (!normalizedShopKey || !orderedIds.length) {
    return;
  }

  const items = await db.$queryRaw<any[]>`
    SELECT "id", "shopListings"
    FROM "UnifiedInventoryItem"
    WHERE "id" = ANY(${orderedIds})
  `;
  const orderIndex = new Map(
    orderedIds.map((id, index) => [id, index])
  );

  for (const item of items) {
    const sortOrder = orderIndex.get(item.id);

    if (sortOrder === undefined) {
      continue;
    }

    const currentListings: Record<string, any>[] = Array.isArray(
      item.shopListings
    )
      ? item.shopListings
      : [];
    const nextListings = currentListings.map((listing) => {
      if (
        listing &&
        typeof listing === "object" &&
        listing.shopKey === normalizedShopKey
      ) {
        return {
          ...listing,
          sortOrder,
        };
      }

      return listing;
    });

    await db.$executeRaw`
      UPDATE "UnifiedInventoryItem"
      SET
        "shopListings" = CAST(${JSON.stringify(nextListings)} AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${item.id}
    `;
  }
}

export async function syncLittleOrchardCatalogToUnifiedInventory(db: Database) {
  await ensureUnifiedInventoryTable(db);

  for (const [index, product] of littleOrchardShopCatalog.products.entries()) {
    const metadata = normalizeObject(product.metadata);
    const category = String(metadata.category || "Uncategorized");
    const categorySortOrder =
      littleOrchardCategorySortOrder.get(category) ?? 999;
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
          categorySortOrder,
          active: true,
          sortOrder: index,
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

const nurseryPriceListItems = [
  {
    category: "Herbs",
    products: [
      ["Scallion (Green Onion)", 50, 400, 800],
      ["Thyme", 100, 500, 1000],
      ["Italian Basil", 75, 450, 900],
      ["Genovese Basil", 75, 450, 900],
      ["Dill", 75, 450, 900],
      ["Parsley", 75, 450, 900],
      ["Cilantro", 75, 450, 900],
      ["Culantro", 100, 500, 900],
      ["Rosemary", 100, 500, 1000],
      ["Lemongrass", 100, 500, 900],
      ["Spearmint", 100, 500, 900],
      ["Peppermint", 100, 500, 900],
      ["Lemon Balm", 100, 500, 900],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Leafy Vegetables",
    products: [
      ["Lettuce", 50, 250, null],
      ["Pak Choi", 50, 250, null],
      ["Callaloo", 50, 250, null],
      ["Spinach", 50, 250, null],
      ["Cabbage", 50, 250, null],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Fruiting Vegetables",
    products: [
      ["Sweet Pepper", 50, 350, 700],
      ["Purple Sweet Pepper", 60, 420, 840],
      ["Scotch Bonnet Pepper", 50, 350, 700],
      ["Eggplant", 50, 350, 700],
      ["Okra", 50, 350, 700],
      ["Cucumber", 50, 350, 700],
      ["String Beans", 40, 200, 400],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Root, Vine and Perennial Crops",
    products: [
      ["Sweet Potato Slips", 30, null, null],
      ["Passion Fruit", 150, 700, 1500],
      ["Moringa", 150, 700, 1500],
      ["Black Pepper (4-inch pot)", null, 500, 900],
      ["Banana Sucker", null, 600, 1200],
      ["Plantain Sucker", null, 600, 1200],
    ],
    headers: ["Plant Starter", "Garden-Ready", "Harvest-Ready"],
  },
] as const;

export async function syncNurseryPriceListToUnifiedInventory(db: Database) {
  await ensureUnifiedInventoryTable(db);

  for (const [categoryIndex, categoryGroup] of nurseryPriceListItems.entries()) {
    for (const [productIndex, productRow] of categoryGroup.products.entries()) {
      const [title, starterPrice, gardenReadyPrice, harvestReadyPrice] =
        productRow;
      const prices = [starterPrice, gardenReadyPrice, harvestReadyPrice];
      const productSlug = sanitizeSlug(title);
      const options = prices
        .map((price, index) => {
          if (price === null) {
            return null;
          }

          const label = categoryGroup.headers[index];
          const isStarterSeedling = label === "Starter Seedling";
          const quantity = isStarterSeedling ? 1000 : 100;

          return {
            id: sanitizeSlug(label),
            sku: `LO-${productSlug}-${sanitizeSlug(label)}`.toUpperCase(),
            label,
            description:
              label === "Starter Seedling"
                ? "Young and ready to transplant."
                : label === "Garden-Ready"
                ? "Established and hardened off."
                : "Mature or close to producing, depending on the crop.",
            price,
            weight: 0.8,
            quantityOnHand: quantity,
            quantityReserved: 0,
            quantityAvailable: quantity,
            metadata: {
              stage: label,
              source: "nursery-price-list",
            },
          };
        })
        .filter(Boolean);
      const totalQuantity = options.reduce(
        (sum, option: any) => sum + toInt(option.quantityAvailable),
        0
      );
      const categoryTags = splitCategoryTags(categoryGroup.category);
      const primaryCategory = categoryTags[0] || "Uncategorized";
      const categorySortOrder =
        littleOrchardCategorySortOrder.get(categoryGroup.category) ??
        littleOrchardCategorySortOrder.get(primaryCategory) ??
        200 + categoryIndex;

      await upsertUnifiedInventoryItem(db, {
        id: `inventory-${productSlug}`,
        sku: `LO-${productSlug}`.toUpperCase(),
        slug: productSlug,
        title,
        description: `${primaryCategory}. Prices are in Jamaican dollars and based on growth stage and establishment.`,
        detailsDescription: `${primaryCategory}. Starter Seedling: young and ready to transplant. Garden-Ready: established and hardened off. Harvest-Ready: mature or close to producing, depending on the crop.`,
        fulfillmentType: "physical",
        active: true,
        quantityOnHand: totalQuantity,
        quantityReserved: 0,
        quantityAvailable: totalQuantity,
        shopTags: ["little-orchard-shop"],
        categoryTags,
        shopListings: [
          {
            shopKey: "little-orchard-shop",
            shopLabel: "Little Orchard Shop",
            categoryKey: sanitizeSlug(primaryCategory),
            categoryLabel: primaryCategory,
            categorySortOrder,
            active: true,
            sortOrder: categorySortOrder * 1000 + productIndex,
          },
        ],
        options: options as any[],
        metadata: {
          source: "nursery-price-list",
          priceList: "Nursery price list",
          category: primaryCategory,
        },
      });
    }
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

function splitCategoryTags(value: unknown) {
  const seen = new Set<string>();

  return String(value ?? "")
    .split(",")
    .flatMap((part) => part.split(/\s+|&|\/|\+/))
    .map((tag) => tag.replace(/[^a-z0-9-]/gi, "").trim())
    .filter((tag) => !["and", "or", "the", "for"].includes(tag.toLowerCase()))
    .filter(Boolean)
    .map((tag) => tag.slice(0, 1).toUpperCase() + tag.slice(1).toLowerCase())
    .filter((tag) => {
      const key = tag.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function toInt(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}
