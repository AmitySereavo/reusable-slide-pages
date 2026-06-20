"use client";

import { useEffect, useMemo, useState } from "react";

const catalogOptions = [
  { id: "musicMerch", label: "Music + Merch" },
  { id: "invitationTickets", label: "Invitation Tickets" },
  { id: "invitationOrder", label: "Combined Order Catalog" },
];

const emptyForm = {
  catalogKey: "musicMerch",
  productId: "",
  sku: "",
  slug: "",
  title: "",
  imageUrl: "",
  description: "",
  fulfillmentType: "physical",
  active: true,
  enableStoreCreditPurchase: false,
  enablePurchaseForOthers: false,
  maxPurchaseForOthers: 4,
  minOrderQuantity: 1,
  maxOrderQuantity: 12,
  minRecipientQuantity: 1,
  maxRecipientQuantity: 2,
  stockOnHand: 0,
  stockReserved: 0,
  stockAvailable: 0,
  optionId: "standard",
  optionSku: "",
  optionLabel: "Standard",
  optionPrice: 0,
  optionWeight: 0,
};

export default function InventoryManager() {
  const [catalogKey, setCatalogKey] = useState("musicMerch");
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedCatalogLabel = useMemo(
    () =>
      catalogOptions.find((catalog) => catalog.id === catalogKey)?.label ??
      catalogKey,
    [catalogKey]
  );

  useEffect(() => {
    loadProducts(catalogKey);
  }, [catalogKey]);

  async function loadProducts(nextCatalogKey = catalogKey) {
    setStatus("Loading inventory...");

    const response = await fetch(
      `/api/dashboard/inventory?catalogKey=${encodeURIComponent(nextCatalogKey)}`
    );
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.error || "Inventory could not be loaded.");
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

  function editProduct(product) {
    const firstOption = product.sizeOptions?.[0];

    setForm({
      ...emptyForm,
      catalogKey: product.catalogKey,
      productId: product.productId,
      sku: product.sku || "",
      slug: product.slug || "",
      title: product.title || "",
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      fulfillmentType: product.fulfillmentType || "physical",
      active: product.active !== false,
      enableStoreCreditPurchase: product.enableStoreCreditPurchase === true,
      enablePurchaseForOthers: product.enablePurchaseForOthers === true,
      maxPurchaseForOthers: product.maxPurchaseForOthers ?? 4,
      minOrderQuantity: product.minOrderQuantity ?? 1,
      maxOrderQuantity: product.maxOrderQuantity ?? 12,
      minRecipientQuantity: product.minRecipientQuantity ?? 1,
      maxRecipientQuantity: product.maxRecipientQuantity ?? 2,
      stockOnHand: product.stockOnHand ?? 0,
      stockReserved: product.stockReserved ?? 0,
      stockAvailable: product.stockAvailable ?? 0,
      optionId: firstOption?.optionId || "standard",
      optionSku: firstOption?.sku || "",
      optionLabel: firstOption?.label || "Standard",
      optionPrice: firstOption?.price ? Number(firstOption.price) : 0,
      optionWeight: firstOption?.weight ? Number(firstOption.weight) : 0,
    });

    document.getElementById("dashboard-inventory-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving inventory...");

    const response = await fetch("/api/dashboard/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        catalogKey: form.catalogKey,
        productId: form.productId,
        sku: form.sku,
        slug: form.slug,
        title: form.title,
        imageUrl: form.imageUrl,
        description: form.description,
        fulfillmentType: form.fulfillmentType,
        active: form.active,
        enableStoreCreditPurchase: form.enableStoreCreditPurchase,
        enablePurchaseForOthers: form.enablePurchaseForOthers,
        maxPurchaseForOthers: Number(form.maxPurchaseForOthers),
        minOrderQuantity: Number(form.minOrderQuantity),
        maxOrderQuantity: Number(form.maxOrderQuantity),
        minRecipientQuantity: Number(form.minRecipientQuantity),
        maxRecipientQuantity: Number(form.maxRecipientQuantity),
        stockOnHand: Number(form.stockOnHand),
        stockReserved: Number(form.stockReserved),
        stockAvailable: Number(form.stockAvailable),
        sizeOptions: [
          {
            optionId: form.optionId,
            sku: form.optionSku,
            label: form.optionLabel,
            price: Number(form.optionPrice),
            weight: Number(form.optionWeight),
            stockOnHand: Number(form.stockOnHand),
            stockReserved: Number(form.stockReserved),
            stockAvailable: Number(form.stockAvailable),
          },
        ],
      }),
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Product could not be saved.");
      return;
    }

    setStatus("Product saved.");
    setCatalogKey(form.catalogKey);
    await loadProducts(form.catalogKey);
  }

  async function seedCurrentCatalogs() {
    setIsSaving(true);
    setStatus("Seeding current file catalogs into database...");

    const response = await fetch("/api/dashboard/inventory/seed", {
      method: "POST",
    });
    const payload = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Catalogs could not be seeded.");
      return;
    }

    setStatus(
      `Seeded ${payload.productCount || 0} products and ${
        payload.optionCount || 0
      } options.`
    );
    await loadProducts(catalogKey);
  }

  return (
    <section id="dashboard-inventory" style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.h2}>Inventory</h2>
          <p style={styles.copy}>
            Database-backed products for reusable shop slides.
          </p>
        </div>
        <select
          value={catalogKey}
          onChange={(event) => {
            const nextCatalogKey = event.target.value;
            setCatalogKey(nextCatalogKey);
            setForm((current) => ({ ...current, catalogKey: nextCatalogKey }));
          }}
          style={styles.input}
        >
          {catalogOptions.map((catalog) => (
            <option key={catalog.id} value={catalog.id}>
              {catalog.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isSaving}
          onClick={seedCurrentCatalogs}
          style={styles.secondaryButton}
        >
          Seed Current Catalogs
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.panel}>
          <h3 style={styles.h3}>{selectedCatalogLabel}</h3>
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
                    {product.sku || product.productId} ·{" "}
                    {product.sizeOptions?.length || 0} option
                    {(product.sizeOptions?.length || 0) === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={styles.empty}>No database products yet for this catalog.</p>
          )}
        </div>

        <form
          id="dashboard-inventory-form"
          style={styles.panel}
          onSubmit={saveProduct}
        >
          <h3 style={styles.h3}>Product Details</h3>

          <label style={styles.label}>
            Catalog
            <select
              value={form.catalogKey}
              onChange={(event) => updateForm("catalogKey", event.target.value)}
              style={styles.input}
            >
              {catalogOptions.map((catalog) => (
                <option key={catalog.id} value={catalog.id}>
                  {catalog.label}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.twoColumns}>
            <Field label="Product ID" value={form.productId} onChange={(value) => updateForm("productId", value)} />
            <Field label="SKU" value={form.sku} onChange={(value) => updateForm("sku", value)} />
          </div>

          <Field label="Title" value={form.title} onChange={(value) => updateForm("title", value)} />
          <Field label="Media URL" value={form.imageUrl} onChange={(value) => updateForm("imageUrl", value)} />

          <label style={styles.label}>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={4}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </label>

          <div style={styles.twoColumns}>
            <label style={styles.label}>
              Fulfillment
              <select
                value={form.fulfillmentType}
                onChange={(event) =>
                  updateForm("fulfillmentType", event.target.value)
                }
                style={styles.input}
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="ticket">Ticket</option>
              </select>
            </label>
            <Field
              label="Max per order"
              type="number"
              value={form.maxOrderQuantity}
              onChange={(value) => updateForm("maxOrderQuantity", value)}
            />
          </div>

          <div style={styles.twoColumns}>
            <Field
              label="Max recipients"
              type="number"
              value={form.maxPurchaseForOthers}
              onChange={(value) => updateForm("maxPurchaseForOthers", value)}
            />
            <Field
              label="Max per recipient"
              type="number"
              value={form.maxRecipientQuantity}
              onChange={(value) => updateForm("maxRecipientQuantity", value)}
            />
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.enablePurchaseForOthers}
                onChange={(event) =>
                  updateForm("enablePurchaseForOthers", event.target.checked)
                }
              />
              Enable purchase for others
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.enableStoreCreditPurchase}
                onChange={(event) =>
                  updateForm("enableStoreCreditPurchase", event.target.checked)
                }
              />
              Enable store credit purchase
            </label>
          </div>

          <div style={styles.optionBox}>
            <h4 style={styles.h4}>Primary Option</h4>
            <div style={styles.twoColumns}>
              <Field label="Option ID" value={form.optionId} onChange={(value) => updateForm("optionId", value)} />
              <Field label="Option SKU" value={form.optionSku} onChange={(value) => updateForm("optionSku", value)} />
            </div>
            <div style={styles.twoColumns}>
              <Field label="Option label" value={form.optionLabel} onChange={(value) => updateForm("optionLabel", value)} />
              <Field label="Price" type="number" value={form.optionPrice} onChange={(value) => updateForm("optionPrice", value)} />
            </div>
          </div>

          {status ? <p style={styles.status}>{status}</p> : null}

          <div style={styles.actions}>
            <button type="submit" disabled={isSaving} style={styles.primaryButton}>
              {isSaving ? "Saving..." : "Save Product"}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setForm({ ...emptyForm, catalogKey })}
            >
              New Product
            </button>
          </div>
        </form>
      </div>
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
    gridTemplateColumns: "minmax(220px, 0.8fr) minmax(320px, 1.2fr)",
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
  checkboxRow: {
    display: "grid",
    gap: "8px",
  },
  checkboxLabel: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontSize: "13px",
  },
  optionBox: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
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
