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
  growthIntroLine1?: string;
  growthIntroLine2?: string;
  seedRevealBlock?: string;
  plantInfoBlock?: string;
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
    growthIntroLine1: "A Malbar Spinach seed has been planted for you.",
    growthIntroLine2: "But not all seeds grow.",
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
    growthIntroLine1: "A Sweet Pepper seed has been planted for you.",
    growthIntroLine2: "But not all seeds grow.",
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
      { offerMode: "WATCH_FROM_SEED", label: "Watch from seed", enabled: true, requiresUpdates: true },
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "500.00" },
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
    growthIntroLine1: "A Scotch Bonnet Pepper seed has been planted for you.",
    growthIntroLine2: "But not all seeds grow.",
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
      { offerMode: "SWITCH_FREE", label: "Switch to Scotch Bonnet Pepper", enabled: true },
      { offerMode: "WATCH_FROM_SEED", label: "Watch from seed", enabled: true, requiresUpdates: true },
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "550.00" },
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
    growthIntroLine1: "A Beefstake Tomato seed has been planted for you.",
    growthIntroLine2: "But not all seeds grow.",
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
      { offerMode: "SWITCH_FREE", label: "Switch to Beefstake Tomatoes", enabled: true },
      { offerMode: "WATCH_FROM_SEED", label: "Watch from seed", enabled: true, requiresUpdates: true },
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "600.00" },
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
    growthIntroLine1: "A Plummy Tomato seed has been planted for you.",
    growthIntroLine2: "But not all seeds grow.",
    offerModes: [
      { offerMode: "WATCH_FROM_SEED", label: "Watch from seed", enabled: true, requiresUpdates: true },
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "600.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 5 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "450.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 6 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "400.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 7 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "450.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 8 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "500.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 9 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "450.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 10 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "400.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 11 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "450.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 12 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "450.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 13 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "400.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 14 }],
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
      { offerMode: "BUY_MATURE_NOW", label: "Get mature plant now", enabled: true, priceJmd: "500.00" },
    ],
    channels: [{ channel: "PLANT_SHOP", visible: true, priority: 15 }],
  },
];

function decimal(value?: string) {
  return value ? new Prisma.Decimal(value) : undefined;
}

async function upsertPlant(input: PlantSeedInput) {
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
      quantityAvailable: input.stockAvailable ?? input.quantityAvailable ?? 0,
      quantityReserved: input.quantityReserved ?? 0,
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
      quantityAvailable: input.stockAvailable ?? input.quantityAvailable ?? 0,
      quantityReserved: input.quantityReserved ?? 0,
      basePriceJmd: decimal(input.basePriceJmd),
      compareAtPriceJmd: decimal(input.compareAtPriceJmd),
    },
  });

  await prisma.plantInventory.upsert({
    where: { plantId: plant.id },
    update: {
      stockOnHand: input.stockOnHand ?? 0,
      stockCommitted: input.stockCommitted ?? 0,
      stockAvailable: input.stockAvailable ?? input.quantityAvailable ?? 0,
      propagationMethod: input.propagationMethod,
      propagationStatus: input.propagationStatus,
      readyNow: input.readyNow ?? false,
    },
    create: {
      plantId: plant.id,
      stockOnHand: input.stockOnHand ?? 0,
      stockCommitted: input.stockCommitted ?? 0,
      stockAvailable: input.stockAvailable ?? input.quantityAvailable ?? 0,
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
      growthIntroLine1: input.growthIntroLine1,
      growthIntroLine2: input.growthIntroLine2,
    },
    create: {
      plantId: plant.id,
      seedRevealBlock: input.seedRevealBlock,
      plantInfoBlock: input.plantInfoBlock,
      growthIntroLine1: input.growthIntroLine1,
      growthIntroLine2: input.growthIntroLine2,
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