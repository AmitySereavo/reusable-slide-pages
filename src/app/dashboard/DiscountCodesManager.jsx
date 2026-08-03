"use client";

import { useEffect, useMemo, useState } from "react";

const emptyForm = {
  id: "",
  code: "",
  label: "",
  active: true,
  discountType: "fixed_amount",
  discountValue: "",
  currencyCode: "JMD",
  minimumSpend: "",
  appliesTo: "whole_cart",
  shopKeys: [],
  productKeys: [],
  customerEmails: "",
  customerPhones: "",
  startsAt: "",
  endsAt: "",
  maxUses: "",
  perPersonLimit: "1",
};

const shopOptions = [
  { id: "little-orchard-shop", label: "Little Orchard Shop" },
  { id: "garden-package", label: "Garden Package" },
  { id: "music-merch-shop", label: "Music + Merch Store" },
  { id: "ticket-add-ons", label: "Ticket Add-ons" },
  { id: "invitation-tickets", label: "Invitation Tickets" },
  { id: "combined-order", label: "Combined Order" },
];

export default function DiscountCodesManager() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDiscounts();
    void loadInventoryOptions();
  }, []);

  const activeCount = useMemo(
    () => discounts.filter((discount) => discount.active).length,
    [discounts]
  );

  async function loadDiscounts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/discount-codes", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Discount codes could not be loaded.");
      }

      setDiscounts(data.discounts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadInventoryOptions() {
    try {
      const response = await fetch("/api/dashboard/inventory/unified", {
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setInventoryItems(data.items || []);
      }
    } catch (loadError) {
      console.error("Discount inventory options load error:", loadError);
    }
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function editDiscount(discount) {
    setForm({
      id: discount.id,
      code: discount.code || "",
      label: discount.label || "",
      active: discount.active !== false,
      discountType: discount.discountType || "fixed_amount",
      discountValue: String(discount.discountValue || ""),
      currencyCode: discount.currencyCode || "JMD",
      minimumSpend: discount.minimumSpend ? String(discount.minimumSpend) : "",
      appliesTo: discount.appliesTo || "whole_cart",
      shopKeys: discount.shopKeys || [],
      productKeys: discount.productKeys || [],
      customerEmails: (discount.customerEmails || []).join(", "),
      customerPhones: (discount.customerPhones || []).join(", "),
      startsAt: toDateTimeInput(discount.startsAt),
      endsAt: toDateTimeInput(discount.endsAt),
      maxUses: discount.maxUses === null ? "" : String(discount.maxUses || ""),
      perPersonLimit: String(discount.perPersonLimit ?? 1),
    });
    setNotice(`Editing ${discount.code}.`);
  }

  async function saveForm(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const payload = {
        ...form,
        shopKeys: normalizeSelectionList(form.shopKeys),
        productKeys: normalizeSelectionList(form.productKeys),
        customerEmails: splitList(form.customerEmails),
        customerPhones: splitList(form.customerPhones),
        discountValue: Number(form.discountValue),
        currencyCode: form.currencyCode,
        minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        perPersonLimit: Number(form.perPersonLimit || 1),
      };
      const response = await fetch("/api/dashboard/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Discount code could not be saved.");
      }

      setForm(emptyForm);
      setNotice(`${data.discount.code} has been saved.`);
      await loadDiscounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(field, value) {
    setForm((current) => {
      const currentList = normalizeSelectionList(current[field]);
      const nextList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];

      return { ...current, [field]: nextList };
    });
  }

  function clearSelection(field) {
    setForm((current) => ({ ...current, [field]: [] }));
  }

  const productOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    for (const item of inventoryItems) {
      const baseKeys = [item.id, item.sku, item.slug].filter(Boolean);
      for (const key of baseKeys) {
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({
          value: key,
          label: `${item.title || key}${item.sku ? ` - ${item.sku}` : ""}`,
        });
      }

      const variants = Array.isArray(item.options) ? item.options : [];
      for (const option of variants) {
        const optionKeys = [option?.sku, option?.id].filter(Boolean);
        for (const key of optionKeys) {
          if (seen.has(key)) continue;
          seen.add(key);
          options.push({
            value: key,
            label: `${item.title || "Product"} - ${option.label || key}${
              option.sku ? ` - ${option.sku}` : ""
            }`,
          });
        }
      }
    }

    return options.sort((first, second) =>
      first.label.localeCompare(second.label)
    );
  }, [inventoryItems]);

  async function toggleDiscount(discount) {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/dashboard/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...discount, active: !discount.active }),
      });
      const data = await response.json();

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Discount code could not be updated.");
      }

      setNotice(
        `${discount.code} is now ${data.discount.active ? "active" : "inactive"}.`
      );
      await loadDiscounts();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <section style={panelStyle}>
        <div style={headerRowStyle}>
          <div>
            <p style={eyebrowStyle}>Discount codes</p>
            <h2 style={titleStyle}>{activeCount} active code(s)</h2>
          </div>
          <button type="button" onClick={() => setForm(emptyForm)} style={ghostButtonStyle}>
            New code
          </button>
        </div>

        <form onSubmit={saveForm} style={formStyle}>
          <label style={labelStyle}>
            Code
            <input
              value={form.code}
              onChange={(event) => updateField("code", event.target.value)}
              placeholder="GARDEN10"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Admin label
            <input
              value={form.label}
              onChange={(event) => updateField("label", event.target.value)}
              placeholder="Launch discount"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Discount type
            <select
              value={form.discountType}
              onChange={(event) => updateField("discountType", event.target.value)}
              style={inputStyle}
            >
              <option value="fixed_amount">Cash amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
          <label style={labelStyle}>
            Value
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={(event) => updateField("discountValue", event.target.value)}
              placeholder={form.discountType === "percentage" ? "10" : "500"}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Currency
            <select
              value={form.currencyCode}
              onChange={(event) => updateField("currencyCode", event.target.value)}
              style={inputStyle}
            >
              <option value="JMD">JMD</option>
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label style={labelStyle}>
            Minimum spend threshold
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minimumSpend}
              onChange={(event) => updateField("minimumSpend", event.target.value)}
              placeholder="Leave blank for no threshold"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Applies to
            <select
              value={form.appliesTo}
              onChange={(event) => updateField("appliesTo", event.target.value)}
              style={inputStyle}
            >
              <option value="whole_cart">Whole cart</option>
              <option value="specific_products">Specific products</option>
            </select>
          </label>
          <label style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField("active", event.target.checked)}
            />
            Active
          </label>
          <MultiSelectField
            label="Shop keys"
            helper="Leave empty to make the code available to all shops."
            options={shopOptions.map((shop) => ({
              value: shop.id,
              label: `${shop.label} - ${shop.id}`,
            }))}
            selectedValues={form.shopKeys}
            placeholder="Choose a shop"
            onToggle={(value) => toggleSelection("shopKeys", value)}
            onClear={() => clearSelection("shopKeys")}
          />
          <MultiSelectField
            label="Product IDs / SKUs"
            helper="Used only when Applies to is set to specific products."
            options={productOptions}
            selectedValues={form.productKeys}
            placeholder="Choose a product or SKU"
            onToggle={(value) => toggleSelection("productKeys", value)}
            onClear={() => clearSelection("productKeys")}
          />
          <label style={labelStyle}>
            Specific customer emails
            <textarea
              value={form.customerEmails}
              onChange={(event) => updateField("customerEmails", event.target.value)}
              placeholder="customer@example.com"
              style={textareaStyle}
            />
          </label>
          <label style={labelStyle}>
            Specific customer phone numbers
            <textarea
              value={form.customerPhones}
              onChange={(event) => updateField("customerPhones", event.target.value)}
              placeholder="18761234567"
              style={textareaStyle}
            />
          </label>
          <label style={labelStyle}>
            Starts at
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Ends at
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => updateField("endsAt", event.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Total use limit
            <input
              type="number"
              min="0"
              value={form.maxUses}
              onChange={(event) => updateField("maxUses", event.target.value)}
              placeholder="Leave blank for no limit"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Uses per email / phone
            <input
              type="number"
              min="0"
              value={form.perPersonLimit}
              onChange={(event) => updateField("perPersonLimit", event.target.value)}
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving..." : form.id ? "Save discount code" : "Create discount code"}
          </button>
        </form>

        {notice ? <p style={noticeStyle}>{notice}</p> : null}
        {error ? <p style={errorStyle}>{error}</p> : null}
      </section>

      <section style={panelStyle}>
        <h2 style={titleStyle}>Codes</h2>
        {loading ? <p>Loading discount codes...</p> : null}
        {!loading && !discounts.length ? (
          <p>No discount codes have been created yet.</p>
        ) : null}
        <div style={listStyle}>
          {discounts.map((discount) => (
            <article key={discount.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h3 style={codeStyle}>{discount.code}</h3>
                  <p style={mutedStyle}>
                    {discount.discountType === "percentage"
                      ? `${discount.discountValue}% off`
                      : `${discount.currencyCode || "JMD"} $${Number(discount.discountValue || 0).toLocaleString("en-JM")} off`}
                    {" · "}
                    {discount.appliesTo === "whole_cart" ? "whole cart" : "specific products"}
                  </p>
                </div>
                <span style={discount.active ? activeBadgeStyle : inactiveBadgeStyle}>
                  {discount.active ? "Active" : "Inactive"}
                </span>
              </div>
              <dl style={definitionStyle}>
                <dt>Shops</dt>
                <dd>{discount.shopKeys.length ? discount.shopKeys.join(", ") : "All shops"}</dd>
                <dt>Products</dt>
                <dd>{discount.productKeys.length ? discount.productKeys.join(", ") : "Any eligible product"}</dd>
                <dt>Customers</dt>
                <dd>
                  {discount.customerEmails.length || discount.customerPhones.length
                    ? [...discount.customerEmails, ...discount.customerPhones].join(", ")
                    : "Any customer"}
                </dd>
                <dt>Threshold</dt>
                <dd>
                  {discount.minimumSpend
                    ? `${discount.currencyCode || "JMD"} $${Number(discount.minimumSpend).toLocaleString("en-JM")}`
                    : "No minimum spend"}
                </dd>
                <dt>Uses</dt>
                <dd>
                  {discount.useCount}
                  {discount.maxUses ? ` / ${discount.maxUses}` : ""}
                </dd>
              </dl>
              <div style={cardActionsStyle}>
                <button type="button" onClick={() => editDiscount(discount)} style={ghostButtonStyle}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleDiscount(discount)}
                  disabled={saving}
                  style={ghostButtonStyle}
                >
                  {discount.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MultiSelectField({
  label,
  helper,
  options,
  selectedValues,
  placeholder,
  onToggle,
  onClear,
}) {
  const normalizedSelected = normalizeSelectionList(selectedValues);
  const selectedSet = new Set(normalizedSelected);
  const selectedOptions = normalizedSelected.map((value) => {
    const option = options.find((candidate) => candidate.value === value);
    return option || { value, label: value };
  });
  const availableOptions = options.filter(
    (option) => !selectedSet.has(option.value)
  );

  return (
    <div style={labelStyle}>
      <span>{label}</span>
      {helper ? <span style={helperTextStyle}>{helper}</span> : null}
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) onToggle(value);
        }}
        style={inputStyle}
      >
        <option value="">{placeholder}</option>
        {availableOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedOptions.length ? (
        <div style={selectionChipListStyle}>
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              style={selectionChipStyle}
              onClick={() => onToggle(option.value)}
              title="Remove this selection"
            >
              {option.label} x
            </button>
          ))}
          <button type="button" style={selectionClearButtonStyle} onClick={onClear}>
            Clear all
          </button>
        </div>
      ) : (
        <span style={emptySelectionTextStyle}>No specific selection.</span>
      )}
    </div>
  );
}

