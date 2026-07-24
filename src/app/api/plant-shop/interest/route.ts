import { NextResponse } from "next/server";
import { LITTLE_ORCHARD_SHOP_SLUG } from "@/config/shops/littleOrchardShop";
import { prisma } from "@/lib/prisma";
import { recordPlantShopProductInterest } from "@/lib/plantShop/productInterest";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productId = cleanText(body?.productId);
  const sizeOptionId = cleanText(body?.sizeOptionId);
  const sessionKey = cleanText(body?.sessionKey)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

  if (!productId || !sizeOptionId || !sessionKey) {
    return NextResponse.json(
      { ok: false, error: "Product, size option, and session are required." },
      { status: 400 }
    );
  }

  const interestedPeopleCount = await recordPlantShopProductInterest(prisma, {
    shopSlug: LITTLE_ORCHARD_SHOP_SLUG,
    productId,
    sizeOptionId,
    sessionKey,
  });

  return NextResponse.json({
    ok: true,
    interestedPeopleCount,
  });
}
