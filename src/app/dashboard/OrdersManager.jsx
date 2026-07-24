"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  return formatMoneyValue(item.currencyCode || "JMD", item.lineTotal || 0);
}

function formatMoneyValue(currencyCode, value) {
  const currency = currencyCode || "JMD";
  const amount = Number(value || 0);

  if (currency === "JMD") {
    return `JMD $${Math.round(amount).toLocaleString("en-JM")}`;
  }

  return `${currency} ${amount.toLocaleString()}`;
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

function cleanFulfillmentNotesForDisplay(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim().toLowerCase();

      return (
        normalized !== "payment status: awaiting_payment" &&
        normalized !== "inventory applied: no"
      );
    })
    .join("\n");
}

function getLittleOrchardOrderPhone(item) {
  return String(
    item.metadata?.customerWhatsappNumber ||
      item.metadata?.customerPhoneNumber ||
      item.metadata?.customerPhone ||
      ""
  ).replace(/[^\d+]/g, "");
}

function getLittleOrchardOrderEmail(item) {
  return String(item.metadata?.customerEmail || item.recipientEmail || "").trim();
}

function getLittleOrchardSocialContacts(item) {
  return [
    item.metadata?.customerInstagramHandle
      ? `Instagram: ${item.metadata.customerInstagramHandle}`
      : "",
    item.metadata?.customerTiktokHandle
      ? `TikTok: ${item.metadata.customerTiktokHandle}`
      : "",
    item.metadata?.customerFacebookMessengerHandle
      ? `Facebook Messenger: ${item.metadata.customerFacebookMessengerHandle}`
      : "",
  ].filter(Boolean);
}

const customerMessageTemplates = [
  { value: "ready", label: "Ready for pickup" },
  { value: "receipt", label: "Your receipt" },
  { value: "payment", label: "Payment confirmed" },
  { value: "cancelled", label: "Order cancelled" },
];

