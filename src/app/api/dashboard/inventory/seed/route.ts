import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  getInvitationOrderCatalog,
  getInvitationShopCatalog,
  getMusicMerchShopCatalog,
} from "@/lib/invitation/getInvitationShopCatalog";
import { prisma } from "@/lib/prisma";
import type { ShopCatalogProduct } from "@/types/questionnaire";

const seedCatalogs = [
  { catalogKey: "invitationTickets", catalog: getInvitationShopCatalog },
  { catalogKey: "musicMerch", catalog: getMusicMerchShopCatalog },
  { catalogKey: "invitationOrder", catalog: getInvitationOrderCatalog },
];

export async function POST() {
  // Dev mode: dashboard seed writes are intentionally ungated while the
  // inventory manager is being built. Restore main-admin auth before launch.
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

  return NextResponse.json({
    ok: true,
    productCount,
    optionCount,
  });
}

async function upsertProduct({
  tx,
  catalogKey,
  product,
  productIndex,
}: {
  tx: Prisma.TransactionClient;
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
