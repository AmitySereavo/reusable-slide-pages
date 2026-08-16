import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";
import { getUnifiedShopCatalog } from "@/lib/inventory/littleOrchardUnifiedCatalog";
import {
  CALLALOO_PACKAGE_SHOP_SLUG,
  CALLALOO_PACKAGE_SYNC_VERSION,
  getUnifiedInventoryItems,
  syncCallalooPackagesToUnifiedInventory,
} from "@/lib/inventory/unifiedInventory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const inventoryItems = await getUnifiedInventoryItems(prisma as any);
  const hasCurrentCallalooSync = inventoryItems.some((item) => {
    const shopTags: unknown[] = Array.isArray(item.shopTags)
      ? item.shopTags
      : [];
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : {};

    return (
      shopTags.includes(CALLALOO_PACKAGE_SHOP_SLUG) &&
      metadata.source === "callaloo-service-package" &&
      metadata.syncVersion === CALLALOO_PACKAGE_SYNC_VERSION
    );
  });

  if (!hasCurrentCallalooSync) {
    await syncCallalooPackagesToUnifiedInventory(prisma as any);
  }

  const shopCatalog = await getUnifiedShopCatalog(
    prisma as any,
    CALLALOO_PACKAGE_SHOP_SLUG,
    {
      ...littleOrchardShopCatalog,
      currencyCode: "JMD",
      weightUnit: "lb",
      products: [],
    }
  );

  return NextResponse.json(
    {
      variables: {
        formFieldOptionOverrides: {},
        shopCatalog,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
