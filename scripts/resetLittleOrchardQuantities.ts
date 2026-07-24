import "dotenv/config";
import { LITTLE_ORCHARD_SHOP_SLUG, littleOrchardShopCatalog } from "../src/config/shops/littleOrchardShop";
import { prisma } from "../src/lib/prisma";
import { setPlantShopEventQuantityOverride } from "../src/lib/plantShop/eventQuantityOverrides";

type ConfirmedQuantityRow = {
  productId: string | null;
  sizeOptionId: string | null;
  total: bigint | number | null;
};

async function main() {
  const rows = await prisma.$queryRaw<ConfirmedQuantityRow[]>`
    SELECT "productId", "sizeOptionId", COALESCE(SUM("quantity"), 0) AS total
    FROM "OrderFulfillmentItem"
    WHERE "sourceType" = 'little-orchard-shop'
      AND "metadata"->>'paymentStatus' = 'PAYMENT_CONFIRMED'
      AND "metadata"->>'inventoryApplied' = 'true'
      AND COALESCE("purchaseModeId", '') <> 'nursery-stock-request'
    GROUP BY "productId", "sizeOptionId"
  `;
  const confirmedByLine = new Map(
    rows.map((row) => [
      `${row.productId ?? ""}::${row.sizeOptionId ?? ""}`,
      Number(row.total ?? 0),
    ])
  );

  let resetCount = 0;

  for (const product of littleOrchardShopCatalog.products) {
    for (const sizeOption of product.sizeOptions) {
      const originalRemaining = Number(
        sizeOption.metadata?.eventQuantityAvailable ?? 0
      );
      const confirmedQuantity =
        confirmedByLine.get(`${product.id}::${sizeOption.id}`) ?? 0;
      const eventQuantity = Math.max(
        0,
        Math.floor(originalRemaining + confirmedQuantity)
      );

      await setPlantShopEventQuantityOverride(prisma as any, {
        shopSlug: LITTLE_ORCHARD_SHOP_SLUG,
        productId: product.id,
        sizeOptionId: sizeOption.id,
        eventQuantity,
        updatedByUserId: null,
        updatedByName: "Admin reset to original document",
      });

      resetCount += 1;
      console.log(
        `${product.title} / ${sizeOption.label}: remaining reset to ${originalRemaining} (event quantity override ${eventQuantity}, confirmed ${confirmedQuantity})`
      );
    }
  }

  console.log(`Reset ${resetCount} Little Orchard shop quantities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
