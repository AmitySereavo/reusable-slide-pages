import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateDiscountCode, type DiscountOrderLine } from "@/lib/discountCodes";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLines(value: unknown): DiscountOrderLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: Array<DiscountOrderLine | null> = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const quantity = Number(raw.quantity ?? 0);
      const unitPrice = Number(raw.unitPrice ?? 0);
      const lineTotal = Number(raw.lineTotal ?? 0);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        !Number.isFinite(lineTotal) ||
        lineTotal <= 0
      ) {
        return null;
      }

      return {
        productId: cleanText(raw.productId) || null,
        productSku: cleanText(raw.productSku) || null,
        productTitle: cleanText(raw.productTitle) || null,
        sizeOptionId: cleanText(raw.sizeOptionId) || null,
        sizeOptionSku: cleanText(raw.sizeOptionSku) || null,
        sizeLabel: cleanText(raw.sizeLabel) || null,
        purchaseModeId: cleanText(raw.purchaseModeId) || null,
        sku: cleanText(raw.sku) || null,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

  return lines.filter((line): line is DiscountOrderLine => Boolean(line));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = cleanText(body.code);
    const shopKey = cleanText(body.shopKey);
    const currencyCode = cleanText(body.currencyCode) || "JMD";
    const lines = normalizeLines(body.lines);

    if (!code) {
      return NextResponse.json({
        ok: true,
        applied: false,
        discountAmount: 0,
        message: "Enter a discount code.",
      });
    }

    if (!shopKey) {
      return NextResponse.json(
        { ok: false, error: "Missing shop for this discount code." },
        { status: 400 }
      );
    }

    if (!lines.length) {
      return NextResponse.json(
        { ok: false, error: "Add items to your cart before applying a discount." },
        { status: 400 }
      );
    }

    const result = await evaluateDiscountCode({
      db: prisma as any,
      code,
      shopKey,
      lines,
      customerEmail: cleanText(body.customerEmail),
      customerPhone: cleanText(body.customerPhone),
      currencyCode,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          applied: false,
          error:
            "error" in result && result.error
              ? result.error
              : "That discount code is not eligible for this cart.",
          discountAmount: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Discount code validation failed:", error);
    return NextResponse.json(
      { ok: false, error: "Could not check that discount code." },
      { status: 500 }
    );
  }
}
