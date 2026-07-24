import { NextResponse } from "next/server";
import { LITTLE_ORCHARD_SHOP_SLUG } from "@/config/shops/littleOrchardShop";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { prisma } from "@/lib/prisma";
import { getPlantShopEventQuantityOverrideMap } from "@/lib/plantShop/eventQuantityOverrides";
import { setPlantShopEventQuantityOverride } from "@/lib/plantShop/eventQuantityOverrides";
import {
  normalizeStockAdjustmentReason,
  recordPlantShopStockAdjustment,
} from "@/lib/plantShop/stockAdjustments";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();

  if (guard.response) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  const productId = cleanText(body?.productId);
  const sizeOptionId = cleanText(body?.sizeOptionId);
  const remainingQuantity = Number(body?.remainingQuantity);
  const reason = normalizeStockAdjustmentReason(body?.reason);
  const notes = cleanText(body?.notes) || null;
  const confirmed = body?.confirmed === true;

  if (!productId || !sizeOptionId) {
    return NextResponse.json(
      { ok: false, error: "Product and size option are required." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(remainingQuantity) || remainingQuantity < 0) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid quantity." },
      { status: 400 }
    );
  }

  if (!reason) {
    return NextResponse.json(
      { ok: false, error: "Choose the reason for this stock update." },
      { status: 400 }
    );
  }

  if (!confirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirm the stock update before saving." },
      { status: 400 }
    );
  }

  const product = littleOrchardShopCatalog.products.find(
    (entry) => entry.id === productId
  );
  const sizeOption = product?.sizeOptions.find(
    (entry) => entry.id === sizeOptionId
  );

  if (!product || !sizeOption) {
    return NextResponse.json(
      { ok: false, error: "Product variation was not found." },
      { status: 404 }
    );
  }

  const rows = await prisma.$queryRaw<Array<{ total: bigint | number | null }>>`
    SELECT COALESCE(SUM("quantity"), 0) AS total
    FROM "OrderFulfillmentItem"
    WHERE "sourceType" = 'little-orchard-shop'
      AND "productId" = ${productId}
      AND "sizeOptionId" = ${sizeOptionId}
      AND "metadata"->>'paymentStatus' = 'PAYMENT_CONFIRMED'
      AND "metadata"->>'inventoryApplied' = 'true'
      AND COALESCE("purchaseModeId", '') <> 'nursery-stock-request'
  `;
  const confirmedQuantity = Number(rows[0]?.total ?? 0);
  const eventQuantity = Math.floor(remainingQuantity + confirmedQuantity);
  const staffUser = guard.session?.user;
  const quantityOverrides = await getPlantShopEventQuantityOverrideMap(
    prisma,
    LITTLE_ORCHARD_SHOP_SLUG
  );
  const previousEventQuantity = Number(
    quantityOverrides.get(`${productId}::${sizeOptionId}`) ??
      sizeOption.metadata?.eventQuantityAvailable ??
      0
  );
  const previousRemainingQuantity = Math.max(
    0,
    Math.floor(previousEventQuantity - confirmedQuantity)
  );

  await prisma.$transaction(async (tx) => {
    await setPlantShopEventQuantityOverride(tx as any, {
      shopSlug: LITTLE_ORCHARD_SHOP_SLUG,
      productId,
      sizeOptionId,
      eventQuantity,
      updatedByUserId: staffUser?.id || null,
      updatedByName: staffUser?.name || staffUser?.email || "Admin",
    });

    await recordPlantShopStockAdjustment(tx as any, {
      shopSlug: LITTLE_ORCHARD_SHOP_SLUG,
      productId,
      productTitle: product.title,
      variationId: sizeOptionId,
      variationLabel: sizeOption.label,
      inventorySource: "event",
      previousQuantity: previousRemainingQuantity,
      newQuantity: Math.floor(remainingQuantity),
      reason,
      notes,
      adjustedByUserId: staffUser?.id || null,
      adjustedByName: staffUser?.name || staffUser?.email || "Admin",
      metadata: {
        previousEventQuantity,
        nextEventQuantity: eventQuantity,
        confirmedQuantity,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    productId,
    sizeOptionId,
    remainingQuantity: Math.floor(remainingQuantity),
    eventQuantity,
    previousRemainingQuantity,
    message: "Event quantity updated.",
  });
}
