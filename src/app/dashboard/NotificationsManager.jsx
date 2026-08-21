"use client";

import { useEffect, useMemo, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPublicKey, setPushPublicKey] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const unreadLabel = useMemo(
    () => `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`,
    [unreadCount]
  );

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard/admin-notifications", {
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not load notifications.");
      }

      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
      setPushPublicKey(data.pushPublicKey || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function enablePushNotifications() {
    setStatus("");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("This browser does not support web push notifications.");
      return;
    }

    if (!pushPublicKey) {
      setStatus("Push keys are not configured yet. Dashboard notifications are still active.");
      return;
    }

    setIsSubscribing(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("Notification permission was not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushPublicKey),
        }));

      const response = await fetch("/api/dashboard/admin-notifications/subscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not save this push subscription.");
      }

      setStatus("Push notifications are enabled on this device.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not enable push notifications.");
    } finally {
      setIsSubscribing(false);
    }
  }

  async function markRead(notificationId) {
    await fetch("/api/dashboard/admin-notifications", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationId }),
    });
    await loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/dashboard/admin-notifications", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markAll: true }),
    });
    await loadNotifications();
  }

  return (
    <section style={styles.shell}>
      <div style={styles.toolbar}>
        <div>
          <strong style={styles.count}>{unreadLabel}</strong>
          <p style={styles.helper}>
            WhatsApp contact submissions appear here with a ready-to-open WhatsApp message link.
          </p>
        </div>
        <div style={styles.actions}>
          <button
            type="button"
            onClick={enablePushNotifications}
            disabled={isSubscribing}
            style={styles.primaryButton}
          >
            {isSubscribing ? "Enabling..." : "Enable push notifications"}
          </button>
          <button type="button" onClick={markAllRead} style={styles.secondaryButton}>
            Mark all read
          </button>
        </div>
      </div>

      {status ? <p style={styles.status}>{status}</p> : null}

      {isLoading ? <p style={styles.empty}>Loading notifications...</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <p style={styles.empty}>No admin notifications yet.</p>
      ) : null}

      <div style={styles.list}>
        {notifications.map((notification) => (
          <article
            key={notification.id}
            style={{
              ...styles.card,
              borderColor: notification.readAt ? "#ded6ca" : "#2f6b3f",
            }}
          >
            <div style={styles.cardHeader}>
              <div>
                <strong style={styles.title}>{notification.title}</strong>
                <p style={styles.meta}>{formatDateTime(notification.createdAt)}</p>
              </div>
              {!notification.readAt ? <span style={styles.unreadDot}>Unread</span> : null}
            </div>

            <p style={styles.body}>{notification.body}</p>

            <div style={styles.cardActions}>
              {notification.actionUrl ? (
                <a href={notification.actionUrl} target="_blank" rel="noreferrer" style={styles.whatsappLink}>
                  Open WhatsApp message
                </a>
              ) : null}
              {!notification.readAt ? (
                <button type="button" onClick={() => markRead(notification.id)} style={styles.linkButton}>
                  Mark read
                </button>
              ) : null}
            </div>

            <p style={styles.pushState}>
              Push:{" "}
              {notification.pushSentAt
                ? `sent ${formatDateTime(notification.pushSentAt)}`
                : notification.pushError || "not attempted yet"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  shell: {
    display: "grid",
    gap: "14px",
  },
  toolbar: {
    alignItems: "start",
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    display: "flex",
    gap: "14px",
    justifyContent: "space-between",
    padding: "16px",
  },
  count: {
    display: "block",
    fontSize: "18px",
  },
  helper: {
    color: "#665d56",
    lineHeight: 1.45,
    margin: "6px 0 0",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "flex-end",
  },
  primaryButton: {
    background: "#2f6b3f",
    border: "1px solid #2f6b3f",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 12px",
  },
  secondaryButton: {
    background: "#fffdfa",
    border: "1px solid #cdbda9",
    borderRadius: "6px",
    color: "#201c1d",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 12px",
  },
  status: {
    background: "#eef6ef",
    border: "1px solid #b9d8bf",
    borderRadius: "6px",
    margin: 0,
    padding: "10px 12px",
  },
  empty: {
    background: "#fffdfa",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: "8px",
    margin: 0,
    padding: "16px",
  },
  list: {
    display: "grid",
    gap: "10px",
  },
  card: {
    background: "#fffdfa",
    border: "2px solid #ded6ca",
    borderRadius: "8px",
    display: "grid",
    gap: "10px",
    padding: "14px",
  },
  cardHeader: {
    alignItems: "start",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "17px",
  },
  meta: {
    color: "#786e66",
    margin: "4px 0 0",
  },
  unreadDot: {
    background: "#2f6b3f",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 8px",
  },
  body: {
    lineHeight: 1.45,
    margin: 0,
  },
  cardActions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  whatsappLink: {
    background: "#111",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 900,
    padding: "10px 12px",
    textDecoration: "none",
  },
  linkButton: {
    background: "transparent",
    border: 0,
    color: "#2f6b3f",
    cursor: "pointer",
    fontWeight: 900,
    padding: "8px 0",
    textDecoration: "underline",
  },
  pushState: {
    color: "#786e66",
    fontSize: "13px",
    margin: 0,
  },
};
