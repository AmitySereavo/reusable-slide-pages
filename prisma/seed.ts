import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in .env for prisma/seed.ts");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PlantSeedInput = {
  slug: string;
  name: string;
  plantKind: Prisma.PlantKind;
  plantCategory: Prisma.PlantCategory;
  lifecycleStage: Prisma.PlantLifecycleStage;
  visibleInPlantShop?: boolean;
  purchasable?: boolean;
  claimEligible?: boolean;
  claimSwitchEligible?: boolean;
  claimFeatured?: boolean;
  supportsSeedJourney?: boolean;
  supportsMatureNow?: boolean;
  supportsGrowthUpdates?: boolean;
  supportsPickup?: boolean;
  supportsDelivery?: boolean;
  stockOnHand?: number;
  stockCommitted?: number;
  stockAvailable?: number;
  propagationMethod?: Prisma.PlantPropagationMethod;
  propagationStatus?: Prisma.PlantPropagationStatus;
  readyNow?: boolean;
  basePriceJmd?: string;
  compareAtPriceJmd?: string;
  primaryBenefit?: string;
  healthBenefit?: string;
  nutritionBenefit?: string;
  healingBenefit?: string;
  environmentBenefit?: string;
  incomeBenefit?: string;
  savingsBenefit?: string;
  yieldType?: Prisma.PlantYieldType;
  yieldFrequency?: string;
  yieldQuantityEstimate?: string;
  monetaryValueNote?: string;
  savingsAmountJmdMonthly?: string;
  adHook?: string;
  adCopyShort?: string;
  adCopyMedium?: string;
  plantShopSummary?: string;
  whatsappPromoCopy?: string;
  claimPageSnippet?: string;
  seedRevealBlock?: string;
  plantInfoBlock?: string;
  updatesIntroBlock?: string;
  careTipsBlock?: string;
  confirmationBlock?: string;
  offerModes?: Array<{
    offerMode: Prisma.PlantOfferModeType;
    enabled?: boolean;
    label?: string;
    description?: string;
    priceJmd?: string;
    compareAtPriceJmd?: string;
    leadTimeDays?: number;
    requiresUpdates?: boolean;
    requiresReservation?: boolean;
  }>;
  channels?: Array<{
    channel: Prisma.PlantSalesChannel;
    visible?: boolean;
    featured?: boolean;
    priority?: number;
    claimEligible?: boolean | null;
    claimSwitchEligible?: boolean | null;
    claimFeatured?: boolean | null;
  }>;
  shopSizeOptions?: Array<{
    label: string;
    slug?: string;
    description?: string;
    active?: boolean;
    featured?: boolean;
    sortOrder?: number;
    priceJmd: string;
    compareAtPriceJmd?: string;
    weight?: string;
    weightUnit?: Prisma.WeightUnit;
    stockOnHand?: number;
    stockReserved?: number;
    stockAvailable?: number;
    supportsPickup?: boolean;
    supportsDelivery?: boolean;
    purchaseModes?: Array<{
      modeType: Prisma.PlantShopPurchaseModeType;
      label: string;
      description?: string;
      active?: boolean;
      featured?: boolean;
      sortOrder?: number;
      priceAdjustmentJmd: string;
    }>;
  }>;
};

