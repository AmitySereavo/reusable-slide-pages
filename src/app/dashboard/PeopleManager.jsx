"use client";

import { useEffect, useMemo, useState } from "react";
import {
  downloadDeletionRecordPdf,
  makeDeletionExportFilename,
} from "./deletionExportPdf";

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

function confirmTypedDelete(message) {
  const response = window.prompt(`${message}\n\nType delete to confirm.`);
  return String(response || "").trim().toLowerCase() === "delete";
}

function exportBeforeDelete({ title, filename, record }) {
  try {
    downloadDeletionRecordPdf({ title, filename, record });
    window.alert("Record downloaded as a PDF. Deletion will continue now.");
    return true;
  } catch {
    window.alert("The PDF record could not be created. Deletion was cancelled.");
    return false;
  }
}

function getPeopleKindLabel(record) {
  if (record.kind === "person") return "Person";
  if (record.kind === "account") return "Account";
  if (record.kind === "customer") {
    return `${record.bucket || "Customer"} customer`;
  }

  return "Lead";
}

function getFollowUpLabel(value) {
  return (
    {
      none: "No follow-up",
      hourly: "Hourly",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      every_3_months: "Every 3 months",
    }[value] || "No follow-up"
  );
}

function getFollowUpDotStyle(status) {
  if (status?.color === "red") return styles.followUpDotRed;
  if (status?.color === "yellow") return styles.followUpDotYellow;
  return null;
}

const emptyConversationNote = {
  summary: "",
  currentGoals: "",
  currentPosition: "",
  immediateNextStep: "",
  relationshipImpact: "",
  nextQuestions: "",
  emotionalState: "",
  satisfaction: "",
  referralOpportunities: "",
  additionalNotes: "",
};

const conversationSections = [
  { key: "summary", label: "Summary" },
  { key: "currentGoals", label: "Goals" },
  { key: "currentPosition", label: "Now" },
  { key: "immediateNextStep", label: "Next step" },
  { key: "relationshipImpact", label: "Relationships" },
  { key: "nextQuestions", label: "Questions next time" },
  { key: "emotionalState", label: "Emotional state" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "referralOpportunities", label: "Referral opportunities" },
  { key: "additionalNotes", label: "Additional notes" },
];

function makeConversationDraft(conversation = {}) {
  return conversationSections.reduce((draft, section) => {
    draft[section.key] = conversation[section.key] || "";
    return draft;
  }, {});
}

function makeProfileDraft(record = {}) {
  const contact = record.contact || {};

  return {
    bucket: record.bucket || "",
    labels: (record.labels || []).join(", "),
    interests: (record.interests || []).join(", "),
    contact: {
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      country: contact.country || "",
      city: contact.city || "",
      addressLine1: contact.addressLine1 || "",
      addressLine2: contact.addressLine2 || "",
      parishOrRegion: contact.parishOrRegion || "",
      postalCode: contact.postalCode || "",
    },
  };
}

function getConversationPreview(conversation = {}) {
  return (
    conversation.summary ||
    conversation.currentGoals ||
    conversation.currentPosition ||
    conversation.nextQuestions ||
    "No summary entered."
  );
}

