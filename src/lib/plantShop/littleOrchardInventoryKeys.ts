import { littleOrchardShopCatalog } from "@/config/shops/littleOrchardShop";

export type LittleOrchardInventoryLineIdentity = {
  productId?: string | null;
  sizeOptionId?: string | null;
  productTitle?: string | null;
  sizeLabel?: string | null;
};

function normalizeInventoryText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSizeText(value: unknown) {
  return normalizeInventoryText(value)
    .replace(/\bfour\b/g, "4")
    .replace(/\bsix\b/g, "6")
    .replace(/\binch\b/g, "inch")
    .replace(/\bpots?\b/g, "pot")
    .replace(/\bseedlings?\b/g, "seedling");
}

const productTitleAliases = new Map([
  ["bolo mint", "lo-panadol-plant-bolo-mint"],
  ["panadol plant", "lo-panadol-plant-bolo-mint"],
  ["panadol plant bolo mint", "lo-panadol-plant-bolo-mint"],
  ["treatment", "lo-tree-mint-jamaican-peppermint"],
  ["tree mint jamaican peppermint", "lo-tree-mint-jamaican-peppermint"],
  ["black pepper plant", "lo-black-pepper"],
]);

const sizeOptionAliases = new Map([
  [
    "lo-tree-mint-jamaican-peppermint::tree-mint-4-inch",
    "lo-tree-mint-jamaican-peppermint::tree-mint-jamaican-peppermint-4-inch",
  ],
]);

export function getLittleOrchardInventoryLineKey(
  line: LittleOrchardInventoryLineIdentity
) {
  let productId = String(line.productId ?? "").trim();
  let sizeOptionId = String(line.sizeOptionId ?? "").trim();
  const productTitle = normalizeInventoryText(line.productTitle);
  const sizeLabel = normalizeSizeText(line.sizeLabel);

  const directAlias = sizeOptionAliases.get(`${productId}::${sizeOptionId}`);

  if (directAlias) {
    return directAlias;
  }

  if (productTitleAliases.has(productTitle)) {
    productId = productTitleAliases.get(productTitle) || productId;
  }

  const product =
    littleOrchardShopCatalog.products.find((entry) => entry.id === productId) ??
    littleOrchardShopCatalog.products.find(
      (entry) => normalizeInventoryText(entry.title) === productTitle
    );

  if (!product) {
    return `${productId}::${sizeOptionId}`;
  }

  productId = product.id;

  const matchingSizeOption =
    product.sizeOptions.find((option) => option.id === sizeOptionId) ??
    product.sizeOptions.find(
      (option) =>
        normalizeSizeText(option.label) === sizeLabel ||
        normalizeSizeText(option.metadata?.potSize) === sizeLabel
    ) ??
    product.sizeOptions.find((option) => {
      const optionLabel = normalizeSizeText(option.label);
      const optionPotSize = normalizeSizeText(option.metadata?.potSize);

      return Boolean(
        sizeLabel &&
          (optionLabel.includes(sizeLabel) ||
            sizeLabel.includes(optionLabel) ||
            optionPotSize.includes(sizeLabel) ||
            sizeLabel.includes(optionPotSize))
      );
    });

  sizeOptionId = matchingSizeOption?.id || sizeOptionId;

  return `${productId}::${sizeOptionId}`;
}

