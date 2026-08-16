import { NextResponse } from "next/server";
import {
  affiliateStoreCommissionSettings,
  getAffiliateStoreCommissionSetting,
  hasStoreAffiliateCommission,
} from "@/lib/affiliates/storeCommissionSettings";
import { getUnifiedInventoryItems } from "@/lib/inventory/unifiedInventory";
import { prisma } from "@/lib/prisma";

const shopLabels: Record<string, string> = {
  "little-orchard-shop": "Little Orchard Shop",
  "garden-package": "Garden Package",
  "seedling-shop": "Seedling Shop",
  "music-merch-shop": "Music + Merch Store",
  "ticket-add-ons": "Ticket Add-ons",
  "invitation-tickets": "Invitation Tickets",
  "combined-order": "Combined Order",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const requestedStoreKeys = getRequestedStoreKeys(requestUrl);
    const items = await getUnifiedInventoryItems(prisma as any);
    const storeKeys = Array.from(
      new Set(
        affiliateStoreCommissionSettings
          .filter((setting) => hasStoreAffiliateCommission(setting.shopKey))
          .map((setting) => setting.shopKey)
      )
    )
      .filter((shopKey) =>
        requestedStoreKeys.length ? requestedStoreKeys.includes(shopKey) : true
      )
      .sort((first, second) =>
        getShopLabel(first).localeCompare(getShopLabel(second))
      );

    const storeOptions = storeKeys.length
      ? storeKeys.map((shopKey) => ({
          value: shopKey,
          label: getShopLabel(shopKey),
        }))
      : [
          {
            value: "no-commissioned-stores",
            label: "No stores have affiliate commission set yet",
            disabled: true,
          },
        ];

    const affiliateProductOptionsByStore = Object.fromEntries(
      storeKeys.map((shopKey) => [
        shopKey,
        buildProductOptionsForStore(items, shopKey),
      ])
    );

    return NextResponse.json({
      variables: {
        affiliateStoreCommissionSettings: affiliateStoreCommissionSettings.filter(
          (setting) => storeKeys.includes(setting.shopKey)
        ),
        affiliateStoreTypes: Object.fromEntries(
          affiliateStoreCommissionSettings
            .filter((setting) => storeKeys.includes(setting.shopKey))
            .map((setting) => [setting.shopKey, setting.shopType])
        ),
        prefillAnswers:
          storeKeys.length === 1
            ? {
                affiliatePreferredStore: storeKeys[0],
                affiliateSelectedShopType:
                  getAffiliateStoreCommissionSetting(storeKeys[0])?.shopType ||
                  "multiple-product",
              }
            : {},
        formFieldOptions: {
          affiliatePreferredStore: storeOptions,
        },
        affiliateProductOptionsByStore,
      },
    });
  } catch (error) {
    console.error("Affiliate sign-up catalog error:", error);

    return NextResponse.json(
      {
        variables: {
          formFieldOptions: {
            affiliatePreferredStore: [
              {
                value: "catalog-unavailable",
                label: "Stores are not available right now",
                disabled: true,
              },
            ],
          },
          affiliateProductOptionsByStore: {},
        },
      },
      { status: 200 }
    );
  }
}

function buildProductOptionsForStore(items: any[], shopKey: string) {
  const storeCommission = getAffiliateStoreCommissionSetting(shopKey);
  const shouldUseStoreCommission =
    storeCommission?.enabled === true && hasStoreAffiliateCommission(shopKey);
  const eligibleItems = items
    .filter(
      (item) =>
        normalizeArray(item.shopTags).includes(shopKey) &&
        (shouldUseStoreCommission || hasAffiliateCommission(item))
    );
  const options =
    shopKey === "seedling-shop"
      ? buildSeedlingAffiliateProductOptions(eligibleItems)
      : buildStandardAffiliateProductOptions(eligibleItems);

  if (!options.length) {
    return [
      {
        value: "no-commissioned-products",
        label: "No commissioned products are available for this store yet",
        disabled: true,
      },
    ];
  }

  return [
    {
      value: "all_commissioned_products",
      label: "All commissioned products in this store",
    },
    ...options,
  ];
}

function buildStandardAffiliateProductOptions(items: any[]) {
  return items
    .map((item) => ({
      value: String(item.sku || item.slug || item.id).trim(),
      label: String(item.title || "Inventory item").trim(),
    }))
    .filter((option) => option.value)
    .sort((first, second) => first.label.localeCompare(second.label));
}

function buildSeedlingAffiliateProductOptions(items: any[]) {
  const byCrop = new Map<string, { label: string; skus: string[] }>();

  for (const item of items) {
    const cropName = getSeedlingCropName(item);
    const key = slugify(cropName);
    const sku = String(item.sku || item.slug || item.id).trim();

    if (!key || !sku) {
      continue;
    }

    const current = byCrop.get(key) || {
      label: cropName,
      skus: [],
    };

    current.skus.push(sku);
    byCrop.set(key, current);
  }

  return Array.from(byCrop.values())
    .map((entry) => ({
      value: `seedling-crop:${entry.skus.join("+")}`,
      label: entry.label,
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

function getSeedlingCropName(item: any) {
  const categoryTags = normalizeArray(item.categoryTags).map((tag) =>
    String(tag || "").trim()
  );
  const categoryCrop = categoryTags.find(
    (tag) =>
      tag &&
      !["Seedlings", "Cuttings", "Batch"].includes(tag)
  );

  if (categoryCrop) {
    return categoryCrop;
  }

  return String(item.title || "Seedling crop")
    .replace(/\s*-\s*Started\s+\d{4}-\d{2}-\d{2}\s*$/i, "")
    .replace(/\s*Seedlings\s*-\s*Batch\s*-\s*\d{4}-\d{2}-\d{2}\s*$/i, "")
    .replace(/\s*-\s*Batch\s*-\s*\d{4}-\d{2}-\d{2}\s*$/i, "")
    .trim();
}

function hasAffiliateCommission(item: any) {
  const metadata = normalizeMetadata(item?.metadata);
  const commission = normalizeMetadata(metadata.affiliateCommission);

  return (
    toNumber(commission.bronzePercent) > 0 ||
    toNumber(commission.silverPercent) > 0 ||
    toNumber(commission.goldPercent) > 0
  );
}

function getRequestedStoreKeys(url: URL) {
  const raw = [
    url.searchParams.get("store"),
    url.searchParams.get("shop"),
    url.searchParams.get("stores"),
    url.searchParams.get("shops"),
  ]
    .filter(Boolean)
    .join(",");

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getShopLabel(shopKey: string) {
  return shopLabels[shopKey] || shopKey;
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeMetadata(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
