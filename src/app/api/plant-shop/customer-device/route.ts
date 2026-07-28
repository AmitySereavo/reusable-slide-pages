import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

function cleanText(value: unknown, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function readMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readDeviceRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (record) =>
          record && typeof record === "object" && !Array.isArray(record)
      )
    : [];
}

function upsertDeviceRecord({
  records,
  deviceKey,
  now,
  patch,
}: {
  records: Record<string, unknown>[];
  deviceKey: string;
  now: string;
  patch: Record<string, unknown>;
}) {
  const existingIndex = records.findIndex(
    (record) => String(record.deviceKey || "") === deviceKey
  );

  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    records[existingIndex] = {
      ...existing,
      ...patch,
      deviceKey,
      firstSeenAt: existing.firstSeenAt || now,
      lastSeenAt: now,
    };
    return records;
  }

  return [
    ...records,
    {
      ...patch,
      deviceKey,
      firstSeenAt: now,
      lastSeenAt: now,
    },
  ];
}

async function isKnownStaffDevice(deviceKey: string) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM "OrderFulfillmentItem"
    WHERE "sourceType" = 'little-orchard-shop'
      AND "metadata"->'staffDeviceRecords' @> ${JSON.stringify([
        { deviceKey },
      ])}::jsonb
  `);

  return Number(rows[0]?.count || 0) > 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = cleanText(body?.token, 140).replace(/[^a-zA-Z0-9_-]/g, "");
    const deviceKey = cleanText(body?.deviceKey, 220);
    const source = cleanText(body?.source || "customer-link", 80);

    if (!token || !deviceKey) {
      return NextResponse.json(
        { ok: false, error: "Receipt token and device key are required." },
        { status: 400 }
      );
    }

    const items = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id", "orderCode", "metadata"
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
        AND "metadata"->>'cashierToken' = ${token}
      ORDER BY "createdAt" ASC
    `);

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const session = await getSessionFromCookie();
    const isAdminSession = Number(session?.user?.adminLevel || 0) >= 1;
    const knownStaffDevice = await isKnownStaffDevice(deviceKey);
    const isStaffDevice = isAdminSession || knownStaffDevice;
    const now = new Date().toISOString();
    const orderCode = String(items[0].orderCode || "");
    const targetKey = isStaffDevice
      ? "staffDeviceRecords"
      : "customerDeviceRecords";
    const otherKey = isStaffDevice
      ? "customerDeviceRecords"
      : "staffDeviceRecords";

    const patch = isStaffDevice
      ? {
          role: "staff",
          source,
          orderCode,
          userId: session?.user?.id || null,
          userName: session?.user?.name || null,
          userEmail: session?.user?.email || null,
          note:
            "Staff/admin device. Do not attribute customer browsing activity from this device to the customer.",
        }
      : {
          role: "customer",
          source,
          orderCode,
          note:
            "Customer opened the receipt/order-status link from this browser.",
        };

    for (const item of items) {
      const metadata = readMetadata(item.metadata);
      const existingTargetRecords = readDeviceRecords(metadata[targetKey]);
      const existingOtherRecords = readDeviceRecords(metadata[otherKey]).filter(
        (record) => String(record.deviceKey || "") !== deviceKey
      );
      const nextTargetRecords = upsertDeviceRecord({
        records: existingTargetRecords as Record<string, unknown>[],
        deviceKey,
        now,
        patch,
      });
      const nextMetadata = {
        ...metadata,
        [targetKey]: nextTargetRecords,
        [otherKey]: existingOtherRecords,
        lastDeviceSeenAt: now,
        lastDeviceSeenSource: source,
        lastDeviceSeenRole: isStaffDevice ? "staff" : "customer",
      };

      await prisma.orderFulfillmentItem.update({
        where: { id: item.id },
        data: {
          metadata: nextMetadata as Prisma.InputJsonObject,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      role: isStaffDevice ? "staff" : "customer",
    });
  } catch (error) {
    console.error("Unable to record customer device", error);
    return NextResponse.json(
      { ok: false, error: "Unable to record this device." },
      { status: 500 }
    );
  }
}
