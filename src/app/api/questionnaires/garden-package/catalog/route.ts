import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GARDEN_PACKAGE_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import {
  getUnifiedShopCatalog,
} from "@/lib/inventory/littleOrchardUnifiedCatalog";
import { syncHomeGardenPackagesToUnifiedInventory } from "@/lib/inventory/unifiedInventory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await syncHomeGardenPackagesToUnifiedInventory(prisma as any);
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
