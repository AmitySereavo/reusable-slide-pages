ALTER TABLE "StoreCreditLedgerEntry" ADD COLUMN "creditType" TEXT NOT NULL DEFAULT 'RETURNED';

DROP INDEX IF EXISTS "StoreCreditLedgerEntry_userId_currencyCode_createdAt_idx";
CREATE INDEX "StoreCreditLedgerEntry_userId_currencyCode_creditType_createdAt_idx" ON "StoreCreditLedgerEntry"("userId", "currencyCode", "creditType", "createdAt");
