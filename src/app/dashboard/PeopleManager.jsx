"use client";

import { useEffect, useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = Math.floor(total % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatMoney(item) {
  return `${item.currencyCode || "USD"} ${Number(item.amount || 0).toLocaleString()}`;
}

function compactAnswer(answer) {
  if (answer == null) return "No answer";
  if (typeof answer === "string") return answer;
  try {
    return JSON.stringify(answer);
  } catch {
    return "Structured answer";
  }
}

export default function PeopleManager() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ summary: {}, accounts: [], leads: [] });
  const [status, setStatus] = useState("Loading people...");
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPeople(query);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  async function loadPeople(nextQuery = query) {
    setStatus("Loading people...");
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());

    const response = await fetch(`/api/dashboard/people?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload?.error || "People could not be loaded.");
      return;
    }

    setData(payload);
    setStatus("");
  }

  const rows = useMemo(
    () => [
      ...(data.accounts || []).map((record) => ({
        ...record,
        rowKey: `account-${record.id}`,
      })),
      ...(data.leads || []).map((record) => ({
        ...record,
        rowKey: `lead-${record.id}`,
      })),
    ],
    [data.accounts, data.leads]
  );

  return (
    <section id="dashboard-people" style={styles.section}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.heading}>People</h2>
          <p style={styles.subtext}>
            View leads, accounts, purchase history, content activity, answers, and email engagement.
          </p>
        </div>
        <div style={styles.countGrid}>
          <span style={styles.countPill}>{data.summary?.accountCount || 0} accounts</span>
          <span style={styles.countPill}>{data.summary?.leadCount || 0} leads</span>
        </div>
      </div>

      <label style={styles.searchLabel}>
        Search people
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, phone, tag, source..."
          style={styles.searchInput}
        />
      </label>

      {status ? <p style={styles.status}>{status}</p> : null}

      <div style={styles.list}>
        {rows.map((record) => {
          const isExpanded = expandedKey === record.rowKey;
          return (
            <article key={record.rowKey} style={styles.card}>
              <button
                type="button"
                onClick={() => setExpandedKey(isExpanded ? null : record.rowKey)}
                style={styles.cardButton}
              >
                <span style={styles.identityBlock}>
                  <strong style={styles.name}>
                    {record.contact?.name || record.contact?.email || "Unnamed person"}
                  </strong>
                  <span style={styles.metaLine}>
                    {record.kind === "account" ? "Account" : "Lead"} ·{" "}
                    {record.contact?.email || record.contact?.phone || "No contact saved"}
                  </span>
                  <span style={styles.metaLine}>
                    Created {formatDate(record.createdAt)}
                    {record.verifiedAt ? ` · Verified ${formatDate(record.verifiedAt)}` : ""}
                  </span>
                </span>
                <span style={styles.expandText}>{isExpanded ? "Hide details" : "See details"}</span>
              </button>

              {isExpanded ? (
                record.kind === "account" ? (
                  <AccountDetails record={record} />
                ) : (
                  <LeadDetails record={record} />
                )
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AccountDetails({ record }) {
  const spent = record.summary?.amountSpent?.length
    ? record.summary.amountSpent.map(formatMoney).join(" · ")
    : "No recorded spend yet";

  return (
    <div style={styles.detailGrid}>
      <DetailGroup title="Contact">
        <InfoLine label="Name" value={record.contact?.name} />
        <InfoLine label="Email" value={record.contact?.email} />
        <InfoLine label="Phone" value={record.contact?.phone} />
        <InfoLine
          label="Location"
          value={[record.contact?.city, record.contact?.country].filter(Boolean).join(", ")}
        />
        <InfoLine
          label="Address"
          value={[
            record.contact?.addressLine1,
            record.contact?.addressLine2,
            record.contact?.parishOrRegion,
            record.contact?.postalCode,
          ]
            .filter(Boolean)
            .join(", ")}
        />
      </DetailGroup>

      <DetailGroup title="Account">
        <InfoLine label="Created by" value={record.createdBy} />
        <InfoLine label="Admin level" value={record.adminLevel} />
        <InfoLine label="Preferred currency" value={record.preferredCurrencyCode} />
        <InfoLine label="Tags" value={(record.tags || []).map((tag) => tag.tagKey).join(", ")} />
      </DetailGroup>

      <DetailGroup title="Commercial">
        <InfoLine label="Amount spent" value={spent} />
        <InfoLine label="Orders" value={record.summary?.orderCount} />
        <InfoLine label="Tickets" value={record.summary?.ticketCount} />
        <InfoLine label="Purchased items" value={record.summary?.purchasedItemCount} />
        <InfoLine label="Gift claims" value={record.summary?.giftClaimCount} />
      </DetailGroup>

      <DetailGroup title="Content Activity">
        <InfoLine label="Videos watched" value={record.summary?.videoCount} />
        <InfoLine
          label="Total watched"
          value={formatDuration(record.summary?.totalWatchedSeconds)}
        />
        <InfoLine label="Questions answered" value={record.summary?.questionAnswerCount} />
        <InfoLine label="Email events" value={record.summary?.emailEventCount} />
      </DetailGroup>

      <DetailList
        title="Purchased Items"
        items={record.purchasedItems}
        empty="No purchased items saved."
        renderItem={(item) => (
          <>
            <strong>{item.itemKey}</strong>
            <span>{item.status} · {formatDate(item.purchasedAt)}</span>
          </>
        )}
      />

      <DetailList
        title="Orders + Tickets"
        items={record.orders}
        empty="No invitation orders saved."
        renderItem={(order) => (
          <>
            <strong>{order.orderCode}</strong>
            <span>
              {order.status} · {order.currencyCode} {order.grandTotal.toLocaleString()} ·{" "}
              {formatDate(order.createdAt)}
            </span>
            {(order.tickets || []).map((ticket) => (
              <span key={ticket.ticketCode}>
                {ticket.ticketCode} · {ticket.productTitle} · {ticket.ownerName || ticket.ownerEmail}
              </span>
            ))}
          </>
        )}
      />

      <DetailList
        title="Videos Watched"
        items={record.videosWatched}
        empty="No video progress saved."
        renderItem={(video) => (
          <>
            <strong>{video.questionnaireSlug} · {video.slideId}</strong>
            <span>
              {formatDuration(video.lastPositionSeconds)}
              {video.durationSeconds ? ` of ${formatDuration(video.durationSeconds)}` : ""} ·{" "}
              {formatDate(video.updatedAt)}
            </span>
          </>
        )}
      />

      <DetailList
        title="Questions Answered"
        items={record.questionsAnswered}
        empty="No marketing/questionnaire answers saved."
        renderItem={(answer) => (
          <>
            <strong>{answer.questionnaireSlug} · {answer.questionKey}</strong>
            <span>{compactAnswer(answer.answer)}</span>
            <span>{formatDate(answer.answeredAt)}</span>
          </>
        )}
      />

      <DetailList
        title="Email Activity"
        items={record.emailActivity}
        empty="No email activity saved."
        renderItem={(event) => (
          <>
            <strong>{event.eventType}</strong>
            <span>{event.eventKey || event.recipientEmail || "No key"} · {formatDate(event.createdAt)}</span>
            {getDeviceActivityLine(event.metadata) ? (
              <span>{getDeviceActivityLine(event.metadata)}</span>
            ) : null}
          </>
        )}
      />
    </div>
  );
}

function LeadDetails({ record }) {
  return (
    <div style={styles.detailGrid}>
      <DetailGroup title="Contact">
        <InfoLine label="Name" value={record.contact?.name} />
        <InfoLine label="Email" value={record.contact?.email} />
        <InfoLine label="Phone" value={record.contact?.phone} />
        <InfoLine
          label="Location"
          value={[record.contact?.city, record.contact?.country].filter(Boolean).join(", ")}
        />
      </DetailGroup>
      <DetailGroup title="Lead Source">
        <InfoLine label="Source" value={record.source} />
        <InfoLine label="Target" value={record.target} />
        <InfoLine label="Verified" value={record.verifiedAt ? formatDate(record.verifiedAt) : null} />
      </DetailGroup>
      <DetailGroup title="Metadata">
        <pre style={styles.pre}>{JSON.stringify(record.metadata || {}, null, 2)}</pre>
      </DetailGroup>
    </div>
  );
}

function DetailGroup({ title, children }) {
  return (
    <section style={styles.detailGroup}>
      <h3 style={styles.detailHeading}>{title}</h3>
      {children}
    </section>
  );
}

function DetailList({ title, items, empty, renderItem }) {
  return (
    <section style={styles.detailGroup}>
      <h3 style={styles.detailHeading}>{title}</h3>
      {items?.length ? (
        <div style={styles.miniList}>
          {items.map((item, index) => (
            <div key={item.id || item.itemKey || item.orderCode || index} style={styles.miniItem}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>{empty}</p>
      )}
    </section>
  );
}

function InfoLine({ label, value }) {
  return (
    <p style={styles.infoLine}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value || "Not recorded"}</span>
    </p>
  );
}

function getDeviceActivityLine(metadata) {
  if (!metadata || typeof metadata !== "object") return "";

  const device = metadata.deviceKey
    ? `device ${String(metadata.deviceKey).slice(0, 10)}`
    : "";
  const location = metadata.location && typeof metadata.location === "object"
    ? [metadata.location.city, metadata.location.region, metadata.location.country]
        .filter(Boolean)
        .join(", ")
    : "";
  const status = metadata.reason ? `reason: ${metadata.reason}` : "";

  return [device, location, status].filter(Boolean).join(" · ");
}

const styles = {
  section: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    margin: "18px 0",
    padding: "18px",
  },
  headerRow: {
    alignItems: "flex-start",
    display: "flex",
    gap: "14px",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  heading: {
    fontSize: "22px",
    margin: 0,
  },
  subtext: {
    color: "#6b625c",
    margin: "6px 0 0",
  },
  countGrid: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  countPill: {
    background: "#eef5ee",
    border: "1px solid rgba(47, 116, 64, 0.2)",
    borderRadius: "999px",
    color: "#2f7440",
    fontSize: "13px",
    fontWeight: 800,
    padding: "7px 10px",
  },
  searchLabel: {
    display: "grid",
    gap: "7px",
    fontSize: "13px",
    fontWeight: 800,
    marginTop: "16px",
  },
  searchInput: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    font: "inherit",
    padding: "11px 12px",
    width: "100%",
  },
  status: {
    color: "#6b625c",
    margin: "12px 0 0",
  },
  list: {
    display: "grid",
    gap: "10px",
    marginTop: "14px",
  },
  card: {
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  cardButton: {
    alignItems: "center",
    background: "#fff",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
    padding: "14px",
    textAlign: "left",
    width: "100%",
  },
  identityBlock: {
    display: "grid",
    gap: "4px",
    minWidth: 0,
  },
  name: {
    fontSize: "16px",
  },
  metaLine: {
    color: "#6b625c",
    fontSize: "13px",
  },
  expandText: {
    color: "#2f7440",
    flex: "0 0 auto",
    fontSize: "13px",
    fontWeight: 900,
    textDecoration: "underline",
  },
  detailGrid: {
    background: "#fbf7f1",
    borderTop: "1px solid rgba(32, 28, 29, 0.1)",
    display: "grid",
    gap: "12px",
    padding: "14px",
  },
  detailGroup: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    padding: "12px",
  },
  detailHeading: {
    fontSize: "14px",
    margin: "0 0 10px",
  },
  infoLine: {
    borderTop: "1px solid rgba(32, 28, 29, 0.08)",
    display: "grid",
    gap: "3px",
    margin: 0,
    padding: "8px 0",
  },
  infoLabel: {
    color: "#6b625c",
    fontSize: "12px",
    fontWeight: 800,
  },
  infoValue: {
    fontSize: "14px",
    overflowWrap: "anywhere",
  },
  miniList: {
    display: "grid",
    gap: "8px",
  },
  miniItem: {
    borderTop: "1px solid rgba(32, 28, 29, 0.08)",
    display: "grid",
    gap: "4px",
    paddingTop: "8px",
    overflowWrap: "anywhere",
  },
  emptyText: {
    color: "#6b625c",
    margin: 0,
  },
  pre: {
    background: "#f5f2ee",
    borderRadius: "6px",
    fontSize: "12px",
    margin: 0,
    maxHeight: "240px",
    overflow: "auto",
    padding: "10px",
    whiteSpace: "pre-wrap",
  },
};
