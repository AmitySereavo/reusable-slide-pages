import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getInvitationOrderCatalog,
  getInvitationShopCatalog,
  getMusicMerchShopCatalog,
} from "../src/lib/invitation/getInvitationShopCatalog";
import type { ShopCatalogProduct } from "../src/types/questionnaire";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const seedCatalogs = [
  { catalogKey: "invitationTickets", catalog: getInvitationShopCatalog },
  { catalogKey: "musicMerch", catalog: getMusicMerchShopCatalog },
  { catalogKey: "invitationOrder", catalog: getInvitationOrderCatalog },
];

async function main() {
  let productCount = 0;
  let optionCount = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const entry of seedCatalogs) {
        const catalog = entry.catalog();

      for (const [productIndex, product] of catalog.products.entries()) {
        const savedProduct = await upsertProduct({
          tx,
          catalogKey: entry.catalogKey,
          product,
          productIndex,
        });

        productCount += 1;

        for (const [optionIndex, sizeOption] of product.sizeOptions.entries()) {
          const savedOption = await tx.reusableShopSizeOption.upsert({
            where: {
              productId_optionId: {
                productId: savedProduct.id,
                optionId: sizeOption.id,
              },
            },
            create: {
              productId: savedProduct.id,
              optionId: sizeOption.id,
              sku: sizeOption.sku,
              label: sizeOption.label,
              description: sizeOption.description,
              sortOrder: optionIndex,
              price: sizeOption.price,
              weight: sizeOption.weight,
              stockOnHand: 999,
              stockAvailable: 999,
              mealSelection: sizeOption.mealSelection,
            },
            update: {
              sku: sizeOption.sku,
              label: sizeOption.label,
              description: sizeOption.description,
              sortOrder: optionIndex,
              price: sizeOption.price,
              weight: sizeOption.weight,
              active: true,
              mealSelection: sizeOption.mealSelection,
            },
          });

          optionCount += 1;

          await tx.reusableShopPurchaseMode.deleteMany({
            where: {
              sizeOptionId: savedOption.id,
            },
          });

          if (sizeOption.purchaseModes?.length) {
            await tx.reusableShopPurchaseMode.createMany({
              data: sizeOption.purchaseModes.map((mode, modeIndex) => ({
                sizeOptionId: savedOption.id,
                modeId: mode.id,
                sku: mode.sku,
                label: mode.label,
                sortOrder: modeIndex,
                priceAdjustment: mode.priceAdjustment,
                requiresPhysicalFulfillment:
                  mode.requiresPhysicalFulfillment === true,
                mealSelection: mode.mealSelection,
              })),
            });
          }
        }
      }
      }
    },
    { timeout: 30000 }
  );

  console.log(
    `Seeded ${productCount} reusable shop products and ${optionCount} options.`
  );
}

async function upsertProduct({
  tx,
  catalogKey,
  product,
  productIndex,
}: {
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
  catalogKey: string;
  product: ShopCatalogProduct;
  productIndex: number;
}) {
  return tx.reusableShopProduct.upsert({
    where: {
      catalogKey_productId: {
        catalogKey,
        productId: product.id,
      },
    },
    create: {
      catalogKey,
      productId: product.id,
      sku: product.sku,
      slug: product.slug,
      title: product.title,
      description: product.description,
      detailsDescription: product.detailsDescription,
      imageUrl: product.imageUrl,
      fulfillmentType: product.fulfillmentType ?? "physical",
      sortOrder: productIndex,
      enableStoreCreditPurchase: product.enableStoreCreditPurchase === true,
      enablePurchaseForOthers: product.enablePurchaseForOthers === true,
      maxPurchaseForOthers: product.maxPurchaseForOthers,
      minOrderQuantity: product.minOrderQuantity,
      maxOrderQuantity: product.maxOrderQuantity,
      minRecipientQuantity: product.minRecipientQuantity,
      maxRecipientQuantity: product.maxRecipientQuantity,
      stockOnHand: 999,
      stockAvailable: 999,
      eventVenueLabel: product.eventVenueLabel,
      eventAddress: product.eventAddress,
      eventDateLabel: product.eventDateLabel,
      eventTimeLabel: product.eventTimeLabel,
    },
    update: {
      sku: product.sku,
      slug: product.slug,
      title: product.title,
      description: product.description,
      detailsDescription: product.detailsDescription,
      imageUrl: product.imageUrl,
      fulfillmentType: product.fulfillmentType ?? "physical",
      sortOrder: productIndex,
      active: true,
      enableStoreCreditPurchase: product.enableStoreCreditPurchase === true,
      enablePurchaseForOthers: product.enablePurchaseForOthers === true,
      maxPurchaseForOthers: product.maxPurchaseForOthers,
      minOrderQuantity: product.minOrderQuantity,
      maxOrderQuantity: product.maxOrderQuantity,
      minRecipientQuantity: product.minRecipientQuantity,
      maxRecipientQuantity: product.maxRecipientQuantity,
      eventVenueLabel: product.eventVenueLabel,
      eventAddress: product.eventAddress,
      eventDateLabel: product.eventDateLabel,
      eventTimeLabel: product.eventTimeLabel,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
