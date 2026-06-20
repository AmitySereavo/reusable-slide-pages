CREATE TABLE "StoreCreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreGiftClaim" (
    "id" TEXT NOT NULL,
    "purchaserUserId" TEXT,
    "recipientUserId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "lineKey" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimToken" TEXT NOT NULL,
    "claimUrl" TEXT,
    "claimBy" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "orderSource" TEXT,
    "orderSourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreGiftClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreCreditLedgerEntry_userId_currencyCode_createdAt_idx" ON "StoreCreditLedgerEntry"("userId", "currencyCode", "createdAt");
CREATE INDEX "StoreCreditLedgerEntry_source_sourceId_idx" ON "StoreCreditLedgerEntry"("source", "sourceId");

CREATE UNIQUE INDEX "StoreGiftClaim_claimToken_key" ON "StoreGiftClaim"("claimToken");
CREATE INDEX "StoreGiftClaim_purchaserUserId_status_idx" ON "StoreGiftClaim"("purchaserUserId", "status");
CREATE INDEX "StoreGiftClaim_recipientEmail_status_idx" ON "StoreGiftClaim"("recipientEmail", "status");
CREATE INDEX "StoreGiftClaim_claimBy_status_idx" ON "StoreGiftClaim"("claimBy", "status");

ALTER TABLE "StoreCreditLedgerEntry" ADD CONSTRAINT "StoreCreditLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreGiftClaim" ADD CONSTRAINT "StoreGiftClaim_purchaserUserId_fkey" FOREIGN KEY ("purchaserUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoreGiftClaim" ADD CONSTRAINT "StoreGiftClaim_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
