import {
  DiscountDefinition,
  DiscountedOrderSummary,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ShopCart,
  ShopCartLine,
  ShopCatalog,
  ShopCatalogProduct,
  ShopCatalogSizeOption,
  ShopPurchaseMode,
  ShopResolvedCartLine,
} from "@/types/questionnaire";

export function getShopCatalog(
  variables: QuestionnaireVariableMap,
  catalogKey: string | undefined
): ShopCatalog | null {
  if (!catalogKey) return null;

  const rawValue = variables[catalogKey];
  if (!rawValue || Array.isArray(rawValue) || typeof rawValue !== "object") {
    return null;
  }

  const record = rawValue as Record<string, QuestionnaireVariableValue>;
  const productsValue = record.products;

  if (!Array.isArray(productsValue)) {
    return null;
  }

  const products = productsValue
    .map(normalizeShopProduct)
    .filter(Boolean) as ShopCatalogProduct[];

  return {
    currencyCode:
      typeof record.currencyCode === "string" ? record.currencyCode : undefined,
    weightUnit:
      typeof record.weightUnit === "string" ? record.weightUnit : undefined,
    products,
  };
}

export function normalizeDiscountDefinitions(
  variables: QuestionnaireVariableMap,
  discountKey: string | undefined
): DiscountDefinition[] {
  if (!discountKey) return [];

  const rawValue = variables[discountKey];
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map(normalizeDiscountDefinition)
    .filter(Boolean) as DiscountDefinition[];
}

export function getDiscountDefinitionByCode(
  definitions: DiscountDefinition[],
  code: string | undefined
): DiscountDefinition | null {
  if (!code) return null;

  const normalizedCode = code.trim().toUpperCase();

  return (
    definitions.find(
      (definition) =>
        definition.active && definition.code.trim().toUpperCase() === normalizedCode
    ) ?? null
  );
}

export function applyDiscountToShopLines(
  lines: ShopResolvedCartLine[],
  discount: DiscountDefinition | null
): ShopResolvedCartLine[] {
  if (!discount?.active || !lines.length) {
    return lines.map((line) => ({
      ...line,
      baseUnitPrice: line.baseUnitPrice ?? line.unitPrice,
      baseLineTotal: line.baseLineTotal ?? line.lineTotal,
    }));
  }

  const eligibleLines = getEligibleLines(lines, discount);

  if (!eligibleLines.length) {
    return lines.map((line) => ({
      ...line,
      baseUnitPrice: line.baseUnitPrice ?? line.unitPrice,
      baseLineTotal: line.baseLineTotal ?? line.lineTotal,
    }));
  }

    if (discount.type === "percentage") {
      return lines.map((line) => {
        const isEligible = eligibleLines.some(
          (eligible) => eligible.lineKey === line.lineKey
        );

        const baseLineTotal = line.lineTotal;
        const baseUnitPrice = line.unitPrice;

        if (!isEligible) {
          return {
            ...line,
            baseUnitPrice,
            baseLineTotal,
          };
        }

        const eligibleQuantity = Math.max(1, line.quantity);
        const discountedQuantity =
          discount.code === "QUESTIONNAIRE_PROMO" ? 1 : eligibleQuantity;

        const eligibleBaseAmount = roundMoney(baseUnitPrice * discountedQuantity);

        const lineDiscount = clampMoney(
          roundMoney((eligibleBaseAmount * discount.amount) / 100),
          0,
          baseLineTotal
        );

        const nextLineTotal = clampMoney(baseLineTotal - lineDiscount, 0, baseLineTotal);
        const unitDiscount = roundMoney(lineDiscount / Math.max(1, line.quantity));
        const nextUnitPrice = roundMoney(nextLineTotal / Math.max(1, line.quantity));

        return {
          ...line,
          unitPrice: nextUnitPrice,
          lineTotal: nextLineTotal,
          baseUnitPrice,
          baseLineTotal,
          unitDiscount,
          lineDiscount,
          discountCode: discount.code,
          discountLabel: discount.label,
        };
      });
    }

  const totalEligibleAmount = eligibleLines.reduce(
    (sum, line) => sum + line.lineTotal,
    0
  );

  if (totalEligibleAmount <= 0) {
    return lines.map((line) => ({
      ...line,
      baseUnitPrice: line.baseUnitPrice ?? line.unitPrice,
      baseLineTotal: line.baseLineTotal ?? line.lineTotal,
    }));
  }

  const maxDiscount = clampMoney(discount.amount, 0, totalEligibleAmount);
  let remainingDiscount = maxDiscount;
  let remainingEligibleBase = totalEligibleAmount;

  return lines.map((line) => {
    const isEligible = eligibleLines.some(
      (eligible) => eligible.lineKey === line.lineKey
    );

    const baseLineTotal = line.lineTotal;
    const baseUnitPrice = line.unitPrice;

    if (!isEligible) {
      return {
        ...line,
        baseUnitPrice,
        baseLineTotal,
      };
    }

    const isLastEligible =
      eligibleLines.filter((eligible) => eligible.lineKey >= line.lineKey).length === 1;

    let lineDiscount = 0;

    if (remainingDiscount > 0 && remainingEligibleBase > 0) {
      if (isLastEligible) {
        lineDiscount = remainingDiscount;
      } else {
        lineDiscount = roundMoney(
          (baseLineTotal / remainingEligibleBase) * remainingDiscount
        );
      }
    }

    lineDiscount = clampMoney(lineDiscount, 0, baseLineTotal);
    remainingDiscount = clampMoney(remainingDiscount - lineDiscount, 0, maxDiscount);
    remainingEligibleBase = clampMoney(
      remainingEligibleBase - baseLineTotal,
      0,
      totalEligibleAmount
    );

    const nextLineTotal = clampMoney(baseLineTotal - lineDiscount, 0, baseLineTotal);
    const unitDiscount = roundMoney(lineDiscount / Math.max(1, line.quantity));
    const nextUnitPrice = roundMoney(nextLineTotal / Math.max(1, line.quantity));

    return {
      ...line,
      unitPrice: nextUnitPrice,
      lineTotal: nextLineTotal,
      baseUnitPrice,
      baseLineTotal,
      unitDiscount,
      lineDiscount,
      discountCode: discount.code,
      discountLabel: discount.label,
    };
  });
}