function splitList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSelectionList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return splitList(value);
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

const pageStyle = {
  display: "grid",
  gap: "24px",
};

const panelStyle = {
  border: "1px solid rgba(69, 55, 38, 0.18)",
  borderRadius: "8px",
  background: "#fffaf1",
  padding: "22px",
};

const headerRowStyle = {
  display: "flex",
  gap: "16px",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const eyebrowStyle = {
  margin: 0,
  color: "#6f5b42",
  fontWeight: 700,
  textTransform: "uppercase",
  fontSize: "0.76rem",
};

const titleStyle = {
  margin: "0 0 14px",
  color: "#1f4c2e",
};

const formStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const labelStyle = {
  display: "grid",
  gap: "7px",
  color: "#3f3328",
  fontWeight: 700,
};

const helperTextStyle = {
  color: "#6f5b42",
  fontSize: "0.84rem",
  fontWeight: 500,
  lineHeight: 1.35,
};

const checkLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#3f3328",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minHeight: "44px",
  border: "1px solid rgba(69, 55, 38, 0.22)",
  borderRadius: "8px",
  padding: "10px 12px",
  font: "inherit",
  background: "#ffffff",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "84px",
  resize: "vertical",
};

const selectionChipListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const selectionChipStyle = {
  border: "1px solid rgba(47, 111, 65, 0.24)",
  borderRadius: "999px",
  background: "#e9f4eb",
  color: "#1f4c2e",
  padding: "7px 10px",
  font: "inherit",
  fontSize: "0.84rem",
  fontWeight: 800,
  cursor: "pointer",
};

