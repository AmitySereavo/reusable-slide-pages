import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedShopCatalog } from "@/lib/inventory/littleOrchardUnifiedCatalog";
import { SEEDLING_SHOP_SLUG } from "@/lib/seedlings/productionTemplates";

export async function GET() {
  try {
    const catalog = await getUnifiedShopCatalog(prisma as any, SEEDLING_SHOP_SLUG);

    return NextResponse.json({
      variables: {
        shopCatalog: {
          ...catalog,
          currencyCode: "JMD",
          products: catalog.products.filter((product) => {
            const remaining = Number(product.metadata?.quantityRemaining ?? product.maxOrderQuantity ?? 0);
            return remaining > 0;
          }),
        },
      },
    });
  } catch (error) {
    console.error("Seedling shop catalog error:", error);
    return NextResponse.json(
      {
        variables: {
          shopCatalog: {
            currencyCode: "JMD",
            weightUnit: "lb",
            products: [],
          },
        },
      },
      { status: 200 }
    );
  }
}
