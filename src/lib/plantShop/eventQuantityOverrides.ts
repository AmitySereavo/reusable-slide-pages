import { Prisma, PrismaClient } from "@prisma/client";

type EventQuantityOverrideRow = {
  productId: string | null;
  sizeOptionId: string | null;
  eventQuantity: number | null;
};

export type EventQuantityOverrideKey = `${string}::${string}`;

export async function ensurePlantShopEventQuantityOverrideTable(
  prisma: PrismaClient
) {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlantShopEventQuantityOverride" (
      "id" TEXT PRIMARY KEY,
      "shopSlug" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "sizeOptionId" TEXT NOT NULL,
      "eventQuantity" INTEGER NOT NULL,
      "updatedByUserId" TEXT,
      "updatedByName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "PlantShopEventQuantityOverride_unique_line"
    ON "PlantShopEventQuantityOverride" ("shopSlug", "productId", "sizeOptionId")
  `;
}

export async function getPlantShopEventQuantityOverrideMap(
  prisma: PrismaClient,
  shopSlug: string
) {
  await ensurePlantShopEventQuantityOverrideTable(prisma);

  const rows = await prisma.$queryRaw<EventQuantityOverrideRow[]>(
    Prisma.sql`
      SELECT "productId", "sizeOptionId", "eventQuantity"
      FROM "PlantShopEventQuantityOverride"
      WHERE "shopSlug" = ${shopSlug}
    `
  );

  return new Map<EventQuantityOverrideKey, number>(
    rows.map((row) => [
      `${row.productId ?? ""}::${row.sizeOptionId ?? ""}`,
      Number(row.eventQuantity ?? 0),
    ])
  );
}

export async function setPlantShopEventQuantityOverride(
  prisma: PrismaClient,
  {
    shopSlug,
    productId,
    sizeOptionId,
    eventQuantity,
    updatedByUserId,
    updatedByName,
  }: {
    shopSlug: string;
    productId: string;
    sizeOptionId: string;
    eventQuantity: number;
    updatedByUserId?: string | null;
    updatedByName?: string | null;
  }
) {
  await ensurePlantShopEventQuantityOverrideTable(prisma);

  const id = `${shopSlug}:${productId}:${sizeOptionId}`;

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "PlantShopEventQuantityOverride"
        ("id", "shopSlug", "productId", "sizeOptionId", "eventQuantity", "updatedByUserId", "updatedByName", "updatedAt")
      VALUES (${id}, ${shopSlug}, ${productId}, ${sizeOptionId}, ${eventQuantity}, ${updatedByUserId ?? null}, ${updatedByName ?? null}, CURRENT_TIMESTAMP)
      ON CONFLICT ("shopSlug", "productId", "sizeOptionId")
      DO UPDATE SET
        "eventQuantity" = ${eventQuantity},
        "updatedByUserId" = ${updatedByUserId ?? null},
        "updatedByName" = ${updatedByName ?? null},
        "updatedAt" = CURRENT_TIMESTAMP
    `
  );
}
