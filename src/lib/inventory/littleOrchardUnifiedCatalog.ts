import { PrismaClient } from "@prisma/client";
import {
  LITTLE_ORCHARD_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import type {
  QuestionnaireVariableMap,
  ShopCatalog,
  ShopCatalogProduct,
} from "@/types/questionnaire";
import {
  getUnifiedInventoryItems,
  syncLittleOrchardCatalogToUnifiedInventory,
} from "./unifiedInventory";

type Database = PrismaClient | any;

export async function getLittleOrchardUnifiedShopCatalog(
  db: Database
): Promise<ShopCatalog> {
  let items = await getUnifiedInventoryItems(db);
  let littleOrchardItems = items.filter(isLittleOrchardInventoryItem);

  if (!littleOrchardItems.length) {
    await syncLittleOrchardCatalogToUnifiedInventory(db);
    items = await getUnifiedInventoryItems(db);
    littleOrchardItems = items.filter(isLittleOrchardInventoryItem);
  }

  return {
    ...littleOrchardShopCatalog,
    products: littleOrchardItems
      .map(inventoryItemToShopProduct)
      .sort((first, second) => {
        const firstMetadata = normalizeMetadata(first.metadata);
        const secondMetadata = normalizeMetadata(second.metadata);
        const firstCategorySort = Number(
          firstMetadata.shopCategorySortOrder ?? 999
        );
        const secondCategorySort = Number(
          secondMetadata.shopCategorySortOrder ?? 999
        );
        const firstSort = Number(firstMetadata.shopSortOrder ?? 999999);
        const secondSort = Number(secondMetadata.shopSortOrder ?? 999999);

        return (
          firstCategorySort - secondCategorySort ||
          firstSort - secondSort ||
          first.title.localeCompare(second.title)
        );
      }),
  };
}

function isLittleOrchardInventoryItem(item: any) {
  if (!normalizeArray(item.shopTags).includes(LITTLE_ORCHARD_SHOP_SLUG)) {
    return false;
  }

  const listing = getShopListing(item, LITTLE_ORCHARD_SHOP_SLUG);

  return item.active !== false && listing?.active !== false;
}

function inventoryItemToShopProduct(item: any): ShopCatalogProduct {
  const metadata = normalizeMetadata(item.metadata);
  const littleOrchardListing =
    getShopListing(item, LITTLE_ORCHARD_SHOP_SLUG) || {};
  const category =
    littleOrchardListing.categoryLabel ||
    normalizeArray(item.categoryTags)[0] ||
    "Uncategorized";
  const shopSortOrder = Number(littleOrchardListing.sortOrder ?? 999999);
  const shopCategorySortOrder = Number(
    littleOrchardListing.categorySortOrder ?? 999
  );
  const productId = String(metadata.sourceProductId || item.slug || item.id);
  const sizeOptions = normalizeArray(item.options).map((option: any) => {
    const optionMetadata = normalizeMetadata(option.metadata);
    const quantityAvailable = Number(
      option.quantityAvailable ??
        optionMetadata.eventQuantityAvailable ??
        item.quantityAvailable ??
        0
    );

    return {
      id: String(option.id || option.optionId || option.sku || "default"),
      sku: option.sku || item.sku || undefined,
      label: String(option.label || "Default option"),
      description:
        option.description ||
        [
          optionMetadata.potSize,
          optionMetadata.estimatedSize,
          "Available while nursery stock lasts.",
          `Inventory remaining: ${quantityAvailable}.`,
        ]
          .filter(Boolean)
          .join(". "),
      price: Number(option.price || 0),
      weight: option.weight ?? undefined,
      metadata: {
        ...optionMetadata,
        eventQuantityAvailable: quantityAvailable,
        unifiedInventoryItemId: item.id,
      },
    };
  });

  return {
    id: productId,
    sku: item.sku || undefined,
    slug: item.slug || productId,
    title: item.title,
    imageUrl: item.imageUrl || undefined,
    previewImageUrl: item.previewImageUrl || item.imageUrl || undefined,
    description: item.description || "",
    detailsDescription:
      item.detailsDescription ||
      `${category}. ${item.description || ""} Inventory available: ${
        item.quantityAvailable ?? 0
      }.`,
    fulfillmentType: item.fulfillmentType || "physical",
    maxOrderQuantity: Number(item.quantityAvailable || 0),
    metadata: {
      ...metadata,
      category,
      eventQuantityAvailable: Number(item.quantityAvailable || 0),
      unifiedInventoryItemId: item.id,
      shopSortOrder,
      shopCategorySortOrder,
    },
    sizeOptions,
  } as ShopCatalogProduct;
}

function normalizeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getShopListing(item: any, shopKey: string) {
  return (
    normalizeArray(item.shopListings).find(
      (listing) =>
        listing &&
        typeof listing === "object" &&
        listing.shopKey === shopKey
    ) || null
  );
}

function normalizeMetadata(
  metadata: QuestionnaireVariableMap | undefined
): QuestionnaireVariableMap {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};
}
