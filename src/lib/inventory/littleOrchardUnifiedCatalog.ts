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
  return getUnifiedShopCatalog(db, LITTLE_ORCHARD_SHOP_SLUG);
}

export async function getUnifiedShopCatalog(
  db: Database,
  shopSlug: string,
  baseCatalog: ShopCatalog = littleOrchardShopCatalog
): Promise<ShopCatalog> {
  let items = await getUnifiedInventoryItems(db);
  let shopItems = getShopCatalogItems(items, shopSlug);

  if (!shopItems.length) {
    await syncLittleOrchardCatalogToUnifiedInventory(db);
    items = await getUnifiedInventoryItems(db);
    shopItems = getShopCatalogItems(items, shopSlug);
  }

  const products = shopItems
    .map((item) => inventoryItemToShopProduct(item, shopSlug, items))
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
      });

  return {
    ...baseCatalog,
    products,
  };
}

function getShopCatalogItems(items: any[], shopSlug: string) {
  const shopItems = items.filter((item) =>
    normalizeArray(item.shopTags).includes(shopSlug)
  );
  const visibleItems = shopItems.filter((item) =>
    isVisibleInventoryItem(item, shopSlug)
  );
  const packageSkuReferences = new Set<string>();

  for (const item of visibleItems) {
    if (!isPackageInventoryItem(item)) {
      continue;
    }

    collectPackageContentSkus(item.metadata, packageSkuReferences);
    for (const option of normalizeArray(item.options)) {
      collectPackageContentSkus(option?.metadata, packageSkuReferences);
    }
  }

  const packageTargetItems = shopItems.filter(
    (item) =>
      !isVisibleInventoryItem(item, shopSlug) &&
      itemHasAnySku(item, packageSkuReferences)
  );
  const externalPackageTargetItems = items.filter(
    (item) =>
      !normalizeArray(item.shopTags).includes(shopSlug) &&
      itemHasAnySku(item, packageSkuReferences)
  );

  return [
    ...visibleItems,
    ...packageTargetItems.map(markHiddenPackageTarget),
    ...externalPackageTargetItems.map(markHiddenPackageTarget),
  ];
}

function isLittleOrchardInventoryItem(item: any) {
  if (!normalizeArray(item.shopTags).includes(LITTLE_ORCHARD_SHOP_SLUG)) {
    return false;
  }

  return isVisibleInventoryItem(item, LITTLE_ORCHARD_SHOP_SLUG);
}

function isVisibleInventoryItem(item: any, shopSlug: string) {
  const listing = getShopListing(item, shopSlug);

  return item.active !== false && listing?.active !== false;
}

function inventoryItemToShopProduct(
  item: any,
  shopSlug: string,
  allItems: any[]
): ShopCatalogProduct {
  const metadata = normalizeMetadata(item.metadata);
  const littleOrchardListing =
    getShopListing(item, shopSlug) || {};
  const category =
    littleOrchardListing.categoryLabel ||
    normalizeArray(item.categoryTags)[0] ||
    "Uncategorized";
  const shopSortOrder = Number(littleOrchardListing.sortOrder ?? 999999);
  const shopCategorySortOrder = Number(
    littleOrchardListing.categorySortOrder ?? 999
  );
  const productId = String(metadata.sourceProductId || item.slug || item.id);
  const isPackage = isPackageInventoryItem(item);
  const sizeOptions = normalizeArray(item.options).map((option: any) => {
    const optionMetadata = normalizeMetadata(option.metadata);
    const packageContents = isPackage
      ? resolvePackageContents(
          normalizePackageContents(
            optionMetadata.packageContents ?? metadata.packageContents
          ),
          allItems
        )
      : [];
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
      purchaseModes: packageContents.length
        ? [
            {
              id: "package-content",
              sku: option.sku ? `${option.sku}-PACKAGE` : undefined,
              label: "Package contents",
              priceAdjustment: 0,
              requiresPhysicalFulfillment: true,
              bundledCartItems: packageContents,
              metadata: {
                packageShell: true,
              },
            },
          ]
        : undefined,
      metadata: {
        ...optionMetadata,
        eventQuantityAvailable: quantityAvailable,
        unifiedInventoryItemId: item.id,
        packageContentCount: packageContents.length,
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
      isPackage,
    },
    sizeOptions,
  } as ShopCatalogProduct;
}

function isPackageInventoryItem(item: any) {
  return normalizeArray(item.categoryTags).some(
    (tag) => String(tag).trim().toLowerCase() === "package"
  );
}

function isPackageComponentInventoryItem(item: any) {
  const metadata = normalizeMetadata(item.metadata);

  if (
    String(metadata.source ?? "").trim().toLowerCase() ===
      "home-garden-package-component" ||
    metadata.packageComponentOnly === true ||
    metadata.hideFromPackage === true
  ) {
    return metadata.hideFromPackage !== true;
  }

  return normalizeArray(item.categoryTags).some(
    (tag) => String(tag).trim().toLowerCase() === "packagecomponent"
  );
}

function markHiddenPackageTarget(item: any) {
  const metadata = normalizeMetadata(item.metadata);

  return {
    ...item,
    metadata: {
      ...metadata,
      hideFromBrowse: true,
      packageComponentOnly: true,
    },
  };
}

function itemHasAnySku(item: any, skuSet: Set<string>) {
  if (!skuSet.size) {
    return false;
  }

  const skus = [
    item.sku,
    ...normalizeArray(item.options).map((option) => option?.sku),
  ]
    .map(normalizeSku)
    .filter(Boolean);

  return skus.some((sku) => skuSet.has(sku));
}

function collectPackageContentSkus(value: unknown, skuSet: Set<string>) {
  const metadata = normalizeMetadata(
    value as QuestionnaireVariableMap | undefined
  );
  const contents = Array.isArray(value) ? value : metadata.packageContents;

  for (const content of normalizePackageContents(contents)) {
    if (content.sku) {
      skuSet.add(normalizeSku(content.sku));
    }
  }
}

function normalizePackageContents(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const sku = normalizeSku(record.sku);
      const quantity = Number(record.quantity ?? 1);

      if (!sku) {
        return null;
      }

      return {
        sku,
        quantity: Number.isFinite(quantity)
          ? Math.max(1, Math.floor(quantity))
          : 1,
      };
    })
    .filter(Boolean) as Array<{ sku: string; quantity: number }>;
}

function resolvePackageContents(
  packageContents: Array<{ sku: string; quantity: number }>,
  allItems: any[]
) {
  const lookup = buildSkuLookup(allItems);

  return packageContents
    .map((content) => {
      const target = lookup.get(normalizeSku(content.sku));

      if (!target) {
        return null;
      }

      return {
        productId: target.productId,
        sizeOptionId: target.sizeOptionId,
        quantity: content.quantity,
        sourceSku: content.sku,
      };
    })
    .filter(Boolean) as Array<{
      productId: string;
      sizeOptionId: string;
      quantity: number;
      sourceSku: string;
    }>;
}

function buildSkuLookup(items: any[]) {
  const lookup = new Map<
    string,
    { productId: string; sizeOptionId: string }
  >();

  for (const item of items) {
    const metadata = normalizeMetadata(item.metadata);
    const productId = String(metadata.sourceProductId || item.slug || item.id);

    for (const option of normalizeArray(item.options)) {
      const optionId = String(
        option?.id || option?.optionId || option?.sku || "default"
      );
      const optionSku = normalizeSku(option?.sku || item.sku);

      if (optionSku) {
        lookup.set(optionSku, {
          productId,
          sizeOptionId: optionId,
        });
      }
    }
  }

  return lookup;
}

function normalizeSku(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
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
