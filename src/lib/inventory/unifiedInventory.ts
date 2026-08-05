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
      ["Basil - Thai", 75, 450, 900],
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
      ["Chinese Mint (French Thyme)", 100, 500, 900],
      ["Lemon Balm", 100, 500, 900],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Leafy Vegetables",
    products: [
      ["Lettuce", 30, 250, 500],
      ["Pak Choi", 30, 250, null],
      ["Bok Choy", 30, 250, null],
      ["Callaloo", 30, 250, null],
      ["Malabar Spinach", 30, 250, 500],
      ["Cabbage", 30, 250, null],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Fruiting Vegetables",
    products: [
      ["Pepper - Sweet", 50, 350, 700],
      ["Pepper - Sweet (Purple)", 60, 420, 840],
      ["Pepper - Scotch Bonnet", 50, 350, 700],
      ["Pepper - Chili", 50, 350, 700],
      ["Pepper - Bird", 50, 350, 700],
      ["Pepper - Caribbean Red", 50, 350, 700],
      ["Tomato - Slicing (Salad or Sandwich Tomato)", 50, 350, 700],
      ["Tomato - Cherry", 50, 350, 700],
      ["Tomato - Plummy (Cooking Tomato)", 50, 350, 700],
      ["Eggplant", 50, 350, 700],
      ["Okra", 50, 350, 700],
      ["Cucumber", 50, 350, 700],
      ["Chow Chow (Chayote)", 50, 350, 700],
      ["Susumba", 50, 350, 700],
      ["String Beans", 40, 200, 400],
    ],
    headers: ["Starter Seedling", "Garden-Ready", "Harvest-Ready"],
  },
  {
    category: "Root, Vine and Perennial Crops",
    products: [
      ["Sweet Potato Slips", 30, 250, 500],
      ["Coco Yam", 100, 500, 900],
      ["Irish Potato Slips", 100, 500, 900],
      ["Carrot", 50, 250, 500],
      ["Beetroot", 50, 250, 500],
      ["Turnip", 50, 250, 500],
      ["Garlic", 50, 250, 500],
      ["Onion", 50, 250, 500],
      ["Yellow Yam Slips", 100, 500, 900],
      ["Renta Yam Slips", 100, 500, 900],
      ["Dasheen", 100, 500, 900],
      ["Passion Fruit", 150, 700, 1500],
      ["Sweet Cup Vine", 150, 700, 1500],
      ["Mulberry Tree", null, null, 2500],
      ["Key Lime Tree", null, 700, 3500],
      ["Star Fruit Tree", null, 700, 2500],
      ["Soursop Tree", null, 700, 2500],
      ["Cherry Tree", null, null, 2500],
      ["Pepper - Black Pepper", 500, 500, 900],
      ["FIA Banana Sucker", 600, 600, 1200],
      ["Lakatan Banana Sucker", 600, 600, 1200],
      ["One-Hand Bandit Plantain Sucker", 600, 600, 1200],
      ["Regular Plantain Sucker", 600, 600, 1200],
      ["Strawberry", 150, 700, 1500],
      ["Blueberry", 150, 700, 1500],
      ["Purple Grape Vine", 150, 700, 1500],
      ["Red Grape Vine", 150, 700, 1500],
      ["Cerasee", 100, 500, 900],
      ["Cloves", 150, 700, 1500],
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
    "Basil - Thai": 2,
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
    "Chinese Mint (French Thyme)": 1,
    "Lemon Balm": 1,
    "Pepper - Scotch Bonnet": 2,
    "Pepper - Sweet": 2,
    "Pepper - Chili": 2,
    "Pepper - Bird": 2,
    "Pepper - Caribbean Red": 2,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 3,
    "Tomato - Cherry": 2,
    "Tomato - Plummy (Cooking Tomato)": 2,
    Eggplant: 2,
    Okra: 2,
    Cucumber: 2,
    "Chow Chow (Chayote)": 2,
    Susumba: 2,
    "String Beans": 10,
    Lettuce: 12,
    "Pak Choi": 12,
    "Bok Choy": 12,
    Callaloo: 12,
    "Malabar Spinach": 12,
    Cabbage: 12,
    Beetroot: 12,
    "Mulberry Tree": 1,
    "Key Lime Tree": 1,
    "Star Fruit Tree": 1,
    "Soursop Tree": 1,
    "Cherry Tree": 1,
    "Pepper - Black Pepper": 1,
    "Sweet Potato Slips": 6,
    "Coco Yam": 2,
    "Irish Potato Slips": 4,
    Turnip: 12,
    Garlic: 10,
    Onion: 10,
    "Yellow Yam Slips": 2,
    "Renta Yam Slips": 2,
    Dasheen: 2,
    Carrot: 12,
    "FIA Banana Sucker": 1,
    "Lakatan Banana Sucker": 1,
    "One-Hand Bandit Plantain Sucker": 1,
    "Regular Plantain Sucker": 1,
    Strawberry: 2,
    Blueberry: 2,
    "Purple Grape Vine": 1,
    "Red Grape Vine": 1,
    "Sweet Cup Vine": 1,
    Cerasee: 1,
    Cloves: 1,
  },
  family: {
    "Scallion (Green Onion)": 20,
    Thyme: 3,
    "Basil - Italian Sweet": 3,
    "Basil - Genovese": 3,
    "Basil - Thai": 3,
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
    "Chinese Mint (French Thyme)": 2,
    "Lemon Balm": 2,
    "Pepper - Scotch Bonnet": 3,
    "Pepper - Sweet": 4,
    "Pepper - Chili": 3,
    "Pepper - Bird": 3,
    "Pepper - Caribbean Red": 3,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 6,
    "Tomato - Cherry": 4,
    "Tomato - Plummy (Cooking Tomato)": 4,
    Eggplant: 4,
    Okra: 4,
    Cucumber: 3,
    "Chow Chow (Chayote)": 3,
    Susumba: 3,
    "String Beans": 20,
    Lettuce: 24,
    "Pak Choi": 24,
    "Bok Choy": 24,
    Callaloo: 24,
    "Malabar Spinach": 24,
    Cabbage: 24,
    Beetroot: 24,
    "Mulberry Tree": 2,
    "Key Lime Tree": 2,
    "Star Fruit Tree": 2,
    "Soursop Tree": 2,
    "Cherry Tree": 2,
    "Pepper - Black Pepper": 2,
    "Sweet Potato Slips": 12,
    "Coco Yam": 4,
    "Irish Potato Slips": 8,
    Turnip: 24,
    Garlic: 20,
    Onion: 20,
    "Yellow Yam Slips": 4,
    "Renta Yam Slips": 4,
    Dasheen: 4,
    Carrot: 24,
    "FIA Banana Sucker": 2,
    "Lakatan Banana Sucker": 2,
    "One-Hand Bandit Plantain Sucker": 2,
    "Regular Plantain Sucker": 2,
    Strawberry: 4,
    Blueberry: 4,
    "Purple Grape Vine": 2,
    "Red Grape Vine": 2,
    "Sweet Cup Vine": 2,
    Cerasee: 2,
    Cloves: 2,
  },
  large: {
    "Scallion (Green Onion)": 30,
    Thyme: 4,
    "Basil - Italian Sweet": 4,
    "Basil - Genovese": 4,
    "Basil - Thai": 4,
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
    "Chinese Mint (French Thyme)": 3,
    "Lemon Balm": 3,
    "Pepper - Scotch Bonnet": 4,
    "Pepper - Sweet": 6,
    "Pepper - Chili": 4,
    "Pepper - Bird": 4,
    "Pepper - Caribbean Red": 4,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 10,
    "Tomato - Cherry": 6,
    "Tomato - Plummy (Cooking Tomato)": 6,
    Eggplant: 6,
    Okra: 6,
    Cucumber: 4,
    "Chow Chow (Chayote)": 4,
    Susumba: 4,
    "String Beans": 30,
    Lettuce: 36,
    "Pak Choi": 36,
    "Bok Choy": 36,
    Callaloo: 36,
    "Malabar Spinach": 36,
    Cabbage: 36,
    Beetroot: 36,
    "Mulberry Tree": 3,
    "Key Lime Tree": 3,
    "Star Fruit Tree": 3,
    "Soursop Tree": 3,
    "Cherry Tree": 3,
    "Pepper - Black Pepper": 3,
    "Sweet Potato Slips": 18,
    "Coco Yam": 6,
    "Irish Potato Slips": 12,
    Turnip: 36,
    Garlic: 30,
    Onion: 30,
    "Yellow Yam Slips": 6,
    "Renta Yam Slips": 6,
    Dasheen: 6,
    Carrot: 36,
    "FIA Banana Sucker": 3,
    "Lakatan Banana Sucker": 3,
    "One-Hand Bandit Plantain Sucker": 3,
    "Regular Plantain Sucker": 3,
    Strawberry: 6,
    Blueberry: 6,
    "Purple Grape Vine": 3,
    "Red Grape Vine": 3,
    "Sweet Cup Vine": 3,
    Cerasee: 3,
    Cloves: 3,
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
    "Basil - Thai": 75,
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
    "Chinese Mint (French Thyme)": 100,
    "Lemon Balm": 100,
    "Pepper - Scotch Bonnet": 50,
    "Pepper - Sweet": 50,
    "Pepper - Chili": 50,
    "Pepper - Bird": 50,
    "Pepper - Caribbean Red": 50,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 50,
    "Tomato - Cherry": 50,
    "Tomato - Plummy (Cooking Tomato)": 50,
    Eggplant: 50,
    Okra: 50,
    Cucumber: 50,
    "Chow Chow (Chayote)": 50,
    Susumba: 50,
    "String Beans": 40,
    Lettuce: 30,
    "Pak Choi": 30,
    "Bok Choy": 30,
    Callaloo: 30,
    "Malabar Spinach": 30,
    Cabbage: 30,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 700,
    "Star Fruit Tree": 700,
    "Soursop Tree": 700,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 500,
    "Sweet Potato Slips": 30,
    "Coco Yam": 100,
    "Irish Potato Slips": 100,
    Carrot: 50,
    Beetroot: 50,
    Turnip: 50,
    Garlic: 50,
    Onion: 50,
    "Yellow Yam Slips": 100,
    "Renta Yam Slips": 100,
    Dasheen: 100,
    "FIA Banana Sucker": 600,
    "Lakatan Banana Sucker": 600,
    "One-Hand Bandit Plantain Sucker": 600,
    "Regular Plantain Sucker": 600,
    Strawberry: 150,
    Blueberry: 150,
    "Purple Grape Vine": 150,
    "Red Grape Vine": 150,
    "Sweet Cup Vine": 150,
    Cerasee: 100,
    Cloves: 150,
  },
  garden: {
    "Scallion (Green Onion)": 400,
    Thyme: 500,
    "Basil - Italian Sweet": 450,
    "Basil - Genovese": 450,
    "Basil - Thai": 450,
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
    "Chinese Mint (French Thyme)": 500,
    "Lemon Balm": 500,
    "Pepper - Scotch Bonnet": 350,
    "Pepper - Sweet": 350,
    "Pepper - Chili": 350,
    "Pepper - Bird": 350,
    "Pepper - Caribbean Red": 350,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 350,
    "Tomato - Cherry": 350,
    "Tomato - Plummy (Cooking Tomato)": 350,
    Eggplant: 350,
    Okra: 350,
    Cucumber: 350,
    "Chow Chow (Chayote)": 350,
    Susumba: 350,
    "String Beans": 200,
    Lettuce: 250,
    "Pak Choi": 250,
    "Bok Choy": 250,
    Callaloo: 250,
    "Malabar Spinach": 250,
    Cabbage: 250,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 700,
    "Star Fruit Tree": 700,
    "Soursop Tree": 700,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 500,
    "Sweet Potato Slips": 250,
    "Coco Yam": 500,
    "Irish Potato Slips": 500,
    Carrot: 250,
    Beetroot: 250,
    Turnip: 250,
    Garlic: 250,
    Onion: 250,
    "Yellow Yam Slips": 500,
    "Renta Yam Slips": 500,
    Dasheen: 500,
    "FIA Banana Sucker": 600,
    "Lakatan Banana Sucker": 600,
    "One-Hand Bandit Plantain Sucker": 600,
    "Regular Plantain Sucker": 600,
    Strawberry: 700,
    Blueberry: 700,
    "Purple Grape Vine": 700,
    "Red Grape Vine": 700,
    "Sweet Cup Vine": 700,
    Cerasee: 500,
    Cloves: 700,
  },
  premium: {
    "Scallion (Green Onion)": 800,
    Thyme: 1000,
    "Basil - Italian Sweet": 900,
    "Basil - Genovese": 900,
    "Basil - Thai": 900,
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
    "Chinese Mint (French Thyme)": 900,
    "Lemon Balm": 900,
    "Pepper - Scotch Bonnet": 700,
    "Pepper - Sweet": 700,
    "Pepper - Chili": 700,
    "Pepper - Bird": 700,
    "Pepper - Caribbean Red": 700,
    "Tomato - Slicing (Salad or Sandwich Tomato)": 700,
    "Tomato - Cherry": 700,
    "Tomato - Plummy (Cooking Tomato)": 700,
    Eggplant: 700,
    Okra: 700,
    Cucumber: 700,
    "Chow Chow (Chayote)": 700,
    Susumba: 700,
    "String Beans": 400,
    Lettuce: 500,
    "Pak Choi": 500,
    "Bok Choy": 500,
    Callaloo: 500,
    "Malabar Spinach": 500,
    Cabbage: 500,
    "Mulberry Tree": 2500,
    "Key Lime Tree": 3500,
    "Star Fruit Tree": 2500,
    "Soursop Tree": 2500,
    "Cherry Tree": 2500,
    "Pepper - Black Pepper": 900,
    "Sweet Potato Slips": 500,
    "Coco Yam": 900,
    "Irish Potato Slips": 900,
    Carrot: 500,
    Beetroot: 500,
    Turnip: 500,
    Garlic: 500,
    Onion: 500,
    "Yellow Yam Slips": 900,
    "Renta Yam Slips": 900,
    Dasheen: 900,
    "FIA Banana Sucker": 1200,
    "Lakatan Banana Sucker": 1200,
    "One-Hand Bandit Plantain Sucker": 1200,
    "Regular Plantain Sucker": 1200,
    Strawberry: 1500,
    Blueberry: 1500,
    "Purple Grape Vine": 1500,
    "Red Grape Vine": 1500,
    "Sweet Cup Vine": 1500,
    Cerasee: 900,
    Cloves: 1500,
  },
};

