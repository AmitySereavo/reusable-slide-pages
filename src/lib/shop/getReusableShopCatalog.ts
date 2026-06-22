import { prisma } from "@/lib/prisma";
import type {
  FulfillmentType,
  ShopCatalog,
  ShopCatalogProduct,
  ShopCatalogSizeOption,
  ShopMealSelectionRequirement,
  ShopPurchaseMode,
} from "@/types/questionnaire";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeFulfillmentType(value: string | null | undefined): FulfillmentType {
  if (value === "digital" || value === "ticket") {
    return value;
  }

  return "physical";
}

function withTicketQuantityDefaults(
  product: ShopCatalogProduct
): ShopCatalogProduct {
  if (product.fulfillmentType !== "ticket") {
    return product;
  }

  return {
    ...product,
    enablePurchaseForOthers: product.enablePurchaseForOthers ?? true,
    maxPurchaseForOthers: Math.min(product.maxPurchaseForOthers ?? 5, 5),
    minOrderQuantity: product.minOrderQuantity ?? 1,
    maxOrderQuantity: Math.min(product.maxOrderQuantity ?? 7, 7),
    maxAccountHolderQuantity: Math.min(
      product.maxAccountHolderQuantity ?? 2,
      2
    ),
    minRecipientQuantity: product.minRecipientQuantity ?? 1,
    maxRecipientQuantity: Math.min(product.maxRecipientQuantity ?? 1, 1),
  };
}

function normalizeMealSelection(
  value: unknown
): ShopMealSelectionRequirement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ShopMealSelectionRequirement>;

  if (
    (candidate.mode === "required" || candidate.mode === "optional") &&
    typeof candidate.menuId === "string" &&
    candidate.menuId.trim()
  ) {
    return {
      mode: candidate.mode,
      menuId: candidate.menuId,
      label: typeof candidate.label === "string" ? candidate.label : undefined,
      price: toNumber(candidate.price),
    };
  }

  return undefined;
}

export async function getReusableShopCatalog({
  catalogKey,
  currencyCode,
  weightUnit,
}: {
  catalogKey: string;
  currencyCode?: string;
  weightUnit?: string;
}): Promise<ShopCatalog> {
  try {
    const rows = await prisma.reusableShopProduct.findMany({
      where: {
        catalogKey,
        active: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
      include: {
        sizeOptions: {
          where: {
            active: true,
          },
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            purchaseModes: {
              where: {
                active: true,
              },
              orderBy: [
                { sortOrder: "asc" },
                { createdAt: "asc" },
              ],
            },
          },
        },
      },
    });

    const products = rows
      .map((product): ShopCatalogProduct | null => {
        const sizeOptions = product.sizeOptions
          .map((sizeOption): ShopCatalogSizeOption | null => {
            const price = toNumber(sizeOption.price);

            if (price === undefined) {
              return null;
            }

            const purchaseModes = sizeOption.purchaseModes
              .map((mode): ShopPurchaseMode => ({
                id: mode.modeId,
                sku: mode.sku ?? undefined,
                label: mode.label,
                priceAdjustment: toNumber(mode.priceAdjustment) ?? 0,
                requiresPhysicalFulfillment:
                  mode.requiresPhysicalFulfillment || undefined,
                mealSelection: normalizeMealSelection(mode.mealSelection),
              }))
              .filter((mode) => mode.label.trim());

            return {
              id: sizeOption.optionId,
              sku: sizeOption.sku ?? undefined,
              label: sizeOption.label,
              description: sizeOption.description ?? undefined,
              price,
              weight: toNumber(sizeOption.weight),
              mealSelection: normalizeMealSelection(sizeOption.mealSelection),
              purchaseModes: purchaseModes.length ? purchaseModes : undefined,
            };
          })
          .filter(Boolean) as ShopCatalogSizeOption[];

        if (!sizeOptions.length) {
          return null;
        }

        return withTicketQuantityDefaults({
          id: product.productId,
          sku: product.sku ?? undefined,
          slug: product.slug ?? undefined,
          title: product.title,
          imageUrl: product.imageUrl ?? undefined,
          description: product.description ?? undefined,
          detailsDescription: product.detailsDescription ?? undefined,
          eventVenueLabel: product.eventVenueLabel ?? undefined,
          eventAddress: product.eventAddress ?? undefined,
          eventDateLabel: product.eventDateLabel ?? undefined,
          eventTimeLabel: product.eventTimeLabel ?? undefined,
          fulfillmentType: normalizeFulfillmentType(product.fulfillmentType),
          enableStoreCreditPurchase:
            product.enableStoreCreditPurchase || undefined,
          enablePurchaseForOthers: product.enablePurchaseForOthers || undefined,
          maxPurchaseForOthers: product.maxPurchaseForOthers ?? undefined,
          minOrderQuantity: product.minOrderQuantity ?? undefined,
          maxOrderQuantity: product.maxOrderQuantity ?? undefined,
          maxAccountHolderQuantity: undefined,
          minRecipientQuantity: product.minRecipientQuantity ?? undefined,
          maxRecipientQuantity: product.maxRecipientQuantity ?? undefined,
          sizeOptions,
        });
      })
      .filter(Boolean) as ShopCatalogProduct[];

    if (products.length) {
      return {
        currencyCode,
        weightUnit,
        products,
      };
    }
  } catch (error) {
    console.warn(
      `Reusable shop catalog "${catalogKey}" could not be loaded from the database.`,
      error
    );
  }

  return {
    currencyCode,
    weightUnit,
    products: [],
  };
}
