export type AffiliateCommissionLevel = {
  bronzePercent: number;
  silverPercent: number;
  goldPercent: number;
};

export type ShopType =
  | "one-product"
  | "package-layout"
  | "multiple-product";

export type AffiliateStoreCommissionSetting = AffiliateCommissionLevel & {
  shopKey: string;
  shopLabel: string;
  shopType: ShopType;
  enabled: boolean;
};

export const affiliateStoreCommissionSettings: AffiliateStoreCommissionSetting[] =
  [
    {
      shopKey: "little-orchard-shop",
      shopLabel: "Little Orchard Shop",
      shopType: "multiple-product",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 7.5,
      goldPercent: 10,
    },
    {
      shopKey: "garden-package",
      shopLabel: "Garden Package",
      shopType: "package-layout",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 7.5,
      goldPercent: 10,
    },
    {
      shopKey: "callaloo-package",
      shopLabel: "Callaloo Package",
      shopType: "package-layout",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 10,
      goldPercent: 20,
    },
    {
      shopKey: "seedling-shop",
      shopLabel: "Seedling Shop",
      shopType: "multiple-product",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 7.5,
      goldPercent: 10,
    },
  ];

export function getAffiliateStoreCommissionSetting(shopKey: string) {
  return affiliateStoreCommissionSettings.find(
    (setting) => setting.shopKey === shopKey
  );
}

export function hasStoreAffiliateCommission(shopKey: string) {
  const setting = getAffiliateStoreCommissionSetting(shopKey);

  return (
    setting?.enabled === true &&
    (setting.bronzePercent > 0 ||
      setting.silverPercent > 0 ||
      setting.goldPercent > 0)
  );
}
