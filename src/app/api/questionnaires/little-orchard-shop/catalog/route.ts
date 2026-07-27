import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LITTLE_ORCHARD_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import { getPlantShopEventQuantityOverrideMap } from "@/lib/plantShop/eventQuantityOverrides";
import { getLittleOrchardInventoryLineKey } from "@/lib/plantShop/littleOrchardInventoryKeys";
import { getPlantShopProductInterestMap } from "@/lib/plantShop/productInterest";
import type {
  QuestionnaireVariableMap,
  ShopCatalog,
  ShopCatalogProduct,
} from "@/types/questionnaire";

type ConfirmedQuantityRow = {
  productId: string | null;
  sizeOptionId: string | null;
  productTitle: string | null;
  sizeLabel: string | null;
  total: bigint | number | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const eventDateHasPassed = false;
  const [quantityOverrides, interestCounts] = await Promise.all([
    getPlantShopEventQuantityOverrideMap(prisma, LITTLE_ORCHARD_SHOP_SLUG),
    getPlantShopProductInterestMap(prisma, LITTLE_ORCHARD_SHOP_SLUG),
  ]);
  const confirmedRows = await prisma.$queryRaw<ConfirmedQuantityRow[]>(
    Prisma.sql`
      SELECT
        "productId",
        "sizeOptionId",
        "productTitle",
        "sizeLabel",
        COALESCE(SUM("quantity"), 0) AS total
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
        AND "metadata"->>'paymentStatus' = 'PAYMENT_CONFIRMED'
        AND "metadata"->>'inventoryApplied' = 'true'
        AND COALESCE("purchaseModeId", '') <> 'nursery-stock-request'
      GROUP BY "productId", "sizeOptionId", "productTitle", "sizeLabel"
    `
  );

  const confirmedByLine = buildConfirmedQuantityMap(confirmedRows);

  const shopCatalog = applyConfirmedQuantities(
    littleOrchardShopCatalog,
    confirmedByLine,
    eventDateHasPassed,
    quantityOverrides,
    interestCounts
  );

  return NextResponse.json(
    {
      variables: {
        littleOrchardEventDateHasPassed: false,
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

function buildConfirmedQuantityMap(rows: ConfirmedQuantityRow[]) {
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = getCanonicalLineKey(row);
    const total = Number(row.total ?? 0);

    map.set(key, (map.get(key) ?? 0) + (Number.isFinite(total) ? total : 0));
  }

  return map;
}

function getCanonicalLineKey(row: ConfirmedQuantityRow) {
  return getLittleOrchardInventoryLineKey(row);
}

function applyConfirmedQuantities(
  catalog: ShopCatalog,
  confirmedByLine: Map<string, number>,
  eventDateHasPassed: boolean,
  quantityOverrides: Map<string, number>,
  interestCounts: Map<string, number>
): ShopCatalog {
  return {
    ...catalog,
    products: catalog.products.map((product) =>
      applyProductConfirmedQuantities(
        product,
        confirmedByLine,
        eventDateHasPassed,
        quantityOverrides,
        interestCounts
      )
    ),
  };
}

function applyProductConfirmedQuantities(
  product: ShopCatalogProduct,
  confirmedByLine: Map<string, number>,
  eventDateHasPassed: boolean,
  quantityOverrides: Map<string, number>,
  interestCounts: Map<string, number>
): ShopCatalogProduct {
  const sizeOptions = product.sizeOptions.map((sizeOption) => {
    const metadata = normalizeMetadata(sizeOption.metadata);
    const lineKey = `${product.id}::${sizeOption.id}`;
    const originalQuantity = Number(
      quantityOverrides.get(lineKey) ?? metadata.eventQuantityAvailable ?? 0
    );
    const confirmedQuantity = confirmedByLine.get(
      lineKey
    ) ?? 0;
    const interestedPeopleCount = interestCounts.get(lineKey) ?? 0;
    const remainingQuantity =
      eventDateHasPassed
        ? 0
        : originalQuantity > 0
        ? Math.max(0, Math.floor(originalQuantity - confirmedQuantity))
        : originalQuantity;

    return {
      ...sizeOption,
      description: sizeOption.description
        ? sizeOption.description
            .replace(
              /(?:Event quantity(?: remaining)?|Inventory remaining):\s*\d+\./i,
              `Inventory remaining: ${remainingQuantity}.`
            )
            .replace(
              /Available for pickup at the Little Orchard Nursery tent while show stock lasts\./i,
              "Available while nursery stock lasts."
            )
        : sizeOption.description,
      metadata: {
        ...metadata,
        originalEventQuantityAvailable: originalQuantity,
        eventQuantityAvailable: remainingQuantity,
        confirmedEventQuantity: confirmedQuantity,
        eventDateHasPassed,
        interestedPeopleCount,
      },
    };
  });

  const remainingProductQuantity = sizeOptions.reduce((sum, sizeOption) => {
    const metadata = normalizeMetadata(sizeOption.metadata);
    const remainingQuantity = Number(metadata.eventQuantityAvailable ?? 0);

    return sum + (Number.isFinite(remainingQuantity) ? remainingQuantity : 0);
  }, 0);
  const metadata = normalizeMetadata(product.metadata);

  return {
    ...product,
    maxOrderQuantity: remainingProductQuantity,
    detailsDescription: product.detailsDescription
      ? product.detailsDescription.replace(
          /Event quantity available:\s*\d+\./i,
          `Inventory remaining: ${remainingProductQuantity}.`
        )
      : product.detailsDescription,
    metadata: {
      ...metadata,
      originalEventQuantityAvailable: metadata.eventQuantityAvailable ?? null,
      eventQuantityAvailable: remainingProductQuantity,
      eventDateHasPassed,
    },
    sizeOptions,
  };
}

function normalizeMetadata(
  metadata: QuestionnaireVariableMap | undefined
): QuestionnaireVariableMap {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};
}
