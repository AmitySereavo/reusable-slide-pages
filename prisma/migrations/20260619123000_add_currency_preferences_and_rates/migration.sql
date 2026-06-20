ALTER TABLE "User" ADD COLUMN "preferredCurrencyCode" TEXT NOT NULL DEFAULT 'USD';

CREATE TABLE "CurrencyExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrencyCode" TEXT NOT NULL,
    "quoteCurrencyCode" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurrencyExchangeRate_baseCurrencyCode_quoteCurrencyCode_key" ON "CurrencyExchangeRate"("baseCurrencyCode", "quoteCurrencyCode");
CREATE INDEX "CurrencyExchangeRate_autoUpdateEnabled_idx" ON "CurrencyExchangeRate"("autoUpdateEnabled");

INSERT INTO "CurrencyExchangeRate" ("id", "baseCurrencyCode", "quoteCurrencyCode", "rate", "source", "autoUpdateEnabled", "effectiveAt", "createdAt", "updatedAt")
VALUES
  ('currency-usd-usd', 'USD', 'USD', 1, 'manual', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('currency-usd-jmd', 'USD', 'JMD', 155, 'manual', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('currency-usd-gbp', 'USD', 'GBP', 0.79, 'manual', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("baseCurrencyCode", "quoteCurrencyCode") DO NOTHING;
