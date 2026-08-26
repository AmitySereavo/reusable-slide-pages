import { Prisma } from "@prisma/client";
import Link from "next/link";
import { getShopDisplayName } from "@/config/shopIdentities";
import { prisma } from "@/lib/prisma";
import {
  ensureLittleOrchardReceiptCode,
  readMetadata,
} from "@/lib/plantShop/receiptCodes";
import { getShopReceiptSetting } from "@/lib/receipt/shopReceiptSettings";
import PrintReceiptButton from "./PrintReceiptButton";

export function normalizeToken(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

export function formatMoney(currencyCode: string | null, value: unknown) {
  const currency = currencyCode || "JMD";
  const amount = Number(value ?? 0);

  if (currency === "JMD") {
    return `JMD $${Math.round(amount).toLocaleString("en-JM")}`;
  }

  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDate(value: unknown) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Jamaica",
  }).format(new Date(String(value)));
}

function isNurseryStockRequest(item: any) {
  return item?.purchaseModeId === "nursery-stock-request";
}

function getReceiptItemTitle(item: any) {
  return isNurseryStockRequest(item) ? "Nursery stock request" : item.productTitle;
}

function getRequestedItemLabel(item: any) {
  return [item.productTitle, item.sizeLabel].filter(Boolean).join(" - ");
}

function getReceiptCopy(metadata: Record<string, unknown>) {
  const shopName = getShopDisplayName(String(metadata.questionnaireSlug || ""));

  if (metadata.questionnaireSlug === "callaloo") {
    return {
      eyebrow: shopName,
      lineSectionTitle: "Subscription Details",
      lineTotalLabel: "Subscription line total",
    };
  }

  return {
    eyebrow: shopName || getShopDisplayName("little-orchard-shop"),
    lineSectionTitle: "Items",
    lineTotalLabel: "Line total",
  };
}

export async function getLittleOrchardOrderItemsByToken(token: string) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      "orderCode",
      "productTitle",
      "sizeLabel",
      "purchaseModeId",
      "purchaseModeLabel",
      "quantity",
      "currencyCode",
      "unitPrice",
      "lineTotal",
      "recipientName",
      "recipientEmail",
      "fulfillmentStatus",
      "currentStageLabel",
      "createdAt",
      "updatedAt",
      "metadata"
    FROM "OrderFulfillmentItem"
    WHERE "metadata"->>'cashierToken' = ${token}
    ORDER BY "createdAt" ASC
  `);
}

export async function getLittleOrchardOrderItemsByCode(orderCode: string) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      "orderCode",
      "productTitle",
      "sizeLabel",
      "purchaseModeId",
      "purchaseModeLabel",
      "quantity",
      "currencyCode",
      "unitPrice",
      "lineTotal",
      "recipientName",
      "recipientEmail",
      "fulfillmentStatus",
      "currentStageLabel",
      "createdAt",
      "updatedAt",
      "metadata"
    FROM "OrderFulfillmentItem"
    WHERE "orderCode" = ${orderCode}
    ORDER BY "createdAt" ASC
  `);
}