const homeGardenPackageFormatOverrides: Record<
  string,
  Partial<Record<HomeGardenPackageFormat, HomeGardenPackageFormat>>
> = {
  "Star Fruit Tree": {
    starter: "garden",
  },
  "Soursop Tree": {
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
  "Strawberry": {
    starter: "garden",
  },
  "Blueberry": {
    starter: "garden",
  },
  "Purple Grape Vine": {
    starter: "garden",
  },
  "Red Grape Vine": {
    starter: "garden",
  },
  "Sweet Cup Vine": {
    starter: "garden",
  },
  "FIA Banana Sucker": {
    starter: "garden",
  },
  "Lakatan Banana Sucker": {
    starter: "garden",
  },
  "One-Hand Bandit Plantain Sucker": {
    starter: "garden",
  },
  "Regular Plantain Sucker": {
    starter: "garden",
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

function isIntrusiveRunnerPackageItem(productTitle: string) {
  const normalized = productTitle.toLowerCase();

  if (normalized.includes("coco yam") || normalized.includes("dasheen")) {
    return false;
  }

  return (
    normalized.includes("vine") ||
    normalized.includes("grape") ||
    normalized.includes("black pepper") ||
    normalized.includes("pepper - black") ||
    normalized.includes("chayote") ||
    normalized.includes("chow chow") ||
    normalized.includes("sweet cup") ||
    normalized.includes("sweet potato") ||
    normalized.includes("yam") ||
    normalized.includes("malabar spinach")
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
      const isIntrusiveRunner = isIntrusiveRunnerPackageItem(productTitle);

      return {
        id: sanitizeSlug(optionLabel),
        sku: `PKG-HOME-${skuSlug}-${format.optionSuffix}`,
        label: optionLabel,
        description: isIntrusiveRunner
          ? `${format.description} Intrusive runner.`
          : format.description,
        price,
        weight: 0.8,
        quantityOnHand: quantity,
        quantityReserved: 0,
        quantityAvailable: quantity,
        metadata: {
          source: "home-garden-package-component",
          format: format.id,
          eventQuantityAvailable: quantity,
          ...(isIntrusiveRunner ? { growthNote: "Intrusive runner" } : {}),
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
        isIntrusiveRunnerPackageItem(productTitle)
          ? "Hidden package component. Intrusive runner. This item can be included inside packages before it is shown in a storefront."
          : "Hidden package component. This item can be included inside packages before it is shown in a storefront.",
      detailsDescription:
        isIntrusiveRunnerPackageItem(productTitle)
          ? "Package component. Intrusive runner. Hidden from storefronts unless assigned to a shop."
          : "Package component. Hidden from storefronts unless assigned to a shop.",
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
        ...(isIntrusiveRunnerPackageItem(productTitle)
          ? { growthNote: "Intrusive runner" }
          : {}),
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
