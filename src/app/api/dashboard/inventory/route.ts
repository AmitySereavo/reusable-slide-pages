import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { ensurePlantShopStockAdjustmentTable } from "@/lib/plantShop/stockAdjustments";

type InventoryPurchaseModeInput = {
  modeId?: string;
  sku?: string;
  label?: string;
  description?: string;
  priceAdjustment?: number;
  requiresPhysicalFulfillment?: boolean;
  metadata?: unknown;
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
  metadata?: unknown;
  sizeOptions?: InventorySizeOptionInput[];
};

type NormalizedPurchaseMode = {
  modeId: string;
  sku?: string;
  label: string;
  description?: string;
  priceAdjustment: number;
  requiresPhysicalFulfillment: boolean;
  metadata?: Prisma.InputJsonObject;
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
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const rawCatalogKey = url.searchParams.get("catalogKey");
  const catalogKey =
    rawCatalogKey === "all" ? "all" : normalizeCatalogKey(rawCatalogKey);

  if (catalogKey === "all") {
    const products = await prisma.reusableShopProduct.findMany({
      orderBy: [
        { title: "asc" },
        { catalogKey: "asc" },
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

    return NextResponse.json({
      catalogKey,
      products,
      stockAdjustments: [],
    });
  }

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
  let stockAdjustments: any[] = [];

  if (catalogKey === "littleOrchardShop") {
    await ensurePlantShopStockAdjustmentTable(prisma as any);
    stockAdjustments = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT *
      FROM "PlantShopStockAdjustment"
      WHERE "shopSlug" = 'little-orchard-shop'
      ORDER BY "createdAt" DESC
      LIMIT 80
    `);
  }

  return NextResponse.json({ catalogKey, products, stockAdjustments });
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = (await request.json().catch(() => null)) as
    | (InventoryProductInput & {
        action?: string;
        sourceCatalogKey?: string;
        targetCatalogKey?: string;
      })
    | null;

  if (body?.action === "add-to-catalog") {
    return copyProductToCatalog(body);
  }

  if (body?.action === "remove-from-catalog") {
    return removeProductFromCatalog(body);
  }

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
        metadata: normalizeMetadata(body?.metadata),
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
        metadata: normalizeMetadata(body?.metadata),
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
            metadata: mode.metadata,
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

async function copyProductToCatalog(
  body: InventoryProductInput & {
    sourceCatalogKey?: string;
    targetCatalogKey?: string;
  }
) {
  const sourceCatalogKey = normalizeCatalogKey(body.sourceCatalogKey);
  const targetCatalogKey = normalizeCatalogKey(body.targetCatalogKey);
  const productId = sanitizeId(body.productId);

  if (!productId) {
    return NextResponse.json(
      { error: "Choose an inventory item first." },
      { status: 400 }
    );
  }

  if (sourceCatalogKey === targetCatalogKey) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sourceProduct = await prisma.reusableShopProduct.findUnique({
    where: {
      catalogKey_productId: {
        catalogKey: sourceCatalogKey,
        productId,
      },
    },
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

  if (!sourceProduct) {
    return NextResponse.json(
      { error: "The source inventory item could not be found." },
      { status: 404 }
    );
  }

  const product = await prisma.$transaction(async (tx) => {
    const savedProduct = await tx.reusableShopProduct.upsert({
      where: {
        catalogKey_productId: {
          catalogKey: targetCatalogKey,
          productId,
        },
      },
      create: {
        catalogKey: targetCatalogKey,
        productId,
        sku: sourceProduct.sku,
        slug: sourceProduct.slug,
        title: sourceProduct.title,
        description: sourceProduct.description,
        detailsDescription: sourceProduct.detailsDescription,
        imageUrl: sourceProduct.imageUrl,
        fulfillmentType: sourceProduct.fulfillmentType,
        active: sourceProduct.active,
        featured: sourceProduct.featured,
        sortOrder: sourceProduct.sortOrder,
        enableStoreCreditPurchase: sourceProduct.enableStoreCreditPurchase,
        enablePurchaseForOthers: sourceProduct.enablePurchaseForOthers,
        maxPurchaseForOthers: sourceProduct.maxPurchaseForOthers,
        minOrderQuantity: sourceProduct.minOrderQuantity,
        maxOrderQuantity: sourceProduct.maxOrderQuantity,
        minRecipientQuantity: sourceProduct.minRecipientQuantity,
        maxRecipientQuantity: sourceProduct.maxRecipientQuantity,
        stockOnHand: sourceProduct.stockOnHand,
        stockReserved: sourceProduct.stockReserved,
        stockAvailable: sourceProduct.stockAvailable,
        eventVenueLabel: sourceProduct.eventVenueLabel,
        eventAddress: sourceProduct.eventAddress,
        eventDateLabel: sourceProduct.eventDateLabel,
        eventTimeLabel: sourceProduct.eventTimeLabel,
        metadata: sourceProduct.metadata ?? Prisma.JsonNull,
      },
      update: {
        active: true,
        updatedAt: new Date(),
      },
    });

    for (const [index, sourceOption] of sourceProduct.sizeOptions.entries()) {
      const savedOption = await tx.reusableShopSizeOption.upsert({
        where: {
          productId_optionId: {
            productId: savedProduct.id,
            optionId: sourceOption.optionId,
          },
        },
        create: {
          productId: savedProduct.id,
          optionId: sourceOption.optionId,
          sku: sourceOption.sku,
          label: sourceOption.label,
          description: sourceOption.description,
          active: sourceOption.active,
          featured: sourceOption.featured,
          sortOrder: index,
          price: sourceOption.price,
          weight: sourceOption.weight,
          stockOnHand: sourceOption.stockOnHand,
          stockReserved: sourceOption.stockReserved,
          stockAvailable: sourceOption.stockAvailable,
          mealSelection: sourceOption.mealSelection ?? Prisma.JsonNull,
          metadata: sourceOption.metadata ?? Prisma.JsonNull,
        },
        update: {
          sku: sourceOption.sku,
          label: sourceOption.label,
          description: sourceOption.description,
          active: sourceOption.active,
          featured: sourceOption.featured,
          sortOrder: index,
          price: sourceOption.price,
          weight: sourceOption.weight,
          stockOnHand: sourceOption.stockOnHand,
          stockReserved: sourceOption.stockReserved,
          stockAvailable: sourceOption.stockAvailable,
          mealSelection: sourceOption.mealSelection ?? Prisma.JsonNull,
          metadata: sourceOption.metadata ?? Prisma.JsonNull,
        },
      });

      await tx.reusableShopPurchaseMode.deleteMany({
        where: {
          sizeOptionId: savedOption.id,
        },
      });

      if (sourceOption.purchaseModes.length) {
        await tx.reusableShopPurchaseMode.createMany({
          data: sourceOption.purchaseModes.map((mode, modeIndex) => ({
            sizeOptionId: savedOption.id,
            modeId: mode.modeId,
            sku: mode.sku,
            label: mode.label,
            description: mode.description,
            active: mode.active,
            featured: mode.featured,
            sortOrder: modeIndex,
            priceAdjustment: mode.priceAdjustment,
            requiresPhysicalFulfillment: mode.requiresPhysicalFulfillment,
            mealSelection: mode.mealSelection ?? Prisma.JsonNull,
            metadata: mode.metadata ?? Prisma.JsonNull,
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

async function removeProductFromCatalog(
  body: InventoryProductInput & {
    targetCatalogKey?: string;
  }
) {
  const targetCatalogKey = normalizeCatalogKey(body.targetCatalogKey);
  const productId = sanitizeId(body.productId);

  if (!productId) {
    return NextResponse.json(
      { error: "Choose an inventory item first." },
      { status: 400 }
    );
  }

  await prisma.reusableShopProduct.deleteMany({
    where: {
      catalogKey: targetCatalogKey,
      productId,
    },
  });

  return NextResponse.json({ ok: true });
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
                metadata: normalizeMetadata(mode.metadata),
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

function normalizeMetadata(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Prisma.InputJsonObject;
}