export function summarizeDiscountedOrder(
  lines: ShopResolvedCartLine[],
  deliveryFee: number
): DiscountedOrderSummary {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discountTotal = lines.reduce(
    (sum, line) => sum + (line.lineDiscount ?? 0),
    0
  );

  return {
    subtotal,
    discountTotal,
    deliveryFee,
    grandTotal: subtotal + deliveryFee,
  };
}

export function makeShopLineKey(productId: string, sizeOptionId: string) {
  return `${productId}::${sizeOptionId}`;
}

export function normalizeShopCart(input: unknown): ShopCart {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>);
  const normalized: ShopCart = {};

  for (const [key, value] of entries) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const raw = value as Record<string, unknown>;
    const productId =
      typeof raw.productId === "string" ? raw.productId : undefined;
    const sizeOptionId =
      typeof raw.sizeOptionId === "string" ? raw.sizeOptionId : undefined;

    if (!productId || !sizeOptionId) {
      continue;
    }

    const quantity = normalizePositiveInteger(raw.quantity, 1);
    const selected = raw.selected === true;
    const purchaseModeId =
      typeof raw.purchaseModeId === "string" ? raw.purchaseModeId : undefined;

    normalized[key] = {
      productId,
      sizeOptionId,
      selected,
      quantity,
      purchaseModeId,
    };
  }

  return normalized;
}

export function toggleShopLineSelected(
  cart: ShopCart,
  catalog: ShopCatalog | null,
  productId: string,
  sizeOptionId: string,
  selected: boolean
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];
  const sizeOption = findShopSizeOption(catalog, productId, sizeOptionId);
  const defaultPurchaseModeId = getDefaultPurchaseModeId(sizeOption);

  const nextLine: ShopCartLine = {
    productId,
    sizeOptionId,
    selected,
    quantity: normalizePositiveInteger(current?.quantity, 1),
    purchaseModeId: current?.purchaseModeId ?? defaultPurchaseModeId,
  };

  return {
    ...cart,
    [key]: nextLine,
  };
}

