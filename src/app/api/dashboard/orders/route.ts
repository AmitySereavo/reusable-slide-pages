import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import { createLittleOrchardOrderActivity } from "@/lib/plantShop/orderActivity";
import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";

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

function hasDeleteConfirmation(value: unknown) {
  return cleanText(value).toLowerCase() === "delete";
}

function normalizeStatus(value: unknown) {
  const status = cleanText(value).toUpperCase();
  return fulfillmentStatuses.has(status) ? status : "";
}

function serializeMoney(value: unknown) {
  return Number(value ?? 0);
}

function normalizePositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeNonNegativeMoney(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : 0;
}

function serializeActivity(activity: any) {
  return {
    id: activity.id,
    stageKey: activity.stageKey,
    stageLabel: activity.stageLabel,
    updateType: activity.updateType,
    source: activity.source,
    staffUserId: activity.staffUserId,
    staffUserName: activity.staffUserName,
    completedAt: activity.completedAt,
    notes: activity.notes,
    photos: activity.photos,
    documents: activity.documents,
    metadata: activity.metadata,
    createdAt: activity.createdAt,
  };
}

function activityTimestampBucket(activity: any) {
  const date = activity.completedAt || activity.createdAt;
  const timestamp = date ? new Date(date).getTime() : 0;

  if (!Number.isFinite(timestamp) || timestamp <= 0) return "unknown";

  return String(Math.floor(timestamp / 2000));
}

function isOrderAwareActivity(activity: any) {
  const metadata = readSnapshotObject(activity.metadata);

  return Boolean(
    cleanText(metadata.orderActivityKey) ||
      metadata.customerVisible !== undefined ||
      cleanText(metadata.customerTitle)
  );
}

function serializeActivities(value: unknown) {
  const activities = readSnapshotArray(value);
  const byStageMoment = new Map<string, any>();

  for (const activity of activities) {
    const key = [
      cleanText(activity.stageKey) || cleanText(activity.stageLabel),
      activityTimestampBucket(activity),
    ].join("|");
    const existing = byStageMoment.get(key);

    if (!existing || isOrderAwareActivity(activity)) {
      byStageMoment.set(key, activity);
    }
  }

  return Array.from(byStageMoment.values()).map(serializeActivity);
}

function serializeFulfillmentItem(item: any) {
  const selectedCourier = item.selectedCourier
    ? {
        id: item.selectedCourier.id,
        courierKey: item.selectedCourier.courierKey,
        name: item.selectedCourier.name,
        contactInfo: item.selectedCourier.contactInfo,
        trackingUrlTemplate: item.selectedCourier.trackingUrlTemplate,
      }
    : null;

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
    selectedCourierId: item.selectedCourierId,
    selectedCourierName: item.selectedCourierName,
    selectedCourier,
    courierContactInfo: item.courierContactInfo,
    shippingMethod: item.shippingMethod,
    currentStageKey: item.currentStageKey,
    currentStageLabel: item.currentStageLabel,
    estimatedDeliveryAt: item.estimatedDeliveryAt,
    estimatedRemainingSeconds: item.estimatedRemainingSeconds,
    activities: serializeActivities(item.activities),
    metadata: item.metadata ?? null,
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

function readSnapshotArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readSnapshotObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeInvitationMailingAddress(value: unknown) {
  const record = readSnapshotObject(value);
  const address = {
    addressLine1: cleanText(record.addressLine1),
    addressLine2: cleanText(record.addressLine2),
    city: cleanText(record.city),
    region: cleanText(record.region),
    postalCode: cleanText(record.postalCode),
    country: cleanText(record.country),
  };

  return Object.values(address).some(Boolean) ? address : null;
}

function getBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");

  return origin ? origin.replace(/\/+$/, "") : "http://localhost:3000";
}

