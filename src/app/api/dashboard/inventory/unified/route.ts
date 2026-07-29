import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  getUnifiedInventoryItems,
  syncNurseryPriceListToUnifiedInventory,
  syncLittleOrchardCatalogToUnifiedInventory,
  updateUnifiedInventoryShopOrder,
  upsertUnifiedInventoryItem,
} from "@/lib/inventory/unifiedInventory";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const items = await getUnifiedInventoryItems(prisma as any);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);

  if (body?.action === "sync-little-orchard-config") {
    await syncLittleOrchardCatalogToUnifiedInventory(prisma as any);
    const items = await getUnifiedInventoryItems(prisma as any);

    return NextResponse.json({ ok: true, items });
  }

  if (body?.action === "sync-nursery-price-list") {
    await syncNurseryPriceListToUnifiedInventory(prisma as any);
    const items = await getUnifiedInventoryItems(prisma as any);

    return NextResponse.json({ ok: true, items });
  }

  if (body?.action === "upsert-item") {
    const title = String(body?.title ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Inventory title is required." },
        { status: 400 }
      );
    }

    await upsertUnifiedInventoryItem(prisma as any, {
      id: body.id,
      sku: body.sku,
      slug: body.slug || body.title,
      title,
      description: body.description,
      detailsDescription: body.detailsDescription,
      imageUrl: body.imageUrl,
      previewImageUrl: body.previewImageUrl,
      fulfillmentType: body.fulfillmentType,
      active: body.active,
      quantityOnHand: body.quantityOnHand,
      quantityReserved: body.quantityReserved,
      quantityAvailable: body.quantityAvailable,
      shopTags: Array.isArray(body.shopTags) ? body.shopTags : [],
      categoryTags: Array.isArray(body.categoryTags) ? body.categoryTags : [],
      shopListings: Array.isArray(body.shopListings) ? body.shopListings : [],
      options: Array.isArray(body.options) ? body.options : [],
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    });

    const items = await getUnifiedInventoryItems(prisma as any);

    return NextResponse.json({ ok: true, items });
  }

  if (body?.action === "reorder-shop-items") {
    const shopKey = String(body?.shopKey ?? "").trim();
    const orderedIds = Array.isArray(body?.orderedIds)
      ? body.orderedIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    if (!shopKey || !orderedIds.length) {
      return NextResponse.json(
        { error: "Shop and ordered inventory ids are required." },
        { status: 400 }
      );
    }

    await updateUnifiedInventoryShopOrder(
      prisma as any,
      shopKey,
      orderedIds
    );
    const items = await getUnifiedInventoryItems(prisma as any);

    return NextResponse.json({ ok: true, items });
  }

  return NextResponse.json(
    { error: "Unsupported inventory action." },
    { status: 400 }
  );
}
