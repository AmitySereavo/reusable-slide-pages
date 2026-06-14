CREATE TABLE "UserPurchasedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPurchasedItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPurchasedItem_userId_itemKey_key" ON "UserPurchasedItem"("userId", "itemKey");
CREATE INDEX "UserPurchasedItem_userId_status_idx" ON "UserPurchasedItem"("userId", "status");
CREATE INDEX "UserPurchasedItem_itemKey_status_idx" ON "UserPurchasedItem"("itemKey", "status");

ALTER TABLE "UserPurchasedItem" ADD CONSTRAINT "UserPurchasedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
