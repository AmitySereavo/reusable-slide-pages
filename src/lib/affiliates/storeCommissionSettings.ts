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
      shopLabel: getShopDisplayName("little-orchard-shop"),
      shopType: "multiple-product",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 7.5,
      goldPercent: 10,
    },
    {
      shopKey: "garden-package",
      shopLabel: getShopDisplayName("garden-package"),
      shopType: "package-layout",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 7.5,
      goldPercent: 10,
    },
    {
      shopKey: "callaloo-package",
      shopLabel: getShopDisplayName("callaloo-package"),
      shopType: "package-layout",
      enabled: true,
      bronzePercent: 5,
      silverPercent: 10,
      goldPercent: 20,
    },
    {
      shopKey: "seedling-shop",
      shopLabel: getShopDisplayName("seedling-shop"),
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
import { getShopDisplayName } from "@/config/shopIdentities";
