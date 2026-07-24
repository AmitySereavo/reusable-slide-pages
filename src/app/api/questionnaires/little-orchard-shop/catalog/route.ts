import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LITTLE_ORCHARD_SHOP_SLUG,
  littleOrchardPlantShowEvent,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import { getPlantShopEventQuantityOverrideMap } from "@/lib/plantShop/eventQuantityOverrides";
import { getPlantShopProductInterestMap } from "@/lib/plantShop/productInterest";
import type {
  QuestionnaireVariableMap,
  ShopCatalog,
  ShopCatalogProduct,
} from "@/types/questionnaire";

type ConfirmedQuantityRow = {
  productId: string | null;
  sizeOptionId: string | null;
  total: bigint | number | null;
};

export async function GET() {
  const eventDateHasPassed = hasLittleOrchardEventPassed();
  const [quantityOverrides, interestCounts] = await Promise.all([
    getPlantShopEventQuantityOverrideMap(prisma, LITTLE_ORCHARD_SHOP_SLUG),
    getPlantShopProductInterestMap(prisma, LITTLE_ORCHARD_SHOP_SLUG),
  ]);
  const confirmedRows = await prisma.$queryRaw<ConfirmedQuantityRow[]>(
    Prisma.sql`
      SELECT "productId", "sizeOptionId", COALESCE(SUM("quantity"), 0) AS total
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
        AND "metadata"->>'paymentStatus' = 'PAYMENT_CONFIRMED'
        AND "metadata"->>'inventoryApplied' = 'true'
        AND COALESCE("purchaseModeId", '') <> 'nursery-stock-request'
      GROUP BY "productId", "sizeOptionId"
    `
  );

  const confirmedByLine = new Map(
    confirmedRows.map((row) => [
      `${row.productId ?? ""}::${row.sizeOptionId ?? ""}`,
      Number(row.total ?? 0),
    ])
  );

  const shopCatalog = applyConfirmedQuantities(
    littleOrchardShopCatalog,
    confirmedByLine,
    eventDateHasPassed,
    quantityOverrides,
    interestCounts
  );

  return NextResponse.json({
    variables: {
      littleOrchardEventDateHasPassed: eventDateHasPassed,
      formFieldOptionOverrides: eventDateHasPassed
        ? {
            plantShopFulfillmentMethod: {
              event_pickup: {
                label:
                  "Jamaica Horticultural Society Plant Market (event date has passed)",
                disabled: true,
              },
            },
          }
        : {},
      shopCatalog,
    },
  });
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
        ? sizeOption.description.replace(
            /Event quantity:\s*\d+\./i,
            `Event quantity remaining: ${remainingQuantity}.`
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
          `Event quantity remaining: ${remainingProductQuantity}.`
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

function hasLittleOrchardEventPassed() {
  const eventEndsAt = new Date(littleOrchardPlantShowEvent.eventEndsAt);

  return !Number.isNaN(eventEndsAt.getTime()) && Date.now() > eventEndsAt.getTime();
}

function normalizeMetadata(
  metadata: QuestionnaireVariableMap | undefined
): QuestionnaireVariableMap {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};
}
