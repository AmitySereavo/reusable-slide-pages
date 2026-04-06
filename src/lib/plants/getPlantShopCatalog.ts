import { prisma } from "@/lib/prisma";
import { ShopCatalog, ShopCatalogProduct, ShopCatalogSizeOption } from "@/types/questionnaire";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getDisplayName(plant: {
  name: string;
  displayName: string | null;
}) {
  return plant.displayName?.trim() || plant.name;
}

export async function getPlantShopCatalog(): Promise<ShopCatalog> {
  const plants = await prisma.plant.findMany({
    where: {
      active: true,
      visibleInPlantShop: true,
      purchasable: true,
      shopSizeOptions: {
        some: {
          active: true,
          stockAvailable: {
            gt: 0,
          },
        },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      imageUrl: true,
      thumbnailUrl: true,
      description: true,
      marketing: {
        select: {
          plantShopSummary: true,
        },
      },
      shopSizeOptions: {
        where: {
          active: true,
          stockAvailable: {
            gt: 0,
          },
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          id: true,
          slug: true,
          label: true,
          description: true,
          priceJmd: true,
          weight: true,
          weightUnit: true,
          stockAvailable: true,
          purchaseModes: {
            where: {
              active: true,
            },
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
            select: {
              id: true,
              modeType: true,
              label: true,
              description: true,
              priceAdjustmentJmd: true,
            },
          },
        },
      },
    },
  });

  const products: ShopCatalogProduct[] = plants
    .map((plant) => {
      const sizeOptions: ShopCatalogSizeOption[] = plant.shopSizeOptions
        .map((sizeOption) => {
          const purchaseModes = sizeOption.purchaseModes.map((mode) => ({
            id: mode.id,
            label: mode.label,
            priceAdjustment: toNumber(mode.priceAdjustmentJmd) ?? 0,
          }));

          return {
            id: sizeOption.id,
            label: sizeOption.label,
            price: toNumber(sizeOption.priceJmd) ?? 0,
            weight: toNumber(sizeOption.weight),
            purchaseModes: purchaseModes.length ? purchaseModes : undefined,
          };
        })
        .filter((sizeOption) => sizeOption.price > 0);

      if (!sizeOptions.length) {
        return null;
      }

            return {
        id: plant.id,
        slug: plant.slug,
        title: getDisplayName(plant),
        imageUrl: plant.thumbnailUrl || plant.imageUrl || undefined,
        description:
          plant.marketing?.plantShopSummary || plant.description || undefined,
        sizeOptions,
      };
    })
    .filter(Boolean) as ShopCatalogProduct[];

  return {
    currencyCode: "JMD",
    weightUnit: "lb",
    products,
  };
}