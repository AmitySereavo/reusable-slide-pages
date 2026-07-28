import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRequestIdentity } from "@/lib/security/requestIdentity";
import { ensureCustomerGrowGuideTables } from "@/lib/growGuides/trackedLinks";

type GuideLinkPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function cleanToken(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 180);
}

export default async function CustomerGrowGuideLinkPage({
  params,
}: GuideLinkPageProps) {
  const { token: rawToken } = await params;
  const token = cleanToken(rawToken);

  if (!token) {
    redirect("/grow-guides");
  }

  await ensureCustomerGrowGuideTables();

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT *
    FROM "CustomerGrowGuideLink"
    WHERE "token" = ${token}
    LIMIT 1
  `);
  const link = rows[0];

  if (!link) {
    redirect("/grow-guides");
  }

  const requestIdentity = await getRequestIdentity();
  const headerStore = await headers();
  const referrer = headerStore.get("referer") || null;
  const visitId = `cggv-${randomUUID()}`;

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "CustomerGrowGuideLink"
      SET
        "openedCount" = "openedCount" + 1,
        "firstOpenedAt" = COALESCE("firstOpenedAt", CURRENT_TIMESTAMP),
        "lastOpenedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${link.id}
    `,
    prisma.$executeRaw`
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
        "metadata",
        "createdAt"
      )
      VALUES (
        ${visitId},
        ${link.id},
        ${token},
        ${requestIdentity.deviceKey},
        ${requestIdentity.ipHash},
        ${requestIdentity.userAgent},
        ${JSON.stringify(requestIdentity.location || {})}::jsonb,
        ${referrer},
        'opened_link',
        ${link.guideSlug},
        ${JSON.stringify({
          orderCode: link.orderCode || null,
          productTitle: link.productTitle || null,
          ownerIdentityKey: link.ownerIdentityKey || null,
        })}::jsonb,
        CURRENT_TIMESTAMP
      )
    `,
  ]);

  const guideSlug = String(link.guideSlug || "").trim();
  const target = guideSlug
    ? `/questionnaire/${encodeURIComponent(guideSlug)}?guideLink=${encodeURIComponent(
        token
      )}`
    : "/grow-guides";

  redirect(target);
}
