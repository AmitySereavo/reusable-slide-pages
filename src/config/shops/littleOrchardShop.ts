import type { ShopCatalog } from "@/types/questionnaire";
import { getShopDisplayName } from "@/config/shopIdentities";

export const LITTLE_ORCHARD_SHOP_SLUG = "little-orchard-shop";
export const GARDEN_PACKAGE_SHOP_SLUG = "garden-package";
export const BUSH_TEA_SHOP_SLUG = "bush-tea";
export const LITTLE_ORCHARD_SHOP_SOURCE = "little_orchard_shop";

export const littleOrchardPlantShowEvent = {
  eventId: "little-orchard-online-shop",
  shopSource: LITTLE_ORCHARD_SHOP_SOURCE,
  shopName: getShopDisplayName(LITTLE_ORCHARD_SHOP_SLUG),
  brandName: "Para-life Trees",
  tagline: "Planting a life in paradise",
  eventName: "Little Orchard Online Shop",
  venueName: "Little Orchard pickup and delivery",
  venueAddress: "Kingston, Jamaica",
  eventDateLabel: "Current nursery inventory",
  eventEndsAt: "2099-12-31T23:59:59-05:00",
  openingHours: "Pickup times vary by location",
  pickupLocation: "Selected pickup location",
  contactName: "Romone",
  whatsappNumber: "18763727415",
  displayWhatsappNumber: "1 (876) 372-7415",
  businessOrderEmail: "paralifetrees@gmail.com",
  reservationDurationMinutes: 15,
  flyerImageUrl: "/media/paralife_trees/jhs-plant-market.jpeg",
};

const preferredProductOrder = [
  "lo-red-wax-apple-tree",
  "lo-mulberry-tree",
  "lo-lychee-tree",
  "lo-black-pepper",
  "lo-slicing-tomato-seedlings",
  "lo-dill",
  "lo-scallion",
  "lo-caribbean-queen-cabbage-seedlings",
  "lo-alderan-lettuce-seedlings",
  "lo-tree-mint-jamaican-peppermint",
  "lo-spearmint",
  "lo-black-mint",
  "lo-lemon-balm",
  "lo-panadol-plant-bolo-mint",
  "lo-italian-sweet-basil",
  "lo-genovese-basil",
  "lo-sweet-bell-pepper",
  "lo-scotch-bonnet-pepper",
  "lo-coleus-green-red-stripe",
  "lo-coleus-red-green-spots",
  "lo-cow-itch-tshirt",
  "lo-pepper-sauce-tshirt",
];