export default function PeopleManager() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ summary: {}, accounts: [], leads: [] });
  const [status, setStatus] = useState("Loading people...");
  const [expandedKey, setExpandedKey] = useState(null);
  const [actionStatus, setActionStatus] = useState("");

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

  async function updatePeopleProfile(record, body) {
    setActionStatus("Saving...");
    const response = await fetch("/api/dashboard/people/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetKind: record.kind,
        targetKey: record.id,
        ...body,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setActionStatus(payload?.error || "Profile could not be updated.");
      return false;
    }

    await loadPeople(query);
    setActionStatus("");
    return true;
  }

  const rows = useMemo(
    () =>
      data.people?.length
        ? (data.people || []).map((record) => ({
            ...record,
            rowKey: `person-${record.id}`,
          }))
        : [
            ...(data.accounts || []).map((record) => ({
              ...record,
              rowKey: `account-${record.id}`,
            })),
            ...(data.leads || []).map((record) => ({
              ...record,
              rowKey: `lead-${record.id}`,
            })),
            ...(data.customers || []).map((record) => ({
              ...record,
              rowKey: `customer-${record.id}`,
            })),
          ],
    [data.accounts, data.customers, data.leads, data.people]
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
          <span style={styles.countPill}>{data.summary?.customerCount || 0} customers</span>
          <span style={styles.countPill}>{data.summary?.personCount || 0} people</span>
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
                    {getFollowUpDotStyle(record.peopleProfile?.followUpStatus) ? (
                      <span
                        aria-label={record.peopleProfile?.followUpStatus?.label}
                        title={record.peopleProfile?.followUpStatus?.label}
                        style={getFollowUpDotStyle(record.peopleProfile?.followUpStatus)}
                      />
                    ) : null}
                    {record.contact?.name || record.contact?.email || "Unnamed person"}
                  </strong>
                  <span style={styles.metaLine}>
                    {getPeopleKindLabel(record)} ·{" "}
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
                record.kind === "person" ? (
                  <PersonDetails record={record} onProfileAction={updatePeopleProfile} />
                ) : record.kind === "account" ? (
                  <AccountDetails record={record} onProfileAction={updatePeopleProfile} />
                ) : record.kind === "customer" ? (
                  <CustomerDetails record={record} onProfileAction={updatePeopleProfile} />
                ) : (
                  <LeadDetails record={record} onProfileAction={updatePeopleProfile} />
                )
              ) : null}
            </article>
          );
        })}
      </div>
      {actionStatus ? <p style={styles.status}>{actionStatus}</p> : null}
    </section>
  );
}

