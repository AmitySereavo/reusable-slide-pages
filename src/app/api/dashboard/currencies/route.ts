import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SUPPORTED_CURRENCIES,
  normalizeCurrencyCode,
} from "@/lib/currency/currencies";
import { DEFAULT_USD_RATES } from "@/lib/currency/rates";

export async function GET() {
  // Dev mode: dashboard currency settings are ungated while this admin surface
  // is being built. Restore main-admin auth before production launch.
  if (!("currencyExchangeRate" in prisma) || !prisma.currencyExchangeRate) {
    return NextResponse.json({
      baseCurrencyCode: "USD",
      supportedCurrencies: SUPPORTED_CURRENCIES,
      rates: getFallbackRows(),
      notice: "Using fallback rates until Prisma Client is refreshed.",
    });
  }

  const rows = await prisma.currencyExchangeRate.findMany({
    where: {
      baseCurrencyCode: "USD",
      quoteCurrencyCode: {
        in: [...SUPPORTED_CURRENCIES],
      },
    },
    orderBy: {
      quoteCurrencyCode: "asc",
    },
  });

  return NextResponse.json({
    baseCurrencyCode: "USD",
    supportedCurrencies: SUPPORTED_CURRENCIES,
    rates: rows,
  });
}

export async function POST(request: Request) {
  // Dev mode: dashboard currency settings are ungated while this admin surface
  // is being built. Restore main-admin auth before production launch.
  const body = await request.json().catch(() => null);
  const quoteCurrencyCode = normalizeCurrencyCode(body?.quoteCurrencyCode);
  const rate = Number(body?.rate);
  const autoUpdateEnabled = body?.autoUpdateEnabled === true;

  if (!("currencyExchangeRate" in prisma) || !prisma.currencyExchangeRate) {
    return NextResponse.json(
      { error: "Currency database model is not available. Restart the dev server after Prisma generation." },
      { status: 503 }
    );
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json(
      { error: "A positive exchange rate is required." },
      { status: 400 }
    );
  }

  const saved = await prisma.currencyExchangeRate.upsert({
    where: {
      baseCurrencyCode_quoteCurrencyCode: {
        baseCurrencyCode: "USD",
        quoteCurrencyCode,
      },
    },
    create: {
      baseCurrencyCode: "USD",
      quoteCurrencyCode,
      rate,
      source: "manual",
      autoUpdateEnabled,
      effectiveAt: new Date(),
    },
    update: {
      rate,
      source: "manual",
      autoUpdateEnabled,
      effectiveAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, rate: saved });
}

function getFallbackRows() {
  return SUPPORTED_CURRENCIES.map((quoteCurrencyCode) => ({
    id: `fallback-usd-${quoteCurrencyCode.toLowerCase()}`,
    baseCurrencyCode: "USD",
    quoteCurrencyCode,
    rate: DEFAULT_USD_RATES[quoteCurrencyCode],
    source: "fallback",
    autoUpdateEnabled: false,
    effectiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
