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
  FulfillmentType,
  ShopMealSelectionRequirement,
  ShopPurchaseMode,
  ShopPurchaseRecipient,
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

    const selected = raw.selected === true;
    const availabilityStatus =
      raw.availabilityStatus === "unavailable" ? "unavailable" : "available";
    const unavailableReason =
      typeof raw.unavailableReason === "string"
        ? raw.unavailableReason
        : undefined;
    const purchaseModeId =
      typeof raw.purchaseModeId === "string" ? raw.purchaseModeId : undefined;
    const bundledFromLineKey =
      typeof raw.bundledFromLineKey === "string"
        ? raw.bundledFromLineKey
        : undefined;
    const bundledByPurchaseModeId =
      typeof raw.bundledByPurchaseModeId === "string"
        ? raw.bundledByPurchaseModeId
        : undefined;
    const purchaseRecipients = normalizeShopPurchaseRecipients(
      raw.purchaseRecipients
    );
    const minQuantity =
      getMinimumQuantityForPurchaseRecipients(purchaseRecipients);
    const quantity = Math.max(
      minQuantity,
      normalizePositiveInteger(raw.quantity, minQuantity)
    );

    normalized[key] = {
      productId,
      sizeOptionId,
      selected,
      quantity,
      availabilityStatus,
      unavailableReason,
      purchaseModeId,
      bundledFromLineKey,
      bundledByPurchaseModeId,
      purchaseRecipients,
      lockedQuantity: raw.lockedQuantity === true,
      lockedPurchaseMode: raw.lockedPurchaseMode === true,
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
  const nextQuantity = normalizePositiveInteger(current?.quantity, 1);
  const nextLine: ShopCartLine = {
    productId,
    sizeOptionId,
    selected: current?.availabilityStatus === "unavailable" ? false : selected,
    availabilityStatus: current?.availabilityStatus,
    unavailableReason: current?.unavailableReason,
    quantity: nextQuantity,
    purchaseModeId: current?.purchaseModeId ?? defaultPurchaseModeId,
    purchaseRecipients: current?.purchaseRecipients,
  };

  return syncBundledCartItemsForLine(catalog, {
    ...cart,
    [key]: nextLine,
  }, key);
}

export function setShopLineQuantity(
  cart: ShopCart,
  catalog: ShopCatalog | null,
  productId: string,
  sizeOptionId: string,
  quantity: number
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];
  const quantityRules = getProductQuantityRules(catalog, productId);
  const minQuantity = Math.max(
    quantityRules.minOrderQuantity,
    getMinimumQuantityForPurchaseRecipients(current?.purchaseRecipients)
  );
  const nextQuantity = clampQuantity(
    normalizePositiveInteger(quantity, minQuantity),
    minQuantity,
    quantityRules.maxOrderQuantity
  );
  return syncBundledCartItemsForLine(catalog, {
    ...cart,
    [key]: {
      productId,
      sizeOptionId,
      selected: current?.selected ?? false,
      quantity: nextQuantity,
      purchaseModeId: current?.purchaseModeId,
      bundledFromLineKey: current?.bundledFromLineKey,
      bundledByPurchaseModeId: current?.bundledByPurchaseModeId,
      purchaseRecipients: current?.purchaseRecipients,
    },
  }, key);
}

export function setShopLinePurchaseMode(
  cart: ShopCart,
  catalog: ShopCatalog | null,
  productId: string,
  sizeOptionId: string,
  purchaseModeId?: string
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];

  return syncBundledCartItemsForLine(catalog, {
    ...cart,
    [key]: {
      productId,
      sizeOptionId,
      selected: current?.selected ?? false,
      quantity: normalizePositiveInteger(current?.quantity, 1),
      purchaseModeId,
      bundledFromLineKey: current?.bundledFromLineKey,
      bundledByPurchaseModeId: current?.bundledByPurchaseModeId,
      purchaseRecipients: current?.purchaseRecipients,
    },
  }, key);
}

