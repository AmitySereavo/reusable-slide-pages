"use client";

import { useEffect, useMemo, useState } from "react";

const shopOptions = [
  { id: "little-orchard-shop", label: "Little Orchard Shop" },
  { id: "music-merch-shop", label: "Music + Merch Store" },
  { id: "ticket-add-ons", label: "Ticket Add-ons" },
  { id: "invitation-tickets", label: "Invitation Tickets" },
  { id: "combined-order", label: "Combined Order" },
];

const flowSteps = [
  { id: "identity", title: "Inventory Identity" },
  { id: "shops", title: "Shops and Categories" },
  { id: "quantity", title: "Quantity" },
  { id: "options", title: "Purchase Options" },
  { id: "review", title: "Review" },
];

const emptyForm = {
  id: "",
  sku: "",
  slug: "",
  title: "",
  description: "",
  detailsDescription: "",
  imageUrl: "",
  previewImageUrl: "",
  fulfillmentType: "physical",
  active: true,
  quantityOnHand: 0,
  quantityReserved: 0,
  quantityAvailable: 0,
  shopTags: ["little-orchard-shop"],
  categoryTags: ["Uncategorized"],
  optionId: "default",
  optionSku: "",
  optionLabel: "Default option",
  optionPrice: 0,
};

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [bookmarkedStepIndex, setBookmarkedStepIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filterShop, setFilterShop] = useState("all");

  const activeStep = flowSteps[stepIndex] || flowSteps[0];

  const filteredItems = useMemo(() => {
    if (filterShop === "all") return items;

    return items.filter((item) =>
      normalizeArray(item.shopTags).includes(filterShop)
    );
  }, [filterShop, items]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setStatus("Loading unified inventory...");
    const response = await fetch("/api/dashboard/inventory/unified");
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.error || "Inventory could not be loaded.");
      return;
    }

    setItems(payload.items || []);
    setStatus("");
  }

  async function syncLittleOrchardConfig() {
    setIsSaving(true);
    setStatus("Syncing Little Orchard catalog into unified inventory...");
    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-little-orchard-config" }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Little Orchard catalog could not be synced.");
      return;
    }

    setItems(payload.items || []);
    setStatus("Little Orchard catalog synced into unified inventory.");
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleShop(shopId, checked) {
    setForm((current) => {
      const nextShopTags = checked
        ? Array.from(new Set([...current.shopTags, shopId]))
        : current.shopTags.filter((tag) => tag !== shopId);

      return {
        ...current,
        shopTags: nextShopTags.length ? nextShopTags : current.shopTags,
      };
    });
  }

  function editItem(item) {
    const options = normalizeArray(item.options);
    const firstOption = options[0] || {};

    setForm({
      ...emptyForm,
      id: item.id || "",
      sku: item.sku || "",
      slug: item.slug || "",
      title: item.title || "",
      description: item.description || "",
      detailsDescription: item.detailsDescription || "",
      imageUrl: item.imageUrl || "",
      previewImageUrl: item.previewImageUrl || "",
      fulfillmentType: item.fulfillmentType || "physical",
      active: item.active !== false,
      quantityOnHand: item.quantityOnHand ?? 0,
      quantityReserved: item.quantityReserved ?? 0,
      quantityAvailable: item.quantityAvailable ?? 0,
      shopTags: normalizeArray(item.shopTags).length
        ? normalizeArray(item.shopTags)
        : ["little-orchard-shop"],
      categoryTags: normalizeArray(item.categoryTags).length
        ? normalizeArray(item.categoryTags)
        : ["Uncategorized"],
      optionId: firstOption.id || "default",
      optionSku: firstOption.sku || "",
      optionLabel: firstOption.label || "Default option",
      optionPrice: firstOption.price ?? 0,
    });
    setStepIndex(0);
    document.getElementById("dashboard-inventory-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveItem(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving unified inventory item...");

    const primaryCategory = form.categoryTags[0] || "Uncategorized";
    const shopListings = form.shopTags.map((shopId) => ({
      shopKey: shopId,
      shopLabel: getShopLabel(shopId),
      categoryKey: slugify(primaryCategory),
      categoryLabel: primaryCategory,
      active: true,
      sortOrder: 0,
    }));

    const response = await fetch("/api/dashboard/inventory/unified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-item",
        ...form,
        quantityOnHand: Number(form.quantityOnHand),
        quantityReserved: Number(form.quantityReserved),
        quantityAvailable: Number(form.quantityAvailable),
        shopListings,
        options: [
          {
            id: form.optionId,
            sku: form.optionSku,
            label: form.optionLabel,
            price: Number(form.optionPrice),
            quantityOnHand: Number(form.quantityOnHand),
            quantityReserved: Number(form.quantityReserved),
            quantityAvailable: Number(form.quantityAvailable),
          },
        ],
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Inventory item could not be saved.");
      return;
    }

    setItems(payload.items || []);
    setStatus("Inventory item saved.");
  }

  function resetForm() {
    setForm(emptyForm);
    setStepIndex(0);
  }

  return (
    <section id="dashboard-inventory" style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.h2}>Inventory</h2>
          <p style={styles.copy}>
            One inventory table for all shops. Items appear in shops through
            shop tags and category tags, while quantity stays shared.
          </p>
        </div>
        <div style={styles.actions}>
          <select
            value={filterShop}
            onChange={(event) => setFilterShop(event.target.value)}
            style={styles.input}
          >
            <option value="all">All shops</option>
            {shopOptions.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={isSaving}
            onClick={syncLittleOrchardConfig}
          >
            Sync Little Orchard Plants
          </button>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.h3}>All Inventory</h3>
        {filteredItems.length ? (
          <div style={styles.inventoryList}>
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                style={styles.inventoryRow}
                onClick={() => editItem(item)}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" style={styles.thumbnail} />
                ) : (
                  <span style={styles.thumbnailPlaceholder}>
                    {getInitials(item.title)}
                  </span>
                )}
                <span style={styles.itemText}>
                  <strong>{item.title}</strong>
                  <span>{item.sku || item.slug}</span>
                  <span>
                    Shops:{" "}
                    {normalizeArray(item.shopTags).map(getShopLabel).join(", ") ||
                      "No shop tags"}
                  </span>
                  <span>
                    Categories:{" "}
                    {normalizeArray(item.categoryTags).join(", ") ||
                      "Uncategorized"}
                  </span>
                </span>
                <span style={styles.quantityBlock}>
                  <strong>{item.quantityAvailable ?? 0}</strong>
                  <span>available</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p style={styles.empty}>
            No unified inventory records yet. Sync Little Orchard plants or add a
            new item below.
          </p>
        )}
      </div>

      <form
        id="dashboard-inventory-form"
        style={styles.panel}
        onSubmit={saveItem}
      >
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.h3}>Add Inventory DSL Flow</h3>
            <p style={styles.copy}>
              Step {stepIndex + 1} of {flowSteps.length}: {activeStep.title}
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setBookmarkedStepIndex(stepIndex);
              setStatus(`Bookmarked: ${activeStep.title}`);
            }}
          >
            Bookmark Step
          </button>
        </div>

        <div style={styles.stepTabs}>
          {flowSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              style={{
                ...styles.stepTab,
                ...(index === stepIndex ? styles.stepTabActive : null),
              }}
              onClick={() => setStepIndex(index)}
            >
              {step.title}
              {index === bookmarkedStepIndex ? " *" : ""}
            </button>
          ))}
        </div>

        <div style={styles.flowPanel}>
          {activeStep.id === "identity" ? (
            <>
              <div style={styles.twoColumns}>
                <Field label="Title" value={form.title} onChange={(value) => updateForm("title", value)} />
                <Field label="SKU" value={form.sku} onChange={(value) => updateForm("sku", value)} />
              </div>
              <Field label="Slug" value={form.slug} onChange={(value) => updateForm("slug", value)} />
              <Field label="Image URL" value={form.imageUrl} onChange={(value) => updateForm("imageUrl", value)} />
              <label style={styles.label}>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={4}
                  style={{ ...styles.input, resize: "vertical" }}
                />
              </label>
            </>
          ) : null}

          {activeStep.id === "shops" ? (
            <>
              <div style={styles.shopGrid}>
                {shopOptions.map((shop) => (
                  <label key={shop.id} style={styles.shopToggle}>
                    <input
                      type="checkbox"
                      checked={form.shopTags.includes(shop.id)}
                      onChange={(event) => toggleShop(shop.id, event.target.checked)}
                    />
                    {shop.label}
                  </label>
                ))}
              </div>
              <Field
                label="Category tags, comma separated"
                value={form.categoryTags.join(", ")}
                onChange={(value) =>
                  updateForm(
                    "categoryTags",
                    value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                  )
                }
              />
            </>
          ) : null}

          {activeStep.id === "quantity" ? (
            <div style={styles.twoColumns}>
              <Field label="Quantity on hand" type="number" value={form.quantityOnHand} onChange={(value) => updateForm("quantityOnHand", value)} />
              <Field label="Quantity reserved" type="number" value={form.quantityReserved} onChange={(value) => updateForm("quantityReserved", value)} />
              <Field label="Quantity available" type="number" value={form.quantityAvailable} onChange={(value) => updateForm("quantityAvailable", value)} />
              <label style={styles.label}>
                Fulfillment type
                <select
                  value={form.fulfillmentType}
                  onChange={(event) => updateForm("fulfillmentType", event.target.value)}
                  style={styles.input}
                >
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                  <option value="ticket">Ticket</option>
                </select>
              </label>
            </div>
          ) : null}

          {activeStep.id === "options" ? (
            <div style={styles.twoColumns}>
              <Field label="Option ID" value={form.optionId} onChange={(value) => updateForm("optionId", value)} />
              <Field label="Option SKU" value={form.optionSku} onChange={(value) => updateForm("optionSku", value)} />
              <Field label="Option label" value={form.optionLabel} onChange={(value) => updateForm("optionLabel", value)} />
              <Field label="Price" type="number" value={form.optionPrice} onChange={(value) => updateForm("optionPrice", value)} />
            </div>
          ) : null}

          {activeStep.id === "review" ? (
            <div style={styles.reviewList}>
              <span><strong>Item:</strong> {form.title || "Not entered"}</span>
              <span><strong>Shops:</strong> {form.shopTags.map(getShopLabel).join(", ")}</span>
              <span><strong>Categories:</strong> {form.categoryTags.join(", ")}</span>
              <span><strong>Available:</strong> {form.quantityAvailable}</span>
              <span><strong>Option:</strong> {form.optionLabel} at JMD {Number(form.optionPrice || 0).toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        {status ? <p style={styles.status}>{status}</p> : null}

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryButton}
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          {stepIndex < flowSteps.length - 1 ? (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() =>
                setStepIndex((current) =>
                  Math.min(flowSteps.length - 1, current + 1)
                )
              }
            >
              Next
            </button>
          ) : (
            <button type="submit" disabled={isSaving} style={styles.primaryButton}>
              {isSaving ? "Saving..." : "Save Inventory"}
            </button>
          )}
          <button type="button" style={styles.secondaryButton} onClick={resetForm}>
            New Item
          </button>
        </div>
      </form>
    </section>
  );
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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getShopLabel(value) {
  return shopOptions.find((shop) => shop.id === value)?.label || value;
}

