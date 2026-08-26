INSERT INTO "CurrencyExchangeRate" (
  "id",
  "baseCurrencyCode",
  "quoteCurrencyCode",
  "rate",
  "source",
  "autoUpdateEnabled",
  "createdAt",
  "updatedAt"
)
VALUES (
  'currency-usd-cad',
  'USD',
  'CAD',
  1.36,
  'manual',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("baseCurrencyCode", "quoteCurrencyCode") DO NOTHING;