export function setShopLinePurchaseRecipients(
  cart: ShopCart,
  catalog: ShopCatalog | null,
  productId: string,
  sizeOptionId: string,
  purchaseRecipients: ShopPurchaseRecipient[]
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const current = cart[key];
  const quantityRules = getProductQuantityRules(catalog, productId);
  const normalizedRecipients = purchaseRecipients.map((recipient) => ({
    ...recipient,
    quantity: clampQuantity(
      normalizePositiveInteger(recipient.quantity, quantityRules.minRecipientQuantity),
      quantityRules.minRecipientQuantity,
      quantityRules.maxRecipientQuantity
    ),
  }));
  const previousReservedRecipientQuantity = countValidShopPurchaseRecipients(
    current?.purchaseRecipients
  );
  const nextReservedRecipientQuantity =
    countValidShopPurchaseRecipients(normalizedRecipients);
  const currentQuantity = normalizePositiveInteger(current?.quantity, 1);
  const minQuantity = Math.max(
    quantityRules.minOrderQuantity,
    nextReservedRecipientQuantity > 0 ? nextReservedRecipientQuantity : 1
  );
  const recipientQuantityDelta =
    nextReservedRecipientQuantity - previousReservedRecipientQuantity;
  const nextQuantity = clampQuantity(
    currentQuantity + recipientQuantityDelta,
    minQuantity,
    quantityRules.maxOrderQuantity
  );

  return syncBundledCartItemsForLine(catalog, {
    ...cart,
    [key]: {
      productId,
      sizeOptionId,
      selected: current?.selected ?? false,
      quantity: nextQuantity,
      purchaseModeId: current?.purchaseModeId,
      bundledFromLineKey: current?.bundledFromLineKey,
      bundledByPurchaseModeId: current?.bundledByPurchaseModeId,
      lockedQuantity: current?.lockedQuantity,
      lockedPurchaseMode: current?.lockedPurchaseMode,
      purchaseRecipients: normalizedRecipients,
    },
  }, key);
}

export function addShopProductDraftToCart(
  cart: ShopCart,
  catalog: ShopCatalog | null,
  productId: string
): ShopCart {
  const product = findShopProduct(catalog, productId);
  const draftEntries = Object.entries(cart).filter(
    ([, line]) => line.productId === productId
  );

  if (!draftEntries.length && product?.sizeOptions[0]) {
    const sizeOption = product.sizeOptions[0];
    const key = makeShopLineKey(productId, sizeOption.id);

    return syncBundledCartItemsForLine(catalog, {
      ...cart,
      [key]: {
        productId,
        sizeOptionId: sizeOption.id,
        selected: true,
        quantity: product.minOrderQuantity ?? 1,
        purchaseModeId: getDefaultPurchaseModeId(sizeOption),
      },
    }, key);
  }

  let nextCart = { ...cart };

  for (const [key, line] of draftEntries) {
    nextCart[key] = {
      ...line,
      selected: line.availabilityStatus === "unavailable" ? false : true,
    };
    nextCart = syncBundledCartItemsForLine(catalog, nextCart, key);
  }

  return nextCart;
}

function syncBundledCartItemsForLine(
  catalog: ShopCatalog | null,
  cart: ShopCart,
  sourceLineKey: string
): ShopCart {
  if (!catalog) {
    return cart;
  }

  const sourceLine = cart[sourceLineKey];

  if (!sourceLine || sourceLine.bundledFromLineKey) {
    return cart;
  }

  const sourceSizeOption = findShopSizeOption(
    catalog,
    sourceLine.productId,
    sourceLine.sizeOptionId
  );
  const purchaseMode = sourceSizeOption?.purchaseModes?.find(
    (mode) => mode.id === sourceLine.purchaseModeId
  );
  const nextCart = { ...cart };

  for (const [lineKey, line] of Object.entries(nextCart)) {
    if (line.bundledFromLineKey === sourceLineKey) {
      delete nextCart[lineKey];
    }
  }

  if (!purchaseMode?.bundledCartItems?.length) {
    return nextCart;
  }

  for (const bundledItem of purchaseMode.bundledCartItems) {
    const targetProduct = findShopProduct(catalog, bundledItem.productId);
    const targetSizeOption = targetProduct?.sizeOptions.find(
      (option) => option.id === bundledItem.sizeOptionId
    );

    if (!targetProduct || !targetSizeOption) {
      continue;
    }

    const bundledLineKey = `${sourceLineKey}::bundle::${bundledItem.productId}::${bundledItem.sizeOptionId}${bundledItem.purchaseModeId ? `::${bundledItem.purchaseModeId}` : ""}`;
    const bundledQuantity = Math.max(
      1,
      normalizePositiveInteger(bundledItem.quantity, 1)
    );

    nextCart[bundledLineKey] = {
      productId: bundledItem.productId,
      sizeOptionId: bundledItem.sizeOptionId,
      selected:
        sourceLine.selected === true &&
        sourceLine.availabilityStatus !== "unavailable",
      quantity: normalizePositiveInteger(sourceLine.quantity, 1) * bundledQuantity,
      purchaseModeId:
        bundledItem.purchaseModeId ?? getDefaultPurchaseModeId(targetSizeOption),
      bundledFromLineKey: sourceLineKey,
      bundledByPurchaseModeId: purchaseMode.id,
      lockedQuantity: true,
      lockedPurchaseMode: true,
    };
  }

  return nextCart;
}

