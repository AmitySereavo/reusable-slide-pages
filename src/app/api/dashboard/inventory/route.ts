import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InventoryPurchaseModeInput = {
  modeId?: string;
  sku?: string;
  label?: string;
  description?: string;
  priceAdjustment?: number;
  requiresPhysicalFulfillment?: boolean;
};

type InventorySizeOptionInput = {
  optionId?: string;
  sku?: string;
  label?: string;
  description?: string;
  price?: number;
  weight?: number;
  stockOnHand?: number;
  stockReserved?: number;
  stockAvailable?: number;
  purchaseModes?: InventoryPurchaseModeInput[];
};

type InventoryProductInput = {
  catalogKey?: string;
  productId?: string;
  sku?: string;
  slug?: string;
  title?: string;
  description?: string;
  detailsDescription?: string;
  imageUrl?: string;
  eventVenueLabel?: string;
  eventAddress?: string;
  eventDateLabel?: string;
  eventTimeLabel?: string;
  fulfillmentType?: string;
  active?: boolean;
  enableStoreCreditPurchase?: boolean;
  enablePurchaseForOthers?: boolean;
  maxPurchaseForOthers?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  minRecipientQuantity?: number;
  maxRecipientQuantity?: number;
  stockOnHand?: number;
  stockReserved?: number;
  stockAvailable?: number;
  sizeOptions?: InventorySizeOptionInput[];
};

type NormalizedPurchaseMode = {
  modeId: string;
  sku?: string;
  label: string;
  description?: string;
  priceAdjustment: number;
  requiresPhysicalFulfillment: boolean;
};

type NormalizedSizeOption = {
  optionId: string;
  sku?: string;
  label: string;
  description?: string;
  price: number;
  weight?: number;
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  purchaseModes: NormalizedPurchaseMode[];
};

export async function GET(request: Request) {
  // Dev mode: dashboard APIs are intentionally ungated while the inventory
  // manager is being built. Restore main-admin auth before production launch.
  const url = new URL(request.url);
  const catalogKey = normalizeCatalogKey(url.searchParams.get("catalogKey"));

  const products = await prisma.reusableShopProduct.findMany({
    where: {
      catalogKey,
    },
    orderBy: [
      { sortOrder: "asc" },
      { updatedAt: "desc" },
    ],
    include: {
      sizeOptions: {
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          purchaseModes: {
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      },
    },
  });

  return NextResponse.json({ catalogKey, products });
}

export async function POST(request: Request) {
  // Dev mode: dashboard APIs are intentionally ungated while the inventory
  // manager is being built. Restore main-admin auth before production launch.
  const body = (await request.json().catch(() => null)) as
    | InventoryProductInput
    | null;

  const catalogKey = normalizeCatalogKey(body?.catalogKey);
  const productId = sanitizeId(body?.productId || body?.slug || body?.title);
  const title = String(body?.title ?? "").trim();

  if (!productId) {
    return NextResponse.json(
      { error: "Product ID or title is required." },
      { status: 400 }
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Product title is required." },
      { status: 400 }
    );
  }

  const sizeOptions = normalizeSizeOptions(body?.sizeOptions);

  if (!sizeOptions.length) {
    return NextResponse.json(
      { error: "At least one size or product option is required." },
      { status: 400 }
    );
  }

  const product = await prisma.$transaction(async (tx) => {
    const savedProduct = await tx.reusableShopProduct.upsert({
      where: {
        catalogKey_productId: {
          catalogKey,
          productId,
        },
      },
      create: {
        catalogKey,
        productId,
        sku: cleanText(body?.sku),
        slug: cleanText(body?.slug) ?? productId,
        title,
        description: cleanText(body?.description),
        detailsDescription: cleanText(body?.detailsDescription),
        imageUrl: cleanText(body?.imageUrl),
        eventVenueLabel: cleanText(body?.eventVenueLabel),
        eventAddress: cleanText(body?.eventAddress),
        eventDateLabel: cleanText(body?.eventDateLabel),
        eventTimeLabel: cleanText(body?.eventTimeLabel),
        fulfillmentType: normalizeFulfillmentType(body?.fulfillmentType),
        active: body?.active !== false,
        enableStoreCreditPurchase: body?.enableStoreCreditPurchase === true,
        enablePurchaseForOthers: body?.enablePurchaseForOthers === true,
        maxPurchaseForOthers: toOptionalInt(body?.maxPurchaseForOthers),
        minOrderQuantity: toOptionalInt(body?.minOrderQuantity),
        maxOrderQuantity: toOptionalInt(body?.maxOrderQuantity),
        minRecipientQuantity: toOptionalInt(body?.minRecipientQuantity),
        maxRecipientQuantity: toOptionalInt(body?.maxRecipientQuantity),
        stockOnHand: toInt(body?.stockOnHand),
        stockReserved: toInt(body?.stockReserved),
        stockAvailable: toInt(body?.stockAvailable),
      },
      update: {
        sku: cleanText(body?.sku),
        slug: cleanText(body?.slug) ?? productId,
        title,
        description: cleanText(body?.description),
        detailsDescription: cleanText(body?.detailsDescription),
        imageUrl: cleanText(body?.imageUrl),
        eventVenueLabel: cleanText(body?.eventVenueLabel),
        eventAddress: cleanText(body?.eventAddress),
        eventDateLabel: cleanText(body?.eventDateLabel),
        eventTimeLabel: cleanText(body?.eventTimeLabel),
        fulfillmentType: normalizeFulfillmentType(body?.fulfillmentType),
        active: body?.active !== false,
        enableStoreCreditPurchase: body?.enableStoreCreditPurchase === true,
        enablePurchaseForOthers: body?.enablePurchaseForOthers === true,
        maxPurchaseForOthers: toOptionalInt(body?.maxPurchaseForOthers),
        minOrderQuantity: toOptionalInt(body?.minOrderQuantity),
        maxOrderQuantity: toOptionalInt(body?.maxOrderQuantity),
        minRecipientQuantity: toOptionalInt(body?.minRecipientQuantity),
        maxRecipientQuantity: toOptionalInt(body?.maxRecipientQuantity),
        stockOnHand: toInt(body?.stockOnHand),
        stockReserved: toInt(body?.stockReserved),
        stockAvailable: toInt(body?.stockAvailable),
      },
    });

    for (const [index, sizeOption] of sizeOptions.entries()) {
      const savedSizeOption = await tx.reusableShopSizeOption.upsert({
        where: {
          productId_optionId: {
            productId: savedProduct.id,
            optionId: sizeOption.optionId,
          },
        },
        create: {
          productId: savedProduct.id,
          optionId: sizeOption.optionId,
          sku: sizeOption.sku,
          label: sizeOption.label,
          description: sizeOption.description,
          sortOrder: index,
          price: sizeOption.price,
          weight: sizeOption.weight,
          stockOnHand: sizeOption.stockOnHand,
          stockReserved: sizeOption.stockReserved,
          stockAvailable: sizeOption.stockAvailable,
        },
        update: {
          sku: sizeOption.sku,
          label: sizeOption.label,
          description: sizeOption.description,
          sortOrder: index,
          price: sizeOption.price,
          weight: sizeOption.weight,
          stockOnHand: sizeOption.stockOnHand,
          stockReserved: sizeOption.stockReserved,
          stockAvailable: sizeOption.stockAvailable,
          active: true,
        },
      });

      await tx.reusableShopPurchaseMode.deleteMany({
        where: {
          sizeOptionId: savedSizeOption.id,
        },
      });

      if (sizeOption.purchaseModes.length) {
        await tx.reusableShopPurchaseMode.createMany({
          data: sizeOption.purchaseModes.map((mode, modeIndex) => ({
            sizeOptionId: savedSizeOption.id,
            modeId: mode.modeId,
            sku: mode.sku,
            label: mode.label,
            description: mode.description,
            sortOrder: modeIndex,
            priceAdjustment: mode.priceAdjustment,
            requiresPhysicalFulfillment: mode.requiresPhysicalFulfillment,
          })),
        });
      }
    }

    return tx.reusableShopProduct.findUnique({
      where: {
        id: savedProduct.id,
      },
      include: {
        sizeOptions: {
          include: {
            purchaseModes: true,
          },
        },
      },
    });
  });

  return NextResponse.json({ ok: true, product });
}

function normalizeCatalogKey(value: unknown) {
  return sanitizeId(value) || "musicMerch";
}

function normalizeFulfillmentType(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "digital" || normalized === "ticket") {
    return normalized;
  }

  return "physical";
}

