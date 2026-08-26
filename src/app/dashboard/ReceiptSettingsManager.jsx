"use client";

import { useEffect, useMemo, useState } from "react";

const colorFields = [
  ["pageBackground", "Page background"],
  ["panelBackground", "Receipt panel"],
  ["text", "Text"],
  ["border", "Border"],
  ["accent", "Accent"],
  ["primaryButtonBackground", "Shop / print button"],
  ["primaryButtonText", "Shop / print text"],
  ["promotionButtonBackground", "Promotion button"],
  ["promotionButtonText", "Promotion text"],
  ["secondaryButtonBackground", "Secondary button"],
  ["secondaryButtonText", "Secondary text"],
];

function blankSetting(shopKey = "") {
  return {
    shopKey,
    shopUrl: "",
    shopButtonLabel: "",
    promotionUrl: "",
    promotionButtonLabel: "",
    colors: {},
  };
}

export default function ReceiptSettingsManager() {
  const [shops, setShops] = useState([]);
  const [settings, setSettings] = useState([]);
  const [activeShopKey, setActiveShopKey] = useState("");
  const [draft, setDraft] = useState(blankSetting());
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setStatus("Loading receipt settings...");
      const response = await fetch("/api/dashboard/receipt-settings");
      const payload = await response.json().catch(() => ({}));

      if (!isMounted) return;

      if (!response.ok || payload.ok === false) {
        setStatus(payload.error || "Receipt settings could not be loaded.");
        return;
      }

      const nextShops = Array.isArray(payload.shops) ? payload.shops : [];
      const nextSettings = Array.isArray(payload.settings)
        ? payload.settings
        : [];
      const firstShopKey = nextShops[0]?.shopKey || "";

      setShops(nextShops);
      setSettings(nextSettings);
      setActiveShopKey(firstShopKey);
      setDraft(
        nextSettings.find((item) => item.shopKey === firstShopKey) ||
          blankSetting(firstShopKey)
      );
      setStatus("");
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeShop = useMemo(
    () => shops.find((shop) => shop.shopKey === activeShopKey),
    [activeShopKey, shops]
  );

  function selectShop(shopKey) {
    setActiveShopKey(shopKey);
    setDraft(
      settings.find((item) => item.shopKey === shopKey) || blankSetting(shopKey)
    );
    setStatus("");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateColor(field, value) {
    setDraft((current) => ({
      ...current,
      colors: {
        ...(current.colors || {}),
        [field]: value,
      },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving receipt settings...");

    try {
      const response = await fetch("/api/dashboard/receipt-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Receipt settings could not be saved.");
      }

      setSettings((current) => {
        const others = current.filter((item) => item.shopKey !== draft.shopKey);
        return [...others, payload.setting];
      });
      setDraft(payload.setting);
      setStatus("Receipt settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={styles.shell}>
      <section style={styles.panel}>
        <label style={styles.label}>
          Shop
          <select
            value={activeShopKey}
            onChange={(event) => selectShop(event.target.value)}
            style={styles.select}
          >
            {shops.map((shop) => (
              <option key={shop.shopKey} value={shop.shopKey}>
                {shop.displayName}
              </option>
            ))}
          </select>
        </label>
      </section>

      <form onSubmit={saveSettings} style={styles.panel}>
        <div style={styles.headerRow}>
          <div>
            <strong>{activeShop?.displayName || draft.shopKey}</strong>
            <p style={styles.muted}>
              Configure receipt buttons and colors for this shop.
            </p>
          </div>
          <button type="submit" disabled={isSaving} style={styles.primaryButton}>
            {isSaving ? "Saving..." : "Save receipt settings"}
          </button>
        </div>

        {status ? <p style={styles.status}>{status}</p> : null}

        <div style={styles.grid}>
          <label style={styles.label}>
            Visit shop URL
            <input
              value={draft.shopUrl || ""}
              onChange={(event) => updateDraft("shopUrl", event.target.value)}
              placeholder="/questionnaire/music-merch-shop"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Visit shop button text
            <input
              value={draft.shopButtonLabel || ""}
              onChange={(event) =>
                updateDraft("shopButtonLabel", event.target.value)
              }
              placeholder="Visit shop"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Promotion URL
            <input
              value={draft.promotionUrl || ""}
              onChange={(event) =>
                updateDraft("promotionUrl", event.target.value)
              }
              placeholder="/gift"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Promotion button text
            <input
              value={draft.promotionButtonLabel || ""}
              onChange={(event) =>
                updateDraft("promotionButtonLabel", event.target.value)
              }
              placeholder="View current promotion"
              style={styles.input}
            />
          </label>
        </div>

        <h2 style={styles.sectionTitle}>Receipt colors</h2>
        <div style={styles.colorGrid}>
          {colorFields.map(([field, label]) => (
            <label key={field} style={styles.colorLabel}>
              <span>{label}</span>
              <span style={styles.colorControlRow}>
                <input
                  type="color"
                  value={draft.colors?.[field] || "#ffffff"}
                  onChange={(event) => updateColor(field, event.target.value)}
                  style={styles.colorInput}
                />
                <input
                  value={draft.colors?.[field] || ""}
                  onChange={(event) => updateColor(field, event.target.value)}
                  style={styles.colorTextInput}
                />
              </span>
            </label>
          ))}
        </div>
      </form>
    </div>
  );
}

const styles = {
  shell: {
    display: "grid",
    gap: "16px",
  },
  panel: {
    background: "#fffdf8",
    border: "1px solid #d9c9b5",
    borderRadius: "8px",
    padding: "16px",
  },
  headerRow: {
    alignItems: "center",
    display: "flex",
    gap: "16px",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  muted: {
    color: "#746b62",
    margin: "4px 0 0",
  },
  status: {
    background: "#eef7ee",
    border: "1px solid #bdd7bd",
    borderRadius: "6px",
    padding: "10px",
  },
  grid: {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: "16px",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontWeight: 700,
  },
  input: {
    border: "1px solid #cdbfae",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px",
  },
  select: {
    border: "1px solid #cdbfae",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px",
    maxWidth: "420px",
  },
  primaryButton: {
    background: "#356e3b",
    border: "1px solid #356e3b",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "10px 14px",
  },
  sectionTitle: {
    fontSize: "1rem",
    margin: "20px 0 10px",
  },
  colorGrid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  colorLabel: {
    display: "grid",
    gap: "6px",
    fontWeight: 700,
  },
  colorControlRow: {
    alignItems: "center",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "44px 1fr",
  },
  colorInput: {
    height: "42px",
    width: "44px",
  },
  colorTextInput: {
    border: "1px solid #cdbfae",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px",
  },
};
