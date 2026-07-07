"use client";

import { useEffect, useMemo, useState } from "react";

const statusOptions = [
  "PENDING",
  "PROCESSING",
  "READY",
  "FULFILLED",
  "CANCELED",
  "REFUNDED",
];

const fulfillmentTypes = [
  { value: "", label: "All fulfillment" },
  { value: "digital", label: "Digital" },
  { value: "physical", label: "Physical" },
];

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(item) {
  return `${item.currencyCode || "USD"} ${Number(
    item.lineTotal || 0
  ).toLocaleString()}`;
}

function statusColor(status) {
  switch (status) {
    case "FULFILLED":
      return "#2f7a46";
    case "PROCESSING":
      return "#7a5a12";
    case "READY":
      return "#245f99";
    case "CANCELED":
    case "REFUNDED":
      return "#8a2f2f";
    default:
      return "#5f5a52";
  }
}

export default function OrdersManager() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0 });
  const [status, setStatus] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading orders...");
  const [editing, setEditing] = useState({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadOrders();
    }, 200);

    return () => clearTimeout(timeout);
  }, [status, fulfillmentType, query]);

  async function loadOrders() {
    setMessage("Loading orders...");
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (fulfillmentType) params.set("fulfillmentType", fulfillmentType);
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/dashboard/orders?${params.toString()}`, {
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(
        [payload?.error, payload?.details].filter(Boolean).join(" ") ||
          "Orders could not be loaded."
      );
      return;
    }

    setItems(payload.items || []);
    setSummary(payload.summary || { total: 0 });
    setMessage("");
  }

  async function updateItem(item) {
    const draft = editing[item.id] || {};
    const fulfillmentStatus = draft.fulfillmentStatus || item.fulfillmentStatus;
    setMessage("Updating order item...");

    const response = await fetch("/api/dashboard/orders", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.id,
        fulfillmentStatus,
        fulfillmentNotes:
          draft.fulfillmentNotes !== undefined
            ? draft.fulfillmentNotes
            : item.fulfillmentNotes || "",
        trackingReference:
          draft.trackingReference !== undefined
            ? draft.trackingReference
            : item.trackingReference || "",
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(
        [payload?.error, payload?.details].filter(Boolean).join(" ") ||
          "Order item could not be updated."
      );
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? payload.item : entry))
    );
    setEditing((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setMessage("Order item updated.");
  }

  const visibleSummary = useMemo(
    () =>
      statusOptions
        .map((option) => ({ label: option, value: summary[option] || 0 }))
        .filter((item) => item.value > 0),
    [summary]
  );

  return (
    <section style={styles.stack}>
      <div style={styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order, SKU, recipient, product..."
          style={styles.input}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={styles.select}
        >
          <option value="">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={fulfillmentType}
          onChange={(event) => setFulfillmentType(event.target.value)}
          style={styles.select}
        >
          {fulfillmentTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.summary}>
        <strong>Total: {summary.total || 0}</strong>
        {visibleSummary.map((item) => (
          <span key={item.label}>
            {item.label}: {item.value}
          </span>
        ))}
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.grid}>
        {items.map((item) => {
          const draft = editing[item.id] || {};
          const currentStatus =
            draft.fulfillmentStatus || item.fulfillmentStatus || "PENDING";
          const order = item.invitationOrder;

          return (
            <article key={item.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong>{item.productTitle}</strong>
                  <div style={styles.muted}>
                    {[item.sizeLabel, item.purchaseModeLabel]
                      .filter(Boolean)
                      .join(" - ") || "Order item"}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    color: statusColor(currentStatus),
                    borderColor: statusColor(currentStatus),
                  }}
                >
                  {currentStatus}
                </span>
              </div>

              <div style={styles.detailGrid}>
                <Info label="Order" value={item.orderCode || "No order code"} />
                <Info label="Fulfillment" value={item.fulfillmentType} />
                <Info label="SKU" value={item.sku || item.productSku || "No SKU"} />
                <Info label="Quantity" value={item.quantity} />
                <Info label="Total" value={formatMoney(item)} />
                <Info label="Created" value={formatDate(item.createdAt)} />
              </div>

              <div style={styles.section}>
                <strong>Recipient</strong>
                <div>{item.recipientName || order?.purchaserName || "No name"}</div>
                <div style={styles.muted}>
                  {item.recipientEmail || order?.purchaserEmail || "No email"}
                </div>
                {item.ticketAttendeeName ? (
                  <div style={styles.muted}>
                    {item.ticketAttendeeName} add-on
                    {item.ticketCode ? ` - ${item.ticketCode}` : ""}
                  </div>
                ) : null}
              </div>

              {order?.deliverySelection ? (
                <div style={styles.section}>
                  <strong>Delivery / Pickup</strong>
                  <pre style={styles.pre}>
                    {JSON.stringify(order.deliverySelection, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div style={styles.controls}>
                <label style={styles.label}>
                  Fulfillment status
                  <select
                    value={currentStatus}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          fulfillmentStatus: event.target.value,
                        },
                      }))
                    }
                    style={styles.selectWide}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Tracking / delivery reference
                  <input
                    value={
                      draft.trackingReference !== undefined
                        ? draft.trackingReference
                        : item.trackingReference || ""
                    }
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          trackingReference: event.target.value,
                        },
                      }))
                    }
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Fulfillment notes
                  <textarea
                    value={
                      draft.fulfillmentNotes !== undefined
                        ? draft.fulfillmentNotes
                        : item.fulfillmentNotes || ""
                    }
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [item.id]: {
                          ...(current[item.id] || {}),
                          fulfillmentNotes: event.target.value,
                        },
                      }))
                    }
                    rows={3}
                    style={styles.textarea}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void updateItem(item)}
                  style={styles.button}
                >
                  Update fulfillment
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!items.length && !message ? (
        <div style={styles.empty}>No fulfillment order items found.</div>
      ) : null}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span style={styles.infoLabel}>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

const styles = {
  stack: {
    display: "grid",
    gap: "16px",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) repeat(2, minmax(150px, 190px))",
    gap: "10px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
  },
  select: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    background: "#fffdfa",
  },
  selectWide: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    background: "#fffdfa",
    width: "100%",
  },
  summary: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    padding: "12px",
  },
  message: {
    color: "#2f6f46",
    fontWeight: 800,
  },
  grid: {
    display: "grid",
    gap: "14px",
  },
  card: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "6px",
    display: "grid",
    gap: "14px",
    padding: "16px",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
  },
  badge: {
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
    padding: "5px 8px",
  },
  muted: {
    color: "rgba(32, 28, 29, 0.68)",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
  },
  infoLabel: {
    color: "rgba(32, 28, 29, 0.62)",
    display: "block",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  section: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "4px",
    paddingTop: "12px",
  },
  pre: {
    background: "#f5f2ee",
    borderRadius: "6px",
    margin: 0,
    maxHeight: "160px",
    overflow: "auto",
    padding: "10px",
    whiteSpace: "pre-wrap",
  },
  controls: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  label: {
    display: "grid",
    gap: "5px",
    fontWeight: 800,
  },
  textarea: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px 12px",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#2f7a46",
    border: 0,
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "12px 14px",
  },
  empty: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    padding: "18px",
  },
};
