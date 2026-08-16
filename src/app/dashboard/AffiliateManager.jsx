"use client";

import { useEffect, useState } from "react";

const statusOptions = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "paused", label: "Paused" },
];

const levelOptions = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

const scopeOptions = [
  { value: "entire_store", label: "Entire store" },
  { value: "specific_products", label: "Specific product SKUs" },
];

export default function AffiliateManager() {
  const [applications, setApplications] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState("");
  const [savingId, setSavingId] = useState("");
  const [view, setView] = useState("applications");
  const [expandedProducts, setExpandedProducts] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "products") {
      setView("products");
    }
    void loadApplications();
  }, []);

  async function loadApplications() {
    setStatus("Loading affiliate applications...");
    const response = await fetch("/api/dashboard/affiliates");
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload?.error || "Affiliate applications could not be loaded.");
      return;
    }

    setApplications(payload.applications || []);
    setDrafts(
      Object.fromEntries(
        (payload.applications || []).map((application) => [
          application.id,
          makeDraft(application),
        ])
      )
    );
    setStatus("");
  }

  function updateDraft(id, key, value) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [key]: value,
        ...(key === "status" ? { statusConfirmation: "" } : {}),
      },
    }));
  }

  async function saveApplication(application) {
    const draft = drafts[application.id] || makeDraft(application);
    setSavingId(application.id);
    setStatus(`Saving ${application.fullName || "affiliate"}...`);

    const response = await fetch("/api/dashboard/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: application.id,
        status: draft.status,
        level: draft.level,
        scope: draft.scope,
        storeKeys: draft.storeKeys,
        productSkus: draft.productSkus,
        notes: draft.notes,
        statusConfirmation: draft.statusConfirmation,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSavingId("");

    if (!response.ok) {
      setStatus(payload?.error || "Affiliate review could not be saved.");
      return;
    }

    setApplications(payload.applications || []);
    setDrafts(
      Object.fromEntries(
        (payload.applications || []).map((nextApplication) => [
          nextApplication.id,
          makeDraft(nextApplication),
        ])
      )
    );
    setStatus("Affiliate review saved.");
  }

  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.h2}>Affiliate Applications</h2>
            <p style={styles.copy}>
              Review new requests, approve a level, and decide whether commission applies to a full store or selected SKUs.
            </p>
          </div>
          <a href="/affiliate" target="_blank" rel="noreferrer" style={styles.linkButton}>
            Open sign-up flow
          </a>
        </div>
        {status ? <p style={styles.status}>{status}</p> : null}
        <div style={styles.viewTabs}>
          <button
            type="button"
            onClick={() => setView("applications")}
            style={{
              ...styles.tabButton,
              ...(view === "applications" ? styles.activeTabButton : {}),
            }}
          >
            Applications
          </button>
          <button
            type="button"
            onClick={() => setView("products")}
            style={{
              ...styles.tabButton,
              ...(view === "products" ? styles.activeTabButton : {}),
            }}
          >
            View affiliated products
          </button>
        </div>
      </div>

      {view === "products" ? (
        <AffiliatedProductsView applications={applications} />
      ) : applications.length ? (
        <div style={styles.list}>
          {applications.map((application) => {
            const draft = drafts[application.id] || makeDraft(application);
            const confirmWord = getStatusConfirmationWord(draft.status);
            const productsOpen = expandedProducts[application.id] === true;

            return (
              <article key={application.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.h3}>{application.fullName || "Unnamed applicant"}</h3>
                    <p style={styles.meta}>
                      {application.email || "No email"} - {application.phone || "No phone"}
                      {application.whatsappOptIn ? " - WhatsApp" : ""}
                    </p>
                    <p style={styles.meta}>
                      Email verification:{" "}
                      {application.emailVerification?.status === "verified"
                        ? `Verified ${formatDateTime(
                            application.emailVerification?.verifiedAt
                          )}`
                        : application.emailVerification?.status === "pending"
                          ? "Pending"
                          : "Not sent"}
                    </p>
                    <p style={styles.meta}>
                      Submitted {formatDateTime(application.submittedAt)}
                    </p>
                    {application.review?.accountSetupEmailSentAt ? (
                      <p style={styles.meta}>
                        Account setup email sent{" "}
                        {formatDateTime(application.review.accountSetupEmailSentAt)}
                      </p>
                    ) : null}
                  </div>
                  <strong style={styles.badge}>{formatLabel(draft.status)}</strong>
                </div>

                <div style={styles.grid}>
                  <label style={styles.label}>
                    Status
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        updateDraft(application.id, "status", event.target.value)
                      }
                      style={styles.input}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Affiliate level
                    <select
                      value={draft.level}
                      onChange={(event) =>
                        updateDraft(application.id, "level", event.target.value)
                      }
                      style={styles.input}
                    >
                      {levelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Commission scope
                    <select
                      value={draft.scope}
                      onChange={(event) =>
                        updateDraft(application.id, "scope", event.target.value)
                      }
                      style={styles.input}
                    >
                      {scopeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={styles.grid}>
                  <label style={styles.label}>
                    Store keys, comma separated
                    <input
                      value={draft.storeKeys}
                      onChange={(event) =>
                        updateDraft(application.id, "storeKeys", event.target.value)
                      }
                      style={styles.input}
                      placeholder="little-orchard-shop, garden-package"
                    />
                  </label>
                  <label style={styles.label}>
                    Product SKUs, comma separated
                    <input
                      value={draft.productSkus}
                      onChange={(event) =>
                        updateDraft(application.id, "productSkus", event.target.value)
                      }
                      style={styles.input}
                      placeholder="LO-SCALLION-4IN, LO-LEMON-BALM"
                    />
                  </label>
                </div>

                <label style={styles.label}>
                  Type {confirmWord} to save this status
                  <input
                    value={draft.statusConfirmation}
                    onChange={(event) =>
                      updateDraft(
                        application.id,
                        "statusConfirmation",
                        event.target.value.toUpperCase()
                      )
                    }
                    style={styles.input}
                    placeholder={confirmWord}
                  />
                </label>

                <div style={styles.detailGrid}>
                  <InfoBlock title="Preferred stores" text={application.preferredStores} />
                  <InfoBlock title="Shop type" text={application.selectedShopType} />
                  <InfoBlock title="Requested SKUs" text={application.productSkuList} />
                  <InfoBlock title="Audience type" text={application.audienceType} />
                  <InfoBlock title="Audience fit" text={application.audienceFit} />
                  <InfoBlock title="Elevator pitch" text={application.elevatorPitch} />
                  <InfoBlock
                    title="Social links"
                    text={
                      application.socialLinks?.length
                        ? application.socialLinks
                            .map((link) => `${link.label}: ${link.url}`)
                            .join("\n")
                        : ""
                    }
                  />
                </div>

                <label style={styles.label}>
                  Review notes
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      updateDraft(application.id, "notes", event.target.value)
                    }
                    rows={4}
                    style={{ ...styles.input, resize: "vertical" }}
                  />
                </label>

                <section style={styles.productsPanel}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProducts((current) => ({
                        ...current,
                        [application.id]: !current[application.id],
                      }))
                    }
                    style={styles.secondaryButton}
                  >
                    {productsOpen ? "Hide affiliated products" : "View affiliated products"}
                  </button>
                  {productsOpen ? (
                    <AffiliatedProductList
                      products={application.affiliatedProducts || []}
                    />
                  ) : null}
                </section>

                <div style={styles.actions}>
                  <button
                    type="button"
                    disabled={savingId === application.id}
                    style={styles.primaryButton}
                    onClick={() => saveApplication(application)}
                  >
                    {savingId === application.id ? "Saving..." : "Save review"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p style={styles.empty}>No affiliate applications yet.</p>
      )}
    </section>
  );
}

function InfoBlock({ title, text }) {
  return (
    <div style={styles.infoBlock}>
      <strong>{title}</strong>
      <p style={styles.infoText}>{String(text || "Not provided")}</p>
    </div>
  );
}

function AffiliatedProductsView({ applications }) {
  const approvedApplications = applications.filter(
    (application) => application.review?.status === "approved"
  );

  return (
    <div style={styles.list}>
      {approvedApplications.length ? (
        approvedApplications.map((application) => (
          <article key={application.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.h3}>
                  {application.fullName || "Unnamed affiliate"}
                </h3>
                <p style={styles.meta}>
                  {formatLabel(application.review?.level)} -{" "}
                  {application.email || "No email"}
                </p>
              </div>
              <strong style={styles.badge}>
                {application.affiliatedProducts?.length || 0} products
              </strong>
            </div>
            <AffiliatedProductList
              products={application.affiliatedProducts || []}
            />
          </article>
        ))
      ) : (
        <p style={styles.empty}>No approved affiliates with products yet.</p>
      )}
    </div>
  );
}

function AffiliatedProductList({ products }) {
  if (!products.length) {
    return (
      <p style={styles.empty}>
        No affiliated products match this approved scope yet.
      </p>
    );
  }

  return (
    <div style={styles.productList}>
      {products.map((product) => (
        <div key={product.id} style={styles.productRow}>
          <div>
            <strong>{product.title}</strong>
            <p style={styles.meta}>
              {product.sku || "No SKU"} - {product.shopKey}
            </p>
            <p style={styles.meta}>
              Commission: {product.commissionPercent}% - JMD{" "}
              {formatCurrencyNumber(product.commissionAmountJmd)}
            </p>
          </div>
          <div style={styles.productLinks}>
            <a href={product.affiliateLink} target="_blank" rel="noreferrer">
              Product link
            </a>
            {(product.associatedLinks || []).map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer">
                Associated link
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function makeDraft(application) {
  return {
    status: application.review?.status || "pending_review",
    level: application.review?.level || "bronze",
    scope: application.review?.scope || "entire_store",
    storeKeys: normalizeArray(application.review?.storeKeys).join(", "),
    productSkus: normalizeArray(application.review?.productSkus).join(", "),
    notes: application.review?.notes || "",
    statusConfirmation: "",
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusConfirmationWord(value) {
  return (
    {
      pending_review: "PENDING",
      approved: "APPROVE",
      declined: "DECLINE",
      paused: "PAUSE",
    }[value] || String(value || "").toUpperCase()
  );
}

function formatCurrencyNumber(value) {
  return Number(value || 0).toLocaleString("en-JM", {
    maximumFractionDigits: 0,
  });
}

const styles = {
  section: {
    display: "grid",
    gap: "16px",
    marginTop: "24px",
  },
  panel: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "16px",
  },
  header: {
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
    fontSize: "20px",
    margin: 0,
  },
  copy: {
    color: "#6b625c",
    lineHeight: 1.45,
    margin: "4px 0 0",
  },
  status: {
    color: "#2f6f3e",
    fontWeight: 800,
    margin: 0,
  },
  viewTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tabButton: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "8px",
    background: "#fffdfa",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  activeTabButton: {
    background: "#2f6f3e",
    borderColor: "#2f6f3e",
    color: "#fff",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "14px",
    padding: "16px",
  },
  cardHeader: {
    alignItems: "start",
    borderBottom: "1px solid rgba(32, 28, 29, 0.12)",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
    paddingBottom: "12px",
  },
  meta: {
    color: "#a8a2a0",
    margin: "4px 0 0",
  },
  badge: {
    background: "#eef7ef",
    borderRadius: "999px",
    color: "#2f6f3e",
    padding: "8px 12px",
  },
  grid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  detailGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  infoBlock: {
    background: "rgba(47, 111, 62, 0.04)",
    border: "1px solid rgba(47, 111, 62, 0.14)",
    borderRadius: "8px",
    display: "grid",
    gap: "6px",
    padding: "12px",
  },
  infoText: {
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  productsPanel: {
    display: "grid",
    gap: "10px",
  },
  productList: {
    display: "grid",
    gap: "8px",
  },
  productRow: {
    alignItems: "start",
    background: "rgba(32, 28, 29, 0.03)",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "space-between",
    padding: "12px",
  },
  productLinks: {
    display: "grid",
    gap: "6px",
    justifyItems: "end",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 800,
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "8px",
    font: "inherit",
    padding: "10px 12px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  primaryButton: {
    background: "#2f6f3e",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "11px 16px",
  },
  secondaryButton: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "8px",
    color: "#201c1d",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    justifySelf: "start",
    padding: "10px 14px",
  },
  linkButton: {
    background: "#201c1d",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 900,
    padding: "10px 14px",
    textDecoration: "none",
  },
  empty: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    margin: 0,
    padding: "16px",
  },
};
