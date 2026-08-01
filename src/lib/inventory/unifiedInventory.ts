import { Prisma, PrismaClient } from "@prisma/client";
import {
  GARDEN_PACKAGE_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";

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
      ["Basil - Italian Sweet", 75, 450, 900],
      ["Basil - Genovese", 75, 450, 900],
      ["Dill", 75, 450, 900],
      ["Parsley", 75, 450, 900],
      ["Cilantro", 75, 450, 900],
      ["Culantro", 100, 500, 900],
      ["Rosemary", 100, 500, 1000],
      ["Lemongrass", 100, 500, 900],
      ["Fever Grass", 100, 500, 900],
      ["Spearmint", 100, 500, 900],
      ["Common Mint", 100, 500, 900],
      ["Peppermint", 100, 500, 900],
      ["Black Mint", 100, 500, 900],
      ["Jamaican Peppermint (Tree Mint)", 100, 500, 900],
      ["Bolo Mint (Panadol Plant)", 100, 500, 900],
      ["French Thyme (Cuban Mint)", 100, 500, 900],
      ["Lemon Balm", 100, 500, 900],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Leafy Vegetables",
    products: [
      ["Lettuce", 50, 250, 500],
      ["Pak Choi", 50, 250, null],
      ["Callaloo", 50, 250, null],
      ["Malabar Spinach", 50, 250, 500],
      ["Cabbage", 50, 250, null],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Fruiting Vegetables",
    products: [
      ["Pepper - Sweet", 50, 350, 700],
      ["Pepper - Sweet (Purple)", 60, 420, 840],
      ["Pepper - Scotch Bonnet", 50, 350, 700],
      ["Tomato - Slicing (Salad or Sandwich Tomato)", 50, 350, 700],
      ["Tomato - Cherry", 50, 350, 700],
      ["Tomato - Plummy (Cooking Tomato)", 50, 350, 700],
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
      ["Sweet Potato Slips", 30, 250, 500],
      ["Coco Root", 100, 500, 900],
      ["Yam Slips", 100, 500, 900],
      ["Irish Potato Slips", 100, 500, 900],
      ["Carrot", 50, 250, 500],
      ["Beetroot", 50, 250, 500],
      ["Passion Fruit", 150, 700, 1500],
      ["Mulberry Tree", null, null, 2500],
      ["Key Lime Tree", null, 700, 3500],
      ["Star Fruit Tree", null, 700, 2500],
      ["Cherry Tree", null, null, 2500],
      ["Pepper - Black Pepper", 500, 500, 900],
      ["Banana Sucker", 600, 600, 1200],
      ["Plantain Sucker", 600, 600, 1200],
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
          const optionLabel = getProductFormatLabel(title, label);
          const isStarterSeedling = label === "Starter Seedling";
          const quantity = isStarterSeedling ? 1000 : 100;

          return {
            id: sanitizeSlug(optionLabel),
            sku: `LO-${productSlug}-${sanitizeSlug(optionLabel)}`.toUpperCase(),
            label: optionLabel,
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
              stage: optionLabel,
              baseStage: label,
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

type HomeGardenPackageSize = "small" | "family" | "large";
type HomeGardenPackageFormat = "starter" | "garden" | "premium";

const homeGardenPackageQuantities: Record<
  HomeGardenPackageSize,
  Record<string, number>
> = {
  small: {
    "Scallion (Green Onion)": 10,
    Thyme: 2,
    "Basil - Italian Sweet": 2,
    "Basil - Genovese": 2,
    Dill: 2,
    Parsley: 2,
    Cilantro: 2,
    Culantro: 1,
    Lemongrass: 1,
    "Fever Grass": 1,
    Spearmint: 1,
    "Common Mint": 1,
    Peppermint: 1,
    "Black Mint": 1,
    "Jamaican Peppermint (Tree Mint)": 1,
    "Bolo Mint (Panadol Plant)": 1,
    "French Thyme (Cuban Mint)": 1,
    "Lemon Balm": 1,
    "Pepper - Scotch Bonnet": 2,
    "Pepper - Sweet": 2,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 3,
    "Tomato - Cherry": 2,
    "Tomato - Plummy (Cooking Tomato)": 2,
    Eggplant: 2,
    Okra: 2,
    Cucumber: 2,
    "String Beans": 10,
    Lettuce: 12,
    "Pak Choi": 12,
    Callaloo: 12,
    "Malabar Spinach": 12,
    Cabbage: 12,
    "Mulberry Tree": 1,
    "Key Lime Tree": 1,
    "Star Fruit Tree": 1,
    "Cherry Tree": 1,
    "Pepper - Black Pepper": 1,
    "Sweet Potato Slips": 6,
    "Coco Root": 2,
    "Yam Slips": 2,
    "Irish Potato Slips": 4,
    Carrot: 12,
    "Banana Sucker": 1,
    "Plantain Sucker": 1,
  },
  family: {
    "Scallion (Green Onion)": 20,
    Thyme: 3,
    "Basil - Italian Sweet": 3,
    "Basil - Genovese": 3,
    Dill: 3,
    Parsley: 3,
    Cilantro: 3,
    Culantro: 2,
    Lemongrass: 2,
    "Fever Grass": 2,
    Spearmint: 2,
    "Common Mint": 2,
    Peppermint: 2,
    "Black Mint": 2,
    "Jamaican Peppermint (Tree Mint)": 2,
    "Bolo Mint (Panadol Plant)": 2,
    "French Thyme (Cuban Mint)": 2,
    "Lemon Balm": 2,
    "Pepper - Scotch Bonnet": 3,
    "Pepper - Sweet": 4,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 6,
    "Tomato - Cherry": 4,
    "Tomato - Plummy (Cooking Tomato)": 4,
    Eggplant: 4,
    Okra: 4,
    Cucumber: 3,
    "String Beans": 20,
    Lettuce: 24,
    "Pak Choi": 24,
    Callaloo: 24,
    "Malabar Spinach": 24,
    Cabbage: 24,
    "Mulberry Tree": 2,
    "Key Lime Tree": 2,
    "Star Fruit Tree": 2,
    "Cherry Tree": 2,
    "Pepper - Black Pepper": 2,
    "Sweet Potato Slips": 12,
    "Coco Root": 4,
    "Yam Slips": 4,
    "Irish Potato Slips": 8,
    Carrot: 24,
    "Banana Sucker": 2,
    "Plantain Sucker": 2,
  },
  large: {
    "Scallion (Green Onion)": 30,
    Thyme: 4,
    "Basil - Italian Sweet": 4,
    "Basil - Genovese": 4,
    Dill: 4,
    Parsley: 4,
    Cilantro: 4,
    Culantro: 3,
    Lemongrass: 3,
    "Fever Grass": 3,
    Spearmint: 3,
    "Common Mint": 3,
    Peppermint: 3,
    "Black Mint": 3,
    "Jamaican Peppermint (Tree Mint)": 3,
    "Bolo Mint (Panadol Plant)": 3,
    "French Thyme (Cuban Mint)": 3,
    "Lemon Balm": 3,
    "Pepper - Scotch Bonnet": 4,
    "Pepper - Sweet": 6,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 10,
    "Tomato - Cherry": 6,
    "Tomato - Plummy (Cooking Tomato)": 6,
    Eggplant: 6,
    Okra: 6,
    Cucumber: 4,
    "String Beans": 30,
    Lettuce: 36,
    "Pak Choi": 36,
    Callaloo: 36,
    "Malabar Spinach": 36,
    Cabbage: 36,
    "Mulberry Tree": 3,
    "Key Lime Tree": 3,
    "Star Fruit Tree": 3,
    "Cherry Tree": 3,
    "Pepper - Black Pepper": 3,
    "Sweet Potato Slips": 18,
    "Coco Root": 6,
    "Yam Slips": 6,
    "Irish Potato Slips": 12,
    Carrot: 36,
    "Banana Sucker": 3,
    "Plantain Sucker": 3,
  },
};

const homeGardenPackageFormats: Array<{
  id: HomeGardenPackageFormat;
  label: string;
  description: string;
  optionSuffix: string;
}> = [
  {
    id: "starter",
    label: "Seedling Pack",
    description: "Ready to transplant immediately. Lowest cost.",
    optionSuffix: "STARTER-SEEDLING",
  },
  {
    id: "garden",
    label: "10-inch Ready-to-Harvest Pack",
    description: "Established plants that start producing sooner.",
    optionSuffix: "GARDEN-READY",
  },
  {
    id: "premium",
    label: "16-inch Premium Pack",
    description: "Larger, more mature plants for an almost instant garden.",
    optionSuffix: "HARVEST-READY",
  },
];

const homeGardenPackageDefinitions = [
  {
    id: "starter-home-garden-pack",
    title: "Small Household Garden Pack",
    subtitle: "For 1-2 people",
    description:
      "Enough core garden items for a small household without wasting growing space.",
    size: "small" as HomeGardenPackageSize,
    sortOrder: 0,
  },
  {
    id: "family-home-garden-pack",
    title: "Family Kitchen Garden Pack",
    subtitle: "For 3-5 people",
    description:
      "A fuller kitchen garden package for a family that cooks and harvests regularly.",
    size: "family" as HomeGardenPackageSize,
    sortOrder: 1,
  },
  {
    id: "large-family-homestead-pack",
    title: "Homestead Garden Pack",
    subtitle: "For 6+ people",
    description:
      "A larger food-garden package for bigger households and serious home growing.",
    size: "large" as HomeGardenPackageSize,
    sortOrder: 2,
  },
];

const homeGardenPackagePrices: Record<
  HomeGardenPackageFormat,
  Record<string, number>
> = {
  starter: {
    "Scallion (Green Onion)": 50,
    Thyme: 100,
    "Basil - Italian Sweet": 75,
    "Basil - Genovese": 75,
    Dill: 75,
    Parsley: 75,
    Cilantro: 75,
    Culantro: 100,
    Lemongrass: 100,
    "Fever Grass": 100,
    Spearmint: 100,
    "Common Mint": 100,
    Peppermint: 100,
    "Black Mint": 100,
    "Jamaican Peppermint (Tree Mint)": 100,
    "Bolo Mint (Panadol Plant)": 100,
    "French Thyme (Cuban Mint)": 100,
    "Lemon Balm": 100,
    "Pepper - Scotch Bonnet": 50,
    "Pepper - Sweet": 50,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 50,
    "Tomato - Cherry": 50,
    "Tomato - Plummy (Cooking Tomato)": 50,
    Eggplant: 50,
    Okra: 50,
    Cucumber: 50,
    "String Beans": 40,
    Lettuce: 50,
    "Pak Choi": 50,
    Callaloo: 50,
    "Malabar Spinach": 50,
    Cabbage: 50,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 700,
    "Star Fruit Tree": 700,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 500,
    "Sweet Potato Slips": 30,
    "Coco Root": 100,
    "Yam Slips": 100,
    "Irish Potato Slips": 100,
    Carrot: 50,
    Beetroot: 50,
    "Banana Sucker": 600,
    "Plantain Sucker": 600,
  },
  garden: {
    "Scallion (Green Onion)": 400,
    Thyme: 500,
    "Basil - Italian Sweet": 450,
    "Basil - Genovese": 450,
    Dill: 450,
    Parsley: 450,
    Cilantro: 450,
    Culantro: 500,
    Lemongrass: 500,
    "Fever Grass": 500,
    Spearmint: 500,
    "Common Mint": 500,
    Peppermint: 500,
    "Black Mint": 500,
    "Jamaican Peppermint (Tree Mint)": 500,
    "Bolo Mint (Panadol Plant)": 500,
    "French Thyme (Cuban Mint)": 500,
    "Lemon Balm": 500,
    "Pepper - Scotch Bonnet": 350,
    "Pepper - Sweet": 350,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 350,
    "Tomato - Cherry": 350,
    "Tomato - Plummy (Cooking Tomato)": 350,
    Eggplant: 350,
    Okra: 350,
    Cucumber: 350,
    "String Beans": 200,
    Lettuce: 250,
    "Pak Choi": 250,
    Callaloo: 250,
    "Malabar Spinach": 250,
    Cabbage: 250,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 700,
    "Star Fruit Tree": 700,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 500,
    "Sweet Potato Slips": 250,
    "Coco Root": 500,
    "Yam Slips": 500,
    "Irish Potato Slips": 500,
    Carrot: 250,
    Beetroot: 250,
    "Banana Sucker": 600,
    "Plantain Sucker": 600,
  },
  premium: {
    "Scallion (Green Onion)": 800,
    Thyme: 1000,
    "Basil - Italian Sweet": 900,
    "Basil - Genovese": 900,
    Dill: 900,
    Parsley: 900,
    Cilantro: 900,
    Culantro: 900,
    Lemongrass: 900,
    "Fever Grass": 900,
    Spearmint: 900,
    "Common Mint": 900,
    Peppermint: 900,
    "Black Mint": 900,
    "Jamaican Peppermint (Tree Mint)": 900,
    "Bolo Mint (Panadol Plant)": 900,
    "French Thyme (Cuban Mint)": 900,
    "Lemon Balm": 900,
    "Pepper - Scotch Bonnet": 700,
    "Pepper - Sweet": 700,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 700,
    "Tomato - Cherry": 700,
    "Tomato - Plummy (Cooking Tomato)": 700,
    Eggplant: 700,
    Okra: 700,
    Cucumber: 700,
    "String Beans": 400,
    Lettuce: 500,
    "Pak Choi": 500,
    Callaloo: 500,
    "Malabar Spinach": 500,
    Cabbage: 500,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 3500,
    "Star Fruit Tree": 2500,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 900,
    "Sweet Potato Slips": 500,
    "Coco Root": 900,
    "Yam Slips": 900,
    "Irish Potato Slips": 900,
    Carrot: 500,
    Beetroot: 500,
    "Banana Sucker": 1200,
    "Plantain Sucker": 1200,
  },
};

const homeGardenPackageFormatOverrides: Record<
  string,
  Partial<Record<HomeGardenPackageFormat, HomeGardenPackageFormat>>
> = {
  "Star Fruit Tree": {
    starter: "garden",
  },
  "Mulberry Tree": {
    starter: "premium",
    garden: "premium",
  },
  "Key Lime Tree": {
    starter: "garden",
  },
  "Cherry Tree": {
    starter: "premium",
    garden: "premium",
  },
};

function getEffectiveHomeGardenPackageFormat(
  productTitle: string,
  requestedFormat: HomeGardenPackageFormat
): HomeGardenPackageFormat {
  return (
    homeGardenPackageFormatOverrides[productTitle]?.[requestedFormat] ||
    requestedFormat
  );
}

function getProductFormatLabel(productTitle: string, fallbackLabel: string) {
  const labelOverrides: Record<string, Record<string, string>> = {
    "Star Fruit Tree": {
      "Harvest-Ready": "Grafted (Near Harvest Ready)",
      "16-inch Premium Pack": "Grafted (Near Harvest Ready)",
    },
    "Mulberry Tree": {
      "Harvest-Ready": "Grafted (Near Harvest Ready)",
      "16-inch Premium Pack": "Grafted (Near Harvest Ready)",
    },
    "Key Lime Tree": {
      "Harvest-Ready": "Grafted (Near Harvest Ready)",
      "16-inch Premium Pack": "Grafted (Near Harvest Ready)",
    },
    "Cherry Tree": {
      "Harvest-Ready": "Grafted (Near Harvest Ready)",
      "16-inch Premium Pack": "Grafted (Near Harvest Ready)",
    },
  };

  return labelOverrides[productTitle]?.[fallbackLabel] || fallbackLabel;
}

export async function syncHomeGardenPackagesToUnifiedInventory(db: Database) {
  await ensureUnifiedInventoryTable(db);
  await ensureHomeGardenPackageComponentItems(db);

  for (const definition of homeGardenPackageDefinitions) {
    const slug = definition.id;
    const options = homeGardenPackageFormats.map((format) => {
      const packageContents = makeHomeGardenPackageContents(
        definition.size,
        format.id
      );
      const price = packageContents.reduce((sum, content) => {
        const title = content.productTitle;
        const effectiveFormat = getEffectiveHomeGardenPackageFormat(
          title,
          format.id
        );
        const unitPrice = homeGardenPackagePrices[effectiveFormat][title] ?? 0;

        return sum + unitPrice * content.quantity;
      }, 0);

      return {
        id: `${slug}-${format.id}`,
        sku: `LO-PACK-${definition.size.toUpperCase()}-${format.id.toUpperCase()}`,
        label: format.label,
        description: format.description,
        price,
        weight: null,
        quantityOnHand: 100,
        quantityReserved: 0,
        quantityAvailable: 100,
        metadata: {
          source: "home-garden-package",
          format: format.id,
          packageContents: packageContents.map(({ productTitle, ...content }) => content),
          eventQuantityAvailable: 100,
        },
      };
    });

    await upsertUnifiedInventoryItem(db, {
      id: `inventory-${slug}`,
      sku: `LO-PACK-${definition.size.toUpperCase()}`,
      slug,
      title: definition.title,
      description: `${definition.subtitle}. ${definition.description}`,
      detailsDescription:
        "Package. Choose a format based on budget and how quickly you want to harvest. Package content is fulfilled from the linked inventory items.",
      fulfillmentType: "physical",
      active: true,
      quantityOnHand: 100,
      quantityReserved: 0,
      quantityAvailable: 100,
      shopTags: [GARDEN_PACKAGE_SHOP_SLUG],
      categoryTags: ["Package", "Garden"],
      shopListings: [
        {
          shopKey: GARDEN_PACKAGE_SHOP_SLUG,
          shopLabel: "Garden Package",
          categoryKey: "package",
          categoryLabel: "Package",
          categorySortOrder: 5,
          active: true,
          sortOrder: definition.sortOrder,
        },
      ],
      options,
      metadata: {
        source: "home-garden-package",
        category: "Package",
        packageType: "home-garden",
      },
    });
  }
}

async function ensureHomeGardenPackageComponentItems(db: Database) {
  const productTitles = Array.from(
    new Set(
      Object.values(homeGardenPackageQuantities).flatMap((quantities) =>
        Object.keys(quantities)
      )
    )
  );

  for (const productTitle of productTitles) {
    const slug = getHomeGardenPackageComponentSlug(productTitle);
    const skuSlug = sanitizeSlug(productTitle).toUpperCase();

    const allowedFormats = homeGardenPackageFormats.filter(
      (format) =>
        getEffectiveHomeGardenPackageFormat(productTitle, format.id) ===
        format.id
    );
    const options = allowedFormats.map((format) => {
      const quantity = format.id === "starter" ? 1000 : 100;
      const price = homeGardenPackagePrices[format.id][productTitle] ?? 0;
      const optionLabel = getProductFormatLabel(productTitle, format.label);

      return {
        id: sanitizeSlug(optionLabel),
        sku: `PKG-HOME-${skuSlug}-${format.optionSuffix}`,
        label: optionLabel,
        description: format.description,
        price,
        weight: 0.8,
        quantityOnHand: quantity,
        quantityReserved: 0,
        quantityAvailable: quantity,
        metadata: {
          source: "home-garden-package-component",
          format: format.id,
          eventQuantityAvailable: quantity,
        },
      };
    });
    const totalQuantity = options.reduce(
      (sum, option) => sum + toInt(option.quantityAvailable),
      0
    );

    await upsertUnifiedInventoryItem(db, {
      id: `inventory-${slug}`,
      sku: `PKG-HOME-${skuSlug}`,
      slug,
      title: productTitle,
      description:
        "Hidden package component. This item can be included inside packages before it is shown in a storefront.",
      detailsDescription:
        "Package component. Hidden from storefronts unless assigned to a shop.",
      fulfillmentType: "physical",
      active: true,
      quantityOnHand: totalQuantity,
      quantityReserved: 0,
      quantityAvailable: totalQuantity,
      shopTags: [GARDEN_PACKAGE_SHOP_SLUG],
      categoryTags: ["PackageComponent"],
      shopListings: [
        {
          shopKey: GARDEN_PACKAGE_SHOP_SLUG,
          shopLabel: "Garden Package",
          categoryKey: "package-component",
          categoryLabel: "PackageComponent",
          categorySortOrder: 999,
          active: false,
          sortOrder: 999999,
        },
      ],
      options,
      metadata: {
        source: "home-garden-package-component",
        category: "PackageComponent",
        hideFromBrowse: true,
      },
    });
  }
}

function makeHomeGardenPackageContents(
  size: HomeGardenPackageSize,
  format: HomeGardenPackageFormat
) {
  const quantities = homeGardenPackageQuantities[size];
  const suffix =
    homeGardenPackageFormats.find((item) => item.id === format)?.optionSuffix ||
    "STARTER-SEEDLING";

  return Object.entries(quantities).map(([productTitle, quantity]) => ({
    productTitle,
    sku: `PKG-HOME-${sanitizeSlug(productTitle).toUpperCase()}-${
      homeGardenPackageFormats.find(
        (item) =>
          item.id === getEffectiveHomeGardenPackageFormat(productTitle, format)
      )?.optionSuffix || suffix
    }`,
    quantity,
  }));
}

function getHomeGardenPackageComponentSlug(productTitle: string) {
  return `package-component-home-garden-${sanitizeSlug(productTitle)}`;
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
