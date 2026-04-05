import {
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