export type ShopIdentity = {
  key: string;
  displayName: string;
  orderLabel: string;
  brandKey?: "amitySereavo" | "paralifeTrees";
  receipt?: ShopReceiptDefaults;
};

export type ShopReceiptDefaults = {
  shopUrl?: string;
  shopButtonLabel?: string;
  promotionUrl?: string;
  promotionButtonLabel?: string;
  colors?: {
    pageBackground?: string;
    panelBackground?: string;
    text?: string;
    border?: string;
    accent?: string;
    primaryButtonBackground?: string;
    primaryButtonText?: string;
    promotionButtonBackground?: string;
    promotionButtonText?: string;
    secondaryButtonBackground?: string;
    secondaryButtonText?: string;
  };
};

export const SHOP_IDENTITIES: Record<string, ShopIdentity> = {
  "music-merch-shop": {
    key: "music-merch-shop",
    displayName: "Amity Sereavo Shop",
    orderLabel: "Amity Sereavo Shop",
    brandKey: "amitySereavo",
    receipt: {
      shopUrl: "/questionnaire/music-merch-shop",
      shopButtonLabel: "Visit Amity Sereavo Shop",
      promotionUrl: "/questionnaire/ticket-shop",
      promotionButtonLabel: "Get tickets",
      colors: {
        pageBackground: "#F8F5F2",
        panelBackground: "#FFFFFF",
        text: "#201C1D",
        border: "#D8C7BE",
        accent: "#8F1D3A",
        primaryButtonBackground: "#201C1D",
        primaryButtonText: "#FFFFFF",
        promotionButtonBackground: "#8F1D3A",
        promotionButtonText: "#FFFFFF",
        secondaryButtonBackground: "#FFFFFF",
        secondaryButtonText: "#201C1D",
      },
    },
  },
  "ticket-add-ons": {
    key: "ticket-add-ons",
    displayName: "Ticket Add-ons",
    orderLabel: "Ticket Add-ons",
    brandKey: "amitySereavo",
  },
  "invitation-tickets": {
    key: "invitation-tickets",
    displayName: "Invitation Tickets",
    orderLabel: "Invitation Tickets",
    brandKey: "amitySereavo",
  },
  "combined-order": {
    key: "combined-order",
    displayName: "Combined Order",
    orderLabel: "Combined Order",
    brandKey: "amitySereavo",
  },
  "ticket-shop": {
    key: "ticket-shop",
    displayName: "Ticket Shop",
    orderLabel: "Ticket Shop",
    brandKey: "amitySereavo",
  },
  invitation: {
    key: "invitation",
    displayName: "Invitation",
    orderLabel: "Invitation Order",
    brandKey: "amitySereavo",
  },
  "little-orchard-shop": {
    key: "little-orchard-shop",
    displayName: "Little Orchard Shop",
    orderLabel: "Little Orchard Order",
    brandKey: "paralifeTrees",
    receipt: {
      shopUrl: "/shop",
      shopButtonLabel: "Visit shop",
      promotionUrl: "/gift",
      promotionButtonLabel: "Claim a free plant",
      colors: {
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
      },
    },
  },
  "bush-tea": {
    key: "bush-tea",
    displayName: "Bush Tea Shop",
    orderLabel: "Bush Tea Order",
    brandKey: "paralifeTrees",
    receipt: {
      shopUrl: "/bushtea",
      shopButtonLabel: "Visit Bush Tea Shop",
      promotionUrl: "/questionnaire/affiliate-sign-up?store=bush-tea",
      promotionButtonLabel: "Share bush teas",
    },
  },
  "seedling-shop": {
    key: "seedling-shop",
    displayName: "Seedling Shop",
    orderLabel: "Seedling Shop Order",
    brandKey: "paralifeTrees",
    receipt: {
      shopUrl: "/questionnaire/seedling-shop",
      shopButtonLabel: "Visit Seedling Shop",
      promotionUrl: "/grow-guides",
      promotionButtonLabel: "Browse grow guides",
    },
  },
  "garden-package": {
    key: "garden-package",
    displayName: "Garden Package",
    orderLabel: "Garden Package Order",
    brandKey: "paralifeTrees",
    receipt: {
      shopUrl: "/gardenpackage",
      shopButtonLabel: "Visit Garden Package",
      promotionUrl: "/questionnaire/affiliate-sign-up",
      promotionButtonLabel: "Become an affiliate",
    },
  },
  callaloo: {
    key: "callaloo",
    displayName: "Callaloo Subscription",
    orderLabel: "Callaloo Subscription",
    brandKey: "paralifeTrees",
    receipt: {
      shopUrl: "/callaloo",
      shopButtonLabel: "Visit Callaloo Subscription",
      promotionUrl: "/callaloo-recipe",
      promotionButtonLabel: "View callaloo recipes",
    },
  },
  "callaloo-package": {
    key: "callaloo-package",
    displayName: "Callaloo Package",
    orderLabel: "Callaloo Package Order",
    brandKey: "paralifeTrees",
  },
};

export function getShopIdentity(key?: string | null): ShopIdentity | null {
  const normalizedKey = String(key || "").trim();

  return normalizedKey ? SHOP_IDENTITIES[normalizedKey] || null : null;
}

export function getShopDisplayName(key?: string | null, fallback = "Shop") {
  return getShopIdentity(key)?.displayName || fallback;
}

export function getShopOrderLabel(key?: string | null, fallback = "Order") {
  return getShopIdentity(key)?.orderLabel || fallback;
}

export function getShopBrandKey(key?: string | null) {
  return getShopIdentity(key)?.brandKey || null;
}

export function getShopReceiptDefaults(
  key?: string | null
): ShopReceiptDefaults {
  return getShopIdentity(key)?.receipt || {};
}
