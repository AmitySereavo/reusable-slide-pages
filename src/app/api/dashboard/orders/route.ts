import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";

const fulfillmentStatuses = new Set([
  "PENDING",
  "PROCESSING",
  "READY",
  "FULFILLED",
  "CANCELED",
  "REFUNDED",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  const status = cleanText(value).toUpperCase();
  return fulfillmentStatuses.has(status) ? status : "";
}

function serializeMoney(value: unknown) {
  return Number(value ?? 0);
}

function serializeFulfillmentItem(item: any) {
  return {
    id: item.id,
    orderCode: item.orderCode,
    sourceType: item.sourceType,
    productTitle: item.productTitle,
    productSku: item.productSku,
    sku: item.sku,
    sizeLabel: item.sizeLabel,
    purchaseModeLabel: item.purchaseModeLabel,
    fulfillmentType: item.fulfillmentType,
    quantity: item.quantity,
    currencyCode: item.currencyCode,
    unitPrice: serializeMoney(item.unitPrice),
    lineTotal: serializeMoney(item.lineTotal),
    recipientName: item.recipientName,
    recipientEmail: item.recipientEmail,
    recipientRole: item.recipientRole,
    ticketCode: item.ticketCode,
    ticketAttendeeName: item.ticketAttendeeName,
    status: item.status,
    fulfillmentStatus: item.fulfillmentStatus,
    fulfillmentNotes: item.fulfillmentNotes,
    trackingReference: item.trackingReference,
    fulfilledAt: item.fulfilledAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    invitationOrder: item.invitationOrder
      ? {
          id: item.invitationOrder.id,
          orderCode: item.invitationOrder.orderCode,
          purchaserName: item.invitationOrder.purchaserName,
          purchaserEmail: item.invitationOrder.purchaserEmail,
          purchaserPhone: item.invitationOrder.purchaserPhone,
          status: item.invitationOrder.status,
          currencyCode: item.invitationOrder.currencyCode,
          grandTotal: serializeMoney(item.invitationOrder.grandTotal),
          deliverySelection: item.invitationOrder.deliverySelectionSnapshot,
          createdAt: item.invitationOrder.createdAt,
        }
      : null,
  };
}

function getOrderFulfillmentDelegate() {
  return (prisma as any).orderFulfillmentItem;
}

function buildOrderWhereSql({
  status,
  fulfillmentType,
  query,
}: {
  status?: string;
  fulfillmentType?: string;
  query?: string;
}) {
  const conditions: Prisma.Sql[] = [];

  if (status) {
    conditions.push(Prisma.sql`f."fulfillmentStatus" = ${status}`);
  }

  if (fulfillmentType) {
    conditions.push(Prisma.sql`f."fulfillmentType" = ${fulfillmentType}`);
  }

  if (query) {
    const likeQuery = `%${query}%`;
    conditions.push(Prisma.sql`(
      f."orderCode" ILIKE ${likeQuery}
      OR f."productTitle" ILIKE ${likeQuery}
      OR f."sku" ILIKE ${likeQuery}
      OR f."recipientName" ILIKE ${likeQuery}
      OR f."recipientEmail" ILIKE ${likeQuery}
    )`);
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

async function findFulfillmentItemsRaw({
  status,
  fulfillmentType,
  query,
}: {
  status?: string;
  fulfillmentType?: string;
  query?: string;
}) {
  const whereSql = buildOrderWhereSql({ status, fulfillmentType, query });

  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      f.*,
      CASE
        WHEN o."id" IS NULL THEN NULL
        ELSE json_build_object(
          'id', o."id",
          'orderCode', o."orderCode",
          'purchaserName', o."purchaserName",
          'purchaserEmail', o."purchaserEmail",
          'purchaserPhone', o."purchaserPhone",
          'status', o."status",
          'currencyCode', o."currencyCode",
          'grandTotal', o."grandTotal",
          'deliverySelectionSnapshot', o."deliverySelectionSnapshot",
          'createdAt', o."createdAt"
        )
      END AS "invitationOrder"
    FROM "OrderFulfillmentItem" f
    LEFT JOIN "InvitationOrder" o ON o."id" = f."invitationOrderId"
    ${whereSql}
    ORDER BY f."fulfillmentStatus" ASC, f."createdAt" DESC
    LIMIT 200
  `);
}

async function updateFulfillmentItemRaw({
  id,
  fulfillmentStatus,
  fulfillmentNotes,
  trackingReference,
  fulfilledAt,
}: {
  id: string;
  fulfillmentStatus: string;
  fulfillmentNotes: string | null;
  trackingReference: string | null;
  fulfilledAt: Date | null;
}) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH updated AS (
      UPDATE "OrderFulfillmentItem"
      SET
        "fulfillmentStatus" = ${fulfillmentStatus},
        "status" = ${fulfillmentStatus},
        "fulfillmentNotes" = ${fulfillmentNotes},
        "trackingReference" = ${trackingReference},
        "fulfilledAt" = ${fulfilledAt},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    )
    SELECT
      updated.*,
      CASE
        WHEN o."id" IS NULL THEN NULL
        ELSE json_build_object(
          'id', o."id",
          'orderCode', o."orderCode",
          'purchaserName', o."purchaserName",
          'purchaserEmail', o."purchaserEmail",
          'purchaserPhone', o."purchaserPhone",
          'status', o."status",
          'currencyCode', o."currencyCode",
          'grandTotal', o."grandTotal",
          'deliverySelectionSnapshot', o."deliverySelectionSnapshot",
          'createdAt', o."createdAt"
        )
      END AS "invitationOrder"
    FROM updated
    LEFT JOIN "InvitationOrder" o ON o."id" = updated."invitationOrderId"
  `);

  return rows[0] || null;
}

export async function GET(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const url = new URL(request.url);
    const status = normalizeStatus(url.searchParams.get("status"));
    const fulfillmentType = cleanText(url.searchParams.get("fulfillmentType"));
    const query = cleanText(url.searchParams.get("q"));

    const delegate = getOrderFulfillmentDelegate();
    const items = delegate?.findMany
      ? await delegate.findMany({
          where: {
            ...(status ? { fulfillmentStatus: status } : {}),
            ...(fulfillmentType ? { fulfillmentType } : {}),
            ...(query
              ? {
                  OR: [
                    { orderCode: { contains: query, mode: "insensitive" } },
                    { productTitle: { contains: query, mode: "insensitive" } },
                    { sku: { contains: query, mode: "insensitive" } },
                    { recipientName: { contains: query, mode: "insensitive" } },
                    { recipientEmail: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: [{ fulfillmentStatus: "asc" }, { createdAt: "desc" }],
          take: 200,
          include: {
            invitationOrder: true,
          },
        })
      : await findFulfillmentItemsRaw({ status, fulfillmentType, query });

    const summary = items.reduce(
      (acc: Record<string, number>, item: any) => {
        const key = item.fulfillmentStatus || "PENDING";
        acc[key] = (acc[key] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { total: 0 }
    );

    return NextResponse.json({
      items: items.map(serializeFulfillmentItem),
      summary,
      statuses: Array.from(fulfillmentStatuses),
    });
  } catch (error) {
    console.error("DASHBOARD ORDERS GET ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Orders could not be loaded.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const id = cleanText(body?.id);
    const fulfillmentStatus = normalizeStatus(body?.fulfillmentStatus);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Fulfillment item id is required." },
        { status: 400 }
      );
    }

    if (!fulfillmentStatus) {
      return NextResponse.json(
        { ok: false, error: "Choose a valid fulfillment status." },
        { status: 400 }
      );
    }

    const now = new Date();
    const fulfillmentNotes = cleanText(body?.fulfillmentNotes) || null;
    const trackingReference = cleanText(body?.trackingReference) || null;
    const fulfilledAt = fulfillmentStatus === "FULFILLED" ? now : null;
    const delegate = getOrderFulfillmentDelegate();
    const item = delegate?.update
      ? await delegate.update({
          where: { id },
          data: {
            fulfillmentStatus,
            status: fulfillmentStatus,
            fulfillmentNotes,
            trackingReference,
            fulfilledAt,
          },
          include: {
            invitationOrder: true,
          },
        })
      : await updateFulfillmentItemRaw({
          id,
          fulfillmentStatus,
          fulfillmentNotes,
          trackingReference,
          fulfilledAt,
        });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Order item was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: serializeFulfillmentItem(item),
    });
  } catch (error) {
    console.error("DASHBOARD ORDERS PATCH ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Order item could not be updated.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