function getInitials(value) {
  return String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function slugify(value) {
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
  panelHeader: {
    alignItems: "start",
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
  copy: {
    margin: "4px 0 0",
    opacity: 0.7,
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "16px",
  },
  inventoryList: {
    display: "grid",
    gap: "10px",
  },
  inventoryRow: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    cursor: "pointer",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "56px minmax(0, 1fr) auto",
    padding: "12px",
    textAlign: "left",
  },
  thumbnail: {
    aspectRatio: "1",
    borderRadius: "8px",
    objectFit: "cover",
    width: "56px",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    aspectRatio: "1",
    background: "#f3efe7",
    borderRadius: "8px",
    display: "grid",
    fontWeight: 800,
    justifyItems: "center",
    width: "56px",
  },
  itemText: {
    display: "grid",
    gap: "3px",
    minWidth: 0,
  },
  quantityBlock: {
    display: "grid",
    justifyItems: "end",
  },
  stepTabs: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  stepTab: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "999px",
    cursor: "pointer",
    font: "inherit",
    fontSize: "12px",
    fontWeight: 800,
    padding: "8px 10px",
  },
  stepTabActive: {
    background: "#2f6f3e",
    borderColor: "#2f6f3e",
    color: "#ffffff",
  },
  flowPanel: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "12px",
    paddingTop: "12px",
  },
  twoColumns: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  shopGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  shopToggle: {
    alignItems: "center",
    background: "#f8f6f1",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "6px",
    display: "flex",
    gap: "8px",
    padding: "10px",
  },
  reviewList: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "6px",
    display: "grid",
    gap: "6px",
    padding: "12px",
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
  actions: {
    alignItems: "center",
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
  status: {
    color: "#2f6f3e",
    fontSize: "13px",
    margin: 0,
  },
  empty: {
    margin: 0,
    opacity: 0.68,
  },
};
