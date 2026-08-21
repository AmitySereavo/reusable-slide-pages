import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { getAdminPushPublicKey } from "@/lib/adminNotifications";

function serializeNotification(record: any) {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    body: record.body,
    actionUrl: record.actionUrl,
    source: record.source,
    sourceId: record.sourceId,
    metadata: record.metadata || {},
    createdAt: record.createdAt.toISOString(),
    readAt: record.readAt ? record.readAt.toISOString() : null,
    pushAttemptedAt: record.pushAttemptedAt
      ? record.pushAttemptedAt.toISOString()
      : null,
    pushSentAt: record.pushSentAt ? record.pushSentAt.toISOString() : null,
    pushError: record.pushError,
  };
}

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const notifications = await prisma.adminNotification.findMany({
    where: {
      OR: [{ targetUserId: null }, { targetUserId: guard.session!.userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const unreadCount = await prisma.adminNotification.count({
    where: {
      readAt: null,
      OR: [{ targetUserId: null }, { targetUserId: guard.session!.userId }],
    },
  });

  return NextResponse.json({
    notifications: notifications.map(serializeNotification),
    unreadCount,
    pushPublicKey: getAdminPushPublicKey(),
  });
}

export async function PATCH(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => ({}));
  const notificationId = String(body.notificationId || "").trim();
  const markAll = body.markAll === true;
  const now = new Date();

  if (markAll) {
    await prisma.adminNotification.updateMany({
      where: {
        readAt: null,
        OR: [{ targetUserId: null }, { targetUserId: guard.session!.userId }],
      },
      data: { readAt: now },
    });

    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json(
      { ok: false, error: "notificationId is required." },
      { status: 400 }
    );
  }

  await prisma.adminNotification.updateMany({
    where: {
      id: notificationId,
      OR: [{ targetUserId: null }, { targetUserId: guard.session!.userId }],
    },
    data: { readAt: now },
  });

  return NextResponse.json({ ok: true });
}
