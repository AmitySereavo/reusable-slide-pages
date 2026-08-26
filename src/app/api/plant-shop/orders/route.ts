import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  littleOrchardPlantShowEvent,
  BUSH_TEA_SHOP_SLUG,
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
  syncBushTeaProductsToUnifiedInventory,
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
import { getShopDisplayName, getShopOrderLabel } from "@/config/shopIdentities";
import { createOrderFulfillmentActivity } from "@/lib/plantShop/orderActivity";
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
  card_payment: "Card payment (Stripe)",
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

function isOrderFeeLine(
  line: Pick<ShopResolvedCartLine, "purchaseModeId" | "productId" | "productSku" | "sku">
) {
  return (
    line.purchaseModeId === "order-fee" ||
    String(line.productId || "").endsWith("-fee") ||
    String(line.productId || "").includes("phytosanitary-certificate") ||
    String(line.productSku || "").includes("PHYTO-CERTIFICATE") ||
    String(line.sku || "").includes("PHYTO-CERTIFICATE")
  );
}

function isRequiredShopFeeProduct(product: ShopCatalog["products"][number] | undefined) {
  if (!product) {
    return false;
  }

  return (
    product.metadata?.requiredShopFee === true ||
    product.sizeOptions.some(
      (sizeOption) => sizeOption.metadata?.requiredShopFee === true
    )
  );
}

function getProductCertificationRequirement(
  catalog: ShopCatalog,
  productId: string,
  sizeOptionId?: string
) {
  const product = catalog.products.find((item) => item.id === productId);

  if (!product || isRequiredShopFeeProduct(product)) {
    return "N/A";
  }

  const sizeOption = sizeOptionId
    ? product.sizeOptions.find((option) => option.id === sizeOptionId)
    : undefined;
  const rawRequirement =
    sizeOption?.metadata?.certificationRequired ??
    product.metadata?.certificationRequired ??
    "N/A";
  const requirement = cleanText(rawRequirement);

  return requirement || "N/A";
}

function lineRequiresPhytosanitaryCertificate(
  line: ShopResolvedCartLine,
  catalog: ShopCatalog
) {
  return (
    !isOrderFeeLine(line) &&
    getProductCertificationRequirement(
      catalog,
      line.productId,
      line.sizeOptionId
    ).toLowerCase() === "phytosanitary"
  );
}

function findRequiredShopFeeLine(
  catalog: ShopCatalog
): ShopResolvedCartLine | null {
  const product = catalog.products.find(isRequiredShopFeeProduct);
  const sizeOption = product?.sizeOptions.find(
    (option) => option.metadata?.requiredShopFee === true
  );

  if (!product || !sizeOption) {
    return null;
  }

  return {
    lineKey: makeShopLineKey(product.id, sizeOption.id),
    productId: product.id,
    productSku: product.sku,
    productTitle: product.title,
    productImageUrl: product.imageUrl,
    sizeOptionId: sizeOption.id,
    sizeOptionSku: sizeOption.sku,
    sizeLabel: sizeOption.label,
    sizeOptionMetadata: sizeOption.metadata,
    purchaseModeId: "order-fee",
    purchaseModeLabel: "Required fee",
    sku: sizeOption.sku || product.sku,
    selected: true,
    availabilityStatus: "available",
    fulfillmentType: "physical",
    quantity: 1,
    unitPrice: Number(sizeOption.price || 0),
    lineTotal: Number(sizeOption.price || 0),
  };
}

const BUSH_TEA_SHIPPING_FEE_JMD = 1500;
const BUSH_TEA_FREE_SHIPPING_THRESHOLD_JMD = 15000;

function isJamaicaDestination(value: unknown) {
  return ["jamaica", "jm"].includes(cleanText(value).toLowerCase());
}

function isBushTeaShippingOutsideJamaica(answers: Record<string, unknown> | undefined) {
  const shippingCountry = cleanText(answers?.plantDeliveryCountry);

  return Boolean(shippingCountry && !isJamaicaDestination(shippingCountry));
}

