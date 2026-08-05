import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GARDEN_PACKAGE_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import {
  getUnifiedShopCatalog,
} from "@/lib/inventory/littleOrchardUnifiedCatalog";
import {
  getUnifiedInventoryItems,
  syncHomeGardenPackagesToUnifiedInventory,
} from "@/lib/inventory/unifiedInventory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const inventoryItems = await getUnifiedInventoryItems(prisma as any);
  const hasGardenPackages = inventoryItems.some((item) => {
    const shopTags: unknown[] = Array.isArray(item.shopTags)
      ? item.shopTags
      : [];
    const categoryTags: unknown[] = Array.isArray(item.categoryTags)
      ? item.categoryTags
      : [];

    return (
      shopTags.includes(GARDEN_PACKAGE_SHOP_SLUG) &&
      categoryTags.some(
        (tag) => String(tag).trim().toLowerCase() === "package"
      )
    );
  });

  if (!hasGardenPackages) {
    await syncHomeGardenPackagesToUnifiedInventory(prisma as any);
  }

  const shopCatalog = await getUnifiedShopCatalog(
    prisma as any,
    GARDEN_PACKAGE_SHOP_SLUG,
    {
      ...littleOrchardShopCatalog,
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
