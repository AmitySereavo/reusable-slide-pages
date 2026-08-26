import { Prisma } from "@prisma/client";
import { getShopReceiptDefaults } from "@/config/shopIdentities";

export type ShopReceiptSetting = {
  shopKey: string;
  shopUrl: string;
  shopButtonLabel: string;
  promotionUrl: string;
  promotionButtonLabel: string;
  colors: Record<string, string>;
  updatedAt?: Date | string | null;
};

const defaultColors = {
  pageBackground: "#F6F0E3",
  panelBackground: "#FFFDF8",
  text: "#28231F",
  border: "#CDBEA7",
  accent: "#356E3B",
  primaryButtonBackground: "#356E3B",
  primaryButtonText: "#FFFFFF",
  promotionButtonBackground: "#7D4A21",
  promotionButtonText: "#FFFFFF",
  secondaryButtonBackground: "#FFFFFF",
  secondaryButtonText: "#356E3B",
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanColor(value: unknown, fallback: string) {
  const text = cleanText(value);
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(text) ? text : fallback;
}

function cleanUrl(value: unknown, fallback: string) {
  const text = cleanText(value);

  if (!text) return fallback;
  if (text.startsWith("/") || /^https?:\/\//i.test(text)) return text;

  return fallback;
}

function normalizeColors(input: unknown) {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.entries(defaultColors).map(([key, fallback]) => [
      key,
      cleanColor(record[key], fallback),
    ])
  );
}

export function resolveShopReceiptSetting(
  shopKey: string,
  override?: Partial<ShopReceiptSetting> | null
): ShopReceiptSetting {
  const defaults = getShopReceiptDefaults(shopKey);
  const defaultColorValues = {
    ...defaultColors,
    ...(defaults.colors || {}),
  };
  const colors = normalizeColors({
    ...defaultColorValues,
    ...(override?.colors || {}),
  });

  return {
    shopKey,
    shopUrl: cleanUrl(override?.shopUrl, defaults.shopUrl || "/shop"),
    shopButtonLabel:
      cleanText(override?.shopButtonLabel) ||
      defaults.shopButtonLabel ||
      "Visit shop",
    promotionUrl: cleanUrl(
      override?.promotionUrl,
      defaults.promotionUrl || "/gift"
    ),
    promotionButtonLabel:
      cleanText(override?.promotionButtonLabel) ||
      defaults.promotionButtonLabel ||
      "View current promotion",
    colors,
    updatedAt: override?.updatedAt || null,
  };
}

export async function ensureShopReceiptSettingsTable(db: any) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ShopReceiptSetting" (
      "shopKey" TEXT PRIMARY KEY,
      "shopUrl" TEXT NOT NULL DEFAULT '/shop',
      "shopButtonLabel" TEXT NOT NULL DEFAULT 'Visit shop',
      "promotionUrl" TEXT NOT NULL DEFAULT '/gift',
      "promotionButtonLabel" TEXT NOT NULL DEFAULT 'View current promotion',
      "colors" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "updatedByUserId" TEXT,
      "updatedByName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export async function getShopReceiptSetting(db: any, shopKey: string) {
  const cleanShopKey = cleanText(shopKey);

  if (!cleanShopKey) {
    return resolveShopReceiptSetting("little-orchard-shop");
  }

  await ensureShopReceiptSettingsTable(db);

  const rows: any[] = await db.$queryRaw(Prisma.sql`
    SELECT
      "shopKey",
      "shopUrl",
      "shopButtonLabel",
      "promotionUrl",
      "promotionButtonLabel",
      "colors",
      "updatedAt"
    FROM "ShopReceiptSetting"
    WHERE "shopKey" = ${cleanShopKey}
    LIMIT 1
  `);

  return resolveShopReceiptSetting(cleanShopKey, rows[0] || null);
}

export async function listShopReceiptSettings(db: any, shopKeys: string[]) {
  await ensureShopReceiptSettingsTable(db);

  const cleanShopKeys = Array.from(new Set(shopKeys.map(cleanText).filter(Boolean)));
  const rows: any[] = cleanShopKeys.length
    ? await db.$queryRaw(Prisma.sql`
        SELECT
          "shopKey",
          "shopUrl",
          "shopButtonLabel",
          "promotionUrl",
          "promotionButtonLabel",
          "colors",
          "updatedAt"
        FROM "ShopReceiptSetting"
        WHERE "shopKey" IN (${Prisma.join(cleanShopKeys)})
      `)
    : [];
  const byShop = new Map(rows.map((row) => [row.shopKey, row]));

  return cleanShopKeys.map((shopKey) =>
    resolveShopReceiptSetting(shopKey, byShop.get(shopKey) || null)
  );
}

export async function saveShopReceiptSetting({
  db,
  shopKey,
  input,
  updatedByUserId = null,
  updatedByName = null,
}: {
  db: any;
  shopKey: string;
  input: Record<string, unknown>;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
}) {
  const cleanShopKey = cleanText(shopKey);
  if (!cleanShopKey) {
    throw new Error("Choose a shop.");
  }

  await ensureShopReceiptSettingsTable(db);

  const setting = resolveShopReceiptSetting(cleanShopKey, {
    shopUrl: cleanText(input.shopUrl),
    shopButtonLabel: cleanText(input.shopButtonLabel),
    promotionUrl: cleanText(input.promotionUrl),
    promotionButtonLabel: cleanText(input.promotionButtonLabel),
    colors: normalizeColors(input.colors),
  });

  await db.$executeRaw`
    INSERT INTO "ShopReceiptSetting" (
      "shopKey",
      "shopUrl",
      "shopButtonLabel",
      "promotionUrl",
      "promotionButtonLabel",
      "colors",
      "updatedByUserId",
      "updatedByName",
      "updatedAt"
    )
    VALUES (
      ${setting.shopKey},
      ${setting.shopUrl},
      ${setting.shopButtonLabel},
      ${setting.promotionUrl},
      ${setting.promotionButtonLabel},
      ${JSON.stringify(setting.colors)}::jsonb,
      ${updatedByUserId},
      ${updatedByName},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("shopKey") DO UPDATE SET
      "shopUrl" = EXCLUDED."shopUrl",
      "shopButtonLabel" = EXCLUDED."shopButtonLabel",
      "promotionUrl" = EXCLUDED."promotionUrl",
      "promotionButtonLabel" = EXCLUDED."promotionButtonLabel",
      "colors" = EXCLUDED."colors",
      "updatedByUserId" = EXCLUDED."updatedByUserId",
      "updatedByName" = EXCLUDED."updatedByName",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  return getShopReceiptSetting(db, cleanShopKey);
}
