import webPush from "web-push";
import { prisma } from "@/lib/prisma";

type AdminNotificationInput = {
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  source?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  targetUserId?: string | null;
};

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey = String(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      process.env.VAPID_PUBLIC_KEY ||
      ""
  ).trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = String(
    process.env.VAPID_SUBJECT ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "mailto:paralifetrees@gmail.com"
  ).trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function configureVapidIfAvailable() {
  if (vapidConfigured) return true;

  const config = getVapidConfig();
  if (!config) return false;

  webPush.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey
  );
  vapidConfigured = true;

  return true;
}

function toPushSubscription(record: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth,
    },
  };
}

function getPushPayload(notification: {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  type: string;
}) {
  return JSON.stringify({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    url: notification.actionUrl || "/dashboard/notifications",
    type: notification.type,
  });
}

export function getAdminPushPublicKey() {
  return (
    String(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        process.env.VAPID_PUBLIC_KEY ||
        ""
    ).trim() || null
  );
}

export async function createAdminNotification(input: AdminNotificationInput) {
  const notification = await prisma.adminNotification.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl || null,
      source: input.source || null,
      sourceId: input.sourceId || null,
      targetUserId: input.targetUserId || null,
      metadata: (input.metadata || {}) as any,
    },
  });

  await sendAdminPushNotification(notification.id);

  return notification;
}

export async function sendAdminPushNotification(notificationId: string) {
  if (!configureVapidIfAvailable()) {
    await prisma.adminNotification.update({
      where: { id: notificationId },
      data: {
        pushAttemptedAt: new Date(),
        pushError: "Missing VAPID push configuration.",
      },
    });
    return { ok: false, reason: "missing-vapid-config" };
  }

  const notification = await prisma.adminNotification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return { ok: false, reason: "notification-not-found" };
  }

  const subscriptions = await prisma.adminPushSubscription.findMany({
    where: {
      disabledAt: null,
      user: {
        adminLevel: {
          gte: 1,
        },
      },
      ...(notification.targetUserId
        ? { userId: notification.targetUserId }
        : {}),
    },
  });

  if (!subscriptions.length) {
    await prisma.adminNotification.update({
      where: { id: notification.id },
      data: {
        pushAttemptedAt: new Date(),
        pushError: "No active admin push subscriptions.",
      },
    });
    return { ok: false, reason: "no-subscriptions" };
  }

  const payload = getPushPayload(notification);
  const now = new Date();
  let sentCount = 0;
  let lastError = "";

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        toPushSubscription(subscription),
        payload
      );
      sentCount += 1;
      await prisma.adminPushSubscription.update({
        where: { id: subscription.id },
        data: {
          lastSuccessAt: now,
          lastFailureAt: null,
          failureReason: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Push delivery failed.";
      lastError = message;
      await prisma.adminPushSubscription.update({
        where: { id: subscription.id },
        data: {
          lastFailureAt: now,
          failureReason: message,
          disabledAt:
            typeof (error as { statusCode?: unknown })?.statusCode ===
              "number" &&
            [404, 410].includes(
              Number((error as { statusCode?: unknown }).statusCode)
            )
              ? now
              : subscription.disabledAt,
        },
      });
    }
  }

  await prisma.adminNotification.update({
    where: { id: notification.id },
    data: {
      pushAttemptedAt: now,
      pushSentAt: sentCount > 0 ? now : null,
      pushError: sentCount > 0 ? null : lastError || "Push delivery failed.",
    },
  });

  return {
    ok: sentCount > 0,
    sentCount,
    attemptedCount: subscriptions.length,
    error: sentCount > 0 ? null : lastError,
  };
}

export function buildWhatsAppUrl({
  phone,
  message,
}: {
  phone: string;
  message: string;
}) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
