import { prisma } from "@/lib/prisma";
import {
  SUPPORTED_CURRENCIES,
  normalizeCurrencyCode,
  type SupportedCurrencyCode,
} from "./currencies";

export const DEFAULT_USD_RATES: Record<SupportedCurrencyCode, number> = {
  USD: 1,
  JMD: 155,
  GBP: 0.79,
  CAD: 1.36,
};

export async function getCurrencyRateMap(baseCurrencyCode = "USD") {
  const base = normalizeCurrencyCode(baseCurrencyCode);

  if (!("currencyExchangeRate" in prisma) || !prisma.currencyExchangeRate) {
    return getFallbackRateMap(base);
  }

  try {
    const rows = await prisma.currencyExchangeRate.findMany({
      where: {
        baseCurrencyCode: base,
        quoteCurrencyCode: {
          in: [...SUPPORTED_CURRENCIES],
        },
      },
    });

    const rates = getFallbackRateMap(base);

    for (const row of rows) {
      const quote = normalizeCurrencyCode(row.quoteCurrencyCode);
      rates[quote] = Number(row.rate);
    }

    rates[base] = 1;

    return rates;
  } catch (error) {
    console.warn("Currency rates could not be loaded. Using fallback rates.", error);
    return getFallbackRateMap(base);
  }
}

export async function getCurrencyRate(
  fromCurrencyCode = "USD",
  toCurrencyCode = "USD"
) {
  const from = normalizeCurrencyCode(fromCurrencyCode);
  const to = normalizeCurrencyCode(toCurrencyCode);

  if (from === to) {
    return 1;
  }

  if (from === "USD") {
    const rates = await getCurrencyRateMap("USD");
    return rates[to] || 1;
  }

  const usdRates = await getCurrencyRateMap("USD");
  const fromRate = usdRates[from] || 1;
  const toRate = usdRates[to] || 1;

  return toRate / fromRate;
}

function getFallbackRateMap(base: SupportedCurrencyCode) {
  if (base === "USD") {
    return { ...DEFAULT_USD_RATES };
  }

  const baseRate = DEFAULT_USD_RATES[base] || 1;

  return {
    USD: DEFAULT_USD_RATES.USD / baseRate,
    JMD: DEFAULT_USD_RATES.JMD / baseRate,
    GBP: DEFAULT_USD_RATES.GBP / baseRate,
    CAD: DEFAULT_USD_RATES.CAD / baseRate,
  };
}