export function setShopLineQuantity(
  cart: ShopCart,
  productId: string,
  sizeOptionId: string,
  quantity: number
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];

  return {
    ...cart,
    [key]: {
      productId,
      sizeOptionId,
      selected: current?.selected ?? true,
      quantity: normalizePositiveInteger(quantity, 1),
      purchaseModeId: current?.purchaseModeId,
    },
  };
}

export function setShopLinePurchaseMode(
  cart: ShopCart,
  productId: string,
  sizeOptionId: string,
  purchaseModeId?: string
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];

  return {
    ...cart,
    [key]: {
      productId,
      sizeOptionId,
      selected: current?.selected ?? true,
      quantity: normalizePositiveInteger(current?.quantity, 1),
      purchaseModeId,
    },
  };
}

export function removeShopLine(
  cart: ShopCart,
  productId: string,
  sizeOptionId: string
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const next = { ...cart };
  delete next[key];
  return next;
}

export function resolveShopSelectedLines(
  catalog: ShopCatalog | null,
  cart: ShopCart
): ShopResolvedCartLine[] {
  if (!catalog) return [];

  const lines = Object.entries(cart)
    .map(([lineKey, cartLine]) => resolveShopLine(catalog, lineKey, cartLine))
    .filter(Boolean) as ShopResolvedCartLine[];

  return lines.filter((line) => line.quantity > 0);
}

export function getShopCartTotal(
  catalog: ShopCatalog | null,
  cart: ShopCart
): number {
  return resolveShopSelectedLines(catalog, cart).reduce(
    (sum, line) => sum + line.lineTotal,
    0
  );
}

export function getShopCartTotalWeight(
  catalog: ShopCatalog | null,
  cart: ShopCart
): number {
  return resolveShopSelectedLines(catalog, cart).reduce(
    (sum, line) => sum + (line.lineWeight ?? 0),
    0
  );
}

export function findShopProduct(
  catalog: ShopCatalog | null,
  productId: string
): ShopCatalogProduct | undefined {
  return catalog?.products.find((product) => product.id === productId);
}

export function findShopSizeOption(
  catalog: ShopCatalog | null,
  productId: string,
  sizeOptionId: string
): ShopCatalogSizeOption | undefined {
  return findShopProduct(catalog, productId)?.sizeOptions.find(
    (sizeOption) => sizeOption.id === sizeOptionId
  );
}

export function getDefaultPurchaseModeId(
  sizeOption: ShopCatalogSizeOption | undefined
): string | undefined {
  return sizeOption?.purchaseModes?.[0]?.id;
}

function resolveShopLine(
  catalog: ShopCatalog,
  lineKey: string,
  line: ShopCartLine
): ShopResolvedCartLine | null {
  if (!line.selected || line.quantity <= 0) {
    return null;
  }

  const product = findShopProduct(catalog, line.productId);
  const sizeOption = product?.sizeOptions.find(
    (item) => item.id === line.sizeOptionId
  );

  if (!product || !sizeOption) {
    return null;
  }

  const purchaseMode = resolvePurchaseMode(sizeOption, line.purchaseModeId);
  const unitPrice = sizeOption.price + (purchaseMode?.priceAdjustment ?? 0);
  const quantity = normalizePositiveInteger(line.quantity, 1);
  const unitWeight =
    typeof sizeOption.weight === "number" && Number.isFinite(sizeOption.weight)
      ? sizeOption.weight
      : undefined;

  return {
    lineKey,
    productId: product.id,
    productTitle: product.title,
    productImageUrl: product.imageUrl,
    sizeOptionId: sizeOption.id,
    sizeLabel: sizeOption.label,
    quantity,
    purchaseModeId: purchaseMode?.id,
    purchaseModeLabel: purchaseMode?.label,
    unitPrice,
    lineTotal: unitPrice * quantity,
    unitWeight,
    lineWeight: unitWeight !== undefined ? unitWeight * quantity : undefined,
  };
}

function resolvePurchaseMode(
  sizeOption: ShopCatalogSizeOption,
  purchaseModeId?: string
): ShopPurchaseMode | undefined {
  if (!sizeOption.purchaseModes?.length) {
    return undefined;
  }

  return (
    sizeOption.purchaseModes.find((mode) => mode.id === purchaseModeId) ??
    sizeOption.purchaseModes[0]
  );
}

