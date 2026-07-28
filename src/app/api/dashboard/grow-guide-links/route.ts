import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  ensureCustomerGrowGuideTables,
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
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
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

    if (!fulfillmentItemId) {
      return NextResponse.json(
        { ok: false, error: "Choose the order item for this grow guide link." },
        { status: 400 }
      );
    }

    await ensureCustomerGrowGuideTables();

    const item = await prisma.orderFulfillmentItem.findUnique({
      where: { id: fulfillmentItemId },
      include: { invitationOrder: true },
    });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Order item was not found." },
        { status: 404 }
      );
    }

    const metadata = readMetadata(item.metadata);
    const customerName =
      cleanText(item.recipientName) ||
      cleanText(metadata.customerName) ||
      cleanText(metadata.answers && (metadata.answers as any).fullName);
    const customerEmail =
      cleanText(metadata.customerEmail) || cleanText(item.recipientEmail);
    const customerPhone = cleanText(
      metadata.customerWhatsappNumber ||
        metadata.customerPhoneNumber ||
        metadata.customerPhone
    );
    const guide =
      findGrowGuideForProduct(item) ||
      (requestedGuideSlug
        ? {
            guideSlug: requestedGuideSlug,
            guidePath: `/${requestedGuideSlug.replace(/-grow-guide$/, "")}`,
          }
        : null);

    if (!guide) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No associated grow guide was found for this product yet. Choose another purchased item.",
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
        ${item.orderCode || null},
        ${item.id},
        ${customerName || null},
        ${customerEmail || null},
        ${customerPhone || null},
        ${ownerIdentityKey},
        ${item.productId || null},
        ${item.productSku || item.sku || null},
        ${item.productTitle || null},
        ${item.sizeLabel || null},
        ${guide.guideSlug},
        ${guide.guidePath},
        ${JSON.stringify({
          source: "orders-dashboard",
          orderCode: item.orderCode || null,
          receiptCode: metadata.receiptCode || null,
          cashierToken: metadata.cashierToken || null,
        })}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `);
    const link = serializeLink(rows[0], request);
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