function AccountDetails({ record, onProfileAction }) {
  const spent = record.summary?.amountSpent?.length
    ? record.summary.amountSpent.map(formatMoney).join(" · ")
    : "No recorded spend yet";

  return (
    <div style={styles.detailGrid}>
      <PeopleCrmPanel record={record} onProfileAction={onProfileAction} />
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
            <span>
              Watched actual:{" "}
              {formatDuration(video.totalWatchSeconds ?? video.lastPositionSeconds)}
              {" | "}Reached:{" "}
              {formatDuration(video.maxPositionSeconds ?? video.lastPositionSeconds)}
              {" | "}Skipped forward {video.seekForwardCount ?? 0}
              {" | "}Rewound {video.seekBackwardCount ?? 0}
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

function LeadDetails({ record, onProfileAction }) {
  return (
    <div style={styles.detailGrid}>
      <PeopleCrmPanel record={record} onProfileAction={onProfileAction} />
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

function PersonDetails({ record, onProfileAction }) {
  const spent = record.summary?.amountSpent?.length
    ? record.summary.amountSpent.map(formatMoney).join(" Â· ")
    : "No recorded spend yet";

  return (
    <div style={styles.detailGrid}>
      <PeopleCrmPanel record={record} onProfileAction={onProfileAction} />

      <DetailGroup title="Profile">
        <InfoLine label="Name" value={record.contact?.name} />
        <InfoLine label="Email" value={record.contact?.email} />
        <InfoLine label="Phone" value={record.contact?.phone} />
        <InfoLine label="Labels" value={(record.labels || []).join(", ")} />
        <InfoLine label="Interests" value={(record.interests || []).join(", ")} />
      </DetailGroup>

      <DetailGroup title="Summary">
        <InfoLine label="Amount spent/requested" value={spent} />
        <InfoLine label="Orders" value={record.summary?.orderCount} />
        <InfoLine label="Items" value={record.summary?.itemCount} />
        <InfoLine label="Tickets" value={record.summary?.ticketCount} />
        <InfoLine label="Videos watched" value={record.summary?.videoCount} />
        <InfoLine
          label="Total watched"
          value={formatDuration(record.summary?.totalWatchedSeconds)}
        />
        <InfoLine label="Questions answered" value={record.summary?.questionAnswerCount} />
        <InfoLine label="Email events" value={record.summary?.emailEventCount} />
      </DetailGroup>

      <DetailList
        title="Activity Log"
        items={record.activityLog}
        empty="No activity saved yet."
        renderItem={(activity) => (
          <>
            <strong>{activity.label}</strong>
            {activity.detail ? <span>{activity.detail}</span> : null}
            <span>{formatDate(activity.createdAt)}</span>
          </>
        )}
      />

      <DetailList
        title="Source Records"
        items={record.sourceRecords}
        empty="No source records bundled yet."
        renderItem={(source) => (
          <>
            <strong>{source.label}</strong>
            <span>{source.kind} Â· {source.id}</span>
            <span>{formatDate(source.createdAt)}</span>
          </>
        )}
      />

      <DetailList
        title="Little Orchard Orders"
        items={(record.customers || []).flatMap((customer) => customer.orders || [])}
        empty="No Little Orchard orders saved."
        renderItem={(order) => (
          <>
            <strong>{order.orderCode}</strong>
            <span>
              {order.status || "Status not recorded"} Â·{" "}
              {order.paymentStatus || "Payment status not recorded"} Â·{" "}
              {order.currencyCode} {Number(order.total || 0).toLocaleString()} Â·{" "}
              {formatDate(order.createdAt)}
            </span>
            {(order.items || []).map((item, index) => (
              <span key={`${order.orderCode}-${index}`}>
                {item.quantity} Ã— {item.productTitle}
                {item.sizeLabel ? ` - ${item.sizeLabel}` : ""}
              </span>
            ))}
          </>
        )}
      />

      <DetailList
        title="Devices"
        items={record.devices}
        empty="No receipt or order-status device opens recorded yet."
        renderItem={(device) => (
          <>
            <strong>
              {device.role === "staff" ? "Staff/admin device" : "Customer device"}
            </strong>
            <span>{String(device.deviceKey || "").slice(0, 18)}</span>
            <span>
              First seen {formatDate(device.firstSeenAt)} Â· Last seen{" "}
              {formatDate(device.lastSeenAt)}
            </span>
          </>
        )}
      />
    </div>
  );
}

function CustomerDetails({ record, onProfileAction }) {
  const spent = record.summary?.amountSpent?.length
    ? record.summary.amountSpent.map(formatMoney).join(" · ")
    : "No recorded spend yet";

  return (
    <div style={styles.detailGrid}>
      <PeopleCrmPanel record={record} onProfileAction={onProfileAction} />
      <DetailGroup title="Customer Profile">
        <InfoLine label="Bucket" value={record.bucket} />
        <InfoLine label="Labels" value={(record.labels || []).join(", ")} />
        <InfoLine label="Name" value={record.contact?.name} />
        <InfoLine label="Email" value={record.contact?.email} />
        <InfoLine label="Phone" value={record.contact?.phone} />
      </DetailGroup>

      <DetailGroup title="Relationship">
        <InfoLine label="Interests" value={(record.interests || []).join(", ")} />
        <InfoLine label="Orders" value={record.summary?.orderCount} />
        <InfoLine label="Items" value={record.summary?.itemCount} />
        <InfoLine label="Amount spent/requested" value={spent} />
      </DetailGroup>

      <DetailList
        title="Devices"
        items={record.devices}
        empty="No receipt or order-status device opens recorded yet."
        renderItem={(device) => (
          <>
            <strong>
              {device.role === "staff" ? "Staff/admin device" : "Customer device"}
            </strong>
            <span>
              {String(device.deviceKey || "").slice(0, 18)}
              {device.orderCode ? ` · ${device.orderCode}` : ""}
            </span>
            <span>
              First seen {formatDate(device.firstSeenAt)} · Last seen{" "}
              {formatDate(device.lastSeenAt)}
            </span>
            {device.userName || device.userEmail ? (
              <span>
                Logged in as {[device.userName, device.userEmail]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            {device.note ? <span>{device.note}</span> : null}
          </>
        )}
      />

      <DetailList
        title="Little Orchard Orders"
        items={record.orders}
        empty="No Little Orchard orders saved."
        renderItem={(order) => (
          <>
            <strong>{order.orderCode}</strong>
            <span>
              {order.status || "Status not recorded"} ·{" "}
              {order.paymentStatus || "Payment status not recorded"} ·{" "}
              {order.currencyCode} {Number(order.total || 0).toLocaleString()} ·{" "}
              {formatDate(order.createdAt)}
            </span>
            {order.fulfillmentPreference ? (
              <span>{order.fulfillmentPreference}</span>
            ) : null}
            {(order.items || []).map((item, index) => (
              <span key={`${order.orderCode}-${index}`}>
                {item.quantity} × {item.productTitle}
                {item.sizeLabel ? ` - ${item.sizeLabel}` : ""} ·{" "}
                {item.currencyCode || order.currencyCode}{" "}
                {Number(item.lineTotal || 0).toLocaleString()}
              </span>
            ))}
          </>
        )}
      />

      <DetailList
        title="Customer Notes"
        items={record.notes}
        empty="No notes saved yet."
        renderItem={(note) => (
          <>
            <strong>{note.source || "Note"} · {note.orderCode}</strong>
            <span>{note.text}</span>
            <span>{formatDate(note.createdAt)}</span>
          </>
        )}
      />
    </div>
  );
}

function PeopleCrmPanel({ record, onProfileAction }) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => makeProfileDraft(record));
  const [expandedConversationId, setExpandedConversationId] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editingNote, setEditingNote] = useState(emptyConversationNote);
  const [note, setNote] = useState(emptyConversationNote);
  const profile = record.peopleProfile || {};
  const followUpStatus = profile.followUpStatus || {};
  const dotStyle = getFollowUpDotStyle(followUpStatus);

  function updateNoteField(key, value) {
    setNote((current) => ({ ...current, [key]: value }));
  }

  function updateProfileContactField(key, value) {
    setProfileDraft((current) => ({
      ...current,
      contact: {
        ...current.contact,
        [key]: value,
      },
    }));
  }

  async function saveProfileDetails(event) {
    event.preventDefault();
    const ok = await onProfileAction(record, {
      action: "update-profile-details",
      bucket: profileDraft.bucket,
      labels: profileDraft.labels,
      interests: profileDraft.interests,
      contact: profileDraft.contact,
    });

    if (ok) {
      setIsEditingProfile(false);
    }
  }

  function cancelProfileEdit() {
    setProfileDraft(makeProfileDraft(record));
    setIsEditingProfile(false);
  }

  async function addConversationNote(event) {
    event.preventDefault();
    const ok = await onProfileAction(record, {
      action: "add-conversation-note",
      note,
    });
    if (ok) {
      setNote(emptyConversationNote);
      setIsAddingNote(false);
    }
  }

  async function saveConversationEdit(event) {
    event.preventDefault();
    if (!editingNoteId) return;

    const ok = await onProfileAction(record, {
      action: "update-conversation-note",
      noteId: editingNoteId,
      note: editingNote,
    });

    if (ok) {
      setEditingNoteId("");
      setEditingNote(emptyConversationNote);
    }
  }

  function startConversationEdit(conversation) {
    setEditingNoteId(conversation.id);
    setEditingNote(makeConversationDraft(conversation));
  }

  return (
    <section style={styles.crmPanel}>
      <div style={styles.crmHeader}>
        <div>
          <h3 style={styles.detailHeading}>Conversation Notes</h3>
          <p style={styles.crmSubtext}>
            Latest conversation, next steps, relationships affected, and follow-up reminders.
          </p>
        </div>
        <button
          type="button"
          style={styles.deleteProfileButton}
          onClick={() => {
            const profileName =
              record.contact?.name ||
              record.contact?.email ||
              record.contact?.phone ||
              "this unnamed person";
            if (
              confirmTypedDelete(
                `Delete ${profileName}'s people profile from the People tab? Orders and account records stay stored.`
              )
            ) {
              const exported = exportBeforeDelete({
                title: `People profile deletion export - ${profileName}`,
                filename: makeDeletionExportFilename([
                  "People Profile",
                  profileName,
                  record.contact?.email,
                  record.contact?.phone,
                ]),
                record,
              });
              if (!exported) return;
              onProfileAction(record, {
                action: "delete-profile",
                confirmation: "delete",
              });
            }
          }}
        >
          Delete profile
        </button>
      </div>

      <div style={styles.followUpRow}>
        <label style={styles.inlineLabel}>
          Follow-up frequency
          <select
            value={profile.followUpFrequency || "none"}
            onChange={(event) =>
              onProfileAction(record, {
                action: "set-follow-up",
                followUpFrequency: event.target.value,
              })
            }
            style={styles.select}
          >
            <option value="none">No follow-up</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="every_3_months">Every 3 months</option>
          </select>
        </label>
        <span style={styles.followUpStatus}>
          {dotStyle ? <span style={dotStyle} /> : null}
          {followUpStatus.label || "No follow-up frequency set"}
          {followUpStatus.dueAt ? ` · ${formatDate(followUpStatus.dueAt)}` : ""}
        </span>
      </div>

      <section style={styles.profileEditPanel}>
        <div style={styles.profileEditHeader}>
          <div>
            <h3 style={styles.detailHeading}>Profile Details</h3>
            <p style={styles.crmSubtext}>
              Admin-edited contact details, labels, tags, and interests for this person.
            </p>
          </div>
          {!isEditingProfile ? (
            <button
              type="button"
              style={styles.textButton}
              onClick={() => {
                setProfileDraft(makeProfileDraft(record));
                setIsEditingProfile(true);
              }}
            >
              Edit profile
            </button>
          ) : null}
        </div>

        {isEditingProfile ? (
          <form onSubmit={saveProfileDetails} style={styles.profileEditForm}>
            <TextInputField
              label="Name"
              value={profileDraft.contact.name}
              onChange={(value) => updateProfileContactField("name", value)}
            />
            <TextInputField
              label="Email"
              value={profileDraft.contact.email}
              onChange={(value) => updateProfileContactField("email", value)}
            />
            <TextInputField
              label="Phone"
              value={profileDraft.contact.phone}
              onChange={(value) => updateProfileContactField("phone", value)}
            />
            <TextInputField
              label="Bucket"
              value={profileDraft.bucket}
              onChange={(value) =>
                setProfileDraft((current) => ({ ...current, bucket: value }))
              }
            />
            <TextInputField
              label="Country"
              value={profileDraft.contact.country}
              onChange={(value) => updateProfileContactField("country", value)}
            />
            <TextInputField
              label="City"
              value={profileDraft.contact.city}
              onChange={(value) => updateProfileContactField("city", value)}
            />
            <TextInputField
              label="Address line 1"
              value={profileDraft.contact.addressLine1}
              onChange={(value) => updateProfileContactField("addressLine1", value)}
            />
            <TextInputField
              label="Address line 2"
              value={profileDraft.contact.addressLine2}
              onChange={(value) => updateProfileContactField("addressLine2", value)}
            />
            <TextInputField
              label="Parish / region"
              value={profileDraft.contact.parishOrRegion}
              onChange={(value) => updateProfileContactField("parishOrRegion", value)}
            />
            <TextInputField
              label="Postal code"
              value={profileDraft.contact.postalCode}
              onChange={(value) => updateProfileContactField("postalCode", value)}
            />
            <TextAreaField
              label="Labels / tags (comma-separated)"
              value={profileDraft.labels}
              onChange={(value) =>
                setProfileDraft((current) => ({ ...current, labels: value }))
              }
            />
            <TextAreaField
              label="Interests (comma-separated)"
              value={profileDraft.interests}
              onChange={(value) =>
                setProfileDraft((current) => ({ ...current, interests: value }))
              }
            />
            <div style={styles.formButtonRow}>
              <button type="submit" style={styles.primarySmallButton}>
                Save profile
              </button>
              <button
                type="button"
                onClick={cancelProfileEdit}
                style={styles.secondarySmallButton}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.profileSummaryGrid}>
            <InfoLine label="Name" value={record.contact?.name} />
            <InfoLine label="Email" value={record.contact?.email} />
            <InfoLine label="Phone" value={record.contact?.phone} />
            <InfoLine label="Bucket" value={record.bucket} />
            <InfoLine label="Labels / tags" value={(record.labels || []).join(", ")} />
            <InfoLine label="Interests" value={(record.interests || []).join(", ")} />
          </div>
        )}
      </section>

      {record.latestConversationNote ? (
        <div style={styles.latestNote}>
          <strong>Last conversation summary</strong>
          <span>{record.latestConversationNote.summary || "No summary entered."}</span>
          <span>
            Next step:{" "}
            {record.latestConversationNote.immediateNextStep || "Not recorded"}
          </span>
        </div>
      ) : null}

      {isAddingNote ? (
        <form onSubmit={addConversationNote} style={styles.noteForm}>
          <TextAreaField
            label="Summary of last conversation"
            value={note.summary}
            onChange={(value) => updateNoteField("summary", value)}
          />
          <TextAreaField
            label="Current goals"
            value={note.currentGoals}
            onChange={(value) => updateNoteField("currentGoals", value)}
          />
          <TextAreaField
            label="Current position"
            value={note.currentPosition}
            onChange={(value) => updateNoteField("currentPosition", value)}
          />
          <TextAreaField
            label="Immediate next step"
            value={note.immediateNextStep}
            onChange={(value) => updateNoteField("immediateNextStep", value)}
          />
          <TextAreaField
            label="Relationships affected by this goal"
            value={note.relationshipImpact}
            onChange={(value) => updateNoteField("relationshipImpact", value)}
          />
          <TextAreaField
            label="Questions to ask next time"
            value={note.nextQuestions}
            onChange={(value) => updateNoteField("nextQuestions", value)}
          />
          <TextAreaField
            label="Emotional state"
            value={note.emotionalState}
            onChange={(value) => updateNoteField("emotionalState", value)}
          />
          <TextAreaField
            label="Satisfaction since last interaction"
            value={note.satisfaction}
            onChange={(value) => updateNoteField("satisfaction", value)}
          />
          <TextAreaField
            label="Referral opportunities"
            value={note.referralOpportunities}
            onChange={(value) => updateNoteField("referralOpportunities", value)}
          />
          <TextAreaField
            label="Additional notes"
            value={note.additionalNotes}
            onChange={(value) => updateNoteField("additionalNotes", value)}
          />
          <div style={styles.formButtonRow}>
            <button type="submit" style={styles.primarySmallButton}>
              Save conversation
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              style={styles.secondarySmallButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingNote(true)}
          style={styles.primarySmallButton}
        >
          Add conversation block
        </button>
      )}

      <DetailList
        title="Conversation Timeline"
        items={record.conversationNotes}
        empty="No conversation blocks saved yet."
        renderItem={(conversation) => (
          <ConversationTimelineCard
            conversation={conversation}
            isExpanded={expandedConversationId === conversation.id}
            editingNoteId={editingNoteId}
            editingNote={editingNote}
            onToggle={() =>
              setExpandedConversationId((current) =>
                current === conversation.id ? "" : conversation.id
              )
            }
            onEditField={(key, value) =>
              setEditingNote((current) => ({ ...current, [key]: value }))
            }
            onStartEdit={(nextConversation) => {
              setExpandedConversationId(nextConversation.id);
              startConversationEdit(nextConversation);
            }}
            onCancelEdit={() => {
              setEditingNoteId("");
              setEditingNote(emptyConversationNote);
            }}
            onSaveEdit={saveConversationEdit}
            onDelete={() => {
              if (
                confirmTypedDelete(
                  "Delete this conversation block from this person's profile?"
                )
              ) {
                const exported = exportBeforeDelete({
                  title: "Conversation block deletion export",
                  filename: makeDeletionExportFilename([
                    "Conversation Block",
                    record.contact?.name,
                    record.contact?.email,
                    record.contact?.phone,
                    formatDate(conversation.createdAt),
                  ]),
                  record: {
                    person: {
                      id: record.id,
                      kind: record.kind,
                      contact: record.contact,
                    },
                    conversation,
                  },
                });
                if (!exported) return;
                onProfileAction(record, {
                  action: "delete-conversation-note",
                  noteId: conversation.id,
                  confirmation: "delete",
                });
              }
            }}
          />
        )}
      />
    </section>
  );
}

function ConversationTimelineCard({
  conversation,
  isExpanded,
  editingNoteId,
  editingNote,
  onToggle,
  onEditField,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  const isEditing = editingNoteId === conversation.id;

  if (isEditing) {
    return (
      <form onSubmit={onSaveEdit} style={styles.conversationCard}>
        <div style={styles.conversationHeader}>
          <div>
            <strong>Edit conversation block</strong>
            <span style={styles.muted}>{formatDate(conversation.createdAt)}</span>
          </div>
        </div>
        <div style={styles.conversationEditGrid}>
          {conversationSections.map((section) => (
            <TextAreaField
              key={section.key}
              label={section.label}
              value={editingNote[section.key] || ""}
              onChange={(value) => onEditField(section.key, value)}
            />
          ))}
        </div>
        <div style={styles.formButtonRow}>
          <button type="submit" style={styles.primarySmallButton}>
            Save changes
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            style={styles.secondarySmallButton}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <article style={styles.conversationCard}>
      <div style={styles.conversationHeader}>
        <div>
          <strong>{formatDate(conversation.createdAt)}</strong>
          {conversation.createdByUserName ? (
            <span style={styles.muted}>Entered by {conversation.createdByUserName}</span>
          ) : null}
          <span style={styles.conversationPreview}>
            {getConversationPreview(conversation)}
          </span>
        </div>
        <div style={styles.conversationActions}>
          <button type="button" style={styles.textButton} onClick={onToggle}>
            {isExpanded ? "Hide details" : "Open details"}
          </button>
          <button
            type="button"
            style={styles.textButton}
            onClick={() => onStartEdit(conversation)}
          >
            Edit block
          </button>
          <button type="button" style={styles.textDangerButton} onClick={onDelete}>
            Delete block
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div style={styles.conversationSectionGrid}>
          {conversationSections.map((section) => (
            <ConversationSection
              key={section.key}
              label={section.label}
              value={conversation[section.key]}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ConversationSection({ label, value }) {
  return (
    <section style={styles.conversationSection}>
      <strong>{label}</strong>
      <p style={styles.conversationSectionText}>{value || "Not recorded"}</p>
    </section>
  );
}

function TextInputField({ label, value, onChange }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        style={styles.textarea}
      />
    </label>
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
    alignItems: "center",
    display: "inline-flex",
    fontSize: "16px",
    gap: "7px",
  },
  followUpDotRed: {
    background: "#c01818",
    borderRadius: "999px",
    boxShadow: "0 0 0 4px rgba(192, 24, 24, 0.12)",
    display: "inline-block",
    flex: "0 0 auto",
    height: "10px",
    width: "10px",
  },
  followUpDotYellow: {
    background: "#d7a600",
    borderRadius: "999px",
    boxShadow: "0 0 0 4px rgba(215, 166, 0, 0.16)",
    display: "inline-block",
    flex: "0 0 auto",
    height: "10px",
    width: "10px",
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
  crmPanel: {
    background: "#fffdfa",
    border: "1px solid rgba(47, 116, 64, 0.22)",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    padding: "12px",
  },
  crmHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  crmSubtext: {
    color: "#6b625c",
    fontSize: "13px",
    margin: "-4px 0 0",
  },
  followUpRow: {
    alignItems: "end",
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "minmax(180px, 260px) 1fr",
  },
  inlineLabel: {
    display: "grid",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 800,
  },
  select: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    font: "inherit",
    padding: "9px 10px",
    width: "100%",
  },
  followUpStatus: {
    alignItems: "center",
    color: "#6b625c",
    display: "flex",
    fontSize: "13px",
    gap: "8px",
    minHeight: "38px",
  },
  profileEditPanel: {
    background: "#fbf7f1",
    border: "1px solid rgba(32, 28, 29, 0.1)",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  profileEditHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
  },
  profileEditForm: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  profileSummaryGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  latestNote: {
    background: "#eef5ee",
    border: "1px solid rgba(47, 116, 64, 0.16)",
    borderRadius: "8px",
    display: "grid",
    gap: "5px",
    padding: "10px",
  },
  noteForm: {
    display: "grid",
    gap: "10px",
  },
  fieldLabel: {
    display: "grid",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 800,
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    font: "inherit",
    padding: "10px",
    width: "100%",
  },
  textarea: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    font: "inherit",
    minHeight: "76px",
    padding: "10px",
    resize: "vertical",
    width: "100%",
  },
  formButtonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  primarySmallButton: {
    background: "#2f7440",
    border: "1px solid #2f7440",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    padding: "9px 12px",
  },
  secondarySmallButton: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "6px",
    color: "#28231F",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "9px 12px",
  },
  deleteProfileButton: {
    background: "transparent",
    border: 0,
    color: "#9b2018",
    cursor: "pointer",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 900,
    padding: "2px 0",
    textDecoration: "underline",
  },
  textDangerButton: {
    background: "transparent",
    border: 0,
    color: "#9b2018",
    cursor: "pointer",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 800,
    justifySelf: "start",
    padding: 0,
    textDecoration: "underline",
  },
  textButton: {
    background: "transparent",
    border: 0,
    color: "#2f7440",
    cursor: "pointer",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 900,
    padding: 0,
    textDecoration: "underline",
  },
  conversationCard: {
    display: "grid",
    gap: "12px",
    minWidth: 0,
  },
  conversationHeader: {
    alignItems: "start",
    borderBottom: "1px solid rgba(32, 28, 29, 0.1)",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    paddingBottom: "10px",
  },
  conversationActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  conversationPreview: {
    color: "#514941",
    display: "-webkit-box",
    fontSize: "14px",
    lineHeight: 1.35,
    marginTop: "6px",
    maxWidth: "680px",
    overflow: "hidden",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },
  conversationSectionGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  conversationSection: {
    background: "#fbf7f1",
    border: "1px solid rgba(32, 28, 29, 0.08)",
    borderRadius: "7px",
    display: "grid",
    gap: "6px",
    minWidth: 0,
    padding: "10px",
  },
  conversationSectionText: {
    color: "#3f3832",
    lineHeight: 1.45,
    margin: 0,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  },
  conversationEditGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