function normalizeDiscountDefinition(
  input: QuestionnaireVariableValue
): DiscountDefinition | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;

  const code = typeof record.code === "string" ? record.code.trim().toUpperCase() : "";
  const label = typeof record.label === "string" ? record.label : "";
  const active = record.active === true;
  const type =
    record.type === "percentage" || record.type === "fixed_amount"
      ? record.type
      : undefined;
  const scope =
    record.scope === "order" ||
    record.scope === "product" ||
    record.scope === "size_option"
      ? record.scope
      : undefined;
  const amount =
    typeof record.amount === "number" && Number.isFinite(record.amount)
      ? record.amount
      : undefined;

  const productIds = Array.isArray(record.productIds)
    ? record.productIds.filter((value): value is string => typeof value === "string")
    : undefined;

  const sizeOptionIds = Array.isArray(record.sizeOptionIds)
    ? record.sizeOptionIds.filter((value): value is string => typeof value === "string")
    : undefined;

  if (!code || !label || !type || !scope || amount === undefined) {
    return null;
  }

  return {
    code,
    label,
    active,
    type,
    scope,
    amount,
    productIds: productIds?.length ? productIds : undefined,
    sizeOptionIds: sizeOptionIds?.length ? sizeOptionIds : undefined,
  };
}

function getEligibleLines(
  lines: ShopResolvedCartLine[],
  discount: DiscountDefinition
) {
  if (discount.scope === "order") {
    return lines;
  }

  if (discount.scope === "product") {
    const allowedProductIds = new Set(discount.productIds ?? []);
    return lines.filter((line) => allowedProductIds.has(line.productId));
  }

  const allowedSizeOptionIds = new Set(discount.sizeOptionIds ?? []);
  return lines.filter((line) => allowedSizeOptionIds.has(line.sizeOptionId));
}

function normalizeShopProduct(
  input: QuestionnaireVariableValue
): ShopCatalogProduct | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const id = typeof record.id === "string" ? record.id : undefined;
  const title = typeof record.title === "string" ? record.title : undefined;
  const imageUrl =
    typeof record.imageUrl === "string" ? record.imageUrl : undefined;
  const description =
    typeof record.description === "string" ? record.description : undefined;
  const sizeOptionsValue = record.sizeOptions;

  if (!id || !title || !Array.isArray(sizeOptionsValue)) {
    return null;
  }

  const sizeOptions = sizeOptionsValue
    .map(normalizeShopSizeOption)
    .filter(Boolean) as ShopCatalogSizeOption[];

  return {
    id,
    title,
    imageUrl,
    description,
    sizeOptions,
  };
}

function normalizeShopSizeOption(
  input: QuestionnaireVariableValue
): ShopCatalogSizeOption | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const id = typeof record.id === "string" ? record.id : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const price =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? record.price
      : undefined;
  const weight =
    typeof record.weight === "number" && Number.isFinite(record.weight)
      ? record.weight
      : undefined;
  const purchaseModesValue = record.purchaseModes;

  if (!id || !label || price === undefined) {
    return null;
  }

  const purchaseModes = Array.isArray(purchaseModesValue)
    ? purchaseModesValue
        .map(normalizeShopPurchaseMode)
        .filter(Boolean) as ShopPurchaseMode[]
    : undefined;

  return {
    id,
    label,
    price,
    weight,
    purchaseModes: purchaseModes?.length ? purchaseModes : undefined,
  };
}

function normalizeShopPurchaseMode(
  input: QuestionnaireVariableValue
): ShopPurchaseMode | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const id = typeof record.id === "string" ? record.id : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const priceAdjustment =
    typeof record.priceAdjustment === "number" &&
    Number.isFinite(record.priceAdjustment)
      ? record.priceAdjustment
      : undefined;

  if (!id || !label || priceAdjustment === undefined) {
    return null;
  }

  return {
    id,
    label,
    priceAdjustment,
  };
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

function roundMoney(value: number) {
  return Math.round(value);
}

function clampMoney(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, roundMoney(value)));
}