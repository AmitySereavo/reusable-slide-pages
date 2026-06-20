"use client";

import { useEffect, useState } from "react";

const supportedCurrencies = ["USD", "JMD", "GBP"];

export default function CurrencyManager() {
  const [rates, setRates] = useState([]);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRates();
  }, []);

  async function loadRates() {
    setStatus("Loading currency rates...");
    const response = await fetch("/api/dashboard/currencies");
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(payload?.error || "Currency rates could not be loaded.");
      return;
    }

    const existingRates = new Map(
      (payload.rates || []).map((rate) => [rate.quoteCurrencyCode, rate])
    );

    setRates(
      supportedCurrencies.map((currencyCode) => ({
        quoteCurrencyCode: currencyCode,
        rate:
          Number(existingRates.get(currencyCode)?.rate ?? (currencyCode === "USD" ? 1 : 0)) ||
          0,
        autoUpdateEnabled:
          existingRates.get(currencyCode)?.autoUpdateEnabled === true,
      }))
    );
    setStatus("");
  }

  function updateRate(currencyCode, patch) {
    setRates((current) =>
      current.map((rate) =>
        rate.quoteCurrencyCode === currencyCode ? { ...rate, ...patch } : rate
      )
    );
  }

  async function saveRate(rate) {
    setIsSaving(true);
    setStatus(`Saving ${rate.quoteCurrencyCode}...`);

    const response = await fetch("/api/dashboard/currencies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rate),
    });
    const payload = await response.json().catch(() => null);

    setIsSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || `${rate.quoteCurrencyCode} could not be saved.`);
      return;
    }

    setStatus(`${rate.quoteCurrencyCode} saved.`);
    await loadRates();
  }

  return (
    <section id="dashboard-currencies" style={styles.section}>
      <div>
        <h2 style={styles.h2}>Currencies</h2>
        <p style={styles.copy}>
          Base currency is USD. Set manual rates now; auto-update can be enabled
          for the future daily API job.
        </p>
      </div>

      <div style={styles.grid}>
        {rates.map((rate) => (
          <div key={rate.quoteCurrencyCode} style={styles.panel}>
            <div style={styles.rateHeader}>
              <strong>USD to {rate.quoteCurrencyCode}</strong>
              <span style={styles.badge}>{rate.quoteCurrencyCode}</span>
            </div>

            <label style={styles.label}>
              Exchange rate
              <input
                type="number"
                min="0"
                step="0.00000001"
                value={rate.rate}
                disabled={rate.quoteCurrencyCode === "USD"}
                onChange={(event) =>
                  updateRate(rate.quoteCurrencyCode, {
                    rate: Number(event.target.value),
                  })
                }
                style={styles.input}
              />
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rate.autoUpdateEnabled}
                onChange={(event) =>
                  updateRate(rate.quoteCurrencyCode, {
                    autoUpdateEnabled: event.target.checked,
                  })
                }
              />
              Auto-update daily by API
            </label>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => saveRate(rate)}
              style={styles.primaryButton}
            >
              Save rate
            </button>
          </div>
        ))}
      </div>

      {status ? <p style={styles.status}>{status}</p> : null}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: "16px",
    marginTop: "24px",
  },
  h2: {
    fontSize: "22px",
    margin: 0,
  },
  copy: {
    margin: "4px 0 0",
    opacity: 0.7,
  },
  grid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "16px",
  },
  rateHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  badge: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 8px",
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
  checkboxLabel: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    fontSize: "13px",
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
  status: {
    color: "#2f6f3e",
    fontSize: "13px",
    margin: 0,
  },
};