const selectionClearButtonStyle = {
  ...selectionChipStyle,
  borderColor: "rgba(69, 55, 38, 0.2)",
  background: "#ffffff",
  color: "#6f5b42",
};

const emptySelectionTextStyle = {
  color: "#817263",
  fontSize: "0.86rem",
  fontWeight: 500,
};

const primaryButtonStyle = {
  minHeight: "48px",
  border: 0,
  borderRadius: "8px",
  background: "#2f6f41",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const ghostButtonStyle = {
  border: "1px solid rgba(69, 55, 38, 0.26)",
  borderRadius: "8px",
  background: "#ffffff",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const noticeStyle = {
  color: "#1f6b3a",
  fontWeight: 700,
};

const errorStyle = {
  color: "#a51414",
  fontWeight: 700,
};

const listStyle = {
  display: "grid",
  gap: "14px",
};

const cardStyle = {
  border: "1px solid rgba(69, 55, 38, 0.16)",
  borderRadius: "8px",
  background: "#ffffff",
  padding: "16px",
};

const cardHeaderStyle = {
  display: "flex",
  gap: "12px",
  justifyContent: "space-between",
};

const codeStyle = {
  margin: 0,
  color: "#111111",
};

const mutedStyle = {
  margin: "5px 0 0",
  color: "#6f5b42",
};

const activeBadgeStyle = {
  alignSelf: "flex-start",
  borderRadius: "999px",
  background: "#dff5e7",
  color: "#1f6b3a",
  padding: "5px 10px",
  fontWeight: 800,
};

const inactiveBadgeStyle = {
  ...activeBadgeStyle,
  background: "#eeeeee",
  color: "#666666",
};

const definitionStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "6px 12px",
  margin: "14px 0",
};

const cardActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};
