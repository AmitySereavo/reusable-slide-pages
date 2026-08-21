import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { getAdminPushPublicKey } from "@/lib/adminNotifications";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  return NextResponse.json({
    pushPublicKey: getAdminPushPublicKey(),
    configured: Boolean(getAdminPushPublicKey()),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => ({}));
  const subscription =
    body.subscription && typeof body.subscription === "object"
      ? body.subscription
      : body;
  const endpoint = String(subscription.endpoint || "").trim();
  const p256dh = String(subscription.keys?.p256dh || "").trim();
  const auth = String(subscription.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { ok: false, error: "A valid push subscription is required." },
      { status: 400 }
    );
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") || null;

  const record = await prisma.adminPushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: guard.session!.userId,
      endpoint,
      p256dh,
      auth,
      userAgent,
    },
    update: {
      userId: guard.session!.userId,
      p256dh,
      auth,
      userAgent,
      disabledAt: null,
      failureReason: null,
    },
  });

  return NextResponse.json({
    ok: true,
    subscriptionId: record.id,
  });
}
