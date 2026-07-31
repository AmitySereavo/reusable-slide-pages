import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  TEST_PACKAGE_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import {
  getUnifiedShopCatalog,
} from "@/lib/inventory/littleOrchardUnifiedCatalog";
import { syncHomeGardenPackagesToUnifiedInventory } from "@/lib/inventory/unifiedInventory";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  await syncHomeGardenPackagesToUnifiedInventory(prisma as any);
  const shopCatalog = await getUnifiedShopCatalog(
    prisma as any,
    TEST_PACKAGE_SHOP_SLUG,
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