function buildCustomerMessage({ item, orderTotal, template }) {
  const customerName = item.recipientName || "there";
  const orderCode = item.orderCode || "your order";
  const total = formatMoneyValue(item.currencyCode || "JMD", orderTotal);
  const status = item.fulfillmentStatus || "PENDING";
  const statusLink = item.metadata?.orderStatusLink || "";
  const paymentConfirmed =
    item.metadata?.paymentStatus === "PAYMENT_CONFIRMED";

  if (template === "ready") {
    return [
      `Ready for pickup, ${customerName}.`,
      "",
      `Little Orchard order ${orderCode} is ready for pickup.`,
      "Congratulations, you've invested in your garden!",
      "You may now come to the Little Orchard Nursery tent to collect your items.",
      !paymentConfirmed ? `Order total: ${total}` : "",
      statusLink ? `Order status: ${statusLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (template === "receipt") {
    return [
      `Your receipt, ${customerName}.`,
      "",
      `Receipt for Little Orchard order ${orderCode}.`,
      "Congratulations, you've invested in your garden!",
      `Order total: ${total}`,
      `Current order status: ${status}`,
      statusLink
        ? `You can view your order status and receipt details here: ${statusLink}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (template === "cancelled") {
    return [
      `Order cancelled, ${customerName}.`,
      "",
      `Your order ${orderCode} has been cancelled.`,
      "Please contact us if you have any questions or would like help placing another order.",
      statusLink ? `Order status: ${statusLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Payment confirmed, ${customerName}.`,
    "",
    `Your payment for order ${orderCode} has been confirmed.`,
    "Congratulations, you've invested in your garden!",
    `Current order status: ${status}`,
    `Order total: ${total}`,
    "We will notify you when your order is ready for pickup at the Little Orchard Nursery tent.",
    statusLink ? `Order status: ${statusLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function openWhatsAppMessage(phone, message) {
  if (!phone) return;
  window.open(
    `https://api.whatsapp.com/send/?phone=${encodeURIComponent(
      phone
    )}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`,
    "_blank",
    "noopener,noreferrer"
  );
}

function openEmailMessage(email, subject, message) {
  if (!email) return;
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function copyMessageToClipboard(message) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = message;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
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
  const [updatingItemIds, setUpdatingItemIds] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({});
  const [messageTemplateByOrder, setMessageTemplateByOrder] = useState({});
  const [busyActions, setBusyActions] = useState({});
  const busyActionLocksRef = useRef({});

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrow(window.innerWidth < 720);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("query") || params.get("q") || "";
    const initialFulfillmentType = params.get("fulfillmentType") || "";

    if (initialQuery.trim()) {
      setQuery(initialQuery.trim());
    }

    if (
      fulfillmentTypes.some((option) => option.value === initialFulfillmentType)
    ) {
      setFulfillmentType(initialFulfillmentType);
    }
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

  async function runBusyAction(actionKey, loadingMessage, action) {
    if (busyActionLocksRef.current[actionKey]) {
      return;
    }

    busyActionLocksRef.current[actionKey] = true;
    setBusyActions((current) => ({ ...current, [actionKey]: true }));
    if (loadingMessage) {
      setMessage(loadingMessage);
    }

    try {
      await Promise.all([
        action(),
        new Promise((resolve) => setTimeout(resolve, 650)),
      ]);
    } finally {
      setBusyActions((current) => {
        const next = { ...current };
        delete next[actionKey];
        return next;
      });
      delete busyActionLocksRef.current[actionKey];
    }
  }

  async function updateItem(item) {
    if (updatingItemIds[item.id]) return;
    const draft = editing[item.id] || {};
    const fulfillmentStatus = draft.fulfillmentStatus || item.fulfillmentStatus;
    setMessage("Updating order item...");
    setUpdatingItemIds((current) => ({ ...current, [item.id]: true }));

    const [response] = await Promise.all([
      fetch("/api/dashboard/orders", {
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
      }),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
    const payload = await response.json().catch(() => ({}));
    setUpdatingItemIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });

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

  async function confirmLittleOrchardPayment(item) {
    if (!item.orderCode) return;
    const actionKey = `confirm-payment:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;
    const paymentMethod = paymentMethods[item.orderCode] || "";

    if (!paymentMethod) {
      setMessage("Choose the payment method before confirming payment.");
      return;
    }

    await runBusyAction(actionKey, "Confirming Little Orchard payment...", async () => {
      const response = await fetch("/api/plant-shop/orders/confirm-payment", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderCode: item.orderCode, paymentMethod }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const conflictText = Array.isArray(payload.conflicts)
          ? payload.conflicts
              .map(
                (conflict) =>
                  `${conflict.productTitle} ${conflict.variation}: ordered ${conflict.orderedQuantity}, available ${conflict.availableQuantity}`
              )
              .join("; ")
          : "";

        setMessage(
          [payload.error || "Payment could not be confirmed.", conflictText]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }

      setMessage(payload.message || "Payment confirmed.");
      await loadOrders();
    });
  }

  async function requestMailingAddressUpdate(item) {
    const actionKey = `mailing-address:${item.id}`;
    if (busyActionLocksRef.current[actionKey]) return;

    await runBusyAction(
      actionKey,
      "Sending mailing address update request...",
      async () => {
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
    );
  }

  async function sendCustomerEmailFromWebsite({
    item,
    customerEmail,
    subject,
    message,
  }) {
    const actionKey = `send-email:${item.orderCode}`;
    if (busyActionLocksRef.current[actionKey]) return;

    if (!customerEmail) {
      setMessage("This order does not have a customer email address.");
      return;
    }

    await runBusyAction(actionKey, "Sending customer email...", async () => {
      const response = await fetch("/api/dashboard/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send-little-orchard-customer-email",
          id: item.id,
          subject,
          message,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          [payload?.error, payload?.details, payload?.message]
            .filter(Boolean)
            .join(" ") || "Customer email could not be sent."
        );
        return;
      }

      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? payload.item : entry))
      );
      setMessage(payload.message || "Customer email sent.");
    });
  }

  const visibleSummary = useMemo(
    () =>
      statusOptions
        .map((option) => ({ label: option, value: summary[option] || 0 }))
        .filter((item) => item.value > 0),
    [summary]
  );
  const orderCards = useMemo(() => {
    const groups = [];
    const littleOrchardGroups = new Map();

    for (const item of items) {
      if (item.sourceType !== "little-orchard-shop" || !item.orderCode) {
        groups.push({
          key: item.id,
          primary: item,
          items: [item],
          isLittleOrchardOrder: false,
        });
        continue;
      }

      const key = `little-orchard-${item.orderCode}`;
      const existing = littleOrchardGroups.get(key);

      if (existing) {
        existing.items.push(item);
      } else {
        const group = {
          key,
          primary: item,
          items: [item],
          isLittleOrchardOrder: true,
        };

        littleOrchardGroups.set(key, group);
        groups.push(group);
      }
    }

    return groups;
  }, [items]);

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
        {orderCards.map((group) => {
          const item = group.primary;
          const orderItems = group.items;
          const draft = editing[item.id] || {};
          const currentStatus =
            draft.fulfillmentStatus || item.fulfillmentStatus || "PENDING";
          const orderQuantity = orderItems.reduce(
            (sum, entry) => sum + Number(entry.quantity || 0),
            0
          );
          const orderTotal = orderItems.reduce(
            (sum, entry) => sum + Number(entry.lineTotal || 0),
            0
          );
          const customerPhone = getLittleOrchardOrderPhone(item);
          const customerEmail = getLittleOrchardOrderEmail(item);
          const socialContacts = getLittleOrchardSocialContacts(item);
          const selectedMessageTemplate =
            messageTemplateByOrder[item.orderCode] ||
            (item.fulfillmentStatus === "READY"
              ? "ready"
              : item.metadata?.paymentStatus === "PAYMENT_CONFIRMED"
                ? "receipt"
                : "payment");
          const preparedCustomerMessage = buildCustomerMessage({
            item,
            orderTotal,
            template: selectedMessageTemplate,
          });
          const confirmPaymentBusy = Boolean(
            busyActions[`confirm-payment:${item.orderCode}`]
          );
          const whatsappBusy = Boolean(
            busyActions[`whatsapp:${item.orderCode}`]
          );
          const emailBusy = Boolean(busyActions[`email:${item.orderCode}`]);
          const sendEmailBusy = Boolean(
            busyActions[`send-email:${item.orderCode}`]
          );
          const copyBusy = Boolean(busyActions[`copy:${item.orderCode}`]);
          const receiptBusy = Boolean(
            busyActions[`receipt:${item.orderCode}`]
          );
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
            <article key={group.key} style={styles.card}>
              <div style={isNarrow ? styles.cardHeaderNarrow : styles.cardHeader}>
                <div style={styles.minWidthZero}>
                  <strong style={styles.breakText}>
                    {group.isLittleOrchardOrder
                      ? `Little Orchard order ${item.orderCode || ""}`.trim()
                      : item.productTitle}
                  </strong>
                  <div style={styles.muted}>
                    {group.isLittleOrchardOrder
                      ? [
                          item.recipientName || "No customer name",
                          `${orderItems.length} item${orderItems.length === 1 ? "" : "s"}`,
                        ].join(" - ")
                      : [item.sizeLabel, item.purchaseModeLabel]
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
                <Info label="Quantity" value={orderQuantity} />
                <Info
                  label="Total"
                  value={
                    group.isLittleOrchardOrder
                      ? formatMoneyValue(item.currencyCode, orderTotal)
                      : formatMoney(item)
                  }
                />
                <Info
                  label="Customer"
                  value={item.recipientName || order?.purchaserName || "No name"}
                />
                <Info
                  label="Payment method"
                  value={item.metadata?.paymentMethodLabel || "Not confirmed"}
                />
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

              {group.isLittleOrchardOrder ? (
                <div style={styles.section}>
                  <strong>Order items</strong>
                  <div style={styles.orderItemList}>
                    {orderItems.map((entry) => (
                      <div key={entry.id} style={styles.orderItemRow}>
                        <div style={styles.minWidthZero}>
                          <strong style={styles.breakText}>
                            {entry.productTitle}
                          </strong>
                          <div style={{ ...styles.muted, ...styles.breakText }}>
                            {[entry.sizeLabel, entry.purchaseModeLabel]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                        </div>
                        <div style={styles.orderItemMeta}>
                          <span>Qty {entry.quantity}</span>
                          <span>{formatMoney(entry)}</span>
                        </div>
                        {entry.purchaseModeId === "nursery-stock-request" ? (
                          <div style={styles.warningText}>
                            Nursery stock request: price is JMD 0 because
                            nursery availability and final price must be
                            confirmed by a representative.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {item.sourceType === "little-orchard-shop" ? (
                <div style={styles.section}>
                  <strong>Little Orchard payment</strong>
                  <div style={styles.recipientMeta}>
                    <span>
                      Payment: {item.metadata?.paymentStatus || "AWAITING_PAYMENT"}
                    </span>
                    <span>
                      Inventory applied:{" "}
                      {item.metadata?.inventoryApplied ? "Yes" : "No"}
                    </span>
                    {item.metadata?.cashierLink ? (
                      <a href={item.metadata.cashierLink}>Cashier order link</a>
                    ) : null}
                  </div>
                  {item.purchaseModeId === "nursery-stock-request" ? (
                    <div style={styles.warningText}>
                      Nursery stock request: price is JMD 0 because nursery
                      availability and final price must be confirmed by a
                      representative.
                    </div>
                  ) : null}
                  {item.metadata?.paymentStatus !== "PAYMENT_CONFIRMED" ? (
                    <div style={styles.paymentConfirmPanel}>
                      <label style={styles.label}>
                        Payment method
                        <select
                          value={paymentMethods[item.orderCode] || ""}
                          onChange={(event) =>
                            setPaymentMethods((current) => ({
                              ...current,
                              [item.orderCode]: event.target.value,
                            }))
                          }
                          style={styles.selectWide}
                        >
                          <option value="">Choose method</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="remittance">Remittance</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => confirmLittleOrchardPayment(item)}
                        disabled={confirmPaymentBusy}
                        style={styles.primarySmallButton}
                      >
                        {confirmPaymentBusy
                          ? "Confirming payment..."
                          : "Confirm Payment"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {item.sourceType === "little-orchard-shop" ? (
                <div style={styles.section}>
                  <strong>Customer communication</strong>
                  <div style={styles.recipientMeta}>
                    {customerPhone ? (
                      <span>WhatsApp: {customerPhone}</span>
                    ) : null}
                    {customerEmail ? <span>Email: {customerEmail}</span> : null}
                    {socialContacts.map((contact) => (
                      <span key={contact}>{contact}</span>
                    ))}
                    {!customerPhone &&
                    !customerEmail &&
                    socialContacts.length === 0 ? (
                      <span>No customer contact method recorded.</span>
                    ) : null}
                  </div>
                  <div style={styles.communicationGrid}>
                    <div style={styles.messageTemplateList}>
                      {customerMessageTemplates.map((template) => (
                        <label
                          key={`${item.orderCode}-${template.value}`}
                          style={styles.messageTemplateOption}
                        >
                          <input
                            type="radio"
                            name={`customer-message-template-${item.orderCode}`}
                            value={template.value}
                            checked={selectedMessageTemplate === template.value}
                            onChange={() =>
                              setMessageTemplateByOrder((current) => ({
                                ...current,
                                [item.orderCode]: template.value,
                              }))
                            }
                          />
                          <span>{template.label}</span>
                        </label>
                      ))}
                    </div>
                    {customerPhone ? (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={whatsappBusy}
                        onClick={() =>
                          runBusyAction(
                            `whatsapp:${item.orderCode}`,
                            "Preparing WhatsApp message...",
                            async () => {
                              openWhatsAppMessage(
                                customerPhone,
                                preparedCustomerMessage
                              );
                              setMessage("WhatsApp message prepared.");
                            }
                          )
                        }
                      >
                        {whatsappBusy
                          ? "Preparing WhatsApp..."
                          : "Prepare selected WhatsApp message"}
                      </button>
                    ) : null}
                    {customerEmail ? (
                      <>
                        <button
                          type="button"
                          style={styles.primarySmallButton}
                          disabled={sendEmailBusy}
                          onClick={() =>
                            sendCustomerEmailFromWebsite({
                              item,
                              customerEmail,
                              subject: `Little Orchard order ${item.orderCode}`,
                              message: preparedCustomerMessage,
                            })
                          }
                        >
                          {sendEmailBusy
                            ? "Sending email..."
                            : "Send selected email from website"}
                        </button>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          disabled={emailBusy}
                          onClick={() =>
                            runBusyAction(
                              `email:${item.orderCode}`,
                              "Opening Gmail compose fallback...",
                              async () => {
                                openEmailMessage(
                                  customerEmail,
                                  `Little Orchard order ${item.orderCode}`,
                                  preparedCustomerMessage
                                );
                                setMessage(
                                  "Gmail compose opened. Gmail controls which logged-in address sends it."
                                );
                              }
                            )
                          }
                        >
                          {emailBusy
                            ? "Opening Gmail..."
                            : "Open Gmail compose fallback"}
                        </button>
                        {item.metadata?.orderStatusLink ? (
                          <a
                            href={item.metadata.orderStatusLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.linkButton}
                            onClick={(event) => {
                              if (receiptBusy) {
                                event.preventDefault();
                                return;
                              }

                              setBusyActions((current) => ({
                                ...current,
                                [`receipt:${item.orderCode}`]: true,
                              }));
                              setMessage("Opening receipt / status...");
                              window.setTimeout(() => {
                                setBusyActions((current) => {
                                  const next = { ...current };
                                  delete next[`receipt:${item.orderCode}`];
                                  return next;
                                });
                              }, 650);
                            }}
                          >
                            {receiptBusy
                              ? "Opening receipt..."
                              : "Open receipt / status"}
                          </a>
                        ) : null}
                      </>
                    ) : null}
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      disabled={copyBusy}
                      onClick={async () => {
                        await runBusyAction(
                          `copy:${item.orderCode}`,
                          "Copying selected customer message...",
                          async () => {
                            const copied = await copyMessageToClipboard(
                              preparedCustomerMessage
                            );
                            setMessage(
                              copied
                                ? "Selected customer message copied."
                                : "Message could not be copied automatically."
                            );
                          }
                        );
                      }}
                    >
                      {copyBusy
                        ? "Copying message..."
                        : "Copy selected message for other channel"}
                    </button>
                  </div>
                </div>
              ) : null}

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
                        disabled={
                          !item.recipientEmail ||
                          Boolean(busyActions[`mailing-address:${item.id}`])
                        }
                        style={styles.secondaryButton}
                      >
                        {busyActions[`mailing-address:${item.id}`]
                          ? "Sending address request..."
                          : "Request mailing address update"}
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
                        : cleanFulfillmentNotesForDisplay(item.fulfillmentNotes)
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
                  disabled={Boolean(updatingItemIds[item.id])}
                  style={{
                    ...styles.button,
                    ...(updatingItemIds[item.id] ? styles.loadingButton : {}),
                  }}
                >
                  {updatingItemIds[item.id]
                    ? "Updating fulfillment..."
                    : "Update fulfillment"}
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
  orderItemList: {
    display: "grid",
    gap: "10px",
  },
  orderItemRow: {
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "grid",
    gap: "8px",
    minWidth: 0,
    padding: "10px",
  },
  orderItemMeta: {
    color: "rgba(32, 28, 29, 0.74)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "14px",
    gap: "8px 14px",
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
  loadingButton: {
    cursor: "wait",
    opacity: 0.68,
  },
  primarySmallButton: {
    background: "#2f7a46",
    border: 0,
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    marginTop: "10px",
    padding: "10px 12px",
  },
  paymentConfirmPanel: {
    display: "grid",
    gap: "10px",
    marginTop: "10px",
  },
  communicationGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "minmax(0, 1fr)",
    marginTop: "8px",
  },
  messageTemplateList: {
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "4px",
    padding: "8px",
  },
  messageTemplateOption: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 700,
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
  linkButton: {
    alignItems: "center",
    background: "#fffdfa",
    border: "1px solid rgba(47, 122, 70, 0.42)",
    borderRadius: "6px",
    color: "#245f38",
    display: "flex",
    font: "inherit",
    fontWeight: 800,
    justifyContent: "center",
    padding: "10px 12px",
    textAlign: "center",
    textDecoration: "none",
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
