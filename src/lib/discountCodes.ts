import { Prisma } from "@prisma/client";

type DbClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  $queryRaw: <T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>;
};

export type DiscountCodeInput = {
  id?: string;
  code?: string;
  label?: string;
  active?: boolean;
  discountType?: string;
  discountValue?: number;
  currencyCode?: string;
  minimumSpend?: number;
  appliesTo?: string;
  shopKeys?: string[];
  productKeys?: string[];
  customerEmails?: string[];
  customerPhones?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  perPersonLimit?: number | null;
};

export type DiscountOrderLine = {
  productId?: string | null;
  productSku?: string | null;
  productTitle?: string | null;
  sizeOptionId?: string | null;
  sizeOptionSku?: string | null;
  sizeLabel?: string | null;
  purchaseModeId?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  discountType: string;
  discountValue: Prisma.Decimal | number | string;
  currencyCode: string | null;
  minimumSpend: Prisma.Decimal | number | string | null;
  appliesTo: string;
  shopKeys: unknown;
  productKeys: unknown;
  customerEmails: unknown;
  customerPhones: unknown;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  maxUses: number | null;
  perPersonLimit: number;
  metadata: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const DISCOUNT_TYPES = new Set(["fixed_amount", "percentage"]);
const APPLIES_TO = new Set(["whole_cart", "specific_products"]);

export function normalizeDiscountCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function normalizePhoneKey(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeEmailKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function ensureDiscountCodeTables(db: DbClient) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShopDiscountCode" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "code" TEXT NOT NULL UNIQUE,
      "label" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT TRUE,
      "discountType" TEXT NOT NULL DEFAULT 'fixed_amount',
      "discountValue" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      "currencyCode" TEXT NOT NULL DEFAULT 'JMD',
      "minimumSpend" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      "appliesTo" TEXT NOT NULL DEFAULT 'whole_cart',
      "shopKeys" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "productKeys" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "customerEmails" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "customerPhones" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "startsAt" TIMESTAMPTZ,
      "endsAt" TIMESTAMPTZ,
      "maxUses" INTEGER,
      "perPersonLimit" INTEGER NOT NULL DEFAULT 1,
      "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "ShopDiscountCode"
    ADD COLUMN IF NOT EXISTS "currencyCode" TEXT NOT NULL DEFAULT 'JMD'
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "ShopDiscountCode"
    ADD COLUMN IF NOT EXISTS "minimumSpend" DECIMAL(10, 2) NOT NULL DEFAULT 0
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShopDiscountCodeRedemption" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "discountCodeId" TEXT NOT NULL REFERENCES "ShopDiscountCode"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL,
      "orderCode" TEXT,
      "shopKey" TEXT,
      "customerEmail" TEXT,
      "customerPhone" TEXT,
      "discountAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      "cartSubtotal" DECIMAL(10, 2) NOT NULL DEFAULT 0,
      "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopDiscountCode_active_code_idx"
    ON "ShopDiscountCode" ("active", "code")
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopDiscountCodeRedemption_code_person_idx"
    ON "ShopDiscountCodeRedemption" ("discountCodeId", "customerEmail", "customerPhone")
  `);
}

export async function listDiscountCodes(db: DbClient) {
  await ensureDiscountCodeTables(db);

  const rows = await db.$queryRaw<DiscountCodeRow[]>`
    SELECT
      d.*,
      COALESCE(r."useCount", 0)::int AS "useCount"
    FROM "ShopDiscountCode" d
    LEFT JOIN (
      SELECT "discountCodeId", COUNT(*) AS "useCount"
      FROM "ShopDiscountCodeRedemption"
      GROUP BY "discountCodeId"
    ) r ON r."discountCodeId" = d."id"
    ORDER BY d."createdAt" DESC
  `;

  return rows.map(serializeDiscountCode);
}

export async function saveDiscountCode(db: DbClient, input: DiscountCodeInput) {
  await ensureDiscountCodeTables(db);

  const code = normalizeDiscountCode(input.code);
  const discountType = DISCOUNT_TYPES.has(String(input.discountType))
    ? String(input.discountType)
    : "fixed_amount";
  const appliesTo = APPLIES_TO.has(String(input.appliesTo))
    ? String(input.appliesTo)
    : "whole_cart";
  const discountValue = normalizePositiveNumber(input.discountValue);
  const currencyCode = normalizeCurrencyCode(input.currencyCode);
  const minimumSpend = normalizeNonNegativeNumber(input.minimumSpend);
  const perPersonLimit = Math.max(0, Math.floor(Number(input.perPersonLimit ?? 1)));
  const maxUses =
    input.maxUses === null || input.maxUses === undefined || input.maxUses === ("" as unknown)
      ? null
      : Math.max(0, Math.floor(Number(input.maxUses)));

  if (!code) {
    throw new Error("Enter a discount code.");
  }

  if (discountValue <= 0) {
    throw new Error("Enter a discount amount greater than zero.");
  }

  const shopKeys = normalizeStringList(input.shopKeys);
  const productKeys = normalizeStringList(input.productKeys).map((item) =>
    item.toUpperCase()
  );
  const customerEmails = normalizeStringList(input.customerEmails).map(
    normalizeEmailKey
  );
  const customerPhones = normalizeStringList(input.customerPhones).map(
    normalizePhoneKey
  );
  const startsAt = normalizeOptionalDate(input.startsAt);
  const endsAt = normalizeOptionalDate(input.endsAt);

  if (input.id) {
    const rows = await db.$queryRaw<DiscountCodeRow[]>`
      UPDATE "ShopDiscountCode"
      SET
        "code" = ${code},
        "label" = ${cleanText(input.label) || null},
        "active" = ${input.active !== false},
        "discountType" = ${discountType},
        "discountValue" = ${discountValue},
        "currencyCode" = ${currencyCode},
        "minimumSpend" = ${minimumSpend},
        "appliesTo" = ${appliesTo},
        "shopKeys" = ${JSON.stringify(shopKeys)}::jsonb,
        "productKeys" = ${JSON.stringify(productKeys)}::jsonb,
        "customerEmails" = ${JSON.stringify(customerEmails)}::jsonb,
        "customerPhones" = ${JSON.stringify(customerPhones)}::jsonb,
        "startsAt" = ${startsAt},
        "endsAt" = ${endsAt},
        "maxUses" = ${maxUses},
        "perPersonLimit" = ${perPersonLimit},
        "updatedAt" = now()
      WHERE "id" = ${input.id}
      RETURNING *
    `;

    return serializeDiscountCode(rows[0]);
  }

  const rows = await db.$queryRaw<DiscountCodeRow[]>`
    INSERT INTO "ShopDiscountCode" (
      "code",
      "label",
      "active",
      "discountType",
      "discountValue",
      "currencyCode",
      "minimumSpend",
      "appliesTo",
      "shopKeys",
      "productKeys",
      "customerEmails",
      "customerPhones",
      "startsAt",
      "endsAt",
      "maxUses",
      "perPersonLimit"
    )
    VALUES (
      ${code},
      ${cleanText(input.label) || null},
      ${input.active !== false},
      ${discountType},
      ${discountValue},
      ${currencyCode},
      ${minimumSpend},
      ${appliesTo},
      ${JSON.stringify(shopKeys)}::jsonb,
      ${JSON.stringify(productKeys)}::jsonb,
      ${JSON.stringify(customerEmails)}::jsonb,
      ${JSON.stringify(customerPhones)}::jsonb,
      ${startsAt},
      ${endsAt},
      ${maxUses},
      ${perPersonLimit}
    )
    RETURNING *
  `;

  return serializeDiscountCode(rows[0]);
}

export async function evaluateDiscountCode({
  db,
  code,
  shopKey,
  lines,
  customerEmail,
  customerPhone,
  currencyCode = "JMD",
}: {
  db: DbClient;
  code: unknown;
  shopKey: string;
  lines: DiscountOrderLine[];
  customerEmail?: string;
  customerPhone?: string;
  currencyCode?: string;
}) {
  await ensureDiscountCodeTables(db);

  const normalizedCode = normalizeDiscountCode(code);
  const emailKey = normalizeEmailKey(customerEmail);
  const phoneKey = normalizePhoneKey(customerPhone);
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0)
  );

  if (!normalizedCode) {
    return { ok: true, applied: false, discountAmount: 0, subtotal };
  }

  const rows = await db.$queryRaw<DiscountCodeRow[]>`
    SELECT * FROM "ShopDiscountCode"
    WHERE "code" = ${normalizedCode}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row || !row.active) {
    return invalidDiscount("That discount code is not active.", subtotal);
  }

  const shopKeys = asStringArray(row.shopKeys);
  if (shopKeys.length && !shopKeys.includes(shopKey)) {
    return invalidDiscount("That discount code is not available for this shop.", subtotal);
  }

  const now = Date.now();
  if (row.startsAt && new Date(row.startsAt).getTime() > now) {
    return invalidDiscount("That discount code is not active yet.", subtotal);
  }
  if (row.endsAt && new Date(row.endsAt).getTime() < now) {
    return invalidDiscount("That discount code has expired.", subtotal);
  }

  const orderCurrencyCode = normalizeCurrencyCode(currencyCode);
  const discountCurrencyCode = normalizeCurrencyCode(row.currencyCode);
  if (discountCurrencyCode && discountCurrencyCode !== orderCurrencyCode) {
    return invalidDiscount(
      `That discount code is for ${discountCurrencyCode}, but this order is in ${orderCurrencyCode}.`,
      subtotal
    );
  }

  const customerEmails = asStringArray(row.customerEmails).map(normalizeEmailKey);
  const customerPhones = asStringArray(row.customerPhones).map(normalizePhoneKey);
  if (
    customerEmails.length &&
    (!emailKey || !customerEmails.includes(emailKey))
  ) {
    return invalidDiscount("That discount code is not assigned to this email address.", subtotal);
  }
  if (
    customerPhones.length &&
    (!phoneKey || !customerPhones.includes(phoneKey))
  ) {
    return invalidDiscount("That discount code is not assigned to this phone number.", subtotal);
  }

  const useRows = await db.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) AS count
    FROM "ShopDiscountCodeRedemption"
    WHERE "discountCodeId" = ${row.id}
  `;
  const useCount = Number(useRows[0]?.count ?? 0);
  if (row.maxUses !== null && useCount >= Number(row.maxUses)) {
    return invalidDiscount("That discount code has reached its usage limit.", subtotal);
  }

  const perPersonLimit = Number(row.perPersonLimit ?? 1);
  if (perPersonLimit > 0 && (emailKey || phoneKey)) {
    const personRows = await db.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*) AS count
      FROM "ShopDiscountCodeRedemption"
      WHERE "discountCodeId" = ${row.id}
      AND (
        (${emailKey || null}::text IS NOT NULL AND "customerEmail" = ${emailKey || null})
        OR (${phoneKey || null}::text IS NOT NULL AND "customerPhone" = ${phoneKey || null})
      )
    `;
    const personCount = Number(personRows[0]?.count ?? 0);
    if (personCount >= perPersonLimit) {
      return invalidDiscount("That discount code has already been used for this customer.", subtotal);
    }
  }

  const productKeys = asStringArray(row.productKeys).map((item) =>
    item.toUpperCase()
  );
  const eligibleLines =
    row.appliesTo === "specific_products"
      ? lines.filter((line) => lineMatchesProductKeys(line, productKeys))
      : lines;
  const eligibleSubtotal = roundMoney(
    eligibleLines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0)
  );

  if (eligibleSubtotal <= 0) {
    return invalidDiscount("That discount code does not match anything in this cart.", subtotal);
  }

  const minimumSpend = Number(row.minimumSpend || 0);
  if (minimumSpend > 0 && eligibleSubtotal < minimumSpend) {
    return invalidDiscount(
      `This discount requires at least ${discountCurrencyCode} ${minimumSpend.toLocaleString()} in eligible spending.`,
      subtotal
    );
  }

  const rawValue = Number(row.discountValue || 0);
  const discountAmount =
    row.discountType === "percentage"
      ? roundMoney(eligibleSubtotal * Math.min(rawValue, 100) * 0.01)
      : roundMoney(Math.min(rawValue, eligibleSubtotal));

  if (discountAmount <= 0) {
    return invalidDiscount("That discount code does not change this cart total.", subtotal);
  }

  return {
    ok: true,
    applied: true,
    id: row.id,
    code: row.code,
    label: row.label || row.code,
    discountType: row.discountType,
    discountValue: rawValue,
    currencyCode: discountCurrencyCode,
    minimumSpend,
    discountAmount,
    subtotal,
    eligibleSubtotal,
    total: roundMoney(Math.max(0, subtotal - discountAmount)),
  };
}

