"use client";

import { useEffect, useState } from "react";

const statusOptions = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function IdentityVerificationManager() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [notesById, setNotesById] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadRecords(nextStatus = status) {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/identity-verifications?status=${encodeURIComponent(
          nextStatus
        )}`
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not load identity verifications.");
      }

      setRecords(data?.verifications || []);
      setNotesById(
        Object.fromEntries(
          (data?.verifications || []).map((record) => [
            record.id,
            record.adminNotes || "",
          ])
        )
      );
      if (data?.notice) {
        setMessage(data.notice);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load identity verifications."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords(status);
  }, [status]);

  async function updateStatus(record, nextStatus) {
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/identity-verifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: record.id,
          status: nextStatus,
          adminNotes: notesById[record.id] || "",
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update verification.");
      }

      setMessage(`${record.userName} marked ${nextStatus.toLowerCase()}.`);
      await loadRecords(status);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update verification."
      );
    }
  }

  return (
    <section style={styles.section}>
      <div style={styles.toolbar}>
        <label style={styles.label}>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={styles.input}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => loadRecords(status)} style={styles.button}>
          Refresh
        </button>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}
      {isLoading ? <div style={styles.empty}>Loading verifications...</div> : null}
      {!isLoading && !records.length ? (
        <div style={styles.empty}>No identity verifications found.</div>
      ) : null}

      <div style={styles.list}>
        {records.map((record) => (
          <article key={record.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <strong>{record.userName}</strong>
                <div style={styles.meta}>{record.userEmail || "No email saved"}</div>
                <div style={styles.meta}>
                  {record.documentType} - submitted {formatDate(record.submittedAt)}
                </div>
              </div>
              <span style={styles.status}>{record.status}</span>
            </div>

            <div style={styles.fileLinks}>
              <a href={record.frontFileUrl} target="_blank" rel="noreferrer" style={styles.link}>
                View ID front
              </a>
              <a href={record.backFileUrl} target="_blank" rel="noreferrer" style={styles.link}>
                View ID back
              </a>
            </div>

            <div style={styles.socialGrid}>
              <InfoLink label="Instagram" href={record.instagramUrl} />
              <InfoLink label="TikTok" href={record.tiktokUrl} />
              <InfoLink label="Facebook" href={record.facebookUrl} />
            </div>

            <label style={styles.label}>
              Admin notes
              <textarea
                value={notesById[record.id] || ""}
                onChange={(event) =>
                  setNotesById((previous) => ({
                    ...previous,
                    [record.id]: event.target.value,
                  }))
                }
                style={{ ...styles.input, minHeight: "84px", resize: "vertical" }}
              />
            </label>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => updateStatus(record, "APPROVED")}
                style={{ ...styles.button, ...styles.approveButton }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => updateStatus(record, "REJECTED")}
                style={{ ...styles.button, ...styles.rejectButton }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => updateStatus(record, "PENDING")}
                style={styles.button}
              >
                Mark Pending
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function InfoLink({ label, href }) {
  return (
    <div style={styles.meta}>
      <strong>{label}:</strong>{" "}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={styles.link}>
          Open
        </a>
      ) : (
        "Not added"
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "not recorded";
  return date.toLocaleString();
}

const styles = {
  section: {
    display: "grid",
    gap: "14px",
  },
  toolbar: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "6px",
    font: "inherit",
    minHeight: "40px",
    padding: "8px 10px",
  },
  button: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    background: "#fffdfa",
    color: "#201c1d",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: "40px",
    padding: "8px 12px",
  },
  approveButton: {
    background: "#2f7d4a",
    color: "#fff",
  },
  rejectButton: {
    background: "#b42318",
    color: "#fff",
  },
  message: {
    border: "1px solid rgba(47, 125, 74, 0.24)",
    borderRadius: "6px",
    background: "rgba(47, 125, 74, 0.08)",
    padding: "10px 12px",
  },
  empty: {
    border: "1px dashed rgba(32, 28, 29, 0.2)",
    borderRadius: "6px",
    padding: "14px",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "14px",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
  },
  status: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 8px",
  },
  meta: {
    color: "#6b625c",
    fontSize: "14px",
    lineHeight: 1.45,
  },
  fileLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  socialGrid: {
    display: "grid",
    gap: "6px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  link: {
    color: "#201c1d",
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
};
