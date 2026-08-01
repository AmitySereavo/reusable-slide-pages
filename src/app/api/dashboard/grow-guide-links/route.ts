import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  ensureCustomerGrowGuideTables,
  findGrowGuideBySlug,
  findGrowGuideForProduct,
  makeGrowGuideToken,
  normalizeIdentityKey,
} from "@/lib/growGuides/trackedLinks";

function cleanText(value: unknown, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

function readMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getBaseUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_GROW_GUIDE_URL ||
    process.env.GROW_GUIDE_PUBLIC_URL ||
    "https://growguide.paralifetrees.com";

  if (configured) return configured.replace(/\/$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function serializeLink(row: any, request: Request) {
  const linkUrl = `${getBaseUrl(request)}/guide-link/${encodeURIComponent(
    row.token
  )}`;

  return {
    id: row.id,
    token: row.token,
    linkUrl,
    guideSlug: row.guideSlug,
    guidePath: row.guidePath,
    orderCode: row.orderCode,
    fulfillmentItemId: row.fulfillmentItemId,
    productTitle: row.productTitle,
    sizeLabel: row.sizeLabel,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    openedCount: Number(row.openedCount || 0),
    firstOpenedAt: row.firstOpenedAt,
    lastOpenedAt: row.lastOpenedAt,
    createdAt: row.createdAt,
  };
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const fulfillmentItemId = cleanText(body?.fulfillmentItemId);
    const requestedGuideSlug = cleanText(body?.guideSlug);
    const suppliedCustomerName = cleanText(body?.customerName);
    const suppliedCustomerEmail = cleanText(body?.customerEmail);
    const suppliedCustomerPhone = cleanText(body?.customerPhone);
    const suppliedProductTitle = cleanText(body?.productTitle);

    await ensureCustomerGrowGuideTables();

    const item = fulfillmentItemId
      ? await prisma.orderFulfillmentItem.findUnique({
          where: { id: fulfillmentItemId },
          include: { invitationOrder: true },
        })
      : null;

    if (fulfillmentItemId && !item) {
      return NextResponse.json(
        { ok: false, error: "Order item was not found." },
        { status: 404 }
      );
    }

    const metadata = readMetadata(item?.metadata);
    const customerName =
      cleanText(item?.recipientName) ||
      cleanText(metadata.customerName) ||
      cleanText(metadata.answers && (metadata.answers as any).fullName) ||
      suppliedCustomerName;
    const customerEmail =
      cleanText(metadata.customerEmail) ||
      cleanText(item?.recipientEmail) ||
      suppliedCustomerEmail;
    const customerPhone = cleanText(
      metadata.customerWhatsappNumber ||
        metadata.customerPhoneNumber ||
        metadata.customerPhone ||
        suppliedCustomerPhone
    );
    const guide =
      (item ? findGrowGuideForProduct(item) : null) ||
      (requestedGuideSlug ? findGrowGuideBySlug(requestedGuideSlug) : null);

    if (!guide) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Choose a grow guide or a purchased item with an associated grow guide.",
        },
        { status: 400 }
      );
    }

    const ownerUser = customerEmail
      ? await prisma.user.findUnique({
          where: { email: customerEmail.toLowerCase() },
          select: { id: true },
        })
      : null;
    const token = makeGrowGuideToken();
    const rowId = `cggl-${randomUUID()}`;
    const ownerIdentityKey = normalizeIdentityKey({
      email: customerEmail,
      phone: customerPhone,
      name: customerName,
    });

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO "CustomerGrowGuideLink" (
        "id",
        "token",
        "ownerUserId",
        "createdByUserId",
        "orderCode",
        "fulfillmentItemId",
        "customerName",
        "customerEmail",
        "customerPhone",
        "ownerIdentityKey",
        "productId",
        "productSku",
        "productTitle",
        "sizeLabel",
        "guideSlug",
        "guidePath",
        "metadata",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${rowId},
        ${token},
        ${ownerUser?.id || null},
        ${guard.session?.user?.id || null},
        ${item?.orderCode || null},
        ${item?.id || null},
        ${customerName || null},
        ${customerEmail || null},
        ${customerPhone || null},
        ${ownerIdentityKey},
        ${item?.productId || null},
        ${item?.productSku || item?.sku || null},
        ${item?.productTitle || suppliedProductTitle || null},
        ${item?.sizeLabel || null},
        ${guide.guideSlug},
        ${guide.guidePath},
        ${JSON.stringify({
          source: item ? "orders-dashboard" : "people-dashboard",
          orderCode: item?.orderCode || null,
          receiptCode: metadata.receiptCode || null,
          cashierToken: metadata.cashierToken || null,
          manualGuideSelection: !item,
        })}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `);
    const link = serializeLink(rows[0], request);

    if (item) {
      const guideLinkHistory = Array.isArray(metadata.growGuideLinks)
        ? metadata.growGuideLinks
        : [];
      const nextMetadata = {
        ...metadata,
        lastGrowGuideLink: link,
        growGuideLinks: [
          {
            token: link.token,
            linkUrl: link.linkUrl,
            guideSlug: link.guideSlug,
            guidePath: link.guidePath,
            productTitle: link.productTitle,
            sizeLabel: link.sizeLabel,
            createdAt: new Date().toISOString(),
          },
          ...guideLinkHistory.slice(0, 19),
        ],
      };

      await prisma.orderFulfillmentItem.update({
        where: { id: item.id },
        data: {
          metadata: nextMetadata as Prisma.InputJsonObject,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      link,
      message: "Tracked grow guide link generated.",
    });
  } catch (error) {
    console.error("Unable to generate grow guide link", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to generate the grow guide link.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