function buildHtmlFromText(text: string) {
  return String(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOrderDetailsForMailingRequest(item: any) {
  const metadata = readSnapshotObject(item.metadata);
  const attendees = readSnapshotArray(metadata.attendees)
    .map((attendee: any) => cleanText(readSnapshotObject(attendee).name))
    .filter(Boolean);

  return [
    cleanText(item.productTitle),
    cleanText(item.sizeLabel),
    attendees.length ? `Attendees: ${attendees.join(", ")}` : "",
    cleanText(item.ticketCode) ? `Ticket: ${cleanText(item.ticketCode)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function serializeInvitationOrderSummary(order: any) {
  const resolvedLines = readSnapshotArray(order.resolvedLinesSnapshot);
  const assignmentSnapshots = readSnapshotArray(
    order.ticketAssignmentsSnapshot
  );
  const ticketRecipients = readSnapshotArray(order.ticketRecipients).map(
    (ticket: any, index) => {
      const assignmentSnapshot = readSnapshotObject(
        assignmentSnapshots.find(
          (assignment: any) =>
            assignment?.ticketCode === ticket.ticketCode ||
            Number(assignment?.ticketIndex ?? -1) === Number(ticket.ticketIndex)
        ) ?? assignmentSnapshots[index]
      );
      const mailingAddress =
        normalizeInvitationMailingAddress(ticket.invitationMailingAddress) ??
        normalizeInvitationMailingAddress(
          assignmentSnapshot.invitationMailingAddress
        );

      return {
      ticketCode: ticket.ticketCode,
      ticketLabel: ticket.ticketLabel || ticket.sizeLabel || "Ticket",
      productTitle: ticket.productTitle,
      sizeLabel: ticket.sizeLabel,
      purchaseModeLabel: ticket.purchaseModeLabel,
      invitationDeliveryMode:
        mailingAddress || ticket.purchaseModeId === "physical-invitation"
          ? "physical"
          : "digital",
      invitationMailingAddress: mailingAddress,
      ownerName: ticket.ownerName,
      ownerEmail: ticket.ownerEmail,
      ownerPhone: ticket.ownerPhone,
      ticketOwnerPaymentMode: ticket.ticketOwnerPaymentMode,
      ticketOwnerAddonBudget: serializeMoney(ticket.ticketOwnerAddonBudget),
      status: ticket.status,
      mealMode: ticket.mealMode,
      mealLabel: ticket.mealLabel,
      mealSelection: ticket.mealSelection,
      wantsExtraFood: ticket.wantsExtraFood,
      hasMealNotes: ticket.hasMealNotes,
      mealNotes: ticket.mealNotes,
      portalEmailSentAt: ticket.portalEmailSentAt,
      portalLastAccessAt: ticket.portalLastAccessAt,
      };
    }
  );
  const ticketCount = Number(order.ticketCount ?? order._count?.tickets ?? 0);
  const firstLine = resolvedLines.find(
    (line) => line && typeof line === "object" && !Array.isArray(line)
  ) as Record<string, unknown> | undefined;
  const productTitle =
    cleanText(firstLine?.productTitle) ||
    cleanText(firstLine?.sizeLabel) ||
    (ticketCount > 0 ? "Ticket order" : "Submitted order");

  return {
    id: `order:${order.id}`,
    orderId: order.id,
    orderCode: order.orderCode,
    sourceType: "invitation-order-summary",
    productTitle,
    productSku: null,
    sku: null,
    sizeLabel:
      ticketCount > 0
        ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}`
        : `${resolvedLines.length} item${resolvedLines.length === 1 ? "" : "s"}`,
    purchaseModeLabel: "Submitted cart",
    fulfillmentType: ticketCount > 0 ? "ticket" : "order",
    quantity: ticketCount || resolvedLines.length || 1,
    currencyCode: order.currencyCode || "USD",
    unitPrice: serializeMoney(order.grandTotal),
    lineTotal: serializeMoney(order.grandTotal),
    recipientName: order.purchaserName,
    recipientEmail: order.purchaserEmail,
    recipientRole: "purchaser",
    ticketCode: null,
    ticketAttendeeName: null,
    ticketRecipients,
    status: order.status,
    fulfillmentStatus: order.status,
    fulfillmentNotes: null,
    trackingReference: null,
    fulfilledAt: null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    invitationOrder: {
      id: order.id,
      orderCode: order.orderCode,
      purchaserName: order.purchaserName,
      purchaserEmail: order.purchaserEmail,
      purchaserPhone: order.purchaserPhone,
      status: order.status,
      currencyCode: order.currencyCode,
      grandTotal: serializeMoney(order.grandTotal),
      deliverySelection: order.deliverySelectionSnapshot,
      createdAt: order.createdAt,
    },
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
        WHEN c."id" IS NULL THEN NULL
        ELSE json_build_object(
          'id', c."id",
          'courierKey', c."courierKey",
          'name', c."name",
          'contactInfo', c."contactInfo",
          'trackingUrlTemplate', c."trackingUrlTemplate"
        )
      END AS "selectedCourier",
      COALESCE(a."activities", '[]'::json) AS "activities",
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
    LEFT JOIN "FulfillmentCourier" c ON c."id" = f."selectedCourierId"
    LEFT JOIN (
      SELECT
        "fulfillmentItemId",
        json_agg(
          json_build_object(
            'id', "id",
            'stageKey', "stageKey",
            'stageLabel', "stageLabel",
            'updateType', "updateType",
            'source', "source",
            'staffUserId', "staffUserId",
            'staffUserName', "staffUserName",
            'completedAt', "completedAt",
            'notes', "notes",
            'photos', "photos",
            'documents', "documents",
            'metadata', "metadata",
            'createdAt', "createdAt"
          )
          ORDER BY "completedAt" DESC, "createdAt" DESC
        ) AS "activities"
      FROM "OrderFulfillmentActivity"
      GROUP BY "fulfillmentItemId"
    ) a ON a."fulfillmentItemId" = f."id"
    ${whereSql}
    ORDER BY f."fulfillmentStatus" ASC, f."createdAt" DESC
    LIMIT 200
  `);
}

function buildInvitationOrderWhereSql({
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
    conditions.push(Prisma.sql`o."status" = ${status}`);
  }

  if (fulfillmentType === "ticket") {
    conditions.push(Prisma.sql`t."ticketCount" > 0`);
  } else if (fulfillmentType === "order") {
    conditions.push(Prisma.sql`t."ticketCount" = 0`);
  } else if (fulfillmentType === "digital" || fulfillmentType === "physical") {
    return Prisma.sql`WHERE FALSE`;
  }

  if (query) {
    const likeQuery = `%${query}%`;
    conditions.push(Prisma.sql`(
      o."orderCode" ILIKE ${likeQuery}
      OR o."purchaserName" ILIKE ${likeQuery}
      OR o."purchaserEmail" ILIKE ${likeQuery}
      OR CAST(o."resolvedLinesSnapshot" AS TEXT) ILIKE ${likeQuery}
      OR EXISTS (
        SELECT 1
        FROM "InvitationOrderTicket" search_ticket
        WHERE search_ticket."orderId" = o."id"
          AND (
            search_ticket."ticketCode" ILIKE ${likeQuery}
            OR search_ticket."ownerName" ILIKE ${likeQuery}
            OR search_ticket."ownerEmail" ILIKE ${likeQuery}
            OR search_ticket."ownerPhone" ILIKE ${likeQuery}
            OR search_ticket."ticketLabel" ILIKE ${likeQuery}
            OR search_ticket."sizeLabel" ILIKE ${likeQuery}
          )
      )
    )`);
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

async function findInvitationOrderSummariesRaw({
  status,
  fulfillmentType,
  query,
}: {
  status?: string;
  fulfillmentType?: string;
  query?: string;
}) {
  const whereSql = buildInvitationOrderWhereSql({
    status,
    fulfillmentType,
    query,
  });

  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      o.*,
      COALESCE(t."ticketCount", 0) AS "ticketCount",
      COALESCE(t."ticketRecipients", '[]'::json) AS "ticketRecipients"
    FROM "InvitationOrder" o
    LEFT JOIN (
      SELECT
        "orderId",
        COUNT(*)::int AS "ticketCount",
        json_agg(
          json_build_object(
            'ticketCode', "ticketCode",
            'ticketLabel', "ticketLabel",
            'productTitle', "productTitle",
            'sizeLabel', "sizeLabel",
            'purchaseModeLabel', "purchaseModeLabel",
            'purchaseModeId', "purchaseModeId",
            'ticketIndex', "ticketIndex",
            'invitationMailingAddress', "invitationMailingAddress",
            'ownerName', "ownerName",
            'ownerEmail', "ownerEmail",
            'ownerPhone', "ownerPhone",
            'ticketOwnerPaymentMode', "ticketOwnerPaymentMode",
            'ticketOwnerAddonBudget', "ticketOwnerAddonBudget",
            'status', "status",
            'mealMode', "mealMode",
            'mealLabel', "mealLabel",
            'mealSelection', "mealSelection",
            'wantsExtraFood', "wantsExtraFood",
            'hasMealNotes', "hasMealNotes",
            'mealNotes', "mealNotes",
            'portalEmailSentAt', "portalEmailSentAt",
            'portalLastAccessAt', "portalLastAccessAt"
          )
          ORDER BY "ticketIndex" ASC, "createdAt" ASC
        ) AS "ticketRecipients"
      FROM "InvitationOrderTicket"
      GROUP BY "orderId"
    ) t ON t."orderId" = o."id"
    ${whereSql}
    ORDER BY o."createdAt" DESC
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
        "currentStageKey" = ${fulfillmentStatus.toLowerCase().replace(/[^a-z0-9]+/g, "-")},
        "currentStageLabel" = ${fulfillmentStatus},
        "fulfilledAt" = ${fulfilledAt},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    )
    SELECT
      updated.*,
      CASE
        WHEN c."id" IS NULL THEN NULL
        ELSE json_build_object(
          'id', c."id",
          'courierKey', c."courierKey",
          'name', c."name",
          'contactInfo', c."contactInfo",
          'trackingUrlTemplate', c."trackingUrlTemplate"
        )
      END AS "selectedCourier",
      COALESCE(a."activities", '[]'::json) AS "activities",
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
    LEFT JOIN "FulfillmentCourier" c ON c."id" = updated."selectedCourierId"
    LEFT JOIN (
      SELECT
        "fulfillmentItemId",
        json_agg(
          json_build_object(
            'id', "id",
            'stageKey', "stageKey",
            'stageLabel', "stageLabel",
            'updateType', "updateType",
            'source', "source",
            'staffUserId', "staffUserId",
            'staffUserName', "staffUserName",
            'completedAt', "completedAt",
            'notes', "notes",
            'photos', "photos",
            'documents', "documents",
            'metadata', "metadata",
            'createdAt', "createdAt"
          )
          ORDER BY "completedAt" DESC, "createdAt" DESC
        ) AS "activities"
      FROM "OrderFulfillmentActivity"
      GROUP BY "fulfillmentItemId"
    ) a ON a."fulfillmentItemId" = updated."id"
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
    const fulfillmentItems = delegate?.findMany
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
            selectedCourier: true,
            activities: {
              orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
              take: 20,
            },
          },
        })
      : await findFulfillmentItemsRaw({ status, fulfillmentType, query });
    const orderSummaries = await findInvitationOrderSummariesRaw({
      status,
      fulfillmentType,
      query,
    });
    const items = [
      ...orderSummaries.map(serializeInvitationOrderSummary),
      ...fulfillmentItems.map(serializeFulfillmentItem),
    ].sort(
      (first, second) =>
        new Date(second.createdAt ?? 0).getTime() -
        new Date(first.createdAt ?? 0).getTime()
    );

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
      items,
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

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const action = cleanText(body?.action);
    const id = cleanText(body?.id);

    if (
      action !== "request-mailing-address-update" &&
      action !== "send-little-orchard-customer-email" &&
      action !== "add-little-orchard-catalog-order-item" &&
      action !== "add-little-orchard-order-item" &&
      action !== "remove-little-orchard-order-item" &&
      action !== "delete-little-orchard-order" &&
      action !== "update-little-orchard-payment-allocations" &&
      action !== "update-little-orchard-customer-phone" &&
      action !== "update-little-orchard-customer-contact"
    ) {
      return NextResponse.json(
        { ok: false, error: "Unknown order action." },
        { status: 400 }
      );
    }

    if (
      !id &&
      action !== "add-little-orchard-order-item" &&
      action !== "add-little-orchard-catalog-order-item"
    ) {
      return NextResponse.json(
        { ok: false, error: "Fulfillment item id is required." },
        { status: 400 }
      );
    }

    if (action === "add-little-orchard-catalog-order-item") {
      const orderCode = cleanText(body?.orderCode);
      const productId = cleanText(body?.productId);
      const sizeOptionId = cleanText(body?.sizeOptionId);
      const quantity = normalizePositiveInteger(body?.quantity, 1);
      const product = littleOrchardShopCatalog.products.find(
        (item) => item.id === productId
      );
      const sizeOption = product?.sizeOptions.find(
        (item) => item.id === sizeOptionId
      );

      if (!orderCode) {
        return NextResponse.json(
          { ok: false, error: "Order code is required." },
          { status: 400 }
        );
      }

      if (!product || !sizeOption) {
        return NextResponse.json(
          { ok: false, error: "Choose a valid Little Orchard shop item." },
          { status: 400 }
        );
      }

      const existingItems = await prisma.orderFulfillmentItem.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
        orderBy: [{ createdAt: "asc" }],
      });

      if (!existingItems.length) {
        return NextResponse.json(
          { ok: false, error: "Little Orchard order was not found." },
          { status: 404 }
        );
      }

      const firstItem = existingItems[0];
      const firstMetadata = readSnapshotObject(firstItem.metadata);
      const now = new Date();
      const staffUser = guard.session?.user;
      const staffUserId = staffUser?.id || null;
      const staffUserName =
        staffUser?.name || staffUser?.email || "Admin";
      const unitPrice = normalizeNonNegativeMoney(sizeOption.price);
      const lineTotal = unitPrice * quantity;
      const sku = sizeOption.sku || product.sku || `${product.id}-${sizeOption.id}`;
      const metadata = {
        ...firstMetadata,
        paymentStatus:
          cleanText(firstMetadata.paymentStatus) || "AWAITING_PAYMENT",
        inventoryApplied: firstMetadata.inventoryApplied === true,
        addedFromDashboard: true,
        addedFromShopCatalog: true,
        addedBy: staffUserId,
        addedByName: staffUserName,
        addedAt: now.toISOString(),
      };

      const createdItem = await prisma.orderFulfillmentItem.create({
        data: {
          sourceType: "little-orchard-shop",
          sourceId: orderCode,
          orderCode,
          lineKey: `dashboard-catalog:${sku}:${now.getTime()}`,
          productId: product.id,
          productSku: product.sku || null,
          productTitle: product.title,
          sizeOptionId: sizeOption.id,
          sizeSku: sizeOption.sku || null,
          sizeLabel: sizeOption.label,
          purchaseModeId: "dashboard-catalog",
          purchaseModeLabel: "Added from shop",
          sku,
          fulfillmentType: product.fulfillmentType || "physical",
          quantity,
          currencyCode:
            littleOrchardShopCatalog.currencyCode ||
            firstItem.currencyCode ||
            "JMD",
          unitPrice: new Prisma.Decimal(unitPrice),
          lineTotal: new Prisma.Decimal(lineTotal),
          recipientName: firstItem.recipientName,
          recipientEmail: firstItem.recipientEmail,
          recipientRole: firstItem.recipientRole,
          status: firstItem.status || "PENDING",
          fulfillmentStatus: firstItem.fulfillmentStatus || "PENDING",
          currentStageKey: firstItem.currentStageKey,
          currentStageLabel: firstItem.currentStageLabel,
          metadata: metadata as Prisma.InputJsonObject,
        },
        include: {
          invitationOrder: true,
          selectedCourier: true,
          activities: {
            orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
            take: 20,
          },
        },
      });

      await createLittleOrchardOrderActivity(prisma as any, {
        fulfillmentItemId: createdItem.id,
        orderCode,
        stageKey: "dashboard-catalog-item-added",
        stageLabel: "Shop item added",
        updateType: "manual",
        source: "orders-dashboard",
        staffUserId,
        staffUserName,
        previousStatus: firstItem.fulfillmentStatus || "PENDING",
        nextStatus: createdItem.fulfillmentStatus,
        notes: `${product.title} - ${sizeOption.label} added to order from the shop catalog.`,
        metadata: {
          orderActivityKey: `${orderCode}:dashboard-catalog-item-added:${createdItem.id}`,
          customerVisible: true,
          customerTitle: "Item added",
          customerDescription:
            "An additional shop item was added to this order.",
        },
      });

      return NextResponse.json({
        ok: true,
        item: serializeFulfillmentItem(createdItem),
        message: "Shop item added to the order.",
      });
    }

    if (action === "add-little-orchard-order-item") {
      const orderCode = cleanText(body?.orderCode);
      const productTitle = cleanText(body?.productTitle);
      const sizeLabel = cleanText(body?.sizeLabel);
      const quantity = normalizePositiveInteger(body?.quantity, 1);
      const unitPrice = normalizeNonNegativeMoney(body?.unitPrice);

      if (!orderCode) {
        return NextResponse.json(
          { ok: false, error: "Order code is required." },
          { status: 400 }
        );
      }

      if (!productTitle) {
        return NextResponse.json(
          { ok: false, error: "Item name is required." },
          { status: 400 }
        );
      }

      const existingItems = await prisma.orderFulfillmentItem.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
        orderBy: [{ createdAt: "asc" }],
      });

      if (!existingItems.length) {
        return NextResponse.json(
          { ok: false, error: "Little Orchard order was not found." },
          { status: 404 }
        );
      }

      const firstItem = existingItems[0];
      const firstMetadata = readSnapshotObject(firstItem.metadata);
      const now = new Date();
      const staffUser = guard.session?.user;
      const staffUserId = staffUser?.id || null;
      const staffUserName =
        staffUser?.name || staffUser?.email || "Admin";
      const lineTotal = unitPrice * quantity;
      const sku = `LO-ADHOC-${now.getTime()}`;
      const orderStatusLink = cleanText(firstMetadata.orderStatusLink);
      const cashierLink = cleanText(firstMetadata.cashierLink);
      const metadata = {
        ...firstMetadata,
        paymentStatus:
          cleanText(firstMetadata.paymentStatus) || "AWAITING_PAYMENT",
        inventoryApplied: firstMetadata.inventoryApplied === true,
        adHocDashboardItem: true,
        addedFromDashboard: true,
        addedBy: staffUserId,
        addedByName: staffUserName,
        addedAt: now.toISOString(),
        cashierLink,
        orderStatusLink,
      };

      const createdItem = await prisma.orderFulfillmentItem.create({
        data: {
          sourceType: "little-orchard-shop",
          sourceId: orderCode,
          orderCode,
          lineKey: `dashboard-ad-hoc:${sku}`,
          productId: `dashboard-ad-hoc-${sku.toLowerCase()}`,
          productSku: sku,
          productTitle,
          sizeOptionId: null,
          sizeSku: null,
          sizeLabel: sizeLabel || "Dashboard item",
          purchaseModeId: "dashboard-ad-hoc",
          purchaseModeLabel: "Added item",
          sku,
          fulfillmentType: "physical",
          quantity,
          currencyCode: firstItem.currencyCode || "JMD",
          unitPrice: new Prisma.Decimal(unitPrice),
          lineTotal: new Prisma.Decimal(lineTotal),
          recipientName: firstItem.recipientName,
          recipientEmail: firstItem.recipientEmail,
          recipientRole: firstItem.recipientRole,
          status: firstItem.status || "PENDING",
          fulfillmentStatus: firstItem.fulfillmentStatus || "PENDING",
          currentStageKey: firstItem.currentStageKey,
          currentStageLabel: firstItem.currentStageLabel,
          metadata: metadata as Prisma.InputJsonObject,
        },
        include: {
          invitationOrder: true,
          selectedCourier: true,
          activities: {
            orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
            take: 20,
          },
        },
      });

      await createLittleOrchardOrderActivity(prisma as any, {
        fulfillmentItemId: createdItem.id,
        orderCode,
        stageKey: "dashboard-item-added",
        stageLabel: "Item added",
        updateType: "manual",
        source: "orders-dashboard",
        staffUserId,
        staffUserName,
        previousStatus: firstItem.fulfillmentStatus || "PENDING",
        nextStatus: createdItem.fulfillmentStatus,
        notes: `${productTitle} added to order from the dashboard.`,
        metadata: {
          orderActivityKey: `${orderCode}:dashboard-item-added:${createdItem.id}`,
          customerVisible: true,
          customerTitle: "Item added",
          customerDescription:
            "An additional item was added to this order at the event.",
        },
      });

      return NextResponse.json({
        ok: true,
        item: serializeFulfillmentItem(createdItem),
        message: "Item added to the order.",
      });
    }

    const delegate = getOrderFulfillmentDelegate();
    const item = delegate?.findUnique
      ? await delegate.findUnique({
          where: { id },
          include: {
            invitationOrder: true,
          },
        })
      : null;

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Order item was not found." },
        { status: 404 }
      );
    }

    if (action === "delete-little-orchard-order") {
      if (item.sourceType !== "little-orchard-shop" || !item.orderCode) {
        return NextResponse.json(
          {
            ok: false,
            error: "Order deletion is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      if (!hasDeleteConfirmation(body?.confirmation)) {
        return NextResponse.json(
          { ok: false, error: "Type delete to confirm this action." },
          { status: 400 }
        );
      }

      const result = await delegate.deleteMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode: item.orderCode,
        },
      });

      return NextResponse.json({
        ok: true,
        deletedOrderCode: item.orderCode,
        deletedItemCount: result.count,
        message: `Order ${item.orderCode} and its receipt record were deleted.`,
      });
    }

    if (action === "remove-little-orchard-order-item") {
      if (item.sourceType !== "little-orchard-shop") {
        return NextResponse.json(
          {
            ok: false,
            error: "Item removal is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      if (!hasDeleteConfirmation(body?.confirmation)) {
        return NextResponse.json(
          { ok: false, error: "Type delete to confirm this action." },
          { status: 400 }
        );
      }

      const metadata = readSnapshotObject(item.metadata);

      if (cleanText(metadata.paymentStatus) === "PAYMENT_CONFIRMED") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Payment is already confirmed. Adjust the order manually before removing receipt items.",
          },
          { status: 400 }
        );
      }

      await delegate.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
        removedItemId: id,
        message: "Item removed from the order and receipt.",
      });
    }

    if (action === "update-little-orchard-customer-phone") {
      if (item.sourceType !== "little-orchard-shop") {
        return NextResponse.json(
          {
            ok: false,
            error: "Customer phone editing is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      const nextPhone = cleanText(body?.phone).replace(/[^\d+]/g, "");

      if (!nextPhone) {
        return NextResponse.json(
          { ok: false, error: "Enter the customer phone number." },
          { status: 400 }
        );
      }

      if (nextPhone.replace(/\D/g, "").length < 10) {
        return NextResponse.json(
          { ok: false, error: "Enter a phone number with at least 10 digits." },
          { status: 400 }
        );
      }

      const orderCode = cleanText(item.orderCode);
      const orderItems = await delegate.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
      });

      await Promise.all(
        orderItems.map((orderItem: any) => {
          const metadata = readSnapshotObject(orderItem.metadata);

          return delegate.update({
            where: { id: orderItem.id },
            data: {
              metadata: {
                ...metadata,
                customerPhoneNumber: nextPhone,
                customerWhatsappNumber: nextPhone,
                customerPhoneUpdatedAt: new Date().toISOString(),
                customerPhoneUpdatedBy:
                  guard.session?.user?.name || guard.session?.user?.email || "Admin",
              } as Prisma.InputJsonObject,
            },
          });
        })
      );

      return NextResponse.json({
        ok: true,
        message: "Customer phone number updated.",
      });
    }

    if (action === "update-little-orchard-customer-contact") {
      if (item.sourceType !== "little-orchard-shop") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Customer contact editing is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      const contact = body?.contact || {};
      const nextName = cleanText(contact.name);
      const nextPhone = cleanText(contact.phone).replace(/[^\d+]/g, "");
      const nextEmail = cleanText(contact.email).toLowerCase();
      const nextContactMethod =
        cleanText(contact.contactMethod) ||
        cleanText(item.metadata?.plantShopContactMethod) ||
        "contact";

      if (!nextName) {
        return NextResponse.json(
          { ok: false, error: "Enter the customer name." },
          { status: 400 }
        );
      }

      if (nextPhone && nextPhone.replace(/\D/g, "").length < 10) {
        return NextResponse.json(
          { ok: false, error: "Enter a phone number with at least 10 digits." },
          { status: 400 }
        );
      }

      if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json(
          { ok: false, error: "Enter a valid email address." },
          { status: 400 }
        );
      }

      const orderCode = cleanText(item.orderCode);
      const orderItems = await delegate.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
      });
      const updatedAt = new Date().toISOString();
      const updatedBy =
        guard.session?.user?.name || guard.session?.user?.email || "Admin";

      await Promise.all(
        orderItems.map((orderItem: any) => {
          const metadata = readSnapshotObject(orderItem.metadata);
          const nextMetadata = {
            ...metadata,
            customerName: nextName,
            customerPhoneNumber: nextPhone,
            customerWhatsappNumber: nextPhone,
            customerEmail: nextEmail,
            plantShopContactMethod: nextContactMethod,
            customerContactUpdatedAt: updatedAt,
            customerContactUpdatedBy: updatedBy,
          } as Prisma.InputJsonObject;

          return delegate.update({
            where: { id: orderItem.id },
            data: {
              recipientName: nextName,
              recipientEmail: nextEmail || null,
              metadata: nextMetadata,
            },
          });
        })
      );

      return NextResponse.json({
        ok: true,
        message: "Customer contact updated.",
      });
    }

    if (action === "update-little-orchard-payment-allocations") {
      if (item.sourceType !== "little-orchard-shop") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Payment allocation editing is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      const allocationInput = readSnapshotObject(body?.paymentAllocations);
      const paymentAllocations = {
        cash: normalizeNonNegativeMoney(allocationInput.cash),
        card: normalizeNonNegativeMoney(allocationInput.card),
        bank_transfer: normalizeNonNegativeMoney(
          allocationInput.bank_transfer
        ),
        remittance: normalizeNonNegativeMoney(allocationInput.remittance),
        other: normalizeNonNegativeMoney(allocationInput.other),
      };
      const paidTotal = Object.values(paymentAllocations).reduce(
        (sum, value) => sum + value,
        0
      );
      const orderCode = cleanText(item.orderCode);
      const orderItems = await delegate.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
      });
      const orderTotal = orderItems.reduce(
        (sum: number, orderItem: any) =>
          sum + Number(orderItem.lineTotal || 0),
        0
      );

      await Promise.all(
        orderItems.map((orderItem: any) => {
          const metadata = readSnapshotObject(orderItem.metadata);

          return delegate.update({
            where: { id: orderItem.id },
            data: {
              metadata: {
                ...metadata,
                paymentAllocations,
                paymentAllocationTotal: paidTotal,
                customerOwes: Math.max(0, orderTotal - paidTotal),
                paymentAllocationsUpdatedAt: new Date().toISOString(),
                paymentAllocationsUpdatedBy:
                  guard.session?.user?.name ||
                  guard.session?.user?.email ||
                  "Admin",
              } as Prisma.InputJsonObject,
            },
          });
        })
      );

      return NextResponse.json({
        ok: true,
        message: "Payment allocations updated.",
        paymentAllocations,
        paidTotal,
        customerOwes: Math.max(0, orderTotal - paidTotal),
      });
    }

    if (action === "send-little-orchard-customer-email") {
      if (item.sourceType !== "little-orchard-shop") {
        return NextResponse.json(
          {
            ok: false,
            error: "Customer email sending is only available for Little Orchard orders.",
          },
          { status: 400 }
        );
      }

      const metadata = readSnapshotObject(item.metadata);
      const recipientEmail = cleanText(
        metadata.customerEmail || item.recipientEmail
      );
      const subject =
        cleanText(body?.subject) ||
        `Little Orchard order ${item.orderCode || ""}`.trim();
      const text = cleanText(body?.message);

      if (!recipientEmail) {
        return NextResponse.json(
          { ok: false, error: "This order does not have a customer email." },
          { status: 400 }
        );
      }

      if (!text) {
        return NextResponse.json(
          { ok: false, error: "Email message is required." },
          { status: 400 }
        );
      }

      const deliveryResult = await sendEmailMessage({
        to: recipientEmail,
        subject,
        text,
        html: buildHtmlFromText(text),
        fromName: "Little Orchard Shop",
        purpose: "little-orchard-shop-dashboard-customer-email",
      });

      const nextMetadata = {
        ...metadata,
        lastCustomerEmailSentAt: new Date().toISOString(),
        lastCustomerEmailSubject: subject,
        lastCustomerEmailResult: deliveryResult,
      };
      const updatedItem = await delegate.update({
        where: { id },
        data: {
          metadata: nextMetadata as Prisma.InputJsonObject,
        },
        include: {
          invitationOrder: true,
          selectedCourier: true,
          activities: {
            orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
            take: 20,
          },
        },
      });

      if ((prisma as any).orderFulfillmentActivity?.create) {
        await (prisma as any).orderFulfillmentActivity.create({
          data: {
            fulfillmentItemId: id,
            stageKey: "customer-email-sent",
            stageLabel: "Customer email sent",
            updateType: "manual",
            source: "orders-dashboard",
            staffUserId: guard.session?.user?.id || null,
            staffUserName:
              guard.session?.user?.name ||
              guard.session?.user?.email ||
              "Admin",
            completedAt: new Date(),
            notes: `Customer email sent to ${recipientEmail}.`,
            metadata: {
              customerVisible: false,
              orderCode: item.orderCode,
              subject,
              deliveryResult,
            },
          },
        });
      }

      const emailOk = deliveryResult?.ok !== false;

      return NextResponse.json(
        {
          ok: emailOk,
          item: serializeFulfillmentItem(updatedItem),
          deliveryResult,
          message: emailOk
            ? "Customer email sent through the website email sender."
            : "Email provider reported a sending problem.",
        },
        { status: emailOk ? 200 : 502 }
      );
    }

    if (
      item.fulfillmentType !== "physical" ||
      item.sourceType !== "physical-invitation"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mailing address requests are only available for physical invitations.",
        },
        { status: 400 }
      );
    }

    const recipientEmail = cleanText(item.recipientEmail);

    if (!recipientEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "This physical order item does not have a recipient email.",
        },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const accountUrl = `${baseUrl}/questionnaire/auth-account`;
    const orderNumber = item.orderCode || item.invitationOrder?.orderCode || "";
    const recipientName =
      cleanText(item.recipientName) ||
      cleanText(item.ticketAttendeeName) ||
      "there";
    const orderDetails = getOrderDetailsForMailingRequest(item);
    const deliveryResult = await sendVerificationDelivery({
      identifier: recipientEmail,
      delivery: "link",
      verifyUrl: accountUrl,
      target: "mailing-address-update",
      successRedirect: "/questionnaire/auth-account",
      contextMetadata: {
        purpose: "mailing-address-update-request",
        recipientName,
        orderNumber,
        orderDetails,
        accountUrl,
        fulfillmentItemId: item.id,
        orderCode: orderNumber,
      },
    });
    const metadata = readSnapshotObject(item.metadata);
    const requestHistory = readSnapshotArray(metadata.mailingAddressUpdateRequests);
    const nextMetadata = {
      ...metadata,
      mailingAddressUpdateRequestedAt: new Date().toISOString(),
      mailingAddressUpdateRequestLastResult: deliveryResult,
      mailingAddressUpdateRequests: [
        ...requestHistory,
        {
          requestedAt: new Date().toISOString(),
          recipientEmail,
          deliveryOk: deliveryResult?.ok === true,
          provider: deliveryResult?.provider ?? null,
        },
      ],
    };
    const updatedItem = await delegate.update({
      where: { id },
      data: {
        metadata: nextMetadata as Prisma.InputJsonObject,
      },
          include: {
            invitationOrder: true,
            selectedCourier: true,
            activities: {
              orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
              take: 20,
            },
          },
        });

    return NextResponse.json({
      ok: true,
      item: serializeFulfillmentItem(updatedItem),
      deliveryResult,
    });
  } catch (error) {
    console.error("DASHBOARD ORDERS POST ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Order action could not be completed.",
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

    if (id.startsWith("order:")) {
      const orderId = id.slice("order:".length);
      const updatedOrders = await prisma.$queryRaw<any[]>(Prisma.sql`
        WITH updated AS (
          UPDATE "InvitationOrder"
          SET
            "status" = ${fulfillmentStatus},
            "updatedAt" = NOW()
          WHERE "id" = ${orderId}
          RETURNING *
        )
        SELECT
          updated.*,
          COALESCE(t."ticketCount", 0) AS "ticketCount",
          COALESCE(t."ticketRecipients", '[]'::json) AS "ticketRecipients"
        FROM updated
        LEFT JOIN (
          SELECT
            "orderId",
            COUNT(*)::int AS "ticketCount",
            json_agg(
              json_build_object(
                'ticketCode', "ticketCode",
                'ticketLabel', "ticketLabel",
                'productTitle', "productTitle",
                'sizeLabel', "sizeLabel",
                'purchaseModeLabel', "purchaseModeLabel",
                'purchaseModeId', "purchaseModeId",
                'ticketIndex', "ticketIndex",
                'invitationMailingAddress', "invitationMailingAddress",
                'ownerName', "ownerName",
                'ownerEmail', "ownerEmail",
                'ownerPhone', "ownerPhone",
                'ticketOwnerPaymentMode', "ticketOwnerPaymentMode",
                'ticketOwnerAddonBudget', "ticketOwnerAddonBudget",
                'status', "status",
                'mealMode', "mealMode",
                'mealLabel', "mealLabel",
                'mealSelection', "mealSelection",
                'wantsExtraFood', "wantsExtraFood",
                'hasMealNotes', "hasMealNotes",
                'mealNotes', "mealNotes",
                'portalEmailSentAt', "portalEmailSentAt",
                'portalLastAccessAt', "portalLastAccessAt"
              )
              ORDER BY "ticketIndex" ASC, "createdAt" ASC
            ) AS "ticketRecipients"
          FROM "InvitationOrderTicket"
          GROUP BY "orderId"
        ) t ON t."orderId" = updated."id"
      `);

      const updatedOrder = updatedOrders[0];

      if (!updatedOrder) {
        return NextResponse.json(
          { ok: false, error: "Order was not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        item: serializeInvitationOrderSummary(updatedOrder),
      });
    }

    const now = new Date();
    const fulfillmentNotes = cleanText(body?.fulfillmentNotes) || null;
    const trackingReference = cleanText(body?.trackingReference) || null;
    const fulfilledAt = fulfillmentStatus === "FULFILLED" ? now : null;
    const delegate = getOrderFulfillmentDelegate();
    const existingItem = delegate?.findUnique
      ? await delegate.findUnique({ where: { id } })
      : null;
    const item = delegate?.update
      ? await delegate.update({
          where: { id },
          data: {
            fulfillmentStatus,
            status: fulfillmentStatus,
            fulfillmentNotes,
            trackingReference,
            currentStageKey: fulfillmentStatus
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
            currentStageLabel: fulfillmentStatus,
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

    if (
      existingItem &&
      existingItem.fulfillmentStatus !== fulfillmentStatus &&
      (prisma as any).orderFulfillmentActivity?.create
    ) {
      if (
        existingItem.sourceType === "little-orchard-shop" &&
        existingItem.orderCode
      ) {
        const stageKey = fulfillmentStatus
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");

        await createLittleOrchardOrderActivity(prisma as any, {
          fulfillmentItemId: id,
          orderCode: existingItem.orderCode,
          stageKey,
          stageLabel: fulfillmentStatus,
          updateType: "manual",
          source: "orders-dashboard",
          staffUserId: guard.session?.user?.id || null,
          staffUserName:
            guard.session?.user?.name ||
            guard.session?.user?.email ||
            "Admin",
          previousStatus: existingItem.fulfillmentStatus,
          nextStatus: fulfillmentStatus,
          notes: fulfillmentNotes,
          metadata: {
            orderActivityKey: `${existingItem.orderCode}:${stageKey}:${now.getTime()}`,
            trackingReference,
          },
        });
      } else {
        await (prisma as any).orderFulfillmentActivity.create({
          data: {
            fulfillmentItemId: id,
            stageKey:
              item.currentStageKey ||
              fulfillmentStatus.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            stageLabel: item.currentStageLabel || fulfillmentStatus,
            updateType: "manual",
            source: "orders-dashboard",
            completedAt: now,
            notes: fulfillmentNotes,
            metadata: {
              previousStatus: existingItem.fulfillmentStatus,
              nextStatus: fulfillmentStatus,
              trackingReference,
            },
          },
        });
      }
    }

    const refreshedItem = delegate?.findUnique
      ? await delegate.findUnique({
          where: { id },
          include: {
            invitationOrder: true,
            selectedCourier: true,
            activities: {
              orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
              take: 20,
            },
          },
        })
      : item;

    return NextResponse.json({
      ok: true,
      item: serializeFulfillmentItem(refreshedItem),
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
