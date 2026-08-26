import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BUSH_TEA_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import { getUnifiedShopCatalog } from "@/lib/inventory/littleOrchardUnifiedCatalog";
import {
  BUSH_TEA_SYNC_VERSION,
  getUnifiedInventoryItems,
  syncBushTeaProductsToUnifiedInventory,
} from "@/lib/inventory/unifiedInventory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const inventoryItems = await getUnifiedInventoryItems(prisma as any);
  const hasCurrentBushTeaSync = inventoryItems.some((item) => {
    const shopTags: unknown[] = Array.isArray(item.shopTags)
      ? item.shopTags
      : [];
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : {};

    return (
      shopTags.includes(BUSH_TEA_SHOP_SLUG) &&
      metadata.source === "bush-tea-shop" &&
      metadata.syncVersion === BUSH_TEA_SYNC_VERSION
    );
  });

  if (!hasCurrentBushTeaSync) {
    await syncBushTeaProductsToUnifiedInventory(prisma as any);
  }

  const shopCatalog = await getUnifiedShopCatalog(
    prisma as any,
    BUSH_TEA_SHOP_SLUG,
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