const plants: PlantSeedInput[] = [
  {
    slug: "malbar-spinach",
    name: "Malbar Spinach",
    plantKind: "VEGETABLE",
    plantCategory: "VEGETABLE",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    claimEligible: true,
    claimSwitchEligible: false,
    claimFeatured: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 80,
    stockCommitted: 0,
    stockAvailable: 80,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "450.00",
    compareAtPriceJmd: "650.00",
    primaryBenefit: "Fresh leafy greens for the household.",
    healthBenefit: "Supports a healthier plate with home-grown greens.",
    nutritionBenefit: "Useful for diets that value leafy green nutrients.",
    savingsBenefit: "Can reduce repeated spending on supermarket greens.",
    yieldType: "LEAVES",
    yieldFrequency: "Frequent leaf harvests once established.",
    yieldQuantityEstimate: "Steady leaf picking for household use.",
    monetaryValueNote: "Can offset repeated spending on leafy vegetables.",
    savingsAmountJmdMonthly: "4000.00",
    adHook: "Grow fresh greens at home.",
    adCopyShort:
      "Malbar Spinach can keep fresh greens close at hand and help reduce repeat supermarket spending.",
    adCopyMedium:
      "Malbar Spinach is a strong choice for households that want regular leafy harvests, nutrition on the table, and less dependence on store-bought greens.",
    plantShopSummary:
      "Fast-moving leafy green option for home growers and kitchen use.",
    whatsappPromoCopy:
      "Claim or buy Malbar Spinach and watch the growth journey from seed to harvest-ready plant.",
    claimPageSnippet:
      "3 Malbar Spinach plants in your garden can keep fresh greens on the table regularly for a family.",
    seedRevealBlock: `
[c2] It's a
# [c1] Malbar Spinach
## seed.
BR
## [c4] 3 Malbar Spinach plants
## [c4] in your garden
BR
[c3] can keep fresh greens
[c3] on the table regularly
[c3] for a household.
`,
    plantInfoBlock: `
BR
# [c1] Malbar Spinach
# [c1] in your garden
---
[c3] can help reduce
## [c1] repeat spending
# [c4] on leafy greens
---
[c3] while keeping
[c3] fresh harvests
[c3] close to home.
BR
`,
    offerModes: [
      {
        offerMode: "CLAIM_FREE",
        label: "Claim complimentary seed-grown plant",
        enabled: true,
      },
      {
        offerMode: "WATCH_FROM_SEED",
        label: "Watch the growth journey",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "GROWTH_UPDATES",
        label: "Get growth updates",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get a mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [
      {
        channel: "CLAIM_FLOW",
        visible: true,
        featured: true,
        priority: 1,
        claimEligible: true,
        claimSwitchEligible: false,
        claimFeatured: true,
      },
      {
        channel: "PLANT_SHOP",
        visible: true,
        featured: true,
        priority: 1,
      },
    ],
    shopSizeOptions: [
      {
        label: '2.5" pot',
        slug: "2-5-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "350.00",
        weight: "0.600",
        weightUnit: "LB",
        stockOnHand: 74,
        stockAvailable: 74,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
      {
        label: '4" pot',
        slug: "4-inch-pot",
        sortOrder: 2,
        priceJmd: "550.00",
        weight: "1.100",
        weightUnit: "LB",
        stockOnHand: 108,
        stockAvailable: 108,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
    ],
  },
  {
    slug: "sweet-pepper",
    name: "Sweet Pepper",
    plantKind: "VEGETABLE",
    plantCategory: "VEGETABLE",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    claimEligible: true,
    claimSwitchEligible: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 50,
    stockAvailable: 50,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "500.00",
    compareAtPriceJmd: "700.00",
    primaryBenefit: "Useful for everyday seasoning and cooking.",
    healthBenefit: "Adds fresh produce to home meals.",
    nutritionBenefit: "Supports fresh vegetable use in cooking.",
    savingsBenefit: "Can reduce repeat pepper purchases.",
    yieldType: "FRUIT",
    yieldFrequency: "Repeated harvests over the production period.",
    yieldQuantityEstimate: "Multiple peppers per productive plant.",
    monetaryValueNote: "Useful for both home cooking and possible resale.",
    adHook: "Fresh peppers for everyday meals.",
    adCopyShort:
      "A Sweet Pepper plant can support home cooking with repeated harvests and less dependence on store-bought peppers.",
    plantShopSummary: "Reliable pepper option for kitchen gardens.",
    whatsappPromoCopy:
      "Choose Sweet Pepper and watch the plant develop toward productive harvests.",
    claimPageSnippet:
      "A Sweet Pepper plant can support everyday cooking with fresh peppers from home.",
    seedRevealBlock: `
[c2] It's a
# [c1] Sweet Pepper
## seed.
BR
## [c4] A Sweet Pepper plant
## [c4] in your garden
BR
[c3] can support
[c3] everyday cooking
[c3] with fresh peppers.
`,
    plantInfoBlock: `
BR
# [c1] Sweet Pepper
# [c1] in your garden
---
[c3] can help reduce
## [c1] repeat spending
# [c4] on fresh peppers
---
[c3] for seasoning,
[c3] cooking,
[c3] and daily meals.
BR
`,
    offerModes: [
      { offerMode: "SWITCH_FREE", label: "Switch to Sweet Pepper", enabled: true },
      {
        offerMode: "WATCH_FROM_SEED",
        label: "Watch from seed",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "500.00",
      },
    ],
    channels: [
      {
        channel: "CLAIM_FLOW",
        visible: true,
        priority: 2,
        claimEligible: true,
        claimSwitchEligible: true,
        claimFeatured: false,
      },
      { channel: "PLANT_SHOP", visible: true, priority: 2 },
    ],
    shopSizeOptions: [
      {
        label: '2.5" pot',
        slug: "2-5-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "400.00",
        weight: "0.550",
        weightUnit: "LB",
        stockOnHand: 30,
        stockAvailable: 30,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
      {
        label: '4" pot',
        slug: "4-inch-pot",
        sortOrder: 2,
        priceJmd: "500.00",
        weight: "1.000",
        weightUnit: "LB",
        stockOnHand: 20,
        stockAvailable: 20,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
    ],
  },
  {
    slug: "scotch-bonnet-pepper",
    name: "Scotch Bonnet Pepper",
    plantKind: "VEGETABLE",
    plantCategory: "VEGETABLE",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    claimEligible: true,
    claimSwitchEligible: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 45,
    stockAvailable: 45,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "550.00",
    primaryBenefit: "Powerful pepper for flavor-focused cooking.",
    nutritionBenefit: "Adds fresh produce and flavor intensity to meals.",
    savingsBenefit: "Can reduce repeated spending on hot peppers.",
    yieldType: "FRUIT",
    yieldFrequency: "Repeated harvests during productive periods.",
    yieldQuantityEstimate: "Multiple peppers per productive plant.",
    monetaryValueNote: "Can serve home use and possible small resale.",
    adHook: "Grow real heat at home.",
    adCopyShort:
      "Scotch Bonnet Pepper brings strong flavor value to the kitchen and can reduce repeated pepper purchases.",
    plantShopSummary: "Popular hot pepper option for Jamaican cooking.",
    seedRevealBlock: `
[c2] It's a
# [c1] Scotch Bonnet Pepper
## seed.
BR
## [c4] A Scotch Bonnet plant
## [c4] in your garden
BR
[c3] can support
[c3] bold home cooking
[c3] with fresh hot peppers.
`,
    plantInfoBlock: `
BR
# [c1] Scotch Bonnet Pepper
# [c1] in your garden
---
[c3] can help reduce
## [c1] repeat spending
# [c4] on hot peppers
---
[c3] while keeping
[c3] strong flavor
[c3] close at hand.
BR
`,
    offerModes: [
      {
        offerMode: "SWITCH_FREE",
        label: "Switch to Scotch Bonnet Pepper",
        enabled: true,
      },
      {
        offerMode: "WATCH_FROM_SEED",
        label: "Watch from seed",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "550.00",
      },
    ],
    channels: [
      {
        channel: "CLAIM_FLOW",
        visible: true,
        priority: 3,
        claimEligible: true,
        claimSwitchEligible: true,
        claimFeatured: false,
      },
      { channel: "PLANT_SHOP", visible: true, priority: 3 },
    ],
    shopSizeOptions: [
      {
        label: '2.5" pot',
        slug: "2-5-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.550",
        weightUnit: "LB",
        stockOnHand: 25,
        stockAvailable: 25,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
      {
        label: '4" pot',
        slug: "4-inch-pot",
        sortOrder: 2,
        priceJmd: "550.00",
        weight: "1.000",
        weightUnit: "LB",
        stockOnHand: 20,
        stockAvailable: 20,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
    ],
  },
  {
    slug: "beefstake-tomatoes",
    name: "Beefstake Tomatoes",
    plantKind: "VEGETABLE",
    plantCategory: "VEGETABLE",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    claimEligible: true,
    claimSwitchEligible: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 40,
    stockAvailable: 40,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "600.00",
    primaryBenefit: "Large tomato harvest potential for household use.",
    nutritionBenefit: "Supports fresh tomato use in meals.",
    savingsBenefit: "Can reduce repeated tomato purchases.",
    yieldType: "FRUIT",
    yieldFrequency: "Repeated harvests during the fruiting cycle.",
    yieldQuantityEstimate: "Multiple large tomatoes per productive plant.",
    adHook: "Grow fuller tomatoes at home.",
    adCopyShort:
      "Beefstake Tomatoes can support repeated home harvests and reduce dependence on store-bought tomatoes.",
    plantShopSummary: "Large-fruit tomato choice for home growers.",
    seedRevealBlock: `
[c2] It's a
# [c1] Beefstake Tomato
## seed.
BR
## [c4] A Beefstake Tomato plant
## [c4] in your garden
BR
[c3] can reward you
[c3] with repeated
[c3] tomato harvests.
`,
    plantInfoBlock: `
BR
# [c1] Beefstake Tomato
# [c1] in your garden
---
[c3] can help reduce
## [c1] repeat spending
# [c4] on tomatoes
---
[c3] for cooking,
[c3] sandwiches,
[c3] and breakfast dishes.
BR
`,
    offerModes: [
      {
        offerMode: "SWITCH_FREE",
        label: "Switch to Beefstake Tomatoes",
        enabled: true,
      },
      {
        offerMode: "WATCH_FROM_SEED",
        label: "Watch from seed",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "600.00",
      },
    ],
    channels: [
      {
        channel: "CLAIM_FLOW",
        visible: true,
        priority: 4,
        claimEligible: true,
        claimSwitchEligible: true,
        claimFeatured: false,
      },
      { channel: "PLANT_SHOP", visible: true, priority: 4 },
    ],
    shopSizeOptions: [
      {
        label: '2.5" pot',
        slug: "2-5-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.600",
        weightUnit: "LB",
        stockOnHand: 20,
        stockAvailable: 20,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
      {
        label: '4" pot',
        slug: "4-inch-pot",
        sortOrder: 2,
        priceJmd: "600.00",
        weight: "1.050",
        weightUnit: "LB",
        stockOnHand: 20,
        stockAvailable: 20,
        supportsPickup: true,
        supportsDelivery: true,
        purchaseModes: [
          {
            modeType: "WATCH_FROM_START",
            label: "Watch it grow from start to maturity",
            sortOrder: 1,
            priceAdjustmentJmd: "150.00",
          },
          {
            modeType: "BUY_MATURE_NOW",
            label: "Skip the wait and get a mature plant now",
            sortOrder: 2,
            priceAdjustmentJmd: "0.00",
          },
        ],
      },
    ],
  },
  {
    slug: "plummy-tomatoes",
    name: "Plummy Tomatoes",
    plantKind: "VEGETABLE",
    plantCategory: "VEGETABLE",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    claimEligible: false,
    claimSwitchEligible: false,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 35,
    stockAvailable: 35,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "600.00",
    primaryBenefit: "Fresh tomato option for regular kitchen use.",
    nutritionBenefit: "Supports fresh tomato use in meals.",
    savingsBenefit: "Can reduce repeated spending on tomatoes.",
    yieldType: "FRUIT",
    yieldFrequency: "Repeated harvests in season.",
    yieldQuantityEstimate: "Multiple fruits per productive plant.",
    adHook: "A handy tomato for everyday cooking.",
    adCopyShort:
      "Plummy Tomatoes can keep a useful home tomato supply closer to your kitchen.",
    plantShopSummary: "Everyday tomato choice for home gardens.",
    offerModes: [
      {
        offerMode: "WATCH_FROM_SEED",
        label: "Watch from seed",
        enabled: true,
        requiresUpdates: true,
      },
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "600.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 5 }],
    shopSizeOptions: [
      {
        label: '2.5" pot',
        slug: "2-5-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.600",
        weightUnit: "LB",
        stockOnHand: 18,
        stockAvailable: 18,
        supportsPickup: true,
        supportsDelivery: true,
      },
      {
        label: '4" pot',
        slug: "4-inch-pot",
        sortOrder: 2,
        priceJmd: "600.00",
        weight: "1.050",
        weightUnit: "LB",
        stockOnHand: 17,
        stockAvailable: 17,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "peppermint",
    name: "Peppermint",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "YOUNG_PLANT",
    visibleInPlantShop: true,
    purchasable: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 25,
    stockAvailable: 25,
    propagationMethod: "CUTTING",
    propagationStatus: "READY",
    readyNow: true,
    basePriceJmd: "450.00",
    primaryBenefit: "Fragrant herb for home use.",
    healthBenefit: "Often appreciated in home wellness routines.",
    healingBenefit: "Useful in herbal traditions and soothing preparations.",
    environmentBenefit: "Adds scent and greenery to the space.",
    adHook: "Fresh peppermint close at hand.",
    adCopyShort:
      "Peppermint brings fragrance, freshness, and everyday herbal value to the home garden.",
    plantShopSummary: "Popular aromatic herb for home growers.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 6 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.900",
        weightUnit: "LB",
        stockOnHand: 25,
        stockAvailable: 25,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "cilantro",
    name: "Cilantro",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 20,
    stockAvailable: 20,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "400.00",
    primaryBenefit: "Fresh herb for seasoning and flavor.",
    nutritionBenefit: "Supports fresh herb use in meals.",
    savingsBenefit: "Can reduce repeated herb purchases.",
    yieldType: "LEAVES",
    yieldFrequency: "Short-cycle herb harvests.",
    yieldQuantityEstimate: "Useful cut-and-come-again herb use.",
    adHook: "Fresh cilantro for your kitchen.",
    adCopyShort:
      "Cilantro helps bring quick fresh flavor to meals without repeated herb shopping.",
    plantShopSummary: "Fast-use kitchen herb for home growers.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "400.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 7 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "400.00",
        weight: "0.850",
        weightUnit: "LB",
        stockOnHand: 20,
        stockAvailable: 20,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "black-mint",
    name: "Black Mint",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "YOUNG_PLANT",
    visibleInPlantShop: true,
    purchasable: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 18,
    stockAvailable: 18,
    propagationMethod: "CUTTING",
    propagationStatus: "READY",
    readyNow: true,
    basePriceJmd: "450.00",
    primaryBenefit: "Aromatic herb for home and herbal use.",
    healingBenefit: "Useful in home wellness and herbal traditions.",
    environmentBenefit: "Adds fragrance and greenery.",
    adHook: "Keep black mint close at home.",
    adCopyShort:
      "Black Mint adds aromatic value, herbal interest, and freshness to the home garden.",
    plantShopSummary: "Aromatic herb option for herb lovers.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 8 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.900",
        weightUnit: "LB",
        stockOnHand: 18,
        stockAvailable: 18,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "rosemary",
    name: "Rosemary",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "YOUNG_PLANT",
    visibleInPlantShop: true,
    purchasable: true,
    supportsMatureNow: true,
    supportsGrowthUpdates: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 22,
    stockAvailable: 22,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "500.00",
    primaryBenefit: "Aromatic culinary herb for repeated use.",
    environmentBenefit: "Adds beauty and fragrance to the growing space.",
    savingsBenefit: "Can reduce repeat spending on fresh rosemary.",
    yieldType: "LEAVES",
    yieldFrequency: "Repeated clipping once established.",
    yieldQuantityEstimate: "Steady home-use herb harvests.",
    adHook: "A classic herb worth keeping at home.",
    adCopyShort:
      "Rosemary can keep fragrance, flavor, and repeated clipping value close to your kitchen.",
    plantShopSummary: "Classic kitchen herb with strong garden presence.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "500.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 9 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "500.00",
        weight: "0.950",
        weightUnit: "LB",
        stockOnHand: 22,
        stockAvailable: 22,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "lemon-balm",
    name: "Lemon Balm",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "YOUNG_PLANT",
    visibleInPlantShop: true,
    purchasable: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 16,
    stockAvailable: 16,
    propagationMethod: "CUTTING",
    propagationStatus: "READY",
    readyNow: true,
    basePriceJmd: "450.00",
    primaryBenefit: "Fragrant herb for calming garden presence.",
    healingBenefit: "Often valued in soothing herbal traditions.",
    environmentBenefit: "Adds scent and gentle greenery to the space.",
    adHook: "A calming herb for home spaces.",
    adCopyShort:
      "Lemon Balm brings fragrance, softness, and herbal value to the garden or yard.",
    plantShopSummary: "Fragrant herb with home wellness appeal.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 10 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.900",
        weightUnit: "LB",
        stockOnHand: 16,
        stockAvailable: 16,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "sweet-basil",
    name: "Sweet Basil",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 30,
    stockAvailable: 30,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "400.00",
    primaryBenefit: "Useful fresh herb for kitchen use.",
    savingsBenefit: "Can reduce repeated spending on basil for meals.",
    yieldType: "LEAVES",
    yieldFrequency: "Repeated clipping.",
    yieldQuantityEstimate: "Useful leaf harvests for home cooking.",
    adHook: "Fresh basil at your fingertips.",
    adCopyShort:
      "Sweet Basil gives quick kitchen value with repeated leaf harvests and fresh flavor at home.",
    plantShopSummary: "Easy kitchen herb with regular harvest potential.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "400.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 11 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "400.00",
        weight: "0.850",
        weightUnit: "LB",
        stockOnHand: 30,
        stockAvailable: 30,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "genovese-basil",
    name: "Genovese Basil",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 28,
    stockAvailable: 28,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "450.00",
    primaryBenefit: "Specialty basil for strong fresh flavor.",
    savingsBenefit: "Can reduce repeated specialty herb purchases.",
    yieldType: "LEAVES",
    yieldFrequency: "Repeated clipping once established.",
    yieldQuantityEstimate: "Useful leaf harvests for home cooking.",
    adHook: "A richer basil for the home grower.",
    adCopyShort:
      "Genovese Basil adds premium fresh-herb value and repeated clipping potential at home.",
    plantShopSummary: "Specialty basil option for flavor-focused growers.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 12 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.850",
        weightUnit: "LB",
        stockOnHand: 28,
        stockAvailable: 28,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "thai-basil",
    name: "Thai Basil",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 24,
    stockAvailable: 24,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "450.00",
    primaryBenefit: "Distinct basil option for fresh cooking use.",
    savingsBenefit: "Can reduce repeated spending on specialty herbs.",
    yieldType: "LEAVES",
    yieldFrequency: "Repeated clipping.",
    yieldQuantityEstimate: "Useful fresh herb harvests for meals.",
    adHook: "A bold basil to grow at home.",
    adCopyShort:
      "Thai Basil adds a distinct fresh-herb option to your home garden and cooking routine.",
    plantShopSummary: "Distinct basil type for herb lovers.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "450.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 13 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "450.00",
        weight: "0.850",
        weightUnit: "LB",
        stockOnHand: 24,
        stockAvailable: 24,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "dill",
    name: "Dill",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "SEEDLING",
    visibleInPlantShop: true,
    purchasable: true,
    supportsSeedJourney: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 15,
    stockAvailable: 15,
    propagationMethod: "SEED",
    propagationStatus: "GROWING",
    readyNow: true,
    basePriceJmd: "400.00",
    primaryBenefit: "Fresh herb option for light and savory dishes.",
    savingsBenefit: "Can reduce repeated herb purchases.",
    yieldType: "LEAVES",
    yieldFrequency: "Short-cycle herb harvest.",
    yieldQuantityEstimate: "Fresh herb use for kitchen needs.",
    adHook: "Grow a fresh herb that stands out.",
    adCopyShort:
      "Dill adds a distinct fresh-herb option to the home garden and kitchen.",
    plantShopSummary: "Fresh herb option with a distinct character.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "400.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 14 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "400.00",
        weight: "0.800",
        weightUnit: "LB",
        stockOnHand: 15,
        stockAvailable: 15,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
  {
    slug: "sage",
    name: "Sage",
    plantKind: "HERB",
    plantCategory: "HERB",
    lifecycleStage: "YOUNG_PLANT",
    visibleInPlantShop: true,
    purchasable: true,
    supportsMatureNow: true,
    supportsPickup: true,
    supportsDelivery: true,
    stockOnHand: 14,
    stockAvailable: 14,
    propagationMethod: "CUTTING",
    propagationStatus: "READY",
    readyNow: true,
    basePriceJmd: "500.00",
    primaryBenefit: "Fragrant herb with culinary and herbal appeal.",
    healingBenefit: "Often valued in traditional herbal use.",
    environmentBenefit: "Adds scent and texture to the garden.",
    adHook: "Keep sage growing close to home.",
    adCopyShort:
      "Sage brings culinary value, fragrance, and herbal interest to the home garden.",
    plantShopSummary: "Classic herb with strong traditional appeal.",
    offerModes: [
      {
        offerMode: "BUY_MATURE_NOW",
        label: "Get mature plant now",
        enabled: true,
        priceJmd: "500.00",
      },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 15 }],
    shopSizeOptions: [
      {
        label: '4" pot',
        slug: "4-inch-pot",
        featured: true,
        sortOrder: 1,
        priceJmd: "500.00",
        weight: "0.950",
        weightUnit: "LB",
        stockOnHand: 14,
        stockAvailable: 14,
        supportsPickup: true,
        supportsDelivery: true,
      },
    ],
  },
];

function decimal(value?: string) {
  return value ? new Prisma.Decimal(value) : undefined;
}

async function upsertPlant(input: PlantSeedInput) {
  const quantityAvailable = input.stockAvailable ?? 0;
  const quantityReserved = input.stockCommitted ?? 0;

  const plant = await prisma.plant.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      displayName: input.name,
      active: true,
      plantKind: input.plantKind,
      plantCategory: input.plantCategory,
      lifecycleStage: input.lifecycleStage,
      visibleInPlantShop: input.visibleInPlantShop ?? true,
      purchasable: input.purchasable ?? true,
      claimEligible: input.claimEligible ?? false,
      claimSwitchEligible: input.claimSwitchEligible ?? false,
      claimFeatured: input.claimFeatured ?? false,
      supportsSeedJourney: input.supportsSeedJourney ?? false,
      supportsMatureNow: input.supportsMatureNow ?? false,
      supportsCircumposingJourney: false,
      supportsReservation: false,
      supportsGrowthUpdates: input.supportsGrowthUpdates ?? false,
      supportsPickup: input.supportsPickup ?? true,
      supportsDelivery: input.supportsDelivery ?? false,
      quantityAvailable,
      quantityReserved,
      basePriceJmd: decimal(input.basePriceJmd),
      compareAtPriceJmd: decimal(input.compareAtPriceJmd),
    },
    create: {
      slug: input.slug,
      name: input.name,
      displayName: input.name,
      active: true,
      plantKind: input.plantKind,
      plantCategory: input.plantCategory,
      lifecycleStage: input.lifecycleStage,
      visibleInPlantShop: input.visibleInPlantShop ?? true,
      purchasable: input.purchasable ?? true,
      claimEligible: input.claimEligible ?? false,
      claimSwitchEligible: input.claimSwitchEligible ?? false,
      claimFeatured: input.claimFeatured ?? false,
      supportsSeedJourney: input.supportsSeedJourney ?? false,
      supportsMatureNow: input.supportsMatureNow ?? false,
      supportsCircumposingJourney: false,
      supportsReservation: false,
      supportsGrowthUpdates: input.supportsGrowthUpdates ?? false,
      supportsPickup: input.supportsPickup ?? true,
      supportsDelivery: input.supportsDelivery ?? false,
      quantityAvailable,
      quantityReserved,
      basePriceJmd: decimal(input.basePriceJmd),
      compareAtPriceJmd: decimal(input.compareAtPriceJmd),
    },
  });

  await prisma.plantInventory.upsert({
    where: { plantId: plant.id },
    update: {
      stockOnHand: input.stockOnHand ?? 0,
      stockCommitted: input.stockCommitted ?? 0,
      stockAvailable: input.stockAvailable ?? 0,
      propagationMethod: input.propagationMethod,
      propagationStatus: input.propagationStatus,
      readyNow: input.readyNow ?? false,
    },
    create: {
      plantId: plant.id,
      stockOnHand: input.stockOnHand ?? 0,
      stockCommitted: input.stockCommitted ?? 0,
      stockAvailable: input.stockAvailable ?? 0,
      propagationMethod: input.propagationMethod,
      propagationStatus: input.propagationStatus,
      readyNow: input.readyNow ?? false,
    },
  });

  await prisma.plantMarketingContent.upsert({
    where: { plantId: plant.id },
    update: {
      primaryBenefit: input.primaryBenefit,
      healthBenefit: input.healthBenefit,
      nutritionBenefit: input.nutritionBenefit,
      healingBenefit: input.healingBenefit,
      environmentBenefit: input.environmentBenefit,
      incomeBenefit: input.incomeBenefit,
      savingsBenefit: input.savingsBenefit,
      yieldType: input.yieldType,
      yieldFrequency: input.yieldFrequency,
      yieldQuantityEstimate: input.yieldQuantityEstimate,
      monetaryValueNote: input.monetaryValueNote,
      savingsAmountJmdMonthly: decimal(input.savingsAmountJmdMonthly),
      adHook: input.adHook,
      adCopyShort: input.adCopyShort,
      adCopyMedium: input.adCopyMedium,
      plantShopSummary: input.plantShopSummary,
      whatsappPromoCopy: input.whatsappPromoCopy,
      claimPageSnippet: input.claimPageSnippet,
    },
    create: {
      plantId: plant.id,
      primaryBenefit: input.primaryBenefit,
      healthBenefit: input.healthBenefit,
      nutritionBenefit: input.nutritionBenefit,
      healingBenefit: input.healingBenefit,
      environmentBenefit: input.environmentBenefit,
      incomeBenefit: input.incomeBenefit,
      savingsBenefit: input.savingsBenefit,
      yieldType: input.yieldType,
      yieldFrequency: input.yieldFrequency,
      yieldQuantityEstimate: input.yieldQuantityEstimate,
      monetaryValueNote: input.monetaryValueNote,
      savingsAmountJmdMonthly: decimal(input.savingsAmountJmdMonthly),
      adHook: input.adHook,
      adCopyShort: input.adCopyShort,
      adCopyMedium: input.adCopyMedium,
      plantShopSummary: input.plantShopSummary,
      whatsappPromoCopy: input.whatsappPromoCopy,
      claimPageSnippet: input.claimPageSnippet,
    },
  });

  await prisma.plantQuestionnaireContent.upsert({
    where: { plantId: plant.id },
    update: {
      seedRevealBlock: input.seedRevealBlock,
      plantInfoBlock: input.plantInfoBlock,
      updatesIntroBlock: input.updatesIntroBlock,
      careTipsBlock: input.careTipsBlock,
      confirmationBlock: input.confirmationBlock,
    },
    create: {
      plantId: plant.id,
      seedRevealBlock: input.seedRevealBlock,
      plantInfoBlock: input.plantInfoBlock,
      updatesIntroBlock: input.updatesIntroBlock,
      careTipsBlock: input.careTipsBlock,
      confirmationBlock: input.confirmationBlock,
    },
  });

  if (input.offerModes?.length) {
    for (const mode of input.offerModes) {
      await prisma.plantOfferMode.upsert({
        where: {
          plantId_offerMode: {
            plantId: plant.id,
            offerMode: mode.offerMode,
          },
        },
        update: {
          enabled: mode.enabled ?? true,
          label: mode.label,
          description: mode.description,
          priceJmd: decimal(mode.priceJmd),
          compareAtPriceJmd: decimal(mode.compareAtPriceJmd),
          leadTimeDays: mode.leadTimeDays,
          requiresUpdates: mode.requiresUpdates ?? false,
          requiresReservation: mode.requiresReservation ?? false,
        },
        create: {
          plantId: plant.id,
          offerMode: mode.offerMode,
          enabled: mode.enabled ?? true,
          label: mode.label,
          description: mode.description,
          priceJmd: decimal(mode.priceJmd),
          compareAtPriceJmd: decimal(mode.compareAtPriceJmd),
          leadTimeDays: mode.leadTimeDays,
          requiresUpdates: mode.requiresUpdates ?? false,
          requiresReservation: mode.requiresReservation ?? false,
        },
      });
    }
  }

  if (input.channels?.length) {
    for (const channel of input.channels) {
      await prisma.plantChannelSetting.upsert({
        where: {
          plantId_channel: {
            plantId: plant.id,
            channel: channel.channel,
          },
        },
        update: {
          visible: channel.visible ?? true,
          featured: channel.featured ?? false,
          priority: channel.priority ?? 0,
          claimEligible: channel.claimEligible ?? null,
          claimSwitchEligible: channel.claimSwitchEligible ?? null,
          claimFeatured: channel.claimFeatured ?? null,
        },
        create: {
          plantId: plant.id,
          channel: channel.channel,
          visible: channel.visible ?? true,
          featured: channel.featured ?? false,
          priority: channel.priority ?? 0,
          claimEligible: channel.claimEligible ?? null,
          claimSwitchEligible: channel.claimSwitchEligible ?? null,
          claimFeatured: channel.claimFeatured ?? null,
        },
      });
    }
  }

  if (input.shopSizeOptions?.length) {
    for (const sizeOption of input.shopSizeOptions) {
      const savedSizeOption = await prisma.plantShopSizeOption.upsert({
        where: {
          plantId_label: {
            plantId: plant.id,
            label: sizeOption.label,
          },
        },
        update: {
          slug: sizeOption.slug,
          description: sizeOption.description,
          active: sizeOption.active ?? true,
          featured: sizeOption.featured ?? false,
          sortOrder: sizeOption.sortOrder ?? 0,
          priceJmd: new Prisma.Decimal(sizeOption.priceJmd),
          compareAtPriceJmd: decimal(sizeOption.compareAtPriceJmd),
          weight: decimal(sizeOption.weight),
          weightUnit: sizeOption.weightUnit,
          stockOnHand: sizeOption.stockOnHand ?? 0,
          stockReserved: sizeOption.stockReserved ?? 0,
          stockAvailable: sizeOption.stockAvailable ?? 0,
          supportsPickup: sizeOption.supportsPickup,
          supportsDelivery: sizeOption.supportsDelivery,
        },
        create: {
          plantId: plant.id,
          slug: sizeOption.slug,
          label: sizeOption.label,
          description: sizeOption.description,
          active: sizeOption.active ?? true,
          featured: sizeOption.featured ?? false,
          sortOrder: sizeOption.sortOrder ?? 0,
          priceJmd: new Prisma.Decimal(sizeOption.priceJmd),
          compareAtPriceJmd: decimal(sizeOption.compareAtPriceJmd),
          weight: decimal(sizeOption.weight),
          weightUnit: sizeOption.weightUnit,
          stockOnHand: sizeOption.stockOnHand ?? 0,
          stockReserved: sizeOption.stockReserved ?? 0,
          stockAvailable: sizeOption.stockAvailable ?? 0,
          supportsPickup: sizeOption.supportsPickup,
          supportsDelivery: sizeOption.supportsDelivery,
        },
      });

      if (sizeOption.purchaseModes?.length) {
        for (const purchaseMode of sizeOption.purchaseModes) {
          await prisma.plantShopSizeOptionPurchaseMode.upsert({
            where: {
              sizeOptionId_modeType: {
                sizeOptionId: savedSizeOption.id,
                modeType: purchaseMode.modeType,
              },
            },
            update: {
              label: purchaseMode.label,
              description: purchaseMode.description,
              active: purchaseMode.active ?? true,
              featured: purchaseMode.featured ?? false,
              sortOrder: purchaseMode.sortOrder ?? 0,
              priceAdjustmentJmd: new Prisma.Decimal(
                purchaseMode.priceAdjustmentJmd
              ),
            },
            create: {
              sizeOptionId: savedSizeOption.id,
              modeType: purchaseMode.modeType,
              label: purchaseMode.label,
              description: purchaseMode.description,
              active: purchaseMode.active ?? true,
              featured: purchaseMode.featured ?? false,
              sortOrder: purchaseMode.sortOrder ?? 0,
              priceAdjustmentJmd: new Prisma.Decimal(
                purchaseMode.priceAdjustmentJmd
              ),
            },
          });
        }
      }
    }
  }

  return plant;
}

async function main() {
  for (const plant of plants) {
    await upsertPlant(plant);
  }

  console.log(`Seeded ${plants.length} plants.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });