"use client";

import { useEffect, useMemo, useState } from "react";

const ticketCatalogKey = "invitationTickets";
const combinedCatalogKey = "invitationOrder";

const hiddenDeliveryModes = [
  {
    modeId: "digital-invitation",
    sku: "DIGITAL-INVITATION",
    label: "Digital Invitation (emailed only)",
    description: "Invitation code and event details are sent by email.",
    priceAdjustment: 0,
    requiresPhysicalFulfillment: false,
  },
  {
    modeId: "physical-invitation",
    sku: "PHYSICAL-INVITATION",
    label: "Physical Invitation (sent to a physical address)",
    description: "Printed invitation sent to the physical address entered later.",
    requiresPhysicalFulfillment: true,
  },
];

const defaultTicketTypes = [
  {
    optionId: "general-admission",
    sku: "GENERAL-ADMISSION",
    label: "General Admission Invitation",
    description:
      "- Use invitation code sent in email to access the event.\n- Essential Meal Included.\n- Extra food available for purchase.",
    price: 0,
    stockOnHand: 100,
    stockReserved: 0,
    stockAvailable: 100,
    enabled: true,
  },
  {
    optionId: "vip",
    sku: "VIP",
    label: "VIP Invitation",
    description:
      "- Elevated view.\n- Meal includes dessert.\n- Use invitation code sent in email to access event.",
    price: 0,
    stockOnHand: 40,
    stockReserved: 0,
    stockAvailable: 40,
    enabled: true,
  },
];

const emptyForm = {
  productId: "amity-sereavo-live",
  sku: "TKT-AMITY-SEREAVO-LIVE",
  slug: "amity-sereavo-live",
  title: "Amity Sereavo Live",
  imageUrl: "",
  eventVenueLabel: "",
  eventAddress: "",
  eventDateLabel: "",
  eventTimeLabel: "",
  active: true,
  publishToCombinedOrder: true,
  maxSelfQuantity: 2,
  maxGiftRecipients: 5,
  maxRecipientQuantity: 1,
  physicalInvitationFee: 8,
  physicalInvitationFulfillmentDetails:
    "Welcoming and formal letter acknowledging the purchaser's order request, signed by artist and management.\nTitle printed in metallic gold.\nMatted thick paper placed in black envelope.\nComplimentary pendant per person.\nPrinted ticket per person.",
  upgradeEnabled: false,
  upgradeName: "",
  upgradePrice: 0,
  ticketTypes: defaultTicketTypes,
};

