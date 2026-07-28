import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  littleOrchardPlantShowEvent,
  LITTLE_ORCHARD_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import { getPlantShopEventQuantityOverrideMap } from "@/lib/plantShop/eventQuantityOverrides";
import { getLittleOrchardInventoryLineKey } from "@/lib/plantShop/littleOrchardInventoryKeys";
import {
  getLittleOrchardDeliveryAddressLines,
  getLittleOrchardFulfillmentKey,
  getLittleOrchardFulfillmentOption,
} from "@/lib/questionnaire/littleOrchardFulfillment";
import { resolveShopSelectedLines } from "@/lib/questionnaire/shop";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import { createLittleOrchardOrderActivity } from "@/lib/plantShop/orderActivity";
import { makeReceiptCode } from "@/lib/plantShop/receiptCodes";
import type { ShopCart, ShopResolvedCartLine } from "@/types/questionnaire";

type PlantShopOrderBody = {
  questionnaireSlug?: string;
  orderRequestKey?: string;
  adminAssisted?: boolean;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  facebookMessengerHandle?: string;
  deviceType?: string;
  contactMethod?: string;
  orderCart?: ShopCart;
  answers?: Record<string, unknown>;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasCountryAndAreaCode(value: string) {
  return value.replace(/\D/g, "").length >= 11;
}

function normalizeDeviceType(value: unknown) {
  return value === "shared_event_device" ? "shared_event_device" : "own_device";
}

function normalizeContactMethod(value: unknown) {
  const normalized = cleanText(value);

  return [
    "email",
    "phone_call",
    "instagram",
    "tiktok",
    "facebook",
    "whatsapp",
  ].includes(normalized)
    ? normalized
    : "whatsapp";
}

function normalizeOrderCart(value: unknown): ShopCart {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ShopCart;
}

function toJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeOrderCode() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `LO-${stamp}-${suffix}`;
}

function makeCashierToken() {
  return randomBytes(24).toString("base64url");
}

async function getConfirmedEventQuantity(productId: string, sizeOptionId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      productId: string | null;
      sizeOptionId: string | null;
      productTitle: string | null;
      sizeLabel: string | null;
      total: bigint | number | null;
    }>
  >(
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
  const requestedKey = getLittleOrchardInventoryLineKey({
    productId,
    sizeOptionId,
  });

  return rows.reduce((sum, row) => {
    const rowKey = getLittleOrchardInventoryLineKey(row);

    return rowKey === requestedKey ? sum + Number(row.total ?? 0) : sum;
  }, 0);
}

function getBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");

  return origin ? origin.replace(/\/+$/, "") : "http://localhost:3000";
}

function formatMoney(value: number) {
  return `JMD $${Math.round(value).toLocaleString("en-JM")}`;
}

function hasLittleOrchardEventPassed() {
  const eventEndsAt = new Date(littleOrchardPlantShowEvent.eventEndsAt);

  return !Number.isNaN(eventEndsAt.getTime()) && Date.now() > eventEndsAt.getTime();
}

