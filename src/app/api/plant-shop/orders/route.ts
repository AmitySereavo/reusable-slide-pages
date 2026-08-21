import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  littleOrchardPlantShowEvent,
  LITTLE_ORCHARD_SHOP_SLUG,
  GARDEN_PACKAGE_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import {
  getLittleOrchardUnifiedShopCatalog,
  getUnifiedShopCatalog,
} from "@/lib/inventory/littleOrchardUnifiedCatalog";
import {
  CALLALOO_PACKAGE_SHOP_SLUG,
  syncCallalooPackagesToUnifiedInventory,
  syncHomeGardenPackagesToUnifiedInventory,
} from "@/lib/inventory/unifiedInventory";
import { getPlantShopEventQuantityOverrideMap } from "@/lib/plantShop/eventQuantityOverrides";
import { getLittleOrchardInventoryLineKey } from "@/lib/plantShop/littleOrchardInventoryKeys";
import {
  getLittleOrchardDeliveryAddressLines,
  getLittleOrchardFulfillmentKey,
  getLittleOrchardFulfillmentOption,
} from "@/lib/questionnaire/littleOrchardFulfillment";
import {
  getDefaultPurchaseModeId,
  makeShopLineKey,
  resolveShopSelectedLines,
} from "@/lib/questionnaire/shop";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import { getEmailSenderForContext } from "@/config/siteBrands";
import { createLittleOrchardOrderActivity } from "@/lib/plantShop/orderActivity";
import { makeReceiptCode } from "@/lib/plantShop/receiptCodes";
import {
  evaluateDiscountCode,
  recordDiscountRedemption,
} from "@/lib/discountCodes";
import { SEEDLING_SHOP_SLUG } from "@/lib/seedlings/productionTemplates";
import type {
  ShopCart,
  ShopCatalog,
  ShopResolvedCartLine,
} from "@/types/questionnaire";

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
  resolvedLines?: ShopResolvedCartLine[];
  orderSummary?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  discountCode?: string;
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

const paymentPreferenceLabels = {
  bank_transfer_scotia: "Bank transfer - Scotiabank",
  bank_transfer_ncb: "Bank transfer - NCB",
  cash_on_delivery: "Cash on delivery",
  remittance: "Western Union / remittance request",
  card_payment: "Card payment (coming soon)",
} as const;

function normalizePaymentPreference(value: unknown) {
  const normalized = cleanText(value);

  return normalized in paymentPreferenceLabels
    ? (normalized as keyof typeof paymentPreferenceLabels)
    : "";
}

function normalizeOrderCart(value: unknown): ShopCart {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ShopCart;
}

function readNumericRecordValue(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSubmittedResolvedLines(value: unknown): ShopResolvedCartLine[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const record = item as Record<string, unknown>;
    const quantity = Math.max(1, Math.floor(Number(record.quantity || 1)));
    const unitPrice = Number(record.unitPrice);
    const lineTotal = Number(record.lineTotal);
    const productTitle = cleanText(record.productTitle);
    const sizeLabel = cleanText(record.sizeLabel);

    if (!productTitle || !Number.isFinite(unitPrice) || !Number.isFinite(lineTotal)) {
      return [];
    }

    return [
      {
        lineKey: cleanText(record.lineKey) || `submitted-callaloo-line-${index + 1}`,
        selected: record.selected === false ? false : true,
        availabilityStatus:
          record.availabilityStatus === "unavailable" ? "unavailable" : "available",
        productId: cleanText(record.productId) || "submitted-callaloo-product",
        productSku: cleanText(record.productSku),
        productTitle,
        productImageUrl: cleanText(record.productImageUrl),
        fulfillmentType: record.fulfillmentType === "digital" ? "digital" : "physical",
        requiresPhysicalFulfillment: record.requiresPhysicalFulfillment === true,
        sizeOptionId: cleanText(record.sizeOptionId) || "submitted-callaloo-option",
        sizeOptionSku: cleanText(record.sizeOptionSku),
        sizeLabel: sizeLabel || "Subscription",
        quantity,
        purchaseModeId: cleanText(record.purchaseModeId),
        purchaseModeSku: cleanText(record.purchaseModeSku),
        purchaseModeLabel: cleanText(record.purchaseModeLabel),
        sku: cleanText(record.sku),
        unitPrice,
        lineTotal,
        unitWeight: Number.isFinite(Number(record.unitWeight))
          ? Number(record.unitWeight)
          : undefined,
        lineWeight: Number.isFinite(Number(record.lineWeight))
          ? Number(record.lineWeight)
          : undefined,
      } satisfies ShopResolvedCartLine,
    ];
  });
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isPackageShellOrderLine(
  line: ShopResolvedCartLine,
  catalog: ShopCatalog
) {
  const product = catalog.products.find((item) => item.id === line.productId);
  const productMetadata = normalizeMetadata(product?.metadata);
  const sizeOption = product?.sizeOptions.find(
    (item) => item.id === line.sizeOptionId
  );
  const sizeMetadata = normalizeMetadata(sizeOption?.metadata);

  return (
    productMetadata.isPackage === true ||
    String(productMetadata.source ?? "").trim() === "home-garden-package" ||
    Number(sizeMetadata.packageContentCount ?? 0) > 0 ||
    String(line.purchaseModeId ?? "").trim() === "package-content" ||
    String(line.purchaseModeLabel ?? "").trim().toLowerCase() ===
      "package contents"
  );
}

