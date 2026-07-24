import { PrismaClient, Prisma } from "@prisma/client";

type ProductInterestRow = {
  productId: string | null;
  sizeOptionId: string | null;
  total: bigint | number | null;
};

export type ProductInterestKey = `${string}::${string}`;

export async function ensurePlantShopInterestTable(prisma: PrismaClient) {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlantShopProductInterest" (
      "id" TEXT PRIMARY KEY,
      "shopSlug" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "sizeOptionId" TEXT NOT NULL,
      "sessionKey" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "PlantShopProductInterest_unique_session_line"
    ON "PlantShopProductInterest" ("shopSlug", "productId", "sizeOptionId", "sessionKey")
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "PlantShopProductInterest_line_idx"
    ON "PlantShopProductInterest" ("shopSlug", "productId", "sizeOptionId")
  `;
}

export async function recordPlantShopProductInterest(
  prisma: PrismaClient,
  {
    shopSlug,
    productId,
    sizeOptionId,
    sessionKey,
  }: {
    shopSlug: string;
    productId: string;
    sizeOptionId: string;
    sessionKey: string;
  }
) {
  await ensurePlantShopInterestTable(prisma);

  const id = `${shopSlug}:${productId}:${sizeOptionId}:${sessionKey}`;

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "PlantShopProductInterest"
        ("id", "shopSlug", "productId", "sizeOptionId", "sessionKey", "updatedAt")
      VALUES (${id}, ${shopSlug}, ${productId}, ${sizeOptionId}, ${sessionKey}, CURRENT_TIMESTAMP)
      ON CONFLICT ("shopSlug", "productId", "sizeOptionId", "sessionKey")
      DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP
    `
  );

  return getPlantShopProductInterestCount(prisma, {
    shopSlug,
    productId,
    sizeOptionId,
  });
}

export async function getPlantShopProductInterestCount(
  prisma: PrismaClient,
  {
    shopSlug,
    productId,
    sizeOptionId,
  }: {
    shopSlug: string;
    productId: string;
    sizeOptionId: string;
  }
) {
  await ensurePlantShopInterestTable(prisma);

  const rows = await prisma.$queryRaw<Array<{ total: bigint | number | null }>>(
    Prisma.sql`
      SELECT COUNT(*) AS total
      FROM "PlantShopProductInterest"
      WHERE "shopSlug" = ${shopSlug}
        AND "productId" = ${productId}
        AND "sizeOptionId" = ${sizeOptionId}
    `
  );

  return Number(rows[0]?.total ?? 0);
}

export async function getPlantShopProductInterestMap(
  prisma: PrismaClient,
  shopSlug: string
) {
  await ensurePlantShopInterestTable(prisma);

  const rows = await prisma.$queryRaw<ProductInterestRow[]>(
    Prisma.sql`
      SELECT "productId", "sizeOptionId", COUNT(*) AS total
      FROM "PlantShopProductInterest"
      WHERE "shopSlug" = ${shopSlug}
      GROUP BY "productId", "sizeOptionId"
    `
  );

  return new Map<ProductInterestKey, number>(
    rows.map((row) => [
      `${row.productId ?? ""}::${row.sizeOptionId ?? ""}`,
      Number(row.total ?? 0),
    ])
  );
}