const productMedia = {
  basilItalianSweet: {
    still: "/media/paralife_trees/jpg/product_basil_italian_sweet_still.jpg",
    gif: "/media/paralife_trees/gif/product_basil_italian_sweet_320p.gif",
  },
  blackPepperPlant: {
    still: "/media/paralife_trees/jpg/product_black_pepper_plant_still.jpg",
    gif: "/media/paralife_trees/gif/product_black_pepper_plant_320p.gif",
  },
  bellPepperPlant: {
    still: "/media/paralife_trees/jpg/product_bell_pepper_plant_still.jpg",
    gif: "/media/paralife_trees/gif/product_bell_pepper_plant_320p.gif",
  },
  coleusBrightGreenRedStripes: {
    still:
      "/media/paralife_trees/jpg/product_coleus_bright_green_red_stripes_still.jpg",
  },
  coleusBurgundy: {
    still: "/media/paralife_trees/jpg/product_coleus_burgundy_still.jpg",
  },
  cowItchTshirt: {
    still: "/media/paralife_trees/png/product_cow_itch_tshirt_still.png",
  },
  pepperSauceTshirt: {
    still: "/media/paralife_trees/png/product_pepper_sauce_tshirt_still.png",
  },
  dill: {
    still: "/media/paralife_trees/jpg/product_dill_still.jpg",
    gif: "/media/paralife_trees/gif/product_dill_320p.gif",
  },
  greenOnionScallion: {
    still: "/media/paralife_trees/jpg/product_green_onion_scallion_still.jpg",
    gif: "/media/paralife_trees/gif/product_green_onion_scallion_320p.gif",
  },
  lemonBalm: {
    still: "/media/paralife_trees/jpg/product_lemon_balm_still.jpg",
    gif: "/media/paralife_trees/gif/product_lemon_balm_320p.gif",
  },
  lettuceSeedlings: {
    still: "/media/paralife_trees/png/product_lettuce_seedlings_generated.png",
  },
  lycheeTree: {
    still: "/media/paralife_trees/jpg/product_lychee_tree_still.jpg",
    gif: "/media/paralife_trees/gif/product_lychee_tree_320p.gif",
  },
  mulberryTree: {
    still: "/media/paralife_trees/jpg/product_mulberry_tree_still.jpg",
    gif: "/media/paralife_trees/gif/product_mulberry_plant_320p.gif",
  },
  slicingTomatoSeedlings: {
    still: "/media/paralife_trees/jpg/product_tomato_seedling_slicing_still.jpg",
    gif: "/media/paralife_trees/gif/product_tomato_seedling_slicing_320p.gif",
  },
  redWaxApple: {
    gif: "/media/paralife_trees/gif/product_wax_apple_red_320p.gif",
  },
  cabbageSeedlings: {
    still: "/media/paralife_trees/png/product_cabbage_seedlings_generated.png",
  },
  blackMint: {
    still: "/media/paralife_trees/svg/product_black_mint_placeholder.svg",
  },
  panadolBoloMint: {
    gif: "/media/paralife_trees/gif/product_panadol_plant_320p.gif",
  },
  scotchBonnetPepper: {
    still: "/media/paralife_trees/jpg/product_scotch_bonnet_plant_still.jpg",
  },
  spearmint: {
    still: "/media/paralife_trees/jpg/product_spearmint_still.jpg",
    gif: "/media/paralife_trees/gif/product_spearmint_320p.gif",
  },
  treeMint: {
    still: "/media/paralife_trees/jpg/product_tree_mint_still.jpg",
    gif: "/media/paralife_trees/gif/product_tree_mint_320p.gif",
  },
} as const;

function sortLittleOrchardProducts<T extends { id: string }>(products: T[]) {
  return [...products].sort((first, second) => {
    const firstIndex = preferredProductOrder.indexOf(first.id);
    const secondIndex = preferredProductOrder.indexOf(second.id);

    if (firstIndex === -1 && secondIndex === -1) return 0;
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;

    return firstIndex - secondIndex;
  });
}

function stripMarkdownLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export const littleOrchardShopCatalog: ShopCatalog = {
  currencyCode: "JMD",
  weightUnit: "lb",
  products: sortLittleOrchardProducts([
    makePlantProduct({
      id: "lo-black-pepper",
      sku: "LO-JHS-BLACK-PEPPER",
      title: "Black Pepper",
      category: "Herbs and Seasoning Plants",
      description: "Seasoning plant for Little Orchard pickup or delivery. [Grow guide](/black-pepper)",
      media: productMedia.blackPepperPlant,
      variations: [
        {
          id: "black-pepper-4-inch",
          sku: "LO-JHS-BLACK-PEPPER-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 6,
          price: 500,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-scallion",
      sku: "LO-JHS-SCALLION",
      title: "Scallion",
      category: "Herbs and Seasoning Plants",
      description: "Kitchen seasoning plant for Little Orchard pickup or delivery. [Grow guide](/green-onion)",
      media: productMedia.greenOnionScallion,
      variations: [
        {
          id: "scallion-4-inch",
          sku: "LO-JHS-SCALLION-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 6,
          price: 400,
        },
        {
          id: "scallion-6-inch",
          sku: "LO-JHS-SCALLION-6",
          label: "Six-inch pot",
          potSize: "6-inch pot",
          eventQuantity: 6,
          price: 700,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-lemon-balm",
      sku: "LO-JHS-LEMON-BALM",
      title: "Lemon Balm",
      category: "Herbs and Seasoning Plants",
      description: "Fragrant balm plant for teas, garden edges, and pollinator interest. [Grow guide](/lemon-balm)",
      media: productMedia.lemonBalm,
      variations: [
        {
          id: "lemon-balm-4-inch",
          sku: "LO-JHS-LEMON-BALM-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 6,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
        {
          id: "lemon-balm-6-inch",
          sku: "LO-JHS-LEMON-BALM-6",
          label: "Six-inch pot",
          potSize: "6-inch pot",
          eventQuantity: 6,
          price: 900,
          bundleGroup: "six-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-italian-sweet-basil",
      sku: "LO-JHS-ITALIAN-SWEET-BASIL",
      title: "Italian Sweet Basil",
      category: "Herbs and Seasoning Plants",
      description: "Culinary basil for sauces, salads, and fresh garden fragrance. [Grow guide](/culinary-basil)",
      media: productMedia.basilItalianSweet,
      variations: [
        {
          id: "italian-sweet-basil-4-inch",
          sku: "LO-JHS-ITALIAN-SWEET-BASIL-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 1,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
        {
          id: "italian-sweet-basil-6-inch",
          sku: "LO-JHS-ITALIAN-SWEET-BASIL-6",
          label: "Six-inch pot",
          potSize: "6-inch pot",
          eventQuantity: 6,
          price: 750,
          bundleGroup: "six-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-genovese-basil",
      sku: "LO-JHS-GENOVESE-BASIL",
      title: "Genovese Basil",
      category: "Herbs and Seasoning Plants",
      description: "Classic culinary basil for pesto, sauces, and fresh garden use. [Grow guide](/culinary-basil)",
      media: productMedia.basilItalianSweet,
      variations: [
        {
          id: "genovese-basil-4-inch",
          sku: "LO-JHS-GENOVESE-BASIL-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 2,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-dill",
      sku: "LO-JHS-DILL",
      title: "Dill",
      category: "Herbs and Seasoning Plants",
      description: "Aromatic herb for cooking and beneficial garden insects. [Grow guide](/dill)",
      media: productMedia.dill,
      variations: [
        {
          id: "dill-6-inch",
          sku: "LO-JHS-DILL-6",
          label: "Six-inch pot",
          potSize: "6-inch pot",
          eventQuantity: 6,
          price: 800,
          bundleGroup: "six-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-tree-mint-jamaican-peppermint",
      sku: "LO-JHS-TREE-MINT",
      title: "Tree Mint - Jamaican Peppermint",
      category: "Herbs and Seasoning Plants",
      description: "Jamaican peppermint for home gardens and tea lovers. [Grow guide](/tree-mint)",
      media: productMedia.treeMint,
      variations: [
        {
          id: "tree-mint-jamaican-peppermint-4-inch",
          sku: "LO-JHS-TREE-MINT-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 6,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-spearmint",
      sku: "LO-JHS-SPEARMINT",
      title: "Spearmint",
      category: "Herbs and Seasoning Plants",
      description: "Fresh mint for teas, drinks, kitchen gardens, and pollinator interest. [Grow guide](/mint)",
      media: productMedia.spearmint,
      variations: [
        {
          id: "spearmint-4-inch",
          sku: "LO-JHS-SPEARMINT-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 2,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-black-mint",
      sku: "LO-JHS-BLACK-MINT",
      title: "Black Mint",
      category: "Herbs and Seasoning Plants",
      description: "Aromatic mint for tea, kitchen use, and home garden fragrance. [Grow guide](/mint)",
      media: productMedia.blackMint,
      variations: [
        {
          id: "black-mint-4-inch",
          sku: "LO-JHS-BLACK-MINT-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 1,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-panadol-plant-bolo-mint",
      sku: "LO-JHS-PANADOL-PLANT",
      title: "Panadol Plant - Bolo Mint",
      category: "Herbs and Seasoning Plants",
      description: "Traditional garden herb for collectors and home growers.",
      media: productMedia.panadolBoloMint,
      variations: [
        {
          id: "panadol-plant-bolo-mint-4-inch",
          sku: "LO-JHS-PANADOL-PLANT-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 2,
          price: 500,
          bundleGroup: "four-inch-herb",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-slicing-tomato-seedlings",
      sku: "LO-JHS-TOMATO-SEEDLINGS",
      title: "Slicing Tomato Seedlings",
      category: "Vegetable Plants",
      description: "Young tomato plants ready for home garden transplanting. [Grow guide](/slicing-tomato)",
      media: productMedia.slicingTomatoSeedlings,
      variations: [
        {
          id: "slicing-tomato-seedlings-4-inch",
          sku: "LO-JHS-TOMATO-SEEDLINGS-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          estimatedSize: "Estimated size: 6 inches tall, measured from ground level; pot height not included",
          eventQuantity: 6,
          price: 350,
          bundleGroup: "vegetable",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-sweet-bell-pepper",
      sku: "LO-JHS-SWEET-BELL-PEPPER",
      title: "Sweet Bell Pepper",
      category: "Vegetable Plants",
      description: "Sweet pepper plant for a productive kitchen garden. [Grow guide](/sweet-pepper)",
      media: productMedia.bellPepperPlant,
      variations: [
        {
          id: "sweet-bell-pepper-4-inch",
          sku: "LO-JHS-SWEET-BELL-PEPPER-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          estimatedSize: "Estimated size: 10 inches tall, measured from ground level; pot height not included",
          eventQuantity: 6,
          price: 350,
          bundleGroup: "vegetable",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-scotch-bonnet-pepper",
      sku: "LO-JHS-SCOTCH-BONNET",
      title: "Scotch Bonnet Pepper",
      category: "Vegetable Plants",
      description: "Classic Jamaican hot pepper plant for careful home growing. [Grow guide](/scotch-bonnet)",
      media: productMedia.scotchBonnetPepper,
      variations: [
        {
          id: "scotch-bonnet-pepper-6-inch",
          sku: "LO-JHS-SCOTCH-BONNET-6",
          label: "Six-inch pot",
          potSize: "6-inch pot",
          estimatedSize: "Estimated size: 8 inches tall, measured from ground level; pot height not included",
          eventQuantity: 3,
          price: 750,
          bundleGroup: "vegetable",
        },
      ],
    }),
    makePlantProduct({
      id: "lo-coleus-green-red-stripe",
      sku: "LO-JHS-COLEUS-GREEN-RED",
      title: "Coleus - Bright Green with Red Stripes",
      category: "Ornamental Plants",
      description: "Colorful ornamental foliage for pots and garden accents.",
      media: productMedia.coleusBrightGreenRedStripes,
      variations: [
        {
          id: "coleus-green-red-stripe-4-inch",
          sku: "LO-JHS-COLEUS-GREEN-RED-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 2,
          price: 500,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-coleus-red-green-spots",
      sku: "LO-JHS-COLEUS-RED-GREEN",
      title: "Coleus - Burgundy with Hints of Light Green",
      category: "Ornamental Plants",
      description: "Decorative foliage plant with burgundy and light green patterning.",
      media: productMedia.coleusBurgundy,
      variations: [
        {
          id: "coleus-red-green-spots-4-inch",
          sku: "LO-JHS-COLEUS-RED-GREEN-4",
          label: "Four-inch pot",
          potSize: "4-inch pot",
          eventQuantity: 2,
          price: 500,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-mulberry-tree",
      sku: "LO-JHS-MULBERRY-TREE",
      title: "Mulberry Tree",
      category: "Fruit Trees",
      description: "Fruit tree for gardeners ready to plant for the long term.",
      media: productMedia.mulberryTree,
      variations: [
        {
          id: "mulberry-tree",
          sku: "LO-JHS-MULBERRY-TREE",
          label: "Tree",
          potSize: "Tree",
          estimatedSize: "Estimated size: 18 inches tall",
          eventQuantity: 3,
          price: 2000,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-red-wax-apple-tree",
      sku: "LO-JHS-RED-WAX-APPLE-TREE",
      title: "Red Wax Apple - Wax Jambu",
      category: "Fruit Trees",
      description: "Wax jambu fruit tree for tropical home gardens. [Grow guide](/wax-apple)",
      media: productMedia.redWaxApple,
      variations: [
        {
          id: "red-wax-apple-tree",
          sku: "LO-JHS-RED-WAX-APPLE-TREE",
          label: "Tree",
          potSize: "Tree",
          estimatedSize: "Estimated size: 2 ft",
          eventQuantity: 2,
          price: 3500,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-lychee-tree",
      sku: "LO-JHS-LYCHEE",
      title: "Lychee Tree",
      category: "Fruit Trees",
      description: "Lychee trees with separate small and large size options. [Grow guide](/lychee)",
      media: productMedia.lycheeTree,
      variations: [
        {
          id: "lychee-tree-small",
          sku: "LO-JHS-LYCHEE-SMALL",
          label: "Small Lychee Tree",
          potSize: "Tree - small",
          estimatedSize: "Estimated size: 1 foot tall",
          eventQuantity: 1,
          price: 4500,
        },
        {
          id: "lychee-tree-large",
          sku: "LO-JHS-LYCHEE-LARGE",
          label: "Large Lychee Tree",
          potSize: "Tree - large",
          estimatedSize: "Estimated size: 30 inches tall, measured from ground level to the tip",
          eventQuantity: 1,
          price: 6000,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-alderan-lettuce-seedlings",
      sku: "LO-JHS-ALDERAN-LETTUCE-SEEDLINGS",
      title: "Alderan Lettuce Seedlings",
      category: "Seedlings",
      description: "Individual lettuce seedlings. Choose the number of seedlings you wish to purchase. [Grow guide](/lettuce)",
      media: productMedia.lettuceSeedlings,
      variations: [
        {
          id: "alderan-lettuce-seedling",
          sku: "LO-JHS-ALDERAN-LETTUCE-SEEDLING",
          label: "Individual seedling",
          potSize: "Individual seedling",
          eventQuantity: 40,
          price: 50,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-caribbean-queen-cabbage-seedlings",
      sku: "LO-JHS-CARIBBEAN-QUEEN-CABBAGE-SEEDLINGS",
      title: "Caribbean Queen Cabbage Seedlings",
      category: "Seedlings",
      description: "Individual cabbage seedlings. Choose the number of seedlings you wish to purchase. [Grow guide](/cabbage)",
      media: productMedia.cabbageSeedlings,
      variations: [
        {
          id: "caribbean-queen-cabbage-seedling",
          sku: "LO-JHS-CARIBBEAN-QUEEN-CABBAGE-SEEDLING",
          label: "Individual seedling",
          potSize: "Individual seedling",
          eventQuantity: 40,
          price: 50,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-cow-itch-tshirt",
      sku: "LO-JHS-COW-ITCH-TSHIRT",
      title: "Cow Itch T-shirt",
      category: "Apparel",
      description: "Little Orchard apparel item. Availability and final order details will be confirmed by a representative.",
      media: productMedia.cowItchTshirt,
      variations: [
        {
          id: "cow-itch-tshirt-small",
          sku: "LO-JHS-COW-ITCH-TSHIRT-S",
          label: "Small",
          potSize: "Small",
          eventQuantity: 0,
          price: 3500,
        },
        {
          id: "cow-itch-tshirt-medium",
          sku: "LO-JHS-COW-ITCH-TSHIRT-M",
          label: "Medium",
          potSize: "Medium",
          eventQuantity: 0,
          price: 3500,
        },
        {
          id: "cow-itch-tshirt-large",
          sku: "LO-JHS-COW-ITCH-TSHIRT-L",
          label: "Large",
          potSize: "Large",
          eventQuantity: 0,
          price: 3500,
        },
      ],
    }),
    makePlantProduct({
      id: "lo-pepper-sauce-tshirt",
      sku: "LO-JHS-PEPPER-SAUCE-TSHIRT",
      title: "T-shirt - Scotch Bonnet Pepper Sauce",
      category: "Apparel",
      description: "Little Orchard apparel item. Availability and final order details will be confirmed by a representative.",
      media: productMedia.pepperSauceTshirt,
      variations: [
        {
          id: "pepper-sauce-tshirt-small",
          sku: "LO-JHS-PEPPER-SAUCE-TSHIRT-S",
          label: "Small",
          potSize: "Small",
          eventQuantity: 0,
          price: 3500,
        },
        {
          id: "pepper-sauce-tshirt-medium",
          sku: "LO-JHS-PEPPER-SAUCE-TSHIRT-M",
          label: "Medium",
          potSize: "Medium",
          eventQuantity: 0,
          price: 3500,
        },
        {
          id: "pepper-sauce-tshirt-large",
          sku: "LO-JHS-PEPPER-SAUCE-TSHIRT-L",
          label: "Large",
          potSize: "Large",
          eventQuantity: 0,
          price: 3500,
        },
      ],
    }),
  ]),
};

type PlantVariation = {
  id: string;
  sku: string;
  label: string;
  potSize: string;
  eventQuantity: number;
  price: number;
  estimatedSize?: string;
  bundleGroup?: string;
  imageUrl?: string;
};

type ProductMedia = {
  still?: string;
  gif?: string;
};

function makePlantProduct({
  id,
  sku,
  title,
  imageUrl,
  media,
  category,
  description,
  variations,
}: {
  id: string;
  sku: string;
  title: string;
  imageUrl?: string;
  media?: ProductMedia;
  category: string;
  description: string;
  variations: PlantVariation[];
}) {
  const totalQuantity = variations.reduce(
    (sum, variation) => sum + variation.eventQuantity,
    0
  );
  const plainDescription = stripMarkdownLinks(description);

  return {
    id,
    sku,
    slug: id.replace(/^lo-/, ""),
    title,
    imageUrl: media?.still || media?.gif || imageUrl || undefined,
    previewImageUrl: media?.gif || media?.still || imageUrl || undefined,
    description,
    detailsDescription: `${category}. ${plainDescription} Inventory available: ${totalQuantity}. Variation availability is tracked separately. Nursery availability is separate and must be confirmed.`,
    fulfillmentType: "physical" as const,
    maxOrderQuantity: totalQuantity,
    metadata: {
      category,
      eventQuantityAvailable: totalQuantity,
      nurseryAvailability: "admin_confirm",
      immediateFulfillmentMethod: "event_tent_pickup",
      soldOutRequestFulfillmentMethod: "nursery_delivery_request",
      nurseryDeliveryDiscountRate: 0.15,
      variationLevelInventory: true,
    },
    sizeOptions: variations.map((variation) => ({
      id: variation.id,
      sku: variation.sku,
      label: variation.label,
      description: [
        variation.potSize,
        variation.estimatedSize,
        "Available while nursery stock lasts.",
        `Inventory remaining: ${variation.eventQuantity}.`,
      ]
        .filter(Boolean)
        .join(". ")
        .replace(/\.\./g, "."),
      price: variation.price,
      weight: variation.potSize.toLowerCase().includes("tree") ? 5 : 0.8,
      metadata: {
        potSize: variation.potSize,
        eventQuantityAvailable: variation.eventQuantity,
        nurseryAvailability: "admin_confirm",
        immediateFulfillmentMethod: "event_tent_pickup",
        soldOutRequestFulfillmentMethod: "nursery_delivery_request",
        nurseryDeliveryDiscountRate: 0.15,
        bundleGroup: variation.bundleGroup ?? null,
        imageUrl: variation.imageUrl ?? null,
      },
    })),
  };
}