function isDiscountCodeLine(
  line: Pick<ShopResolvedCartLine, "purchaseModeId" | "productId">
) {
  return (
    line.purchaseModeId === "discount-code" ||
    line.productId === "discount-code"
  );
}

async function getOrderShopCatalog(questionnaireSlug: string) {
  if (questionnaireSlug === "callaloo") {
    await syncCallalooPackagesToUnifiedInventory(prisma as any);

    return getUnifiedShopCatalog(prisma as any, CALLALOO_PACKAGE_SHOP_SLUG, {
      ...littleOrchardShopCatalog,
      currencyCode: "JMD",
      weightUnit: "lb",
      products: [],
    });
  }

  if (questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG) {
    await syncHomeGardenPackagesToUnifiedInventory(prisma as any);

    return getUnifiedShopCatalog(prisma as any, GARDEN_PACKAGE_SHOP_SLUG, {
      ...littleOrchardShopCatalog,
      products: [],
    });
  }

  if (questionnaireSlug === SEEDLING_SHOP_SLUG) {
    return getUnifiedShopCatalog(prisma as any, SEEDLING_SHOP_SLUG, {
      ...littleOrchardShopCatalog,
      products: [],
    });
  }

  return getLittleOrchardUnifiedShopCatalog(prisma as any);
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

function getShopOrderCopy(questionnaireSlug: string) {
  if (questionnaireSlug === "callaloo") {
    return {
      header: "New Callaloo Subscription Order",
      shopName: "Callaloo Subscription",
      selectedHeading: "Subscription Details",
      quantitySummaryLabel: "Total subscription parcels",
      lineTotalLabel: "Subscription line total",
      sourceName: "Callaloo Subscription",
      businessEmailPurpose: "callaloo-subscription-business-order",
      customerEmailPurpose: "callaloo-subscription-customer-receipt",
    };
  }

  return {
    header: "New Little Orchard Shop Order",
    shopName: "Little Orchard Shop",
    selectedHeading: "Selected Items",
    quantitySummaryLabel: "Total number of items",
    lineTotalLabel: "Item total",
    sourceName: "Little Orchard Shop",
    businessEmailPurpose: "little-orchard-shop-business-order",
    customerEmailPurpose: "little-orchard-shop-customer-receipt",
  };
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
  paymentPreference,
  paymentPreferenceLabel,
  questionnaireSlug,
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
  paymentPreference: keyof typeof paymentPreferenceLabels | "";
  paymentPreferenceLabel: string;
  questionnaireSlug: string;
}) {
  const copy = getShopOrderCopy(questionnaireSlug);
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const plantCount = lines.reduce(
    (sum, line) => sum + (isDiscountCodeLine(line) ? 0 : line.quantity),
    0
  );
  const items = lines
    .map(
      (line, index) => {
        if (isDiscountCodeLine(line)) {
          return `${index + 1}. ${line.productTitle}\n   Discount: ${formatMoney(
            Math.abs(line.lineTotal)
          )}`;
        }

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
              `   ${copy.lineTotalLabel}: ${formatMoney(line.lineTotal)}`) +
          (isNurseryStockRequest
            ? "   Note: Event pickup stock is not available for this item. Nursery stock availability and final price will be confirmed when a representative reaches out."
            : "")
        );
      }
    )
    .join("\n\n");

  const parts = [
    copy.header,
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
  if (paymentPreferenceLabel) {
    parts.push(`Preferred payment option: ${paymentPreferenceLabel}`);
  }
  parts.push(
    "",
    copy.selectedHeading,
    "",
    items,
    "",
    "Order Summary",
    "",
    `${copy.quantitySummaryLabel}: ${plantCount}`,
    `Order total: ${formatMoney(total)}`,
    `Pickup / delivery: ${fulfillmentLabel}`,
    fulfillmentDetail,
    ...deliveryAddressLines,
    `Shop: ${copy.shopName}`,
    "",
    "Order Status Link",
    "",
    orderStatusLink,
    "",
    "Open this link to check payment and fulfillment status. We will use your selected update channel to confirm payment and fulfillment details."
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
  questionnaireSlug,
}: {
  orderCode: string;
  fullName: string;
  email: string;
  text: string;
  questionnaireSlug: string;
}) {
  const copy = getShopOrderCopy(questionnaireSlug);
  const businessEmail =
    process.env.PARALIFE_TREES_ORDER_EMAIL ||
    process.env.PLANT_GIVEAWAY_ADMIN_EMAIL ||
    littleOrchardPlantShowEvent.businessOrderEmail;
  const subject = `${copy.shopName} order ${orderCode}: ${fullName}`;
  const html = buildHtmlFromText(text);
  const sender = getEmailSenderForContext({ questionnaireSlug });

  await sendEmailMessage({
    to: businessEmail,
    subject,
    text,
    html,
    replyTo: email || null,
    fromEmail: sender.fromEmail,
    fromName: copy.shopName,
    purpose: copy.businessEmailPurpose,
  });

  if (email && isValidEmail(email)) {
    await sendEmailMessage({
      to: email,
      subject: `Your ${copy.shopName} order ${orderCode}`,
      text,
      html,
      replyTo: businessEmail,
      fromEmail: sender.fromEmail,
      fromName: copy.shopName,
      purpose: copy.customerEmailPurpose,
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
    const questionnaireSlug = cleanText(body.questionnaireSlug);
    const deviceType = normalizeDeviceType(body.deviceType);
    const contactMethod = normalizeContactMethod(body.contactMethod);
    const paymentPreference = normalizePaymentPreference(
      body.answers?.plantShopPaymentPreference
    );
    const paymentPreferenceLabel = paymentPreference
      ? paymentPreferenceLabels[paymentPreference]
      : "";
    const discountCode = cleanText(
      body.discountCode ||
        body.answers?.plantShopDiscountCode ||
        body.answers?.discountCode
    );
    const orderEmail = email && isValidEmail(email) ? email : "";
    let cart = normalizeOrderCart(body.orderCart);
    const shopCatalog = await getOrderShopCatalog(questionnaireSlug);
    let resolvedLines = resolveShopSelectedLines(shopCatalog, cart).filter(
      (line) =>
        line.selected !== false && line.availabilityStatus !== "unavailable"
    );
    let lines = resolvedLines.filter(
      (line) => !isPackageShellOrderLine(line, shopCatalog)
    );

    if (questionnaireSlug === "callaloo" && !lines.length) {
      const product = shopCatalog.products[0];
      const sizeOption = product?.sizeOptions[0];

      if (product && sizeOption) {
        const lineKey = makeShopLineKey(product.id, sizeOption.id);
        const submittedSubtotal =
          readNumericRecordValue(body.orderSummary, "subtotal") ||
          readNumericRecordValue(body.orderSummary, "grandTotal") ||
          Number(sizeOption.price || 0);

        cart = {
          [lineKey]: {
            productId: product.id,
            sizeOptionId: sizeOption.id,
            selected: true,
            quantity: 1,
            purchaseModeId: getDefaultPurchaseModeId(sizeOption),
            unitPriceOverride: submittedSubtotal,
            lockedQuantity: true,
            lockedPurchaseMode: true,
            metadata: {
              callalooAutoSubscription: true,
            },
          },
        };
        resolvedLines = resolveShopSelectedLines(shopCatalog, cart).filter(
          (line) =>
            line.selected !== false && line.availabilityStatus !== "unavailable"
        );
        lines = resolvedLines.filter(
          (line) => !isPackageShellOrderLine(line, shopCatalog)
        );
      }
    }

    if (questionnaireSlug === "callaloo" && !lines.length) {
      const submittedLines = normalizeSubmittedResolvedLines(body.resolvedLines).filter(
        (line) => line.selected !== false && line.availabilityStatus !== "unavailable"
      );

      if (submittedLines.length) {
        resolvedLines = submittedLines;
        lines = submittedLines;
      }
    }

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

    if (!paymentPreference) {
      return NextResponse.json(
        { ok: false, error: "Choose a payment option." },
        { status: 400 }
      );
    }

    if (paymentPreference === "card_payment") {
      return NextResponse.json(
        { ok: false, error: "Card payment is not available yet." },
        { status: 400 }
      );
    }

    const selectedFulfillmentMethod = cleanText(
      body.answers?.plantShopFulfillmentMethod
    );
    const requiresDeliveryAddress =
      (questionnaireSlug === "callaloo" &&
        selectedFulfillmentMethod === "package_delivery") ||
      questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG ||
      (questionnaireSlug === SEEDLING_SHOP_SLUG &&
        selectedFulfillmentMethod === "paid_delivery");

    if (requiresDeliveryAddress) {
      const requiredAddressFields = [
        body.answers?.plantDeliveryCountry,
        body.answers?.plantDeliveryRegion,
        body.answers?.plantDeliveryCityTown,
        body.answers?.plantDeliveryStreetAddress,
      ];

      if (requiredAddressFields.some((value) => !cleanText(value))) {
        return NextResponse.json(
          {
            ok: false,
            error:
              questionnaireSlug === SEEDLING_SHOP_SLUG
                ? "Enter the country, parish or region, city or town, and street address for seedling delivery."
                : "Enter the country, parish or region, city or town, and street address for package delivery.",
          },
          { status: 400 }
        );
      }
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

    const shopKey =
      questionnaireSlug === "callaloo"
        ? CALLALOO_PACKAGE_SHOP_SLUG
        : questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG
        ? GARDEN_PACKAGE_SHOP_SLUG
        : questionnaireSlug === SEEDLING_SHOP_SLUG
          ? SEEDLING_SHOP_SLUG
          : LITTLE_ORCHARD_SHOP_SLUG;
    const discount = await evaluateDiscountCode({
      db: prisma as any,
      code: discountCode,
      shopKey,
      lines,
      customerEmail: orderEmail,
      customerPhone: whatsappNumber || phoneNumber,
      currencyCode: shopCatalog.currencyCode || "JMD",
    });

    if (!discount.ok) {
      const discountError =
        "error" in discount && discount.error
          ? discount.error
          : "Discount code is not valid.";

      return NextResponse.json(
        { ok: false, error: discountError },
        { status: 400 }
      );
    }
    const appliedDiscount =
      discount.applied && "code" in discount && discount.id
        ? (discount as {
            id: string;
            code: string;
            label: string;
            discountType: string;
            discountValue: number;
            currencyCode?: string;
            minimumSpend?: number;
            discountAmount: number;
            eligibleSubtotal: number;
          })
        : null;

    const orderCode = makeOrderCode();
    const cashierToken = makeCashierToken();
    const cashierLink = `${getBaseUrl(request)}/admin/event-orders/order/${cashierToken}`;
    const orderStatusLink = `${getBaseUrl(request)}/order-status/${cashierToken}`;
    const receiptCode = makeReceiptCode(orderCode);
    const receiptLink = `${getBaseUrl(request)}/receipt/${cashierToken}`;
    const discountLine =
      appliedDiscount && appliedDiscount.discountAmount > 0
        ? ({
            lineKey: `discount-${appliedDiscount.code}`,
            productId: "discount-code",
            productSku: appliedDiscount.code,
            productTitle: `Discount code ${appliedDiscount.code}`,
            sizeOptionId: "discount-code",
            sizeOptionSku: appliedDiscount.code,
            sizeLabel: appliedDiscount.label || appliedDiscount.code,
            purchaseModeId: "discount-code",
            purchaseModeSku: appliedDiscount.code,
            purchaseModeLabel: "Discount",
            sku: `DISCOUNT-${appliedDiscount.code}`,
            selected: true,
            availabilityStatus: "available",
            quantity: 1,
            unitPrice: -appliedDiscount.discountAmount,
            lineTotal: -appliedDiscount.discountAmount,
          } as unknown as ShopResolvedCartLine)
        : null;
    const orderLines = discountLine ? [...lines, discountLine] : lines;
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const total = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const plantCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const submittedAt = new Date();
    const orderCopy = getShopOrderCopy(questionnaireSlug);
    const fulfillmentAnswers =
      (questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG ||
        questionnaireSlug === "callaloo") &&
      !cleanText(body.answers?.plantShopFulfillmentMethod)
        ? {
            ...(body.answers || {}),
            plantShopFulfillmentMethod: "package_delivery",
          }
        : body.answers;
    const fulfillmentOption =
      getLittleOrchardFulfillmentOption(fulfillmentAnswers);
    const fulfillmentKey = getLittleOrchardFulfillmentKey(fulfillmentAnswers);

    const deliveryAddressLines = getLittleOrchardDeliveryAddressLines(
      fulfillmentAnswers
    );
    const shippingMethod = fulfillmentOption.shippingMethod;
    const metadata = toJsonValue({
      event: littleOrchardPlantShowEvent,
      questionnaireSlug,
      shopDisplayName: orderCopy.shopName,
      orderDisplayType: orderCopy.shopName,
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
      paymentPreference: paymentPreference || null,
      paymentPreferenceLabel: paymentPreferenceLabel || null,
      fulfillmentPreference: fulfillmentOption.label,
      fulfillmentDetail: fulfillmentOption.detail,
      deliveryAddressLines,
      totalPlants: plantCount,
      orderTotal: total,
      baseCurrency: "JMD",
      baseSubtotal: subtotal,
      baseDiscount: appliedDiscount ? appliedDiscount.discountAmount : 0,
      baseTotal: total,
      displayCurrency: shopCatalog.currencyCode || "JMD",
      displayExchangeRate: 1,
      displayConvertedTotal: total,
      discountCode: appliedDiscount ? appliedDiscount.code : null,
      discountLabel: appliedDiscount ? appliedDiscount.label : null,
      discountType: appliedDiscount ? appliedDiscount.discountType : null,
      discountValue: appliedDiscount ? appliedDiscount.discountValue : null,
      discountCurrencyCode: appliedDiscount ? appliedDiscount.currencyCode : null,
      discountMinimumSpend: appliedDiscount ? appliedDiscount.minimumSpend : null,
      discountEligibleSubtotal: appliedDiscount
        ? appliedDiscount.eligibleSubtotal
        : null,
      discountAmount: appliedDiscount ? appliedDiscount.discountAmount : 0,
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
        data: orderLines.map((line) => ({
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
        fulfillmentType: isDiscountCodeLine(line) ? "discount" : "physical",
        quantity: line.quantity,
        currencyCode: shopCatalog.currencyCode || "JMD",
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        recipientName: fullName,
        recipientEmail: orderEmail || null,
        recipientRole: "customer",
        status: "PENDING",
        fulfillmentStatus: isDiscountCodeLine(line) ? "FULFILLED" : "PENDING",
        fulfillmentNotes: [
          isDiscountCodeLine(line)
            ? "Discount code line. No fulfillment action required."
            : "",
          `Fulfillment method: ${shippingMethod}`,
          `Pickup / delivery: ${fulfillmentOption.label}`,
          fulfillmentOption.detail,
          deliveryAddressLines.length
            ? `Delivery address: ${deliveryAddressLines.join("; ")}`
            : "",
          `Device type: ${deviceType}`,
          `Contact method: ${contactMethod}`,
          paymentPreferenceLabel
            ? `Preferred payment option: ${paymentPreferenceLabel}`
            : "",
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
          source: orderCopy.sourceName,
          nextStatus: "PENDING",
          notes: `Order submitted through the ${orderCopy.shopName}.`,
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
          notes: [
            "Order is awaiting customer payment.",
            paymentPreferenceLabel
              ? `Selected payment option: ${paymentPreferenceLabel}.`
              : "",
            "Customer may request a payment option change through their selected receipt / communication channel.",
          ]
            .filter(Boolean)
            .join(" "),
          metadata: {
            orderActivityKey: `${orderCode}:awaiting-payment`,
            paymentPreference: paymentPreference || null,
            paymentPreferenceLabel: paymentPreferenceLabel || null,
            paymentWindowMinutes:
              littleOrchardPlantShowEvent.reservationDurationMinutes,
          },
        });
      }

      if (appliedDiscount) {
        await recordDiscountRedemption({
          db: tx as any,
          discountCodeId: appliedDiscount.id,
          code: appliedDiscount.code,
          orderCode,
          shopKey,
          customerEmail: orderEmail,
          customerPhone: whatsappNumber || phoneNumber,
          discountAmount: appliedDiscount.discountAmount,
          cartSubtotal: subtotal,
          metadata: {
            orderRequestKey,
            customerName: fullName,
            questionnaireSlug,
          },
        });
      }
    });

    const text = buildOrderText({
      orderCode,
      fullName,
      email: orderEmail,
      lines: orderLines,
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
      paymentPreference,
      paymentPreferenceLabel,
      questionnaireSlug,
    });

    let emailDeliveryStatus = "not_requested";

    try {
      await sendOrderEmails({
        orderCode,
        fullName,
        email: orderEmail,
        text,
        questionnaireSlug,
      });
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
