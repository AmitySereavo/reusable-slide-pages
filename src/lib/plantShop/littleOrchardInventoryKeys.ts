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

  const directAlias = sizeOptionAliases.get(`${productId}::${sizeOptionId}`);

  if (directAlias) {
    return directAlias;
  }

  if (productTitleAliases.has(productTitle)) {
    productId = productTitleAliases.get(productTitle) || productId;
  }

  return `${productId}::${sizeOptionId}`;
}
