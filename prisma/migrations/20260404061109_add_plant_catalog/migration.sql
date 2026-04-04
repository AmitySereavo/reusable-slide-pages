-- CreateEnum
CREATE TYPE "PlantKind" AS ENUM ('SEED', 'SEEDLING', 'MATURE_PLANT', 'CIRCUMPOSED_PLANT', 'CUTTING', 'TREE', 'HERB', 'VEGETABLE', 'FRUIT_PLANT', 'ORNAMENTAL', 'AIR_PURIFIER', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantCategory" AS ENUM ('HERB', 'VEGETABLE', 'FRUIT', 'ORNAMENTAL', 'SHADE', 'AIR_PURIFYING', 'MEDICINAL', 'FLOWERING', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantLifecycleStage" AS ENUM ('SEED', 'GERMINATING', 'SEEDLING', 'YOUNG_PLANT', 'MATURE', 'PROPAGATING', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY');

-- CreateEnum
CREATE TYPE "PlantPropagationMethod" AS ENUM ('SEED', 'CUTTING', 'CIRCUMPOSING', 'SUCKER', 'GRAFT', 'DIVISION', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantPropagationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'ROOTING', 'GROWING', 'HARDENING', 'READY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PlantSalesChannel" AS ENUM ('CLAIM_FLOW', 'PLANT_SHOP', 'POPUP_SHOP', 'WHOLESALE', 'PARTNER_PORTAL', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "PlantOfferModeType" AS ENUM ('CLAIM_FREE', 'SWITCH_FREE', 'WATCH_FROM_SEED', 'GROWTH_UPDATES', 'BUY_MATURE_NOW', 'RESERVE_MATURE', 'WATCH_CIRCUMPOSING', 'PREORDER');

-- CreateEnum
CREATE TYPE "PlantYieldType" AS ENUM ('FRUIT', 'LEAVES', 'FLOWERS', 'SEEDS', 'SUCKERS', 'CUTTINGS', 'AIR_QUALITY', 'SHADE', 'OTHER');

-- DropIndex
DROP INDEX "QuestionnaireSubmission_createdAt_idx";

-- DropIndex
DROP INDEX "QuestionnaireSubmission_email_idx";

-- DropIndex
DROP INDEX "QuestionnaireSubmission_questionnaireSlug_idx";

-- AlterTable
ALTER TABLE "QuestionnaireSubmission" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "scientificName" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "plantKind" "PlantKind" NOT NULL,
    "plantCategory" "PlantCategory",
    "lifecycleStage" "PlantLifecycleStage",
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "basePriceJmd" DECIMAL(10,2),
    "compareAtPriceJmd" DECIMAL(10,2),
    "visibleInPlantShop" BOOLEAN NOT NULL DEFAULT false,
    "purchasable" BOOLEAN NOT NULL DEFAULT false,
    "claimEligible" BOOLEAN NOT NULL DEFAULT false,
    "claimSwitchEligible" BOOLEAN NOT NULL DEFAULT false,
    "claimFeatured" BOOLEAN NOT NULL DEFAULT false,
    "supportsPickup" BOOLEAN NOT NULL DEFAULT true,
    "supportsDelivery" BOOLEAN NOT NULL DEFAULT false,
    "supportsSeedJourney" BOOLEAN NOT NULL DEFAULT false,
    "supportsMatureNow" BOOLEAN NOT NULL DEFAULT false,
    "supportsCircumposingJourney" BOOLEAN NOT NULL DEFAULT false,
    "supportsReservation" BOOLEAN NOT NULL DEFAULT false,
    "supportsGrowthUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantInventory" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "stockCommitted" INTEGER NOT NULL DEFAULT 0,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "propagationMethod" "PlantPropagationMethod",
    "propagationStatus" "PlantPropagationStatus",
    "batchCode" TEXT,
    "readyNow" BOOLEAN NOT NULL DEFAULT false,
    "estimatedReadyDate" TIMESTAMP(3),
    "readinessNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantMarketingContent" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "primaryBenefit" TEXT,
    "healthBenefit" TEXT,
    "nutritionBenefit" TEXT,
    "healingBenefit" TEXT,
    "environmentBenefit" TEXT,
    "incomeBenefit" TEXT,
    "savingsBenefit" TEXT,
    "yieldType" "PlantYieldType",
    "yieldFrequency" TEXT,
    "yieldQuantityEstimate" TEXT,
    "monetaryValueNote" TEXT,
    "savingsAmountJmdMonthly" DECIMAL(10,2),
    "adHook" TEXT,
    "adCopyShort" TEXT,
    "adCopyMedium" TEXT,
    "plantShopSummary" TEXT,
    "whatsappPromoCopy" TEXT,
    "claimPageSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantMarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantQuestionnaireContent" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "seedRevealBlock" TEXT,
    "plantInfoBlock" TEXT,
    "growthIntroLine1" TEXT,
    "growthIntroLine2" TEXT,
    "updatesIntroBlock" TEXT,
    "careTipsBlock" TEXT,
    "confirmationBlock" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantQuestionnaireContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantOfferMode" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "offerMode" "PlantOfferModeType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "description" TEXT,
    "priceJmd" DECIMAL(10,2),
    "compareAtPriceJmd" DECIMAL(10,2),
    "leadTimeDays" INTEGER,
    "requiresUpdates" BOOLEAN NOT NULL DEFAULT false,
    "requiresReservation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantOfferMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantChannelSetting" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "channel" "PlantSalesChannel" NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "claimEligible" BOOLEAN,
    "claimSwitchEligible" BOOLEAN,
    "claimFeatured" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantChannelSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plant_slug_key" ON "Plant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PlantInventory_plantId_key" ON "PlantInventory"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantMarketingContent_plantId_key" ON "PlantMarketingContent"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantQuestionnaireContent_plantId_key" ON "PlantQuestionnaireContent"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantOfferMode_plantId_offerMode_key" ON "PlantOfferMode"("plantId", "offerMode");

-- CreateIndex
CREATE UNIQUE INDEX "PlantChannelSetting_plantId_channel_key" ON "PlantChannelSetting"("plantId", "channel");

-- AddForeignKey
ALTER TABLE "PlantInventory" ADD CONSTRAINT "PlantInventory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantMarketingContent" ADD CONSTRAINT "PlantMarketingContent_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantQuestionnaireContent" ADD CONSTRAINT "PlantQuestionnaireContent_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantOfferMode" ADD CONSTRAINT "PlantOfferMode_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantChannelSetting" ADD CONSTRAINT "PlantChannelSetting_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
