import type {
  ShopCatalog,
  ShopCatalogProduct,
  ShopCatalogSizeOption,
} from "@/types/questionnaire";

export const SUPPORTED_CURRENCIES = ["USD", "JMD", "GBP", "CAD"] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeCurrencyCode(value: unknown): SupportedCurrencyCode {
  const normalized = String(value ?? "").trim().toUpperCase();

  return SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrencyCode)
    ? (normalized as SupportedCurrencyCode)
    : "USD";
}

export function convertMoney(amount: number, rate: number) {
  const parsedAmount = Number(amount);
  const parsedRate = Number(rate);

  if (!Number.isFinite(parsedAmount) || !Number.isFinite(parsedRate)) {
    return 0;
  }

  return Math.round(parsedAmount * parsedRate * 100) / 100;
}

export function convertShopCatalogCurrency(
  catalog: ShopCatalog | null,
  targetCurrencyCode: string,
  rate: number
): ShopCatalog | null {
  if (!catalog) {
    return null;
  }

  const sourceCurrencyCode = catalog.currencyCode ?? "USD";
  const normalizedTarget = normalizeCurrencyCode(targetCurrencyCode);

  if (sourceCurrencyCode === normalizedTarget) {
    return catalog;
  }

  const products = catalog.products.map((product): ShopCatalogProduct => ({
    ...product,
    sizeOptions: product.sizeOptions.map(
      (sizeOption): ShopCatalogSizeOption => ({
        ...sizeOption,
        price: convertMoney(sizeOption.price, rate),
        purchaseModes: sizeOption.purchaseModes?.map((mode) => ({
          ...mode,
          priceAdjustment: convertMoney(mode.priceAdjustment, rate),
          bundledCartItems: mode.bundledCartItems,
        })),
      })
    ),
  }));

  return {
    ...catalog,
    currencyCode: normalizedTarget,
    baseCurrencyCode: sourceCurrencyCode,
    exchangeRate: rate,
    products,
  };
}