function normalizeShopPurchaseRecipients(
  input: unknown
): ShopPurchaseRecipient[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const recipients = input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      const email = typeof record.email === "string" ? record.email : "";
      const quantity = normalizePositiveInteger(record.quantity, 1);
      const note = typeof record.note === "string" ? record.note : "";

      return {
        name,
        email,
        quantity,
        note,
      };
    })
    .filter(Boolean) as ShopPurchaseRecipient[];

  return recipients.length ? recipients : undefined;
}

function getMinimumQuantityForPurchaseRecipients(
  recipients: ShopPurchaseRecipient[] | undefined
) {
  const validRecipientQuantity = countValidShopPurchaseRecipients(recipients);
  return validRecipientQuantity > 0 ? validRecipientQuantity : 1;
}

function getProductQuantityRules(
  catalog: ShopCatalog | null,
  productId: string
) {
  const product = findShopProduct(catalog, productId);

  return {
    minOrderQuantity: product?.minOrderQuantity ?? 1,
    maxOrderQuantity: product?.maxOrderQuantity,
    minRecipientQuantity: product?.minRecipientQuantity ?? 1,
    maxRecipientQuantity: product?.maxRecipientQuantity,
  };
}

function clampQuantity(value: number, min: number, max?: number) {
  const normalizedMin = Math.max(1, Math.floor(min));
  const normalizedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(normalizedMin, Math.floor(max))
      : undefined;
  const normalizedValue = Math.max(normalizedMin, Math.floor(value));

  return normalizedMax !== undefined
    ? Math.min(normalizedValue, normalizedMax)
    : normalizedValue;
}

function countValidShopPurchaseRecipients(
  recipients: ShopPurchaseRecipient[] | undefined
) {
  if (!recipients?.length) {
    return 0;
  }

  return recipients.filter(
    (recipient) =>
      recipient.name.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email.trim())
  ).reduce(
    (sum, recipient) =>
      sum + normalizePositiveInteger(recipient.quantity, 1),
    0
  );
}

