import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";
import { createLittleOrchardOrderActivity } from "@/lib/plantShop/orderActivity";
import { makeReceiptCode } from "@/lib/plantShop/receiptCodes";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanFulfillmentNotes(value: string | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim().toLowerCase();

      return (
        normalized !== "payment status: awaiting_payment" &&
        normalized !== "inventory applied: no"
      );
    })
    .join("\n");
}

function getVariationLimit(productId: string | null, sizeOptionId: string | null) {
  const sizeOption = littleOrchardShopCatalog.products
    .find((product) => product.id === productId)
    ?.sizeOptions.find((option) => option.id === sizeOptionId);
  const limit = Number(sizeOption?.metadata?.eventQuantityAvailable ?? 0);

  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
}

const paymentMethodLabels = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  remittance: "Remittance",
  other: "Other",
} as const;

function getPaymentMethod(value: unknown) {
  const raw = cleanText(value);

  return raw in paymentMethodLabels
    ? (raw as keyof typeof paymentMethodLabels)
    : null;
}

function normalizeNonNegativeMoney(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : null;
}

async function getConfirmedQuantity(productId: string | null, sizeOptionId: string | null) {
  const rows = await prisma.$queryRaw<Array<{ total: bigint | number | null }>>(
    Prisma.sql`
      SELECT COALESCE(SUM("quantity"), 0) AS total
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
        AND "productId" = ${productId}
        AND "sizeOptionId" = ${sizeOptionId}
        AND "metadata"->>'paymentStatus' = 'PAYMENT_CONFIRMED'
        AND "metadata"->>'inventoryApplied' = 'true'
        AND COALESCE("purchaseModeId", '') <> 'nursery-stock-request'
    `
  );

  return Number(rows[0]?.total ?? 0);
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();

  if (guard.response) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  const orderCode = cleanText(body?.orderCode);
  const paymentMethod = getPaymentMethod(body?.paymentMethod);
  const cashTendered =
    paymentMethod === "cash" ? normalizeNonNegativeMoney(body?.cashTendered) : null;

  if (!orderCode) {
    return NextResponse.json(
      { ok: false, error: "Order code is required." },
      { status: 400 }
    );
  }

  const items = await prisma.orderFulfillmentItem.findMany({
    where: {
      sourceType: "little-orchard-shop",
      orderCode,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (!items.length) {
    return NextResponse.json(
      { ok: false, error: "Little Orchard order was not found." },
      { status: 404 }
    );
  }

  const firstMetadata = readMetadata(items[0].metadata);
  const receiptCode = cleanText(firstMetadata.receiptCode) || makeReceiptCode(orderCode);
  const receiptLink =
    cleanText(firstMetadata.receiptLink) ||
    cleanText(firstMetadata.orderStatusLink)?.replace("/order-status/", "/receipt/") ||
    "";
  const now = new Date();
  const staffUser = guard.session?.user;
  const staffUserId = staffUser?.id || null;
  const staffUserName = staffUser?.name || staffUser?.email || "Admin";

  if (!paymentMethod) {
    return NextResponse.json(
      { ok: false, error: "Choose the payment method before confirming." },
      { status: 400 }
    );
  }

  const orderTotal = items.reduce(
    (sum, item) => sum + Number(item.lineTotal || 0),
    0
  );

  if (paymentMethod === "cash" && cashTendered !== null && cashTendered < orderTotal) {
    return NextResponse.json(
      {
        ok: false,
        error: "Cash received is less than the order total.",
      },
      { status: 400 }
    );
  }

  const changeDue =
    paymentMethod === "cash" && cashTendered !== null
      ? Math.round((cashTendered - orderTotal) * 100) / 100
      : null;

  if (
    firstMetadata.paymentStatus === "PAYMENT_CONFIRMED" &&
    firstMetadata.inventoryApplied === true
  ) {
    return NextResponse.json({
      ok: true,
      orderCode,
      alreadyConfirmed: true,
      message: "Payment was already confirmed for this order.",
    });
  }

  const conflicts = [];

  for (const item of items) {
    if (item.purchaseModeId === "nursery-stock-request") {
      continue;
    }

    const limit = getVariationLimit(item.productId, item.sizeOptionId);
    const confirmedQuantity = await getConfirmedQuantity(
      item.productId,
      item.sizeOptionId
    );
    const available = Math.max(0, limit - confirmedQuantity);

    if (limit > 0 && item.quantity > available) {
      conflicts.push({
        productTitle: item.productTitle,
        variation: item.sizeLabel,
        orderedQuantity: item.quantity,
        availableQuantity: available,
        unavailableQuantity: item.quantity - available,
      });
    }
  }

  if (conflicts.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Inventory changed before payment could be confirmed.",
        conflicts,
      },
      { status: 409 }
    );
  }

  const inventoryTransactionId = `lo-inventory-${orderCode}-${now.getTime()}`;

  await prisma.$transaction(async (tx) => {
    for (const [index, item] of items.entries()) {
      const metadata = readMetadata(item.metadata);
      const previousStatus = cleanText(item.fulfillmentStatus) || "PENDING";
      const nextMetadata = {
        ...metadata,
        paymentStatus: "PAYMENT_CONFIRMED",
        paymentMethod,
        paymentMethodLabel: paymentMethodLabels[paymentMethod],
        orderTotal,
        receiptCode,
        receiptLink,
        ...(paymentMethod === "cash" && cashTendered !== null
          ? {
              cashTendered,
              changeDue,
            }
          : {}),
        paymentConfirmedAt: now.toISOString(),
        paymentConfirmedBy: staffUserId,
        paymentConfirmedByName: staffUserName,
        inventoryApplied: true,
        inventoryAppliedAt: now.toISOString(),
        inventoryAppliedBy: staffUserId,
        inventoryAppliedByName: staffUserName,
        inventoryTransactionId,
      };

      await tx.orderFulfillmentItem.update({
        where: { id: item.id },
        data: {
          status: "PROCESSING",
          fulfillmentStatus: "PROCESSING",
          fulfillmentNotes: cleanFulfillmentNotes(item.fulfillmentNotes),
          currentStageKey: "payment-confirmed",
          currentStageLabel: "Payment confirmed",
          metadata: nextMetadata as Prisma.InputJsonObject,
        },
      });

      if (index === 0) {
        await createLittleOrchardOrderActivity(tx as any, {
          fulfillmentItemId: item.id,
          orderCode,
          stageKey: "payment-confirmed",
          stageLabel: "Payment confirmed",
          updateType: "manual",
          source: "Cashier",
          staffUserId,
          staffUserName,
          previousStatus,
          nextStatus: "PROCESSING",
          notes: [
            `Payment confirmed. Method: ${paymentMethodLabels[paymentMethod]}.`,
            paymentMethod === "cash" && cashTendered !== null
              ? `Cash received: ${cashTendered}. Change returned: ${changeDue}.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
          metadata: {
            orderActivityKey: `${orderCode}:payment-confirmed`,
            paymentMethod,
            paymentMethodLabel: paymentMethodLabels[paymentMethod],
            orderTotal,
            cashTendered,
            changeDue,
          },
        });
      }
    }
  });

  return NextResponse.json({
    ok: true,
    orderCode,
    inventoryTransactionId,
    paymentMethod,
    paymentMethodLabel: paymentMethodLabels[paymentMethod],
    orderTotal,
    cashTendered,
    changeDue,
    message: "Payment confirmed and inventory marked as applied.",
  });
}
