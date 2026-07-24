import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  LITTLE_ORCHARD_SHOP_SLUG,
  littleOrchardShopCatalog,
} from "../src/config/shops/littleOrchardShop";
import { setPlantShopEventQuantityOverride } from "../src/lib/plantShop/eventQuantityOverrides";

async function main() {
  const result = await prisma.$transaction(
    async (tx) => {
      const items = await tx.orderFulfillmentItem.findMany({
        where: { sourceType: "little-orchard-shop" },
        select: { id: true, orderCode: true },
      });
      const orderCodes = new Set(
        items.map((item) => item.orderCode).filter(Boolean)
      );

      const deleteResult = await tx.orderFulfillmentItem.deleteMany({
        where: { sourceType: "little-orchard-shop" },
      });

      let resetCount = 0;

      for (const product of littleOrchardShopCatalog.products) {
        for (const sizeOption of product.sizeOptions) {
          const originalEventQuantity = Number(
            sizeOption.metadata?.eventQuantityAvailable ?? 0
          );

          await setPlantShopEventQuantityOverride(tx as any, {
            shopSlug: LITTLE_ORCHARD_SHOP_SLUG,
            productId: product.id,
            sizeOptionId: sizeOption.id,
            eventQuantity: Math.max(0, Math.floor(originalEventQuantity)),
            updatedByUserId: null,
            updatedByName: "Admin deleted test orders",
          });

          resetCount += 1;
        }
      }

      return {
        deletedItems: deleteResult.count,
        deletedOrders: orderCodes.size,
        resetCount,
      };
    },
    { timeout: 30000 }
  );

  console.log(
    `Deleted ${result.deletedItems} Little Orchard order item(s) across ${result.deletedOrders} order(s).`
  );
  console.log(`Reset ${result.resetCount} Little Orchard quantity override(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