export default function TicketManager() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const enabledTicketTypes = useMemo(
    () => form.ticketTypes.filter((ticketType) => ticketType.enabled),
    [form.ticketTypes]
  );

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setStatus("Loading tickets...");

    const response = await fetch(
      `/api/dashboard/inventory?catalogKey=${encodeURIComponent(ticketCatalogKey)}`
    );
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.error || "Tickets could not be loaded.");
      return;
    }

    setProducts(payload.products || []);
    setStatus("");
  }

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTicketType(index, key, value) {
    setForm((current) => ({
      ...current,
      ticketTypes: current.ticketTypes.map((ticketType, ticketTypeIndex) =>
        ticketTypeIndex === index
          ? {
              ...ticketType,
              [key]: value,
            }
          : ticketType
      ),
    }));
  }

  function editProduct(product) {
    const firstSizeOption = product.sizeOptions?.[0];
    const firstVisibleUpgrade = firstSizeOption?.purchaseModes?.find(
      (mode) =>
        ![
          "standard-invitation",
          "standard",
          "default",
          "digital-invitation",
          "physical-invitation",
        ].includes(mode.modeId)
    );
    const physicalMode = firstSizeOption?.purchaseModes?.find(
      (mode) => mode.modeId === "physical-invitation"
    );
    const physicalFulfillmentDetails =
      product.metadata?.physicalInvitationFulfillmentDetails ||
      physicalMode?.metadata?.physicalInvitationFulfillmentDetails ||
      "";

    setForm({
      ...emptyForm,
      productId: product.productId || "",
      sku: product.sku || "",
      slug: product.slug || "",
      title: product.title || "",
      imageUrl: product.imageUrl || "",
      eventVenueLabel: product.eventVenueLabel || "",
      eventAddress: product.eventAddress || "",
      eventDateLabel: product.eventDateLabel || "",
      eventTimeLabel: product.eventTimeLabel || "",
      active: product.active !== false,
      maxSelfQuantity: product.maxOrderQuantity ?? 2,
      maxGiftRecipients: product.maxPurchaseForOthers ?? 5,
      maxRecipientQuantity: product.maxRecipientQuantity ?? 1,
      physicalInvitationFee: physicalMode?.priceAdjustment
        ? Number(physicalMode.priceAdjustment)
        : 8,
      physicalInvitationFulfillmentDetails:
        physicalFulfillmentDetails ||
        emptyForm.physicalInvitationFulfillmentDetails,
      upgradeEnabled: Boolean(firstVisibleUpgrade),
      upgradeName: firstVisibleUpgrade?.label || "",
      upgradePrice: firstVisibleUpgrade?.priceAdjustment
        ? Number(firstVisibleUpgrade.priceAdjustment)
        : 0,
      ticketTypes: normalizeTicketTypesForForm(product.sizeOptions),
    });

    document.getElementById("dashboard-tickets-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveTickets(event) {
    event.preventDefault();

    if (!enabledTicketTypes.length) {
      setStatus("Enable at least one ticket type before publishing.");
      return;
    }

    if (
      form.upgradeEnabled &&
      (!form.upgradeName.trim() || Number(form.upgradePrice) <= 0)
    ) {
      setStatus("Ticket upgrades need a name and an extra cost greater than 0.");
      return;
    }

    setIsSaving(true);
    setStatus("Publishing tickets...");

    const catalogKeys = form.publishToCombinedOrder
      ? [ticketCatalogKey, combinedCatalogKey]
      : [ticketCatalogKey];
    const payload = buildTicketPayload(form);

    for (const catalogKey of catalogKeys) {
      const response = await fetch("/api/dashboard/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          catalogKey,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setIsSaving(false);
        setStatus(result?.error || "Tickets could not be published.");
        return;
      }
    }

    setIsSaving(false);
    setStatus("Tickets published.");
    await loadTickets();
  }

  return (
    <section id="dashboard-tickets" style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.h2}>Tickets</h2>
          <p style={styles.copy}>
            Create reusable event tickets, ticket types, and optional admin-defined upgrades.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => setForm(emptyForm)}
        >
          New Ticket Event
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.panel}>
          <h3 style={styles.h3}>Published Ticket Events</h3>
          {products.length ? (
            <div style={styles.productList}>
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  style={styles.productButton}
                  onClick={() => editProduct(product)}
                >
                  <span style={styles.productTitle}>{product.title}</span>
                  <span style={styles.productMeta}>
                    {product.sku || product.productId} -{" "}
                    {product.sizeOptions?.length || 0} ticket type
                    {(product.sizeOptions?.length || 0) === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No ticket events are in the database yet.</p>
          )}
        </div>

        <form
          id="dashboard-tickets-form"
          style={styles.panel}
          onSubmit={saveTickets}
        >
          <h3 style={styles.h3}>Ticket Event</h3>

          <div style={styles.twoColumns}>
            <Field
              label="Product ID"
              value={form.productId}
              onChange={(value) => updateForm("productId", value)}
            />
            <Field
              label="SKU"
              value={form.sku}
              onChange={(value) => updateForm("sku", value)}
            />
          </div>

          <Field
            label="Event title"
            value={form.title}
            onChange={(value) => updateForm("title", value)}
          />
          <Field
            label="Ticket image URL"
            value={form.imageUrl}
            onChange={(value) => updateForm("imageUrl", value)}
          />

          <div style={styles.twoColumns}>
            <Field
              label="Venue"
              value={form.eventVenueLabel}
              onChange={(value) => updateForm("eventVenueLabel", value)}
            />
            <Field
              label="Date"
              value={form.eventDateLabel}
              onChange={(value) => updateForm("eventDateLabel", value)}
            />
          </div>

          <div style={styles.twoColumns}>
            <Field
              label="Address"
              value={form.eventAddress}
              onChange={(value) => updateForm("eventAddress", value)}
            />
            <Field
              label="Time"
              value={form.eventTimeLabel}
              onChange={(value) => updateForm("eventTimeLabel", value)}
            />
          </div>

          <div style={styles.twoColumns}>
            <Field
              label="Max purchaser quantity"
              type="number"
              value={form.maxSelfQuantity}
              onChange={(value) => updateForm("maxSelfQuantity", value)}
            />
            <Field
              label="Max gift recipients"
              type="number"
              value={form.maxGiftRecipients}
              onChange={(value) => updateForm("maxGiftRecipients", value)}
            />
          </div>

          <div style={styles.twoColumns}>
            <Field
              label="Max per recipient"
              type="number"
              value={form.maxRecipientQuantity}
              onChange={(value) => updateForm("maxRecipientQuantity", value)}
            />
            <Field
              label="Physical invitation fee"
              type="number"
              value={form.physicalInvitationFee}
              onChange={(value) => updateForm("physicalInvitationFee", value)}
            />
          </div>

          <label style={styles.label}>
            Physical invitation fulfillment details
            <textarea
              value={form.physicalInvitationFulfillmentDetails}
              onChange={(event) =>
                updateForm(
                  "physicalInvitationFulfillmentDetails",
                  event.target.value
                )
              }
              rows={6}
              style={styles.input}
            />
          </label>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm("active", event.target.checked)}
              />
              Publish ticket event
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.publishToCombinedOrder}
                onChange={(event) =>
                  updateForm("publishToCombinedOrder", event.target.checked)
                }
              />
              Also publish to combined order catalog
            </label>
          </div>

          <div style={styles.optionBox}>
            <h4 style={styles.h4}>Ticket Upgrade</h4>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.upgradeEnabled}
                onChange={(event) =>
                  updateForm("upgradeEnabled", event.target.checked)
                }
              />
              Add ticket upgrade?
            </label>
            {form.upgradeEnabled ? (
              <div style={styles.twoColumns}>
                <Field
                  label="Name your ticket upgrade"
                  value={form.upgradeName}
                  onChange={(value) => updateForm("upgradeName", value)}
                />
                <Field
                  label="Upgrade extra cost"
                  type="number"
                  value={form.upgradePrice}
                  onChange={(value) => updateForm("upgradePrice", value)}
                />
              </div>
            ) : null}
          </div>

          <div style={styles.optionBox}>
            <h4 style={styles.h4}>Ticket Types</h4>
            {form.ticketTypes.map((ticketType, index) => (
              <div key={ticketType.optionId || index} style={styles.ticketTypeBox}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={ticketType.enabled}
                    onChange={(event) =>
                      updateTicketType(index, "enabled", event.target.checked)
                    }
                  />
                  Enable this ticket type
                </label>
                <div style={styles.twoColumns}>
                  <Field
                    label="Ticket type ID"
                    value={ticketType.optionId}
                    onChange={(value) => updateTicketType(index, "optionId", value)}
                  />
                  <Field
                    label="Ticket type SKU"
                    value={ticketType.sku}
                    onChange={(value) => updateTicketType(index, "sku", value)}
                  />
                </div>
                <div style={styles.twoColumns}>
                  <Field
                    label="Ticket title"
                    value={ticketType.label}
                    onChange={(value) => updateTicketType(index, "label", value)}
                  />
                  <Field
                    label="Base price"
                    type="number"
                    value={ticketType.price}
                    onChange={(value) => updateTicketType(index, "price", value)}
                  />
                </div>
                <label style={styles.label}>
                  Description
                  <textarea
                    value={ticketType.description}
                    onChange={(event) =>
                      updateTicketType(index, "description", event.target.value)
                    }
                    rows={4}
                    style={styles.input}
                  />
                </label>
                <div style={styles.threeColumns}>
                  <Field
                    label="Stock on hand"
                    type="number"
                    value={ticketType.stockOnHand}
                    onChange={(value) =>
                      updateTicketType(index, "stockOnHand", value)
                    }
                  />
                  <Field
                    label="Reserved"
                    type="number"
                    value={ticketType.stockReserved}
                    onChange={(value) =>
                      updateTicketType(index, "stockReserved", value)
                    }
                  />
                  <Field
                    label="Available"
                    type="number"
                    value={ticketType.stockAvailable}
                    onChange={(value) =>
                      updateTicketType(index, "stockAvailable", value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {status ? <p style={styles.status}>{status}</p> : null}

          <div style={styles.actions}>
            <button type="submit" disabled={isSaving} style={styles.primaryButton}>
              {isSaving ? "Publishing..." : "Publish Tickets"}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setForm(emptyForm)}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function buildTicketPayload(sourceForm) {
  const physicalFee = Number(sourceForm.physicalInvitationFee) || 0;
  const physicalInvitationFulfillmentDetails =
    sourceForm.physicalInvitationFulfillmentDetails?.trim() || "";
  const upgradeMode =
    sourceForm.upgradeEnabled && sourceForm.upgradeName.trim()
      ? {
          modeId: sanitizeId(sourceForm.upgradeName),
          sku: sanitizeId(sourceForm.upgradeName).toUpperCase(),
          label: sourceForm.upgradeName.trim(),
          priceAdjustment: Number(sourceForm.upgradePrice) || 0,
          requiresPhysicalFulfillment: false,
        }
      : null;

  const sizeOptions = sourceForm.ticketTypes
    .filter((ticketType) => ticketType.enabled)
    .map((ticketType) => {
      const purchaseModes = [
        {
          modeId: "standard-invitation",
          sku: `${ticketType.sku || ticketType.optionId}-STANDARD`,
          label: "Standard Invitation",
          priceAdjustment: 0,
          requiresPhysicalFulfillment: false,
        },
      ];

      if (upgradeMode) {
        purchaseModes.push(upgradeMode);
      }

      purchaseModes.push(
        ...hiddenDeliveryModes.map((mode) => ({
          ...mode,
          priceAdjustment:
            mode.modeId === "physical-invitation"
              ? physicalFee
              : mode.priceAdjustment,
          metadata:
            mode.modeId === "physical-invitation"
              ? {
                  physicalInvitationFulfillmentDetails,
                }
              : undefined,
        }))
      );

      return {
        optionId: ticketType.optionId,
        sku: ticketType.sku,
        label: ticketType.label,
        description: ticketType.description,
        price: Number(ticketType.price) || 0,
        weight: 0,
        stockOnHand: Number(ticketType.stockOnHand) || 0,
        stockReserved: Number(ticketType.stockReserved) || 0,
        stockAvailable: Number(ticketType.stockAvailable) || 0,
        purchaseModes,
      };
    });

  const totalStockOnHand = sizeOptions.reduce(
    (sum, option) => sum + option.stockOnHand,
    0
  );
  const totalStockReserved = sizeOptions.reduce(
    (sum, option) => sum + option.stockReserved,
    0
  );
  const totalStockAvailable = sizeOptions.reduce(
    (sum, option) => sum + option.stockAvailable,
    0
  );

  return {
    productId: sourceForm.productId,
    sku: sourceForm.sku,
    slug: sourceForm.slug || sanitizeId(sourceForm.title),
    title: sourceForm.title,
    imageUrl: sourceForm.imageUrl,
    description: "",
    fulfillmentType: "ticket",
    active: sourceForm.active,
    enableStoreCreditPurchase: false,
    enablePurchaseForOthers: true,
    maxPurchaseForOthers: Number(sourceForm.maxGiftRecipients) || 5,
    minOrderQuantity: 1,
    maxOrderQuantity: Number(sourceForm.maxSelfQuantity) || 2,
    minRecipientQuantity: 1,
    maxRecipientQuantity: Number(sourceForm.maxRecipientQuantity) || 1,
    stockOnHand: totalStockOnHand,
    stockReserved: totalStockReserved,
    stockAvailable: totalStockAvailable,
    eventVenueLabel: sourceForm.eventVenueLabel,
    eventAddress: sourceForm.eventAddress,
    eventDateLabel: sourceForm.eventDateLabel,
    eventTimeLabel: sourceForm.eventTimeLabel,
    metadata: {
      physicalInvitationFulfillmentDetails,
    },
    sizeOptions,
  };
}

function normalizeTicketTypesForForm(sizeOptions = []) {
  if (!sizeOptions.length) {
    return defaultTicketTypes;
  }

  return sizeOptions.map((option) => ({
    optionId: option.optionId || "",
    sku: option.sku || "",
    label: option.label || "",
    description: option.description || "",
    price: option.price ? Number(option.price) : 0,
    stockOnHand: option.stockOnHand ?? 0,
    stockReserved: option.stockReserved ?? 0,
    stockAvailable: option.stockAvailable ?? 0,
    enabled: option.active !== false,
  }));
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.label}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const styles = {
  section: {
    display: "grid",
    gap: "16px",
    marginTop: "24px",
  },
  sectionHeader: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
  },
  h2: {
    fontSize: "22px",
    margin: 0,
  },
  h3: {
    fontSize: "17px",
    margin: 0,
  },
  h4: {
    fontSize: "14px",
    margin: 0,
  },
  copy: {
    margin: "4px 0 0",
    opacity: 0.7,
  },
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(220px, 0.75fr) minmax(340px, 1.25fr)",
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "16px",
  },
  productList: {
    display: "grid",
    gap: "8px",
  },
  productButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "6px",
    cursor: "pointer",
    display: "grid",
    gap: "4px",
    padding: "10px",
    textAlign: "left",
  },
  productTitle: {
    fontWeight: 700,
  },
  productMeta: {
    fontSize: "12px",
    opacity: 0.68,
  },
  empty: {
    margin: 0,
    opacity: 0.68,
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 700,
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    boxSizing: "border-box",
    font: "inherit",
    padding: "9px 10px",
    width: "100%",
  },
  twoColumns: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  threeColumns: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  checkboxRow: {
    display: "grid",
    gap: "8px",
  },
  checkboxLabel: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
  },
  optionBox: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  ticketTypeBox: {
    background: "#f7f5f1",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  status: {
    color: "#2f6f3e",
    fontSize: "13px",
    margin: 0,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  primaryButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 14px",
  },
};