function getBushTeaShippingFeeJmd({
  productSubtotalJmd,
  destination,
}: {
  productSubtotalJmd: number;
  destination?: unknown;
}) {
  if (productSubtotalJmd <= 0) {
    return 0;
  }

  const normalizedDestination = cleanText(destination).toLowerCase();

  // Bush Tea is currently flat-rate shipping. Keep destination in this helper
  // so later location-specific shipping rules have one place to branch.
  if (normalizedDestination) {
    return productSubtotalJmd >= BUSH_TEA_FREE_SHIPPING_THRESHOLD_JMD
      ? 0
      : BUSH_TEA_SHIPPING_FEE_JMD;
  }

  return productSubtotalJmd >= BUSH_TEA_FREE_SHIPPING_THRESHOLD_JMD
    ? 0
    : BUSH_TEA_SHIPPING_FEE_JMD;
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

  if (questionnaireSlug === BUSH_TEA_SHOP_SLUG) {
    await syncBushTeaProductsToUnifiedInventory(prisma as any);

    return getUnifiedShopCatalog(prisma as any, BUSH_TEA_SHOP_SLUG, {
      ...littleOrchardShopCatalog,
      currencyCode: "JMD",
      weightUnit: "lb",
      products: [],
    });
  }

  return getLittleOrchardUnifiedShopCatalog(prisma as any);
}

function toJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getOrderCodePrefix(questionnaireSlug: string) {
  if (questionnaireSlug === BUSH_TEA_SHOP_SLUG) return "BT";
  if (questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG) return "GP";
  if (questionnaireSlug === SEEDLING_SHOP_SLUG) return "SEED";
  if (questionnaireSlug === "callaloo") return "CALL";

  return "LO";
}

function makeOrderCode(questionnaireSlug: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `${getOrderCodePrefix(questionnaireSlug)}-${stamp}-${suffix}`;
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

function getStripeSecretKey() {
  return cleanText(process.env.STRIPE_SECRET_KEY);
}

function toStripeMinorUnit(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function buildStripeCheckoutDescription(lines: ShopResolvedCartLine[]) {
  const labels = lines.slice(0, 6).map((line) => {
    if (isOrderFeeLine(line) || isDiscountCodeLine(line)) {
      return `${line.productTitle}: ${formatMoney(line.lineTotal)}`;
    }

    return `${line.quantity} x ${line.productTitle} - ${line.sizeLabel}`;
  });

  if (lines.length > labels.length) {
    labels.push(`+${lines.length - labels.length} more item(s)`);
  }

  return labels.join("; ").slice(0, 480);
}

async function createPlantShopStripeCheckoutSession({
  request,
  orderCode,
  orderStatusLink,
  receiptLink,
  questionnaireSlug,
  shopName,
  customerEmail,
  lines,
  total,
}: {
  request: Request;
  orderCode: string;
  orderStatusLink: string;
  receiptLink: string;
  questionnaireSlug: string;
  shopName: string;
  customerEmail: string;
  lines: ShopResolvedCartLine[];
  total: number;
}) {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("Stripe sandbox is not configured. Add STRIPE_SECRET_KEY.");
  }

  const amount = toStripeMinorUnit(total);

  if (amount <= 0) {
    throw new Error("Stripe checkout requires an order total greater than zero.");
  }

  const origin = getBaseUrl(request);
  const successUrl = `${orderStatusLink}?payment=stripe-success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/questionnaire/${encodeURIComponent(
    questionnaireSlug
  )}?slide=bush-tea-review&payment=stripe-cancelled&order=${encodeURIComponent(
    orderCode
  )}`;
  const paymentDescription = buildStripeCheckoutDescription(lines);
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("client_reference_id", orderCode);
  if (customerEmail) {
    params.set("customer_email", customerEmail);
  }
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "jmd");
  params.set("line_items[0][price_data][unit_amount]", String(amount));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `${shopName} order ${orderCode}`
  );
  if (paymentDescription) {
    params.set(
      "line_items[0][price_data][product_data][description]",
      paymentDescription
    );
  }
  params.set("metadata[source]", "plant-shop");
  params.set("metadata[orderCode]", orderCode);
  params.set("metadata[questionnaireSlug]", questionnaireSlug);
  params.set("metadata[orderStatusLink]", orderStatusLink);
  params.set("metadata[receiptLink]", receiptLink);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.url) {
    throw new Error(
      payload?.error?.message || "Stripe checkout session could not be created."
    );
  }

  return {
    provider: "stripe",
    mode: secretKey.startsWith("sk_test_") ? "sandbox" : "live",
    checkoutSessionId: cleanText(payload.id),
    checkoutUrl: cleanText(payload.url),
  };
}

