import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { sendVerificationDelivery } from "@/lib/verification/delivery";

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
    activities: readSnapshotArray(item.activities).map((activity: any) => ({
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
    })),
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

    if (action !== "request-mailing-address-update") {
      return NextResponse.json(
        { ok: false, error: "Unknown order action." },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Fulfillment item id is required." },
        { status: 400 }
      );
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
        { ok: false, error: "Physical order item was not found." },
        { status: 404 }
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
