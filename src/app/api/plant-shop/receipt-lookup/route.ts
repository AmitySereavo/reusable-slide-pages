import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  makeReceiptCode,
  normalizeReceiptPhoneValue,
  normalizeReceiptLookupValue,
  normalizeReceiptTextKey,
  readMetadata,
} from "@/lib/plantShop/receiptCodes";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const identity = normalizeReceiptLookupValue(body?.identity);
    const identityTextKey = normalizeReceiptTextKey(body?.identity);
    const phoneIdentity = normalizeReceiptPhoneValue(body?.identity);
    const lookupCode = cleanText(body?.code).toUpperCase();

    if (!identity || !lookupCode) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Enter one piece of information you gave with the order, plus your receipt lookup code or receipt/order number.",
        },
        { status: 400 }
      );
    }

    const likeIdentity = `%${identity}%`;
    const likeIdentityTextKey = `%${identityTextKey}%`;
    const orderRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT DISTINCT "orderCode"
      FROM "OrderFulfillmentItem"
      WHERE (
          UPPER(COALESCE("recipientName", '')) LIKE ${likeIdentity}
          OR (
            ${identityTextKey} <> ''
            AND regexp_replace(UPPER(COALESCE("recipientName", '')), '[^A-Z0-9]', '', 'g') LIKE ${likeIdentityTextKey}
          )
          OR UPPER(COALESCE("recipientEmail", '')) = ${identity}
          OR UPPER(COALESCE("metadata"->>'customerEmail', '')) = ${identity}
          OR (
            ${phoneIdentity} <> ''
            AND regexp_replace(COALESCE("metadata"->>'customerWhatsappNumber', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
          )
          OR (
            ${phoneIdentity} <> ''
            AND regexp_replace(COALESCE("metadata"->>'customerPhoneNumber', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
          )
          OR (
            ${phoneIdentity} <> ''
            AND regexp_replace(COALESCE("metadata"->>'customerPhone', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
          )
        )
        AND (
          UPPER(COALESCE("orderCode", '')) = ${lookupCode}
          OR COALESCE("metadata"->>'receiptCode', '') = ${lookupCode}
        )
      ORDER BY "orderCode" ASC
      LIMIT 5
    `);

    let orderCode = String(orderRows[0]?.orderCode || "");

    if (!orderCode && /^\d{4}$/.test(lookupCode)) {
      const candidateRows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT DISTINCT "orderCode"
        FROM "OrderFulfillmentItem"
        WHERE (
            UPPER(COALESCE("recipientName", '')) LIKE ${likeIdentity}
            OR (
              ${identityTextKey} <> ''
              AND regexp_replace(UPPER(COALESCE("recipientName", '')), '[^A-Z0-9]', '', 'g') LIKE ${likeIdentityTextKey}
            )
            OR UPPER(COALESCE("recipientEmail", '')) = ${identity}
            OR UPPER(COALESCE("metadata"->>'customerEmail', '')) = ${identity}
            OR (
              ${phoneIdentity} <> ''
              AND regexp_replace(COALESCE("metadata"->>'customerWhatsappNumber', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
            )
            OR (
              ${phoneIdentity} <> ''
              AND regexp_replace(COALESCE("metadata"->>'customerPhoneNumber', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
            )
            OR (
              ${phoneIdentity} <> ''
              AND regexp_replace(COALESCE("metadata"->>'customerPhone', ''), '[^0-9]', '', 'g') = ${phoneIdentity}
            )
          )
        ORDER BY "orderCode" ASC
        LIMIT 100
      `);
      orderCode =
        candidateRows
          .map((row) => String(row.orderCode || ""))
          .find((candidate) => makeReceiptCode(candidate) === lookupCode) || "";
    }

    if (!orderCode) {
      return NextResponse.json(
        { ok: false, error: "Receipt was not found. Check the name and code." },
        { status: 404 }
      );
    }

    const firstItem = await prisma.orderFulfillmentItem.findFirst({
      where: {
        orderCode,
      },
      orderBy: { createdAt: "asc" },
    });
    const metadata = readMetadata(firstItem?.metadata);
    const token = cleanText(metadata.cashierToken);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Receipt link is not available yet." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderCode,
      receiptUrl: `/receipt/${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error("PLANT SHOP RECEIPT LOOKUP ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Receipt lookup failed.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
