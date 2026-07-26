import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LITTLE_ORCHARD_SHOP_SLUG } from "@/config/shops/littleOrchardShop";
import { getPlantShopProductInterestMap } from "@/lib/plantShop/productInterest";
import { getCustomerOrderStageCopy } from "@/lib/plantShop/orderActivity";
import { makeReceiptCode } from "@/lib/plantShop/receiptCodes";
import { getAdminSession } from "@/lib/auth/adminGuard";
import CountdownTimer from "./CountdownTimer";

function normalizeToken(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

function readMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatMoney(currencyCode: string | null, value: unknown) {
  const currency = currencyCode || "JMD";
  const amount = Number(value ?? 0);

  if (currency === "JMD") {
    return `JMD $${Math.round(amount).toLocaleString("en-JM")}`;
  }

  return `${currency} ${amount.toLocaleString()}`;
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(String(value)));
}

function isNurseryStockRequest(item: any) {
  return item?.purchaseModeId === "nursery-stock-request";
}

function getStatusItemTitle(item: any) {
  return isNurseryStockRequest(item) ? "Nursery stock request" : item.productTitle;
}

function getRequestedItemLabel(item: any) {
  return [item.productTitle, item.sizeLabel].filter(Boolean).join(" - ");
}

async function getOrderItems(token: string) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      "orderCode",
      "productId",
      "productTitle",
      "sizeOptionId",
      "sizeLabel",
      "purchaseModeId",
      "purchaseModeLabel",
      "quantity",
      "currencyCode",
      "lineTotal",
      "recipientName",
      "recipientEmail",
      "fulfillmentStatus",
      "currentStageLabel",
      "trackingReference",
      "createdAt",
      "updatedAt",
      "metadata"
    FROM "OrderFulfillmentItem"
    WHERE "sourceType" = 'little-orchard-shop'
      AND "metadata"->>'cashierToken' = ${token}
    ORDER BY "createdAt" ASC
  `);
}

async function getOrderActivities(token: string) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      a."id",
      a."stageKey",
      a."stageLabel",
      a."updateType",
      a."source",
      a."staffUserName",
      a."completedAt",
      a."notes",
      a."metadata",
      a."createdAt",
      f."orderCode",
      f."fulfillmentStatus"
    FROM "OrderFulfillmentActivity" a
    INNER JOIN "OrderFulfillmentItem" f ON f."id" = a."fulfillmentItemId"
    WHERE f."sourceType" = 'little-orchard-shop'
      AND f."metadata"->>'cashierToken' = ${token}
      AND COALESCE((a."metadata"->>'customerVisible')::boolean, false) = true
    ORDER BY a."completedAt" DESC, a."createdAt" DESC
  `);
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = normalizeToken(rawToken);
  const [items, rawActivities, adminSession] = token
    ? await Promise.all([
        getOrderItems(token),
        getOrderActivities(token),
        getAdminSession(),
      ])
    : [[], [], null];
  const interestCounts = await getPlantShopProductInterestMap(
    prisma,
    LITTLE_ORCHARD_SHOP_SLUG
  );

  if (!items.length) {
    notFound();
  }

  const firstItem = items[0];
  const metadata = readMetadata(firstItem.metadata);
  const orderCode = String(firstItem.orderCode || "");
  const receiptCode = String(metadata.receiptCode || "") || makeReceiptCode(orderCode);
  const paymentStatus = String(metadata.paymentStatus || "AWAITING_PAYMENT");
  const isPaymentConfirmed = paymentStatus === "PAYMENT_CONFIRMED";
  const customerName = String(firstItem.recipientName || "Customer");
  const createdAtMs = new Date(firstItem.createdAt).getTime();
  const paymentWindowExpiresAt = Number.isFinite(createdAtMs)
    ? new Date(createdAtMs + 15 * 60 * 1000).toISOString()
    : null;
  const total = items.reduce(
    (sum, item) => sum + Number(item.lineTotal || 0),
    0
  );
  const currencyCode = String(firstItem.currencyCode || "JMD");
  const fulfillmentStatuses = Array.from(
    new Set(
      items.map((item) =>
        String(item.fulfillmentStatus || "PENDING")
      )
    )
  );
  const activityKeys = new Set<string>();
  const activities = rawActivities.filter((activity) => {
    const metadata = readMetadata(activity.metadata);
    const key =
      String(metadata.orderActivityKey || "") ||
      `${activity.stageKey}:${activity.completedAt}`;

    if (activityKeys.has(key)) {
      return false;
    }

    activityKeys.add(key);
    return true;
  });
  const displayActivities = activities.length
    ? activities
    : [
        ...(isPaymentConfirmed
          ? [
              {
                id: "synthetic-payment-confirmed",
                stageKey: "payment-confirmed",
                stageLabel: "Payment confirmed",
                completedAt: metadata.paymentConfirmedAt || firstItem.updatedAt,
                staffUserName: metadata.paymentConfirmedByName || "",
                fulfillmentStatus: "PROCESSING",
                metadata: {
                  customerVisible: true,
                  nextStatus: "PROCESSING",
                },
              },
            ]
          : []),
        {
          id: "synthetic-order-submitted",
          stageKey: "order-submitted",
          stageLabel: "Order submitted",
          completedAt: firstItem.createdAt,
          staffUserName: "",
          fulfillmentStatus: firstItem.fulfillmentStatus || "PENDING",
          metadata: {
            customerVisible: true,
            nextStatus: firstItem.fulfillmentStatus || "PENDING",
          },
        },
      ];

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <p style={eyebrowStyle}>Little Orchard Shop</p>
        <h1 style={titleStyle}>Order Status</h1>
        <p style={customerNameStyle}>{customerName}</p>
        <p style={orderCodeStyle}>{orderCode}</p>

        <div
          style={{
            ...statusBannerStyle,
            ...(isPaymentConfirmed ? confirmedBannerStyle : pendingBannerStyle),
          }}
        >
          {isPaymentConfirmed ? (
            <>
              <strong>Payment confirmed. Your items are secured.</strong>
              <span>Confirmed at {formatDate(metadata.paymentConfirmedAt)}</span>
            </>
          ) : (
            <>
              <strong>
                Make payment within{" "}
                <CountdownTimer expiresAt={paymentWindowExpiresAt} />.
              </strong>
              <span>
                Your items might be made publicly available again, then sold to
                someone else.
              </span>
            </>
          )}
        </div>

        <div style={summaryGridStyle}>
          <Info
            label="Order fulfillment status"
            value={fulfillmentStatuses.join(", ")}
          />
          <Info
            label="Pickup / delivery"
            value={String(metadata.fulfillmentPreference || "Not selected")}
          />
          <Info label="Customer" value={customerName} />
          <Info
            label="Payment method"
            value={String(metadata.paymentMethodLabel || "Not confirmed yet")}
          />
          <Info label="Order total" value={formatMoney(currencyCode, total)} />
          <Info
            label="Receipt code"
            value={receiptCode || "Ask staff"}
          />
          <Info label="Tracking / reference" value={firstItem.trackingReference || "Not added yet"} />
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Order Updates</h2>
          <div style={timelineStyle}>
            {displayActivities.length ? (
              displayActivities.map((activity) => {
                const metadata = readMetadata(activity.metadata);
                const copy = getCustomerOrderStageCopy(
                  String(activity.stageKey || ""),
                  String(activity.stageLabel || "Order update")
                );
                const title = String(metadata.customerTitle || copy.title);
                const description = String(
                  metadata.customerDescription || copy.description
                );
                const actor = String(activity.staffUserName || "").trim();
                const nextStatus = String(
                  metadata.nextStatus || activity.fulfillmentStatus || ""
                ).trim();

                return (
                  <article key={activity.id} style={timelineItemStyle}>
                    <strong>{title}</strong>
                    <span>{description}</span>
                    <span style={timelineMetaStyle}>
                      Updated {formatDate(activity.completedAt)}
                      {actor ? ` by ${actor}` : ""}
                    </span>
                    {nextStatus ? (
                      <span style={timelineMetaStyle}>
                        Resulting status: {nextStatus}
                      </span>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p style={mutedStyle}>No customer-visible updates yet.</p>
            )}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Items</h2>
          <div style={itemListStyle}>
            {items.map((item, index) => {
              const interestedPeopleCount =
                interestCounts.get(
                    `${String(item.productId || "")}::${String(
                      item.sizeOptionId || ""
                    )}`
                  ) ?? 0;

              return (
              <div key={`${item.productTitle}-${item.sizeLabel}-${index}`} style={itemStyle}>
                <strong>{getStatusItemTitle(item)}</strong>
                {interestedPeopleCount > 0 ? (
                  <span style={interestStyle}>
                    Item viewed by {interestedPeopleCount} interested people so
                    far.
                  </span>
                ) : null}
                {isNurseryStockRequest(item) ? (
                  <span>Requested item: {getRequestedItemLabel(item)}</span>
                ) : item.sizeLabel ? (
                  <span>{item.sizeLabel}</span>
                ) : null}
                {item.purchaseModeLabel && !isNurseryStockRequest(item) ? (
                  <span>{item.purchaseModeLabel}</span>
                ) : null}
                <span>Quantity: {item.quantity}</span>
                <span>{formatMoney(item.currencyCode, item.lineTotal)}</span>
                {item.purchaseModeId === "nursery-stock-request" ? (
                  <span style={noteStyle}>
                    Request fee is JMD 0. Nursery availability and final product
                    price will be confirmed by a representative.
                  </span>
                ) : null}
                <span>Status: {item.fulfillmentStatus || "PENDING"}</span>
                {item.currentStageLabel ? (
                  <span>Latest update: {item.currentStageLabel}</span>
                ) : null}
              </div>
              );
            })}
          </div>
        </section>

        <div style={orderStatusLinkRowStyle}>
          <a
            href="/questionnaire/little-orchard-shop?slide=plant-show-shop"
            style={giveawayLinkStyle}
          >
            Go to shop
          </a>
          <a
            href="/gift"
            style={giveawayLinkStyle}
          >
            Claim a free plant
          </a>
          <a
            href={`/receipt/${encodeURIComponent(token)}`}
            style={giveawayLinkStyle}
          >
            View receipt
          </a>
          {adminSession ? (
            <a
              href={`/dashboard/orders?query=${encodeURIComponent(orderCode)}`}
              style={adminLinkStyle}
            >
              Admin dashboard
            </a>
          ) : null}
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

const statusBannerStyle = {
  borderRadius: "14px",
  display: "grid",
  gap: "6px",
  lineHeight: 1.45,
  marginBottom: "18px",
  padding: "14px",
};

const pendingBannerStyle = {
  background: "rgba(180, 35, 24, 0.08)",
  border: "1px solid rgba(180, 35, 24, 0.22)",
  color: "#8F1D12",
};

const confirmedBannerStyle = {
  background: "rgba(53, 94, 59, 0.1)",
  border: "1px solid rgba(53, 94, 59, 0.24)",
  color: "#355E3B",
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

const timelineStyle = {
  display: "grid",
  gap: "10px",
};

const timelineItemStyle = {
  borderLeft: "4px solid #355E3B",
  background: "#F7F1E7",
  borderRadius: "12px",
  display: "grid",
  gap: "5px",
  padding: "12px 12px 12px 14px",
};

const timelineMetaStyle = {
  color: "rgba(40, 35, 31, 0.66)",
  fontSize: "14px",
  lineHeight: 1.35,
};

const mutedStyle = {
  color: "rgba(40, 35, 31, 0.66)",
  margin: 0,
};

const itemStyle = {
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: "12px",
  display: "grid",
  gap: "4px",
  padding: "12px",
};

const interestStyle = {
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: 1.35,
};

const noteStyle = {
  color: "#7B3F2A",
  fontSize: "14px",
  lineHeight: 1.4,
};

const giveawayLinkStyle = {
  background: "#355E3B",
  borderRadius: "14px",
  color: "#FFFFFF",
  display: "block",
  fontWeight: 800,
  marginTop: "20px",
  padding: "14px 18px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const adminLinkStyle = {
  ...giveawayLinkStyle,
  background: "#7B3F2A",
};

const orderStatusLinkRowStyle = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  marginTop: "20px",
};
