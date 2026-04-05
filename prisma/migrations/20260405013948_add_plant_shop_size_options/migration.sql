/*
  Warnings:

  - You are about to drop the column `growthIntroLine1` on the `PlantQuestionnaireContent` table. All the data in the column will be lost.
  - You are about to drop the column `growthIntroLine2` on the `PlantQuestionnaireContent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('OZ', 'LB', 'G', 'KG');

-- CreateEnum
CREATE TYPE "PlantShopPurchaseModeType" AS ENUM ('WATCH_FROM_START', 'BUY_MATURE_NOW', 'RESERVE_FOR_LATER', 'SUBSCRIBE_TO_UPDATES', 'STANDARD', 'OTHER');

-- AlterTable
ALTER TABLE "PlantQuestionnaireContent" DROP COLUMN "growthIntroLine1",
DROP COLUMN "growthIntroLine2";

-- CreateTable
CREATE TABLE "PlantShopSizeOption" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "slug" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceJmd" DECIMAL(10,2) NOT NULL,
    "compareAtPriceJmd" DECIMAL(10,2),
    "weight" DECIMAL(10,3),
    "weightUnit" "WeightUnit",
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "stockReserved" INTEGER NOT NULL DEFAULT 0,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "supportsPickup" BOOLEAN,
    "supportsDelivery" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantShopSizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantShopSizeOptionPurchaseMode" (
    "id" TEXT NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "modeType" "PlantShopPurchaseModeType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceAdjustmentJmd" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantShopSizeOptionPurchaseMode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantShopSizeOption_plantId_active_sortOrder_idx" ON "PlantShopSizeOption"("plantId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PlantShopSizeOption_plantId_label_key" ON "PlantShopSizeOption"("plantId", "label");

-- CreateIndex
CREATE INDEX "PlantShopSizeOptionPurchaseMode_sizeOptionId_active_sortOrd_idx" ON "PlantShopSizeOptionPurchaseMode"("sizeOptionId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PlantShopSizeOptionPurchaseMode_sizeOptionId_modeType_key" ON "PlantShopSizeOptionPurchaseMode"("sizeOptionId", "modeType");

-- AddForeignKey
ALTER TABLE "PlantShopSizeOption" ADD CONSTRAINT "PlantShopSizeOption_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantShopSizeOptionPurchaseMode" ADD CONSTRAINT "PlantShopSizeOptionPurchaseMode_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "PlantShopSizeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
