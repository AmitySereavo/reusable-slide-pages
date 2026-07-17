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
  { value: "order", label: "Submitted orders" },
  { value: "digital", label: "Digital" },
  { value: "physical", label: "Physical" },
  { value: "ticket", label: "Tickets" },
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

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "Not estimated";
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
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

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function OrdersManager() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0 });
  const [status, setStatus] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading orders...");
  const [editing, setEditing] = useState({});

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrow(window.innerWidth < 720);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

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

  async function requestMailingAddressUpdate(item) {
    setMessage("Sending mailing address update request...");

    const response = await fetch("/api/dashboard/orders", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "request-mailing-address-update",
        id: item.id,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(
        [payload?.error, payload?.details].filter(Boolean).join(" ") ||
          "Mailing address update request could not be sent."
      );
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? payload.item : entry))
    );
    setMessage("Mailing address update request sent.");
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
      <div style={isNarrow ? styles.toolbarNarrow : styles.toolbar}>
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
          const isPhysicalInvitationOrder =
            item.fulfillmentType === "physical" &&
            item.sourceType === "physical-invitation";
          const physicalInvitationAddress =
            item.metadata?.invitationMailingAddress || null;
          const hasPhysicalInvitationAddress = Boolean(
            formatAddress(physicalInvitationAddress)
          );

          return (
            <article key={item.id} style={styles.card}>
              <div style={isNarrow ? styles.cardHeaderNarrow : styles.cardHeader}>
                <div style={styles.minWidthZero}>
                  <strong style={styles.breakText}>{item.productTitle}</strong>
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

              <div style={isNarrow ? styles.detailGridNarrow : styles.detailGrid}>
                <Info label="Order" value={item.orderCode || "No order code"} />
                <Info label="Fulfillment" value={item.fulfillmentType} />
                <Info
                  label="Current stage"
                  value={item.currentStageLabel || item.fulfillmentStatus}
                />
                <Info
                  label="Courier"
                  value={
                    item.selectedCourier?.name ||
                    item.selectedCourierName ||
                    "Not selected"
                  }
                />
                <Info
                  label="Shipping method"
                  value={item.shippingMethod || "Not selected"}
                />
                <Info label="SKU" value={item.sku || item.productSku || "No SKU"} />
                <Info label="Quantity" value={item.quantity} />
                <Info label="Total" value={formatMoney(item)} />
                <Info
                  label="Estimated delivery"
                  value={formatDate(item.estimatedDeliveryAt)}
                />
                <Info
                  label="Remaining"
                  value={formatDuration(item.estimatedRemainingSeconds)}
                />
                <Info label="Created" value={formatDate(item.createdAt)} />
              </div>

              <div style={styles.section}>
                <strong>{item.ticketRecipients?.length ? "Purchaser" : "Recipient"}</strong>
                <div style={styles.breakText}>
                  {item.recipientName || order?.purchaserName || "No name"}
                </div>
                <div style={{ ...styles.muted, ...styles.breakText }}>
                  {item.recipientEmail || order?.purchaserEmail || "No email"}
                </div>
                {item.ticketAttendeeName ? (
                  <div style={styles.muted}>
                    {item.ticketAttendeeName} add-on
                    {item.ticketCode ? ` - ${item.ticketCode}` : ""}
                  </div>
                ) : null}
                {Array.isArray(item.metadata?.attendees) &&
                item.metadata.attendees.length ? (
                  <div style={styles.packageList}>
                    <strong>Package attendees</strong>
                    {item.metadata.attendees.map((attendee, index) => (
                      <div
                        key={`${attendee.ticketCode || attendee.name || "attendee"}-${index}`}
                        style={styles.breakText}
                      >
                        {attendee.name || `Attendee ${index + 1}`}
                        {attendee.isPlusOneTicket ? " (plus one)" : ""}
                        {attendee.ticketCode ? ` - ${attendee.ticketCode}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}
                {item.metadata?.physicalInvitationFulfillmentDetails ? (
                  <div style={styles.packageList}>
                    <strong>Package contents</strong>
                    <div style={{ ...styles.muted, ...styles.preLine }}>
                      {item.metadata.physicalInvitationFulfillmentDetails}
                    </div>
                  </div>
                ) : null}
              </div>

              {item.ticketRecipients?.length ? (
                <div style={styles.section}>
                  <strong>Ticket owners / recipients</strong>
                  <div style={styles.recipientList}>
                    {item.ticketRecipients.map((recipient, index) => (
                      <div
                        key={`${recipient.ticketCode || "ticket"}-${index}`}
                        style={styles.recipientCard}
                      >
                        <div
                          style={
                            isNarrow
                              ? styles.recipientHeaderNarrow
                              : styles.recipientHeader
                          }
                        >
                          <strong style={styles.breakText}>
                            {recipient.ownerName || `Recipient ${index + 1}`}
                          </strong>
                          <span style={{ ...styles.muted, ...styles.breakText }}>
                            {recipient.ticketLabel || recipient.sizeLabel || "Ticket"}
                          </span>
                        </div>
                        <div style={styles.recipientMeta}>
                          {recipient.ownerEmail ? (
                            <span>Email: {recipient.ownerEmail}</span>
                          ) : null}
                          {recipient.ownerPhone ? (
                            <span>Phone: {recipient.ownerPhone}</span>
                          ) : null}
                          {recipient.ticketCode ? (
                            <span>Ticket: {recipient.ticketCode}</span>
                          ) : null}
                          {recipient.purchaseModeLabel ? (
                            <span>Invitation: {recipient.purchaseModeLabel}</span>
                          ) : null}
                          {recipient.invitationMailingAddress ? (
                            <span>
                              Physical invitation address:{" "}
                              {formatAddress(recipient.invitationMailingAddress)}
                            </span>
                          ) : null}
                          {recipient.ticketOwnerPaymentMode ? (
                            <span>
                              Add-on handling: {recipient.ticketOwnerPaymentMode}
                            </span>
                          ) : null}
                          {Number(recipient.ticketOwnerAddonBudget || 0) > 0 ? (
                            <span>
                              Add-on budget:{" "}
                              {item.currencyCode || "USD"}{" "}
                              {Number(
                                recipient.ticketOwnerAddonBudget || 0
                              ).toLocaleString()}
                            </span>
                          ) : null}
                          {recipient.mealLabel ? (
                            <span>Meal: {recipient.mealLabel}</span>
                          ) : null}
                          {recipient.wantsExtraFood ? (
                            <span>May order extra food at event</span>
                          ) : null}
                          {recipient.mealNotes ? (
                            <span>Meal notes: {recipient.mealNotes}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {order?.deliverySelection || isPhysicalInvitationOrder ? (
                <div style={styles.section}>
                  <strong>Delivery / Pickup</strong>
                  {isPhysicalInvitationOrder ? (
                    <div style={styles.packageList}>
                      <Info
                        label="Courier"
                        value={
                          item.selectedCourier?.name ||
                          item.selectedCourierName ||
                          "Not selected"
                        }
                      />
                      {item.selectedCourier?.contactInfo ||
                      item.courierContactInfo ? (
                        <pre style={styles.pre}>
                          {JSON.stringify(
                            item.selectedCourier?.contactInfo ||
                              item.courierContactInfo,
                            null,
                            2
                          )}
                        </pre>
                      ) : null}
                      <Info
                        label="Shipping method"
                        value={item.shippingMethod || "Not selected"}
                      />
                      <Info
                        label="Tracking number"
                        value={item.trackingReference || "Not recorded"}
                      />
                      {hasPhysicalInvitationAddress ? (
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          Physical invitation address:{" "}
                          {formatAddress(physicalInvitationAddress)}
                        </div>
                      ) : (
                        <div style={styles.warningText}>
                          Mailing address is missing or incomplete.
                        </div>
                      )}
                      {item.metadata?.mailingAddressUpdateRequestedAt ? (
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          Address update requested:{" "}
                          {formatDate(
                            item.metadata.mailingAddressUpdateRequestedAt
                          )}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void requestMailingAddressUpdate(item)}
                        disabled={!item.recipientEmail}
                        style={styles.secondaryButton}
                      >
                        Request mailing address update
                      </button>
                      {!item.recipientEmail ? (
                        <div style={styles.warningText}>
                          Recipient email is missing, so no update request can be
                          sent.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {order?.deliverySelection ? (
                    <pre style={styles.pre}>
                      {JSON.stringify(order.deliverySelection, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {Array.isArray(item.activities) && item.activities.length ? (
                <div style={styles.section}>
                  <strong>Fulfillment activity</strong>
                  <div style={styles.activityList}>
                    {item.activities.map((activity) => (
                      <div key={activity.id} style={styles.activityItem}>
                        <div style={styles.recipientHeader}>
                          <strong style={styles.breakText}>
                            {activity.stageLabel || activity.stageKey}
                          </strong>
                          <span style={styles.muted}>
                            {formatDate(activity.completedAt)}
                          </span>
                        </div>
                        <div style={{ ...styles.muted, ...styles.breakText }}>
                          {(activity.updateType || "manual").toUpperCase()}
                          {activity.source ? ` - ${activity.source}` : ""}
                          {activity.staffUserName
                            ? ` - ${activity.staffUserName}`
                            : ""}
                        </div>
                        {activity.notes ? (
                          <div style={{ ...styles.muted, ...styles.preLine }}>
                            {activity.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
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
    <div style={styles.minWidthZero}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.breakText}>{value || "Not set"}</strong>
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
  toolbarNarrow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
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
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
    minWidth: 0,
  },
  cardHeaderNarrow: {
    alignItems: "start",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr)",
    minWidth: 0,
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
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    minWidth: 0,
  },
  detailGridNarrow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "10px",
    minWidth: 0,
  },
  minWidthZero: {
    minWidth: 0,
  },
  breakText: {
    overflowWrap: "anywhere",
    wordBreak: "break-word",
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
    minWidth: 0,
  },
  recipientList: {
    display: "grid",
    gap: "8px",
  },
  recipientCard: {
    background: "#f8f4ee",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "6px",
    display: "grid",
    gap: "6px",
    padding: "10px",
    minWidth: 0,
  },
  recipientHeader: {
    alignItems: "baseline",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "space-between",
    minWidth: 0,
  },
  recipientHeaderNarrow: {
    display: "grid",
    gap: "3px",
    minWidth: 0,
  },
  recipientMeta: {
    color: "rgba(32, 28, 29, 0.74)",
    display: "grid",
    gap: "2px",
    fontSize: "14px",
    lineHeight: 1.35,
    minWidth: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  packageList: {
    display: "grid",
    gap: "4px",
    marginTop: "8px",
    minWidth: 0,
  },
  activityList: {
    display: "grid",
    gap: "8px",
    minWidth: 0,
  },
  activityItem: {
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "4px",
    minWidth: 0,
    paddingTop: "8px",
  },
  preLine: {
    whiteSpace: "pre-line",
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
    minWidth: 0,
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
  secondaryButton: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 122, 70, 0.42)",
    borderRadius: "6px",
    color: "#245f38",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "10px 12px",
    width: "100%",
  },
  warningText: {
    color: "#b3261e",
    fontSize: "14px",
    fontWeight: 800,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  empty: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    padding: "18px",
  },
};