export default async function ReceiptView({
  items,
  token,
}: {
  items: any[];
  token?: string;
}) {
  if (!items.length) {
    return null;
  }

  const firstItem = items[0];
  const metadata = readMetadata(firstItem.metadata);
  const shopKey = String(metadata.questionnaireSlug || "little-orchard-shop");
  const copy = getReceiptCopy(metadata);
  const receiptSetting = await getShopReceiptSetting(prisma, shopKey);
  const colors = receiptSetting.colors;
  const orderCode = String(firstItem.orderCode || "");
  const receiptCode =
    String(metadata.receiptCode || "") ||
    (orderCode ? await ensureLittleOrchardReceiptCode(prisma, orderCode) : "");
  const customerName = String(firstItem.recipientName || "Customer");
  const receiptToken = token || String(metadata.cashierToken || "");
  const currencyCode = String(firstItem.currencyCode || "JMD");
  const orderTotal = items.reduce(
    (sum, item) => sum + Number(item.lineTotal || 0),
    0
  );
  const cashTendered =
    metadata.cashTendered !== undefined ? Number(metadata.cashTendered) : null;
  const changeDue =
    metadata.changeDue !== undefined ? Number(metadata.changeDue) : null;

  return (
    <main style={{ ...pageStyle, background: colors.pageBackground, color: colors.text }}>
      <section
        id="shop-receipt"
        style={{
          ...panelStyle,
          background: colors.panelBackground,
          borderColor: colors.border,
          boxShadow: `0 24px 70px ${colors.accent}29`,
        }}
      >
        <p style={{ ...eyebrowStyle, color: colors.accent }}>{copy.eyebrow}</p>
        <h1 style={{ ...titleStyle, color: colors.text }}>Receipt</h1>
        <p style={customerNameStyle}>{customerName}</p>
        <p style={orderCodeStyle}>{orderCode}</p>

        <div style={summaryGridStyle}>
          <Info
            label="Date and time"
            value={`${formatDate(firstItem.createdAt)} Jamaica time`}
          />
          <Info label="Receipt code" value={receiptCode || "Not recorded"} />
          <Info
            label="Payment"
            value={String(metadata.paymentMethodLabel || "Not confirmed")}
          />
          <Info
            label="Payment confirmed"
            value={`${formatDate(metadata.paymentConfirmedAt)} Jamaica time`}
          />
          <Info label="Order total" value={formatMoney(currencyCode, orderTotal)} />
          {cashTendered !== null && Number.isFinite(cashTendered) ? (
            <Info
              label="Cash received"
              value={formatMoney(currencyCode, cashTendered)}
            />
          ) : null}
          {changeDue !== null && Number.isFinite(changeDue) ? (
            <Info
              label="Change returned"
              value={formatMoney(currencyCode, changeDue)}
            />
          ) : null}
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>{copy.lineSectionTitle}</h2>
          <div style={itemListStyle}>
            {items.map((item, index) => (
              <div
                key={`${item.productTitle}-${item.sizeLabel}-${index}`}
                style={itemStyle}
              >
                <strong>{getReceiptItemTitle(item)}</strong>
                {isNurseryStockRequest(item) ? (
                  <>
                    <span>Requested item: {getRequestedItemLabel(item)}</span>
                    <span>
                      Availability and final product price will be confirmed by
                      a representative.
                    </span>
                  </>
                ) : item.sizeLabel ? (
                  <span>{item.sizeLabel}</span>
                ) : null}
                {item.purchaseModeLabel && !isNurseryStockRequest(item) ? (
                  <span>{item.purchaseModeLabel}</span>
                ) : null}
                <span>Quantity: {item.quantity}</span>
                <span>
                  {isNurseryStockRequest(item) ? "Request fee" : "Unit price"}:{" "}
                  {formatMoney(item.currencyCode, item.unitPrice)}
                </span>
                <strong>
                  {copy.lineTotalLabel}:{" "}
                  {formatMoney(item.currencyCode, item.lineTotal)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <div className="receipt-page-actions" style={buttonRowStyle}>
          <PrintReceiptButton
            style={{
              ...printButtonStyle,
              background: colors.primaryButtonBackground,
              color: colors.primaryButtonText,
            }}
            token={receiptToken}
          />
          <Link
            href={receiptSetting.shopUrl}
            style={{
              ...shopButtonStyle,
              background: colors.primaryButtonBackground,
              color: colors.primaryButtonText,
            }}
          >
            {receiptSetting.shopButtonLabel}
          </Link>
          <Link
            href={receiptSetting.promotionUrl}
            style={{
              ...giveawayButtonStyle,
              background: colors.promotionButtonBackground,
              color: colors.promotionButtonText,
            }}
          >
            {receiptSetting.promotionButtonLabel}
          </Link>
          <Link
            href="/receipt"
            style={{
              ...lookupLinkStyle,
              background: colors.secondaryButtonBackground,
              color: colors.secondaryButtonText,
              borderColor: colors.border,
            }}
          >
            Search for another receipt
          </Link>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle = {
  background: "#F6F0E3",
  color: "#28231F",
  minHeight: "100vh",
  padding: "22px",
};

const panelStyle = {
  background: "#FFFDF8",
  border: "1px solid #CDBEA7",
  borderRadius: "18px",
  boxShadow: "0 24px 70px rgba(53, 94, 59, 0.16)",
  margin: "0 auto",
  maxWidth: "760px",
  padding: "24px",
};

const eyebrowStyle = {
  color: "#7B3F2A",
  fontSize: "14px",
  fontWeight: 800,
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  color: "#355E3B",
  fontSize: "38px",
  lineHeight: 1.05,
  margin: 0,
};

const customerNameStyle = {
  color: "#28231F",
  fontSize: "18px",
  fontWeight: 800,
  margin: "10px 0 0",
};

const orderCodeStyle = {
  color: "rgba(40, 35, 31, 0.68)",
  fontSize: "15px",
  margin: "8px 0 18px",
  overflowWrap: "anywhere" as const,
};

const summaryGridStyle = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  marginBottom: "20px",
};

const infoStyle = {
  background: "#F7F1E7",
  borderRadius: "12px",
  display: "grid",
  gap: "4px",
  padding: "12px",
};

const sectionStyle = {
  display: "grid",
  gap: "10px",
};

const sectionTitleStyle = {
  fontSize: "20px",
  margin: 0,
};

const itemListStyle = {
  display: "grid",
  gap: "10px",
};

const itemStyle = {
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: "12px",
  display: "grid",
  gap: "4px",
  padding: "12px",
};

const buttonRowStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "20px",
};

const printButtonStyle = {
  background: "#355E3B",
  border: 0,
  borderRadius: "14px",
  color: "#FFFFFF",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 800,
  padding: "14px 18px",
  textAlign: "center" as const,
};

const shopButtonStyle = {
  background: "#7B3F2A",
  borderRadius: "14px",
  color: "#FFFFFF",
  display: "block",
  font: "inherit",
  fontWeight: 800,
  padding: "14px 18px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const giveawayButtonStyle = {
  background: "#F7F1E7",
  border: "1px solid #CDBEA7",
  borderRadius: "14px",
  color: "#355E3B",
  display: "block",
  font: "inherit",
  fontWeight: 800,
  padding: "14px 18px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const lookupLinkStyle = {
  color: "#355E3B",
  display: "block",
  fontWeight: 800,
  padding: "8px 12px",
  textAlign: "center" as const,
};
