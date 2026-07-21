"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { ThemeConfig } from "@/types/questionnaire";
import { getContrastTextColor } from "@/lib/questionnaire/display";
import styles from "../QuestionnaireShell.module.css";

type PurchaseRecipientRecord = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  confirmedName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  parishOrRegion?: string | null;
  postalCode?: string | null;
  status: string;
  invitedAt?: string | null;
  inviteExpiresAt?: string | null;
  acceptedAt?: string | null;
  reminderCount?: number;
};

export default function PurchaseRecipientsRenderer({
  theme,
}: {
  theme: ThemeConfig;
}) {
  const [recipients, setRecipients] = useState<PurchaseRecipientRecord[]>([]);
  const [maxRecipients, setMaxRecipients] = useState(12);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadRecipients() {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/purchase-recipients", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/questionnaire/auth-login";
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Could not load recipients.");
      }

      setRecipients(Array.isArray(data?.recipients) ? data.recipients : []);
      setMaxRecipients(Number(data?.maxRecipients) || 12);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load recipients.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipients();
  }, []);

  async function submitRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/purchase-recipients", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not send invite.");
      }

      setStatusMessage({
        type: "success",
        text:
          data?.message ||
          "Invite sent. The recipient must accept before store purchase.",
      });
      setName("");
      setEmail("");
      await loadRecipients();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Could not send invite.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRecipientCount = recipients.filter(
    (recipient) => recipient.status !== "REMOVED"
  ).length;
  const verifiedRecipients = recipients.filter(
    (recipient) => recipient.status === "VERIFIED"
  );

  return (
    <div className={styles.accountSummaryStack}>
      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Add recipient</div>
        <div className={styles.accountCardMeta}>
          Enter the person&apos;s name and email. They must accept the email
          invite before their name can be selected in the store.
        </div>

        <form className={styles.purchaseRecipientForm} onSubmit={submitRecipient}>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Recipient name"
            required
            style={{ borderColor: theme.colors.border }}
          />
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Recipient email"
            required
            style={{ borderColor: theme.colors.border }}
          />
          <button
            type="submit"
            className={styles.primaryActionButton}
            disabled={isSubmitting || activeRecipientCount >= maxRecipients}
            style={{
              background: theme.colors.primary,
              color: getContrastTextColor(theme.colors.primary),
            }}
          >
            {isSubmitting ? "Sending..." : "Send invite"}
          </button>
        </form>

        <div className={styles.accountCardMeta}>
          {activeRecipientCount} of {maxRecipients} recipient spots used.
        </div>
      </div>

      {statusMessage ? (
        <div
          className={
            statusMessage.type === "success"
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {statusMessage.text}
        </div>
      ) : null}

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Verified recipients</div>
        <div className={styles.accountCardMeta}>
          Only verified recipients should appear as selectable names while
          purchasing for someone in the store.
        </div>
        {isLoading ? (
          <div className={styles.accountCardValue}>Loading recipients...</div>
        ) : verifiedRecipients.length ? (
          <div className={styles.purchaseRecipientList}>
            {verifiedRecipients.map((recipient) => (
              <div key={recipient.id} className={styles.purchaseRecipientCard}>
                <strong>
                  {recipient.confirmedName || recipient.recipientName}
                </strong>
                <span>{recipient.recipientEmail}</span>
                <span>{formatPurchaseRecipientStatus(recipient.status)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.accountCardValue}>
            No verified recipients yet.
          </div>
        )}
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Pending invites</div>
        {isLoading ? (
          <div className={styles.accountCardValue}>Loading invites...</div>
        ) : recipients.filter((recipient) => recipient.status !== "VERIFIED")
            .length ? (
          <div className={styles.purchaseRecipientList}>
            {recipients
              .filter((recipient) => recipient.status !== "VERIFIED")
              .map((recipient) => (
                <div key={recipient.id} className={styles.purchaseRecipientCard}>
                  <strong>{recipient.recipientName}</strong>
                  <span>{recipient.recipientEmail}</span>
                  <span>{formatPurchaseRecipientStatus(recipient.status)}</span>
                  {recipient.inviteExpiresAt ? (
                    <span>
                      Invite expires: {formatAccountDate(recipient.inviteExpiresAt)}
                    </span>
                  ) : null}
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.accountCardValue}>No pending invites.</div>
        )}
      </div>
    </div>
  );
}

function formatPurchaseRecipientStatus(status: string) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "VERIFIED") return "Verified";
  if (normalized === "EXPIRED") return "Invite expired";
  if (normalized === "REMOVED") return "Removed";

  return "Pending acceptance";
}

function formatAccountDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
