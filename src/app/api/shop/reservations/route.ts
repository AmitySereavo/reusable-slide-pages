import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ShopCart, ShopCartLine } from "@/types/questionnaire";

const DEFAULT_RESERVATION_SECONDS = 25;

type ReservationNotice = {
  type: "removed" | "adjusted";
  lineKey: string;
  productTitle?: string;
  sizeLabel?: string;
  requestedQuantity: number;
  availableQuantity: number;
  message: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const reservationKey = cleanText(body?.reservationKey);
  const catalogKey = normalizeCatalogKey(body?.catalogKey);
  const cart = normalizeIncomingCart(body?.cart);
  const expiresInSeconds = Math.max(
    5,
    Math.min(60 * 15, Math.floor(Number(body?.expiresInSeconds) || DEFAULT_RESERVATION_SECONDS))
  );

  if (!reservationKey) {
    return NextResponse.json(
      { error: "A reservation key is required." },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const notices: ReservationNotice[] = [];
  const adjustedCart: ShopCart = { ...cart };

  await prisma.$transaction(
    async (tx) => {
      await releaseExpiredReservations(tx);
      await releaseReservationKey(tx, reservationKey);

      for (const [lineKey, line] of Object.entries(cart)) {
        if (!line.selected || line.quantity <= 0) {
          continue;
        }

        const option = await tx.reusableShopSizeOption.findFirst({
          where: {
            optionId: line.sizeOptionId,
            product: {
              catalogKey,
              productId: line.productId,
            },
          },
          include: {
            product: true,
          },
        });

        if (!option) {
          continue;
        }

        const requestedQuantity = Math.max(1, Math.floor(line.quantity));
        const availableQuantity = Math.max(0, option.stockAvailable);
        const acceptedQuantity = Math.min(requestedQuantity, availableQuantity);

        if (acceptedQuantity <= 0) {
          adjustedCart[lineKey] = {
            ...line,
            selected: false,
            availabilityStatus: "unavailable",
            unavailableReason: "sold_out",
          };
          notices.push({
            type: "removed",
            lineKey,
            productTitle: option.product.title,
            sizeLabel: option.label,
            requestedQuantity,
            availableQuantity,
            message: `${option.product.title} ${option.label} was removed from cart because the purchasing window ran out and the item is sold out.`,
          });
          continue;
        }

        if (acceptedQuantity < requestedQuantity) {
          adjustedCart[lineKey] = {
            ...line,
            quantity: acceptedQuantity,
          };
          notices.push({
            type: "adjusted",
            lineKey,
            productTitle: option.product.title,
            sizeLabel: option.label,
            requestedQuantity,
            availableQuantity,
            message: `${option.product.title} ${option.label} has ${acceptedQuantity} available now. Please adjust your quantity before checkout.`,
          });
        }

        await tx.reusableShopSizeOption.update({
          where: {
            id: option.id,
          },
          data: {
            stockAvailable: {
              decrement: acceptedQuantity,
            },
            stockReserved: {
              increment: acceptedQuantity,
            },
          },
        });

        await tx.reusableShopInventoryReservation.create({
          data: {
            reservationKey,
            catalogKey,
            lineKey,
            sizeOptionId: option.id,
            quantity: acceptedQuantity,
            expiresAt,
          },
        });
      }
    },
    { timeout: 30000 }
  );

  return NextResponse.json({
    ok: true,
    cart: adjustedCart,
    notices,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const reservationKey = cleanText(url.searchParams.get("reservationKey"));

  if (!reservationKey) {
    return NextResponse.json(
      { error: "A reservation key is required." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await releaseReservationKey(tx, reservationKey);
    },
    { timeout: 30000 }
  );

  return NextResponse.json({ ok: true });
}

async function releaseExpiredReservations(tx: Prisma.TransactionClient) {
  const expired = await tx.reusableShopInventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  for (const reservation of expired) {
    await releaseReservation(tx, reservation);
  }
}

async function releaseReservationKey(
  tx: Prisma.TransactionClient,
  reservationKey: string
) {
  const reservations = await tx.reusableShopInventoryReservation.findMany({
    where: {
      reservationKey,
      status: "ACTIVE",
    },
  });

  for (const reservation of reservations) {
    await releaseReservation(tx, reservation);
  }
}

async function releaseReservation(
  tx: Prisma.TransactionClient,
  reservation: {
    id: string;
    sizeOptionId: string;
    quantity: number;
  }
) {
  await tx.reusableShopSizeOption.update({
    where: {
      id: reservation.sizeOptionId,
    },
    data: {
      stockAvailable: {
        increment: reservation.quantity,
      },
      stockReserved: {
        decrement: reservation.quantity,
      },
    },
  });

  await tx.reusableShopInventoryReservation.update({
    where: {
      id: reservation.id,
    },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
    },
  });
}

function normalizeIncomingCart(value: unknown): ShopCart {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const nextCart: ShopCart = {};

  for (const [lineKey, rawLine] of Object.entries(value)) {
    if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) {
      continue;
    }

    const line = rawLine as Partial<ShopCartLine>;

    if (
      typeof line.productId !== "string" ||
      typeof line.sizeOptionId !== "string"
    ) {
      continue;
    }

    nextCart[lineKey] = {
      productId: line.productId,
      sizeOptionId: line.sizeOptionId,
      selected: line.selected === true,
      quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
      availabilityStatus:
        line.availabilityStatus === "unavailable" ? "unavailable" : "available",
      unavailableReason:
        typeof line.unavailableReason === "string"
          ? line.unavailableReason
          : undefined,
      purchaseModeId:
        typeof line.purchaseModeId === "string"
          ? line.purchaseModeId
          : undefined,
      bundledFromLineKey:
        typeof line.bundledFromLineKey === "string"
          ? line.bundledFromLineKey
          : undefined,
      bundledByPurchaseModeId:
        typeof line.bundledByPurchaseModeId === "string"
          ? line.bundledByPurchaseModeId
          : undefined,
      lockedQuantity: line.lockedQuantity === true,
      lockedPurchaseMode: line.lockedPurchaseMode === true,
      purchaseRecipients: Array.isArray(line.purchaseRecipients)
        ? line.purchaseRecipients
        : undefined,
    };
  }

  return nextCart;
}

function normalizeCatalogKey(value: unknown) {
  const key = cleanText(value) ?? "musicMerch";

  if (key === "shopCatalog") return "invitationTickets";
  if (key === "musicMerchShopCatalog") return "musicMerch";
  if (key === "ticketAddOnCatalog") return "ticketAddOns";
  if (key === "orderCatalog") return "invitationOrder";

  return key;
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