export function removeShopLine(
  cart: ShopCart,
  productId: string,
  sizeOptionId: string
): ShopCart {
  const key = makeShopLineKey(productId, sizeOptionId);
  const next = { ...cart };
  delete next[key];
  for (const [lineKey, line] of Object.entries(next)) {
    if (line.bundledFromLineKey === key) {
      delete next[lineKey];
    }
  }
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

export function resolveShopCartLines(
  catalog: ShopCatalog | null,
  cart: ShopCart
): ShopResolvedCartLine[] {
  if (!catalog) return [];

  const lines = Object.entries(cart)
    .map(([lineKey, cartLine]) =>
      resolveShopLine(catalog, lineKey, cartLine, { includeUnselected: true })
    )
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

export function getProductFulfillmentType(
  product: ShopCatalogProduct | undefined
): FulfillmentType {
  return product?.fulfillmentType ?? "physical";
}

export function hasPhysicalFulfillmentItems(
  catalog: ShopCatalog | null,
  cart: ShopCart
) {
  return resolveShopSelectedLines(catalog, cart).some(
    (line) => line.requiresPhysicalFulfillment === true
  );
}

export function hasTicketItems(catalog: ShopCatalog | null, cart: ShopCart) {
  return resolveShopSelectedLines(catalog, cart).some(
    (line) => line.fulfillmentType === "ticket"
  );
}

export function isDigitalOnlyCart(catalog: ShopCatalog | null, cart: ShopCart) {
  const lines = resolveShopSelectedLines(catalog, cart);

  return (
    lines.length > 0 &&
    lines.every((line) => line.requiresPhysicalFulfillment !== true)
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
  line: ShopCartLine,
  options: { includeUnselected?: boolean } = {}
): ShopResolvedCartLine | null {
  if ((!options.includeUnselected && !line.selected) || line.quantity <= 0) {
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
  const mealSelection =
    purchaseMode?.mealSelection ?? sizeOption.mealSelection;
  const unitPrice = sizeOption.price + (purchaseMode?.priceAdjustment ?? 0);
  const quantity = normalizePositiveInteger(line.quantity, 1);
  const unitWeight =
    typeof sizeOption.weight === "number" && Number.isFinite(sizeOption.weight)
      ? sizeOption.weight
      : undefined;

  return {
    lineKey,
    selected: line.selected === true,
    availabilityStatus: line.availabilityStatus ?? "available",
    unavailableReason: line.unavailableReason,
    productId: product.id,
    productSku: product.sku,
    productTitle: product.title,
    productImageUrl: product.imageUrl,
    fulfillmentType: getProductFulfillmentType(product),
    requiresPhysicalFulfillment:
      getProductFulfillmentType(product) === "physical" ||
      purchaseMode?.requiresPhysicalFulfillment === true,
    sizeOptionId: sizeOption.id,
    sizeOptionSku: sizeOption.sku,
    sizeLabel: sizeOption.label,
    quantity,
    purchaseModeId: purchaseMode?.id,
    purchaseModeSku: purchaseMode?.sku,
    purchaseModeLabel: purchaseMode?.label,
    bundledFromLineKey: line.bundledFromLineKey,
    bundledByPurchaseModeId: line.bundledByPurchaseModeId,
    sku:
      purchaseMode?.sku ??
      sizeOption.sku ??
      product.sku ??
      `${product.id}:${sizeOption.id}${purchaseMode?.id ? `:${purchaseMode.id}` : ""}`,
    purchaseRecipients: line.purchaseRecipients,
    mealSelection,
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
  const sku = typeof record.sku === "string" ? record.sku : undefined;
  const title = typeof record.title === "string" ? record.title : undefined;
  const imageUrl =
    typeof record.imageUrl === "string" ? record.imageUrl : undefined;
  const description =
    typeof record.description === "string" ? record.description : undefined;
  const detailsDescription =
    typeof record.detailsDescription === "string"
      ? record.detailsDescription
      : undefined;
  const eventVenueLabel =
    typeof record.eventVenueLabel === "string"
      ? record.eventVenueLabel
      : typeof record.venue === "string"
        ? record.venue
        : undefined;
  const eventAddress =
    typeof record.eventAddress === "string"
      ? record.eventAddress
      : typeof record.address === "string"
        ? record.address
        : undefined;
  const eventDateLabel =
    typeof record.eventDateLabel === "string"
      ? record.eventDateLabel
      : typeof record.dateLabel === "string"
        ? record.dateLabel
        : undefined;
  const eventTimeLabel =
    typeof record.eventTimeLabel === "string"
      ? record.eventTimeLabel
      : typeof record.showTimeLabel === "string"
        ? record.showTimeLabel
        : undefined;
  const fulfillmentType =
    record.fulfillmentType === "physical" ||
    record.fulfillmentType === "digital" ||
    record.fulfillmentType === "ticket"
      ? record.fulfillmentType
      : undefined;
  const enableStoreCreditPurchase =
    typeof record.enableStoreCreditPurchase === "boolean"
      ? record.enableStoreCreditPurchase
      : undefined;
  const enablePurchaseForOthers =
    typeof record.enablePurchaseForOthers === "boolean"
      ? record.enablePurchaseForOthers
      : undefined;
  const maxPurchaseForOthers =
    typeof record.maxPurchaseForOthers === "number" &&
    Number.isFinite(record.maxPurchaseForOthers)
      ? Math.max(0, Math.floor(record.maxPurchaseForOthers))
      : undefined;
  const minOrderQuantity =
    typeof record.minOrderQuantity === "number" &&
    Number.isFinite(record.minOrderQuantity)
      ? Math.max(1, Math.floor(record.minOrderQuantity))
      : undefined;
  const maxOrderQuantity =
    typeof record.maxOrderQuantity === "number" &&
    Number.isFinite(record.maxOrderQuantity)
      ? Math.max(1, Math.floor(record.maxOrderQuantity))
      : undefined;
  const minRecipientQuantity =
    typeof record.minRecipientQuantity === "number" &&
    Number.isFinite(record.minRecipientQuantity)
      ? Math.max(1, Math.floor(record.minRecipientQuantity))
      : undefined;
  const maxRecipientQuantity =
    typeof record.maxRecipientQuantity === "number" &&
    Number.isFinite(record.maxRecipientQuantity)
      ? Math.max(1, Math.floor(record.maxRecipientQuantity))
      : undefined;
  const sizeOptionsValue = record.sizeOptions;

  if (!id || !title || !Array.isArray(sizeOptionsValue)) {
    return null;
  }

  const sizeOptions = sizeOptionsValue
    .map(normalizeShopSizeOption)
    .filter(Boolean) as ShopCatalogSizeOption[];

  return {
    id,
    sku,
    title,
    imageUrl,
    description,
    detailsDescription,
    eventVenueLabel,
    eventAddress,
    eventDateLabel,
    eventTimeLabel,
    fulfillmentType,
    enableStoreCreditPurchase,
    enablePurchaseForOthers,
    maxPurchaseForOthers,
    minOrderQuantity,
    maxOrderQuantity,
    minRecipientQuantity,
    maxRecipientQuantity,
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
  const sku = typeof record.sku === "string" ? record.sku : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const description =
    typeof record.description === "string" ? record.description : undefined;
  const price =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? record.price
      : undefined;
  const weight =
    typeof record.weight === "number" && Number.isFinite(record.weight)
      ? record.weight
      : undefined;
  const purchaseModesValue = record.purchaseModes;
  const mealSelection = normalizeShopMealSelection(record.mealSelection);
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
      sku,
      label,
      description,
      price,
      weight,
      mealSelection,
      purchaseModes: purchaseModes?.length ? purchaseModes : undefined,
    };
}

function normalizeShopMealSelection(
  input: QuestionnaireVariableValue | undefined
): ShopMealSelectionRequirement | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }

  const record = input as Record<string, QuestionnaireVariableValue>;
  const mode =
    record.mode === "required" || record.mode === "optional"
      ? record.mode
      : undefined;
  const menuId = typeof record.menuId === "string" ? record.menuId : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;

  const price =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? record.price
      : undefined;
  if (!mode || !menuId) {
    return undefined;
  }

  return {
    mode,
    menuId,
    label,
    price,
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
  const sku = typeof record.sku === "string" ? record.sku : undefined;
  const label = typeof record.label === "string" ? record.label : undefined;
  const priceAdjustment =
    typeof record.priceAdjustment === "number" &&
    Number.isFinite(record.priceAdjustment)
      ? record.priceAdjustment
      : undefined;

    const requiresPhysicalFulfillment =
    typeof record.requiresPhysicalFulfillment === "boolean"
      ? record.requiresPhysicalFulfillment
      : undefined;

      const mealSelection = normalizeShopMealSelection(record.mealSelection);
      const bundledCartItems = normalizeBundledCartItems(record.bundledCartItems);

  if (!id || !label || priceAdjustment === undefined) {
    return null;
  }

  return {
    id,
    sku,
    label,
    priceAdjustment,
    requiresPhysicalFulfillment,
    mealSelection,
    bundledCartItems,
  };
}

function normalizeBundledCartItems(
  input: QuestionnaireVariableValue | undefined
) {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const items = input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, QuestionnaireVariableValue>;
      const productId =
        typeof record.productId === "string" ? record.productId : undefined;
      const sizeOptionId =
        typeof record.sizeOptionId === "string"
          ? record.sizeOptionId
          : undefined;
      const purchaseModeId =
        typeof record.purchaseModeId === "string"
          ? record.purchaseModeId
          : undefined;
      const quantity =
        typeof record.quantity === "number" && Number.isFinite(record.quantity)
          ? Math.max(1, Math.floor(record.quantity))
          : undefined;

      if (!productId || !sizeOptionId) {
        return null;
      }

      return {
        productId,
        sizeOptionId,
        purchaseModeId,
        quantity,
      };
    })
    .filter(Boolean);

  return items.length
    ? (items as NonNullable<ShopPurchaseMode["bundledCartItems"]>)
    : undefined;
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