function buildOrderText({
  orderCode,
  fullName,
  email,
  lines,
  orderStatusLink,
  fulfillmentLabel,
  fulfillmentDetail,
  deliveryAddressLines,
  contactMethod,
  phoneNumber,
  whatsappNumber,
  instagramHandle,
  tiktokHandle,
  facebookMessengerHandle,
}: {
  orderCode: string;
  fullName: string;
  email: string;
  lines: ShopResolvedCartLine[];
  orderStatusLink: string;
  fulfillmentLabel: string;
  fulfillmentDetail: string;
  deliveryAddressLines: string[];
  contactMethod: string;
  phoneNumber: string;
  whatsappNumber: string;
  instagramHandle: string;
  tiktokHandle: string;
  facebookMessengerHandle: string;
}) {
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const plantCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const items = lines
    .map(
      (line, index) => {
        const isNurseryStockRequest =
          line.purchaseModeId === "nursery-stock-request";
        const title = isNurseryStockRequest
          ? "Nursery stock request"
          : `${line.productTitle} - ${line.sizeLabel}`;

        return (
          `${index + 1}. ${title}\n` +
          (isNurseryStockRequest
            ? `   Requested item: ${line.productTitle} - ${line.sizeLabel}\n`
            : line.purchaseModeLabel
              ? `   Option: ${line.purchaseModeLabel}\n`
              : "") +
          `   Quantity: ${line.quantity}\n` +
          (isNurseryStockRequest
            ? `   Request fee: ${formatMoney(line.lineTotal)}\n`
            : `   Unit price: ${formatMoney(line.unitPrice)}\n` +
              `   Item total: ${formatMoney(line.lineTotal)}`) +
          (isNurseryStockRequest
            ? "   Note: Event pickup stock is not available for this item. Nursery stock availability and final price will be confirmed when a representative reaches out."
            : "")
        );
      }
    )
    .join("\n\n");

  const parts = [
    "New Little Orchard Shop Order",
    "",
    `Order number: ${orderCode}`,
    `Customer name: ${fullName}`,
    `Preferred update channel: ${contactMethod}`,
  ];

  if (email) {
    parts.push(`Email: ${email}`);
  }
  if (phoneNumber) {
    parts.push(`Phone: ${phoneNumber}`);
  }
  if (whatsappNumber) {
    parts.push(`WhatsApp: ${whatsappNumber}`);
  }
  if (instagramHandle) {
    parts.push(`Instagram: ${instagramHandle}`);
  }
  if (tiktokHandle) {
    parts.push(`TikTok: ${tiktokHandle}`);
  }
  if (facebookMessengerHandle) {
    parts.push(`Facebook Messenger: ${facebookMessengerHandle}`);
  }

  parts.push(
    "",
    "Selected Items",
    "",
    items,
    "",
    "Order Summary",
    "",
    `Total number of items: ${plantCount}`,
    `Order total: ${formatMoney(total)}`,
    `Pickup / delivery: ${fulfillmentLabel}`,
    fulfillmentDetail,
    ...deliveryAddressLines,
    `Event: ${littleOrchardPlantShowEvent.eventName}`,
    "",
    "Order Status Link",
    "",
    orderStatusLink,
    "",
    "Open this link to check payment and fulfillment status. Please show your order message to the cashier when you are ready to pay and collect your items."
  );

  return parts.join("\n");
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

async function sendOrderEmails({
  orderCode,
  fullName,
  email,
  text,
}: {
  orderCode: string;
  fullName: string;
  email: string;
  text: string;
}) {
  const businessEmail =
    process.env.PARALIFE_TREES_ORDER_EMAIL ||
    process.env.PLANT_GIVEAWAY_ADMIN_EMAIL ||
    littleOrchardPlantShowEvent.businessOrderEmail;
  const subject = `Little Orchard Shop order ${orderCode}: ${fullName}`;
  const html = buildHtmlFromText(text);

  await sendEmailMessage({
    to: businessEmail,
    subject,
    text,
    html,
    replyTo: email || null,
    fromName: "Little Orchard Shop",
    purpose: "little-orchard-shop-business-order",
  });

  if (email && isValidEmail(email)) {
    await sendEmailMessage({
      to: email,
      subject: `Your Little Orchard Shop order ${orderCode}`,
      text,
      html,
      replyTo: businessEmail,
      fromName: "Little Orchard Shop",
      purpose: "little-orchard-shop-customer-receipt",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PlantShopOrderBody | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const orderRequestKey = cleanText(body.orderRequestKey);
    const adminAssisted = body.adminAssisted === true;
    const fullName = cleanText(body.fullName);
    const email = cleanText(body.email).toLowerCase();
    const phoneNumber = cleanText(body.phone);
    const whatsappNumber = cleanText(body.whatsappNumber || body.phone);
    const instagramHandle = cleanText(
      body.instagramHandle || body.answers?.instagramHandle
    );
    const tiktokHandle = cleanText(
      body.tiktokHandle || body.answers?.tiktokHandle
    );
    const facebookMessengerHandle = cleanText(
      body.facebookMessengerHandle || body.answers?.facebookMessengerHandle
    );
    const deviceType = normalizeDeviceType(body.deviceType);
    const contactMethod = normalizeContactMethod(body.contactMethod);
    const orderEmail = email && isValidEmail(email) ? email : "";
    const cart = normalizeOrderCart(body.orderCart);
    const lines = resolveShopSelectedLines(littleOrchardShopCatalog, cart).filter(
      (line) => line.selected !== false && line.availabilityStatus !== "unavailable"
    );

    if (!orderRequestKey) {
      return NextResponse.json(
        { ok: false, error: "Missing order request key." },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { ok: false, error: "Enter your full name." },
        { status: 400 }
      );
    }

    if (!lines.length) {
      return NextResponse.json(
        { ok: false, error: "Select at least one item before submitting." },
        { status: 400 }
      );
    }

    if (contactMethod === "email" && !orderEmail) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (contactMethod === "whatsapp" && !whatsappNumber) {
      return NextResponse.json(
        { ok: false, error: "Enter your WhatsApp number." },
        { status: 400 }
      );
    }

    if (
      contactMethod === "whatsapp" &&
      whatsappNumber &&
      !hasCountryAndAreaCode(whatsappNumber)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter your WhatsApp number with country and area code.",
        },
        { status: 400 }
      );
    }

    if (contactMethod === "phone_call" && !phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "Enter the phone number we should call." },
        { status: 400 }
      );
    }

    if (
      contactMethod === "phone_call" &&
      phoneNumber &&
      !hasCountryAndAreaCode(phoneNumber)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter the phone number with country and area code.",
        },
        { status: 400 }
      );
    }

    if (contactMethod === "instagram" && !instagramHandle) {
      return NextResponse.json(
        { ok: false, error: "Enter your Instagram handle." },
        { status: 400 }
      );
    }

    if (contactMethod === "tiktok" && !tiktokHandle) {
      return NextResponse.json(
        { ok: false, error: "Enter your TikTok handle." },
        { status: 400 }
      );
    }

    if (contactMethod === "facebook" && !facebookMessengerHandle) {
      return NextResponse.json(
        { ok: false, error: "Enter your Facebook Messenger name or profile." },
        { status: 400 }
      );
    }

    const overLimitConflicts = [];
    const quantityOverrides = await getPlantShopEventQuantityOverrideMap(
      prisma as any,
      LITTLE_ORCHARD_SHOP_SLUG
    );

    for (const line of lines) {
      if (line.purchaseModeId === "nursery-stock-request") {
        continue;
      }

      const variationLimit = Number(
        quantityOverrides.get(`${line.productId}::${line.sizeOptionId}`) ??
          line.sizeOptionMetadata?.eventQuantityAvailable ??
          0
      );
      const confirmedQuantity = await getConfirmedEventQuantity(
        line.productId,
        line.sizeOptionId
      );
      const availableQuantity =
        variationLimit > 0
          ? Math.max(0, Math.floor(variationLimit - confirmedQuantity))
          : variationLimit;

      if (
        Number.isFinite(variationLimit) &&
        variationLimit > 0 &&
        line.quantity > availableQuantity
      ) {
        overLimitConflicts.push({
          line,
          availableQuantity,
        });
      }
    }

    if (overLimitConflicts.length) {
      const conflict = overLimitConflicts[0];
      return NextResponse.json(
        {
          ok: false,
          error: `${conflict.line.productTitle} - ${conflict.line.sizeLabel} has ${conflict.availableQuantity} available. Please adjust your quantity.`,
        },
        { status: 400 }
      );
    }

    const duplicate = await prisma.orderFulfillmentItem.findFirst({
      where: {
        sourceType: "little-orchard-shop",
        sourceId: orderRequestKey,
      },
      orderBy: { createdAt: "asc" },
    });

    if (duplicate?.orderCode) {
      const duplicateMetadata =
        duplicate.metadata && typeof duplicate.metadata === "object"
          ? (duplicate.metadata as Record<string, unknown>)
          : {};

      return NextResponse.json({
        ok: true,
        duplicate: true,
        orderCode: duplicate.orderCode,
        cashierLink:
          typeof duplicateMetadata.cashierLink === "string"
            ? duplicateMetadata.cashierLink
            : null,
        orderStatusLink:
          typeof duplicateMetadata.orderStatusLink === "string"
            ? duplicateMetadata.orderStatusLink
            : null,
      });
    }

    const orderCode = makeOrderCode();
    const cashierToken = makeCashierToken();
    const cashierLink = `${getBaseUrl(request)}/admin/event-orders/order/${cashierToken}`;
    const orderStatusLink = `${getBaseUrl(request)}/order-status/${cashierToken}`;
    const receiptCode = makeReceiptCode(orderCode);
    const receiptLink = `${getBaseUrl(request)}/receipt/${cashierToken}`;
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const plantCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const submittedAt = new Date();
    const fulfillmentOption = getLittleOrchardFulfillmentOption(body.answers);
    const fulfillmentKey = getLittleOrchardFulfillmentKey(body.answers);

    const deliveryAddressLines = getLittleOrchardDeliveryAddressLines(
      body.answers
    );
    const shippingMethod = fulfillmentOption.shippingMethod;
    const metadata = toJsonValue({
      event: littleOrchardPlantShowEvent,
      questionnaireSlug: cleanText(body.questionnaireSlug),
      orderRequestKey,
      deviceType,
      contactMethod,
      adminAssisted,
      customerPhoneNumber: phoneNumber || null,
      customerWhatsappNumber: whatsappNumber || null,
      customerEmail: orderEmail || null,
      customerInstagramHandle: instagramHandle || null,
      customerTiktokHandle: tiktokHandle || null,
      customerFacebookMessengerHandle: facebookMessengerHandle || null,
      fulfillmentPreference: fulfillmentOption.label,
      fulfillmentDetail: fulfillmentOption.detail,
      deliveryAddressLines,
      totalPlants: plantCount,
      orderTotal: total,
      baseCurrency: "JMD",
      baseSubtotal: total,
      baseDiscount: 0,
      baseTotal: total,
      displayCurrency: littleOrchardShopCatalog.currencyCode || "JMD",
      displayExchangeRate: 1,
      displayConvertedTotal: total,
      paymentStatus: "AWAITING_PAYMENT",
      inventoryApplied: false,
      inventoryAppliedAt: null,
      cashierToken,
      cashierLink,
      orderStatusLink,
      receiptCode,
      receiptLink,
      consentAcknowledged: body.answers?.plantShopConsent === true,
      consentWording:
        "I understand how my name, contact details, and order information will be used.",
      consentTimestamp: submittedAt.toISOString(),
      answers: body.answers || {},
    }) as Prisma.InputJsonValue;

    await prisma.$transaction(async (tx) => {
      await tx.orderFulfillmentItem.createMany({
        data: lines.map((line) => ({
        sourceType: "little-orchard-shop",
        sourceId: orderRequestKey,
        orderCode,
        lineKey: line.lineKey,
        productId: line.productId,
        productSku: line.productSku,
        productTitle: line.productTitle,
        sizeOptionId: line.sizeOptionId,
        sizeSku: line.sizeOptionSku,
        sizeLabel: line.sizeLabel,
        purchaseModeId: line.purchaseModeId,
        purchaseModeSku: line.purchaseModeSku,
        purchaseModeLabel: line.purchaseModeLabel,
        sku: line.sku,
        fulfillmentType: "physical",
        quantity: line.quantity,
        currencyCode: littleOrchardShopCatalog.currencyCode || "JMD",
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        recipientName: fullName,
        recipientEmail: orderEmail || null,
        recipientRole: "customer",
        status: "PENDING",
        fulfillmentStatus: "PENDING",
        fulfillmentNotes: [
          `Fulfillment method: ${shippingMethod}`,
          `Pickup / delivery: ${fulfillmentOption.label}`,
          fulfillmentOption.detail,
          deliveryAddressLines.length
            ? `Delivery address: ${deliveryAddressLines.join("; ")}`
            : "",
          `Device type: ${deviceType}`,
          `Contact method: ${contactMethod}`,
          phoneNumber ? `Customer phone: ${phoneNumber}` : "",
          whatsappNumber ? `Customer WhatsApp: ${whatsappNumber}` : "",
          instagramHandle ? `Customer Instagram: ${instagramHandle}` : "",
          tiktokHandle ? `Customer TikTok: ${tiktokHandle}` : "",
          facebookMessengerHandle
            ? `Customer Facebook Messenger: ${facebookMessengerHandle}`
            : "",
          line.purchaseModeId === "nursery-stock-request"
            ? "Nursery stock request: request fee is JMD 0. Nursery availability and final product price will be confirmed when a representative reaches out."
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        shippingMethod,
        currentStageKey: "order-recorded",
        currentStageLabel: "Order recorded",
        metadata,
        })),
      });

      const createdItems = await tx.orderFulfillmentItem.findMany({
        where: {
          sourceType: "little-orchard-shop",
          orderCode,
        },
        orderBy: { createdAt: "asc" },
      });
      const firstCreatedItem = createdItems[0];

      if (firstCreatedItem) {
        await createLittleOrchardOrderActivity(tx as any, {
          fulfillmentItemId: firstCreatedItem.id,
          orderCode,
          stageKey: "order-submitted",
          stageLabel: "Order submitted",
          updateType: "customer",
          source: "Little Orchard Shop",
          nextStatus: "PENDING",
          notes: "Order submitted through the Little Orchard Shop.",
          metadata: {
            orderActivityKey: `${orderCode}:order-submitted`,
            customerName: fullName,
            customerEmail: orderEmail || null,
            customerWhatsApp: whatsappNumber || null,
            customerPhone: phoneNumber || null,
            customerInstagramHandle: instagramHandle || null,
            customerTiktokHandle: tiktokHandle || null,
            customerFacebookMessengerHandle: facebookMessengerHandle || null,
          },
        });

        await createLittleOrchardOrderActivity(tx as any, {
          fulfillmentItemId: firstCreatedItem.id,
          orderCode,
          stageKey: "awaiting-payment",
          stageLabel: "Awaiting payment",
          updateType: "system",
          source: "Little Orchard Shop",
          previousStatus: "PENDING",
          nextStatus: "PENDING",
          notes: "Order is awaiting customer payment.",
          metadata: {
            orderActivityKey: `${orderCode}:awaiting-payment`,
            paymentWindowMinutes:
              littleOrchardPlantShowEvent.reservationDurationMinutes,
          },
        });
      }
    });

    const text = buildOrderText({
      orderCode,
      fullName,
      email: orderEmail,
      lines,
      orderStatusLink,
      fulfillmentLabel: fulfillmentOption.label,
      fulfillmentDetail: fulfillmentOption.detail,
      deliveryAddressLines,
      contactMethod,
      phoneNumber,
      whatsappNumber,
      instagramHandle,
      tiktokHandle,
      facebookMessengerHandle,
    });

    let emailDeliveryStatus = "not_requested";

    try {
      await sendOrderEmails({ orderCode, fullName, email: orderEmail, text });
      emailDeliveryStatus = "sent";
    } catch (error) {
      emailDeliveryStatus = "failed";
      console.error("Little Orchard shop order email failed:", error);
    }

    const whatsappUrl =
      !adminAssisted && contactMethod === "whatsapp"
        ? `https://api.whatsapp.com/send/?phone=${littleOrchardPlantShowEvent.whatsappNumber}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`
        : null;

    return NextResponse.json({
      ok: true,
      orderCode,
      orderTotal: total,
      totalPlants: plantCount,
      cashierLink,
      orderStatusLink,
      receiptLink,
      whatsappUrl,
      emailDeliveryStatus,
      message:
        adminAssisted
          ? "Order created. Opening the order record for admin processing."
          : contactMethod === "whatsapp"
          ? "Your order has been recorded. WhatsApp is ready with your order message."
          : contactMethod === "email"
            ? "Your order has been recorded. A receipt and order summary will be sent to your email address."
            : "Your order has been recorded. We will use your selected contact channel for order updates.",
    });
  } catch (error) {
    console.error("Little Orchard shop order create error:", error);

    return NextResponse.json(
      { ok: false, error: "Order could not be recorded." },
      { status: 500 }
    );
  }
}