function normalizeSizeOptions(value: unknown): NormalizedSizeOption[] {
  const rawOptions = Array.isArray(value) ? value : [];

  return rawOptions
    .map((option, index): NormalizedSizeOption | null => {
      const candidate = option as InventorySizeOptionInput;
      const optionId =
        sanitizeId(candidate.optionId || candidate.sku || candidate.label) ||
        `option-${index + 1}`;
      const label = String(candidate.label ?? "").trim();
      const price = toNumber(candidate.price);

      if (!label || price === undefined) {
        return null;
      }

      const purchaseModes = Array.isArray(candidate.purchaseModes)
        ? candidate.purchaseModes
            .map((mode, modeIndex): NormalizedPurchaseMode | null => {
              const modeId =
                sanitizeId(mode.modeId || mode.sku || mode.label) ||
                `mode-${modeIndex + 1}`;
              const modeLabel = String(mode.label ?? "").trim();

              if (!modeLabel) {
                return null;
              }

              return {
                modeId,
                sku: cleanText(mode.sku),
                label: modeLabel,
                description: cleanText(mode.description),
                priceAdjustment: toNumber(mode.priceAdjustment) ?? 0,
                requiresPhysicalFulfillment:
                  mode.requiresPhysicalFulfillment === true,
              };
            })
            .filter((mode): mode is NormalizedPurchaseMode => Boolean(mode))
        : [];

      return {
        optionId,
        sku: cleanText(candidate.sku),
        label,
        description: cleanText(candidate.description),
        price,
        weight: toNumber(candidate.weight),
        stockOnHand: toInt(candidate.stockOnHand),
        stockReserved: toInt(candidate.stockReserved),
        stockAvailable: toInt(candidate.stockAvailable),
        purchaseModes,
      };
    })
    .filter((option): option is NormalizedSizeOption => Boolean(option));
}

function sanitizeId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: unknown) {
  return Math.max(0, Math.floor(toNumber(value) ?? 0));
}

function toOptionalInt(value: unknown) {
  const parsed = toNumber(value);
  return parsed === undefined ? undefined : Math.max(0, Math.floor(parsed));
}