function formatMoney(value: number) {
  return `JMD $${Math.round(value).toLocaleString("en-JM")}`;
}

function getShopOrderCopy(questionnaireSlug: string) {
  if (questionnaireSlug === "callaloo") {
    const shopName = getShopDisplayName("callaloo", "Callaloo Subscription");
    return {
      header: `New ${getShopOrderLabel("callaloo", "Callaloo Subscription")} Order`,
      shopName,
      selectedHeading: "Subscription Details",
      quantitySummaryLabel: "Total subscription parcels",
      lineTotalLabel: "Subscription line total",
      sourceName: shopName,
      businessEmailPurpose: "callaloo-subscription-business-order",
      customerEmailPurpose: "callaloo-subscription-customer-receipt",
    };
  }

  const shopName = getShopDisplayName(
    questionnaireSlug,
    getShopDisplayName("little-orchard-shop", "Little Orchard Shop")
  );
  const orderLabel = getShopOrderLabel(
    questionnaireSlug,
    getShopOrderLabel("little-orchard-shop", "Little Orchard Order")
  );

  return {
    header: `New ${orderLabel}`,
    shopName,
    selectedHeading: "Selected Items",
    quantitySummaryLabel: "Total number of items",
    lineTotalLabel: "Item total",
    sourceName: shopName,
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
    (sum, line) =>
      sum +
      (isDiscountCodeLine(line) || isOrderFeeLine(line) ? 0 : line.quantity),
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

        if (isOrderFeeLine(line)) {
          return `${index + 1}. ${line.productTitle}\n   ${line.sizeLabel}\n   Fee: ${formatMoney(
            line.lineTotal
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
  sendCustomerEmail = true,
}: {
  orderCode: string;
  fullName: string;
  email: string;
  text: string;
  questionnaireSlug: string;
  sendCustomerEmail?: boolean;
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

  if (sendCustomerEmail && email && isValidEmail(email)) {
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
    const submittedPaymentPreference = normalizePaymentPreference(
      body.answers?.plantShopPaymentPreference
    );
    const paymentPreference =
      questionnaireSlug === BUSH_TEA_SHOP_SLUG && !submittedPaymentPreference
        ? "card_payment"
        : submittedPaymentPreference;
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
    const orderSourceType = questionnaireSlug || LITTLE_ORCHARD_SHOP_SLUG;
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

    const bushTeaShipsOutsideJamaica =
      questionnaireSlug === BUSH_TEA_SHOP_SLUG &&
      isBushTeaShippingOutsideJamaica(body.answers);
    const initialProductOrderLines = lines.filter(
      (line) => !isOrderFeeLine(line)
    );
    const bushTeaCertificateRequired =
      bushTeaShipsOutsideJamaica &&
      initialProductOrderLines.some((line) =>
        lineRequiresPhytosanitaryCertificate(line, shopCatalog)
      );

    if (questionnaireSlug === BUSH_TEA_SHOP_SLUG && !bushTeaCertificateRequired) {
      lines = lines.filter((line) => !isOrderFeeLine(line));
      resolvedLines = resolvedLines.filter((line) => !isOrderFeeLine(line));
    }

    if (
      bushTeaCertificateRequired &&
      initialProductOrderLines.length > 0 &&
      !lines.some((line) => isOrderFeeLine(line))
    ) {
      const requiredFeeLine = findRequiredShopFeeLine(shopCatalog);

      if (!requiredFeeLine) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The Phytosanitary Certificate is required, but the certificate fee item is not configured.",
          },
          { status: 400 }
        );
      }

      lines = [...lines, requiredFeeLine];
      resolvedLines = [...resolvedLines, requiredFeeLine];
    }

    const productOrderLines = lines.filter((line) => !isOrderFeeLine(line));

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

    if (!productOrderLines.length) {
      return NextResponse.json(
        { ok: false, error: "Select at least one item before submitting." },
        { status: 400 }
      );
    }

    if (questionnaireSlug === BUSH_TEA_SHOP_SLUG) {
      if (!phoneNumber) {
        return NextResponse.json(
          { ok: false, error: "Enter your contact number." },
          { status: 400 }
        );
      }

      if (!hasCountryAndAreaCode(phoneNumber)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Enter the contact number with country and area code.",
          },
          { status: 400 }
        );
      }
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

    if (
      paymentPreference === "card_payment" &&
      questionnaireSlug !== BUSH_TEA_SHOP_SLUG
    ) {
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
      questionnaireSlug === BUSH_TEA_SHOP_SLUG ||
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
              questionnaireSlug === BUSH_TEA_SHOP_SLUG
                ? "Enter the country, parish or region, city or town, and street address for bush tea shipping."
                : questionnaireSlug === SEEDLING_SHOP_SLUG
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
        sourceType: orderSourceType,
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
        checkoutUrl:
          typeof duplicateMetadata.stripeCheckoutSessionUrl === "string"
            ? duplicateMetadata.stripeCheckoutSessionUrl
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
          : questionnaireSlug === BUSH_TEA_SHOP_SLUG
            ? BUSH_TEA_SHOP_SLUG
          : LITTLE_ORCHARD_SHOP_SLUG;
    const discount = await evaluateDiscountCode({
      db: prisma as any,
      code: discountCode,
      shopKey,
      lines: productOrderLines,
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

    const orderCode = makeOrderCode(questionnaireSlug);
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
    const bushTeaProductSubtotal = productOrderLines.reduce(
      (sum, line) => sum + line.lineTotal,
      0
    );
    const bushTeaShippingLine =
      questionnaireSlug === BUSH_TEA_SHOP_SLUG &&
      getBushTeaShippingFeeJmd({
        productSubtotalJmd: bushTeaProductSubtotal,
        destination: body.answers?.plantDeliveryCountry,
      }) > 0
        ? ({
            lineKey: "bush-tea-shipping-fee",
            productId: "bush-tea-shipping-fee",
            productSku: "BUSH-TEA-SHIPPING",
            productTitle: "Jamaica postal service shipping",
            sizeOptionId: "bush-tea-shipping-fee",
            sizeOptionSku: "BUSH-TEA-SHIPPING-FLAT",
            sizeLabel: "Flat rate shipping",
            purchaseModeId: "order-fee",
            purchaseModeSku: "BUSH-TEA-SHIPPING-FLAT",
            purchaseModeLabel: "Shipping fee",
            sku: "BUSH-TEA-SHIPPING-FLAT",
            selected: true,
            availabilityStatus: "available",
            fulfillmentType: "physical",
            quantity: 1,
            unitPrice: getBushTeaShippingFeeJmd({
              productSubtotalJmd: bushTeaProductSubtotal,
              destination: body.answers?.plantDeliveryCountry,
            }),
            lineTotal: getBushTeaShippingFeeJmd({
              productSubtotalJmd: bushTeaProductSubtotal,
              destination: body.answers?.plantDeliveryCountry,
            }),
          } as unknown as ShopResolvedCartLine)
        : null;
    const orderLines = [
      ...lines,
      ...(bushTeaShippingLine ? [bushTeaShippingLine] : []),
      ...(discountLine ? [discountLine] : []),
    ];
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const serviceFeeLines = orderLines.filter(isOrderFeeLine);
    const serviceFeeTotal = serviceFeeLines.reduce(
      (sum, line) => sum + line.lineTotal,
      0
    );
    const total = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const plantCount = lines.reduce(
      (sum, line) =>
        sum +
        (isDiscountCodeLine(line) || isOrderFeeLine(line) ? 0 : line.quantity),
      0
    );
    const submittedAt = new Date();
    const orderCopy = getShopOrderCopy(questionnaireSlug);
    const fulfillmentAnswers =
      questionnaireSlug === BUSH_TEA_SHOP_SLUG
        ? {
            ...(body.answers || {}),
            plantShopFulfillmentMethod: "bush_tea_jamaica_post",
          }
        : (questionnaireSlug === GARDEN_PACKAGE_SHOP_SLUG ||
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
      baseServiceFees: serviceFeeTotal,
      baseDiscount: appliedDiscount ? appliedDiscount.discountAmount : 0,
      baseTotal: total,
      displayCurrency: shopCatalog.currencyCode || "JMD",
      displayExchangeRate: 1,
      displayConvertedTotal: total,
      serviceFees:
        serviceFeeLines.length > 0
          ? serviceFeeLines.map((line) => ({
              key: line.lineKey,
              label: line.productTitle,
              amount: line.lineTotal,
              currencyCode: shopCatalog.currencyCode || "JMD",
              detail: line.sizeLabel,
            }))
          : [],
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
        sourceType: orderSourceType,
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
        fulfillmentType: isDiscountCodeLine(line)
          ? "discount"
          : isOrderFeeLine(line)
            ? "fee"
            : "physical",
        quantity: line.quantity,
        currencyCode: shopCatalog.currencyCode || "JMD",
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        recipientName: fullName,
        recipientEmail: orderEmail || null,
        recipientRole: "customer",
        status: "PENDING",
        fulfillmentStatus:
          isDiscountCodeLine(line) || isOrderFeeLine(line)
            ? "FULFILLED"
            : "PENDING",
        fulfillmentNotes: [
          isDiscountCodeLine(line)
            ? "Discount code line. No fulfillment action required."
            : isOrderFeeLine(line)
              ? "Order fee line. No product fulfillment action required."
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
          sourceType: orderSourceType,
          orderCode,
        },
        orderBy: { createdAt: "asc" },
      });
      const firstCreatedItem = createdItems[0];

      if (firstCreatedItem) {
        await createOrderFulfillmentActivity(tx as any, {
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

        await createOrderFulfillmentActivity(tx as any, {
          fulfillmentItemId: firstCreatedItem.id,
          orderCode,
          stageKey: "awaiting-payment",
          stageLabel: "Awaiting payment",
          updateType: "system",
          source: orderCopy.sourceName,
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

    const stripeCheckout =
      paymentPreference === "card_payment"
        ? await createPlantShopStripeCheckoutSession({
            request,
            orderCode,
            orderStatusLink,
            receiptLink,
            questionnaireSlug,
            shopName: orderCopy.shopName,
            customerEmail: orderEmail,
            lines: orderLines,
            total,
          })
        : null;

    if (stripeCheckout) {
      const createdItems = await prisma.orderFulfillmentItem.findMany({
        where: {
          sourceType: orderSourceType,
          orderCode,
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      await Promise.all(
        createdItems.map((item) =>
          prisma.orderFulfillmentItem.update({
            where: { id: item.id },
            data: {
              metadata: {
                ...normalizeMetadata(item.metadata),
                paymentPreference: "card_payment",
                paymentPreferenceLabel: paymentPreferenceLabels.card_payment,
                paymentStatus: "STRIPE_CHECKOUT_PENDING",
                paymentMethod: "stripe_card",
                paymentMethodLabel: paymentPreferenceLabels.card_payment,
                stripeCheckoutSessionId:
                  stripeCheckout.checkoutSessionId || null,
                stripeCheckoutSessionUrl: stripeCheckout.checkoutUrl,
                stripeMode: stripeCheckout.mode,
              } as Prisma.InputJsonObject,
            },
          })
        )
      );
    }

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
        sendCustomerEmail: !stripeCheckout,
      });
      emailDeliveryStatus = "sent";
    } catch (error) {
      emailDeliveryStatus = "failed";
      console.error(`${orderCopy.shopName} order email failed:`, error);
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
      checkoutUrl: stripeCheckout?.checkoutUrl || null,
      whatsappUrl,
      emailDeliveryStatus,
      message:
        adminAssisted
          ? "Order created. Opening the order record for admin processing."
          : stripeCheckout?.checkoutUrl
          ? "Your order has been recorded. Stripe Checkout is opening now."
          : contactMethod === "whatsapp"
          ? "Your order has been recorded. WhatsApp is ready with your order message."
          : contactMethod === "email"
            ? "Your order has been recorded. A receipt and order summary will be sent to your email address."
            : "Your order has been recorded. We will use your selected contact channel for order updates.",
    });
  } catch (error) {
    console.error("Plant shop order create error:", error);

    return NextResponse.json(
      { ok: false, error: "Order could not be recorded." },
      { status: 500 }
    );
  }
}