export async function recordDiscountRedemption({
  db,
  discountCodeId,
  code,
  orderCode,
  shopKey,
  customerEmail,
  customerPhone,
  discountAmount,
  cartSubtotal,
  metadata = {},
}: {
  db: DbClient;
  discountCodeId: string;
  code: string;
  orderCode: string;
  shopKey: string;
  customerEmail?: string;
  customerPhone?: string;
  discountAmount: number;
  cartSubtotal: number;
  metadata?: Record<string, unknown>;
}) {
  await ensureDiscountCodeTables(db);

  await db.$queryRaw`
    INSERT INTO "ShopDiscountCodeRedemption" (
      "discountCodeId",
      "code",
      "orderCode",
      "shopKey",
      "customerEmail",
      "customerPhone",
      "discountAmount",
      "cartSubtotal",
      "metadata"
    )
    VALUES (
      ${discountCodeId},
      ${normalizeDiscountCode(code)},
      ${orderCode},
      ${shopKey},
      ${normalizeEmailKey(customerEmail) || null},
      ${normalizePhoneKey(customerPhone) || null},
      ${roundMoney(discountAmount)},
      ${roundMoney(cartSubtotal)},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}

function serializeDiscountCode(row: DiscountCodeRow & { useCount?: number }) {
  return {
    id: row.id,
    code: row.code,
    label: row.label || "",
    active: row.active,
    discountType: row.discountType,
    discountValue: Number(row.discountValue || 0),
    currencyCode: normalizeCurrencyCode(row.currencyCode),
    minimumSpend: Number(row.minimumSpend || 0),
    appliesTo: row.appliesTo,
    shopKeys: asStringArray(row.shopKeys),
    productKeys: asStringArray(row.productKeys),
    customerEmails: asStringArray(row.customerEmails),
    customerPhones: asStringArray(row.customerPhones),
    startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
    endsAt: row.endsAt ? new Date(row.endsAt).toISOString() : null,
    maxUses: row.maxUses,
    perPersonLimit: row.perPersonLimit,
    useCount: Number(row.useCount ?? 0),
    metadata: row.metadata || {},
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function lineMatchesProductKeys(line: DiscountOrderLine, productKeys: string[]) {
  if (!productKeys.length) return false;

  const keys = [
    line.productId,
    line.productSku,
    line.sizeOptionId,
    line.sizeOptionSku,
    line.purchaseModeId,
    line.sku,
    line.productTitle,
    `${line.productTitle || ""} - ${line.sizeLabel || ""}`,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toUpperCase());

  return keys.some((key) => productKeys.includes(key));
}

function invalidDiscount(error: string, subtotal: number) {
  return {
    ok: false,
    applied: false,
    error,
    discountAmount: 0,
    subtotal,
    total: subtotal,
  };
}

function normalizePositiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? roundMoney(number) : 0;
}

function normalizeNonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? roundMoney(number) : 0;
}

function normalizeCurrencyCode(value: unknown) {
  const code = String(value || "JMD").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return code || "JMD";
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[\n,]/)
        .map((item) => item.trim());

  return Array.from(
    new Set(
      source
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeOptionalDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}
