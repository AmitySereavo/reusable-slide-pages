CREATE TABLE "ReusableShopProduct" (
    "id" TEXT NOT NULL,
    "catalogKey" TEXT NOT NULL DEFAULT 'shopCatalog',
    "productId" TEXT NOT NULL,
    "sku" TEXT,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "detailsDescription" TEXT,
    "imageUrl" TEXT,
    "fulfillmentType" TEXT NOT NULL DEFAULT 'physical',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enableStoreCreditPurchase" BOOLEAN NOT NULL DEFAULT false,
    "enablePurchaseForOthers" BOOLEAN NOT NULL DEFAULT false,
    "maxPurchaseForOthers" INTEGER,
    "minOrderQuantity" INTEGER,
    "maxOrderQuantity" INTEGER,
    "minRecipientQuantity" INTEGER,
    "maxRecipientQuantity" INTEGER,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "stockReserved" INTEGER NOT NULL DEFAULT 0,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "eventVenueLabel" TEXT,
    "eventAddress" TEXT,
    "eventDateLabel" TEXT,
    "eventTimeLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReusableShopProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReusableShopSizeOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "sku" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "weight" DECIMAL(10,3),
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "stockReserved" INTEGER NOT NULL DEFAULT 0,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "mealSelection" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReusableShopSizeOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReusableShopPurchaseMode" (
    "id" TEXT NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "modeId" TEXT NOT NULL,
    "sku" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "requiresPhysicalFulfillment" BOOLEAN NOT NULL DEFAULT false,
    "mealSelection" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReusableShopPurchaseMode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReusableShopProduct_catalogKey_productId_key" ON "ReusableShopProduct"("catalogKey", "productId");
CREATE INDEX "ReusableShopProduct_catalogKey_active_sortOrder_idx" ON "ReusableShopProduct"("catalogKey", "active", "sortOrder");
CREATE INDEX "ReusableShopProduct_sku_idx" ON "ReusableShopProduct"("sku");

CREATE UNIQUE INDEX "ReusableShopSizeOption_productId_optionId_key" ON "ReusableShopSizeOption"("productId", "optionId");
CREATE INDEX "ReusableShopSizeOption_productId_active_sortOrder_idx" ON "ReusableShopSizeOption"("productId", "active", "sortOrder");
CREATE INDEX "ReusableShopSizeOption_sku_idx" ON "ReusableShopSizeOption"("sku");

CREATE UNIQUE INDEX "ReusableShopPurchaseMode_sizeOptionId_modeId_key" ON "ReusableShopPurchaseMode"("sizeOptionId", "modeId");
CREATE INDEX "ReusableShopPurchaseMode_sizeOptionId_active_sortOrder_idx" ON "ReusableShopPurchaseMode"("sizeOptionId", "active", "sortOrder");
CREATE INDEX "ReusableShopPurchaseMode_sku_idx" ON "ReusableShopPurchaseMode"("sku");

ALTER TABLE "ReusableShopSizeOption" ADD CONSTRAINT "ReusableShopSizeOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ReusableShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReusableShopPurchaseMode" ADD CONSTRAINT "ReusableShopPurchaseMode_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "ReusableShopSizeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
