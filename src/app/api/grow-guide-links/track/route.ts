import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getRequestIdentity } from "@/lib/security/requestIdentity";
import { ensureCustomerGrowGuideTables } from "@/lib/growGuides/trackedLinks";

function cleanText(value: unknown, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanToken(value: unknown) {
  return cleanText(value, 180).replace(/[^a-zA-Z0-9_-]/g, "");
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = cleanToken(body?.token);
    const questionnaireSlug = cleanText(body?.questionnaireSlug, 160);
    const slideId = cleanText(body?.slideId, 180);
    const eventType = cleanText(body?.eventType || "slide_view", 80);
    const deviceProfile = readObject(body?.deviceProfile);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Guide link token is required." },
        { status: 400 }
      );
    }

    await ensureCustomerGrowGuideTables();

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id", "token", "orderCode", "productTitle", "ownerIdentityKey"
      FROM "CustomerGrowGuideLink"
      WHERE "token" = ${token}
      LIMIT 1
    `);
    const link = rows[0];

    if (!link) {
      return NextResponse.json(
        { ok: false, error: "Guide link was not found." },
        { status: 404 }
      );
    }

    const requestIdentity = await getRequestIdentity();
    const headerStore = await headers();
    const referrer = headerStore.get("referer") || null;

    await prisma.$executeRaw`
      INSERT INTO "CustomerGrowGuideVisit" (
        "id",
        "linkId",
        "token",
        "deviceKey",
        "ipHash",
        "userAgent",
        "location",
        "referrer",
        "eventType",
        "questionnaireSlug",
        "slideId",
        "metadata",
        "createdAt"
      )
      VALUES (
        ${`cggv-${randomUUID()}`},
        ${link.id},
        ${token},
        ${requestIdentity.deviceKey},
        ${requestIdentity.ipHash},
        ${requestIdentity.userAgent},
        ${JSON.stringify(requestIdentity.location || {})}::jsonb,
        ${referrer},
        ${eventType || "slide_view"},
        ${questionnaireSlug || null},
        ${slideId || null},
        ${JSON.stringify({
          orderCode: link.orderCode || null,
          productTitle: link.productTitle || null,
          ownerIdentityKey: link.ownerIdentityKey || null,
          deviceProfile,
          deviceType: deviceProfile?.deviceType || null,
          softwareType: deviceProfile?.softwareType || null,
          browser: deviceProfile?.browser || null,
          os: deviceProfile?.os || null,
        })}::jsonb,
        CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      UPDATE "CustomerGrowGuideLink"
      SET "lastOpenedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${link.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to track grow guide visit", error);
    return NextResponse.json(
      { ok: false, error: "Unable to track this grow guide visit." },
      { status: 500 }
    );
  }
}
