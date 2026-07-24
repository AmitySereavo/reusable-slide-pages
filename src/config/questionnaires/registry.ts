import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { resolveDslTemplate } from "@/lib/questionnaire/resolveDslTemplate";
import { loadDslText } from "@/lib/questionnaire/loadDslText";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { gardenHerbsTheme } from "@/config/themes/gardenHerbsTheme";
import { paraLifeGiveawayTheme } from "@/config/themes/paraLifeGiveawayTheme";
import { seedTheme } from "@/config/themes/seedTheme";
import { seedDslVersions } from "./seedDslVersions";
import { getSeedCampaignData } from "@/lib/plants/getSeedCampaignData";
import { getPlantShopCatalog } from "@/lib/plants/getPlantShopCatalog";
import { getReusableShopCatalog } from "@/lib/shop/getReusableShopCatalog";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currencies";
import { getCurrencyRateMap } from "@/lib/currency/rates";
import { deliveryConfig } from "@/config/delivery/deliveryConfig";
import { discountDefinitions } from "@/config/discounts/discountDefinitions";
import { mealMenus } from "@/config/meals/mealMenus";
import { buildQuestionnaireBlocks } from "@/config/questionnaireBlocks";
import {
  littleOrchardPlantShowEvent,
  littleOrchardShopCatalog,
} from "@/config/shops/littleOrchardShop";
import type {
  ShopCatalog,
  QuestionnaireVariableMap,
  ThemeConfig,
} from "@/types/questionnaire";
const activeSeedDsl = "v2";

const plantGiveawayShopCatalog: ShopCatalog = {
  currencyCode: "JMD",
  weightUnit: "lb",
  products: [
    {
      id: "giveaway-shop-peppermint",
      slug: "peppermint",
      title: "Peppermint",
      description: '6 inch tall herb plant for pickup or delivery follow-up.',
      sizeOptions: [
        {
          id: "peppermint-6-inch",
          label: '6" tall plant',
          price: 500,
          weight: 0.8,
        },
      ],
    },
    {
      id: "giveaway-shop-spearmint",
      slug: "spearmint",
      title: "Spearmint",
      description: '6 inch tall herb plant for pickup or delivery follow-up.',
      sizeOptions: [
        {
          id: "spearmint-6-inch",
          label: '6" tall plant',
          price: 750,
          weight: 0.8,
        },
      ],
    },
    {
      id: "giveaway-shop-lemon-balm",
      slug: "lemon-balm",
      title: "Lemon Balm",
      description: "Fragrant balm plant available in two sizes.",
      sizeOptions: [
        {
          id: "lemon-balm-6-inch",
          label: '6" tall plant',
          price: 700,
          weight: 0.9,
        },
        {
          id: "lemon-balm-12-inch",
          label: '12" tall plant',
          price: 1200,
          weight: 1.4,
        },
      ],
    },
    {
      id: "giveaway-shop-italian-sweet-basil",
      slug: "italian-sweet-basil",
      title: "Italian Sweet Basil",
      description: "Kitchen basil available in two sizes.",
      sizeOptions: [
        {
          id: "italian-sweet-basil-6-inch",
          label: '6" tall plant',
          price: 500,
          weight: 0.8,
        },
        {
          id: "italian-sweet-basil-12-inch",
          label: '12" tall plant',
          price: 950,
          weight: 1.3,
        },
      ],
    },
    {
      id: "giveaway-shop-genovese-basil",
      slug: "genovese-basil",
      title: "Genovese Basil",
      description: "Classic culinary basil available in two sizes.",
      sizeOptions: [
        {
          id: "genovese-basil-6-inch",
          label: '6" tall plant',
          price: 500,
          weight: 0.8,
        },
        {
          id: "genovese-basil-12-inch",
          label: '12" tall plant',
          price: 950,
          weight: 1.3,
        },
      ],
    },
  ],
};

type QuestionnaireRegistryEntry = {
  slug: string;
  name: string;
  themeKey: string;
  theme: ThemeConfig;
  dslPath: string;
  showStepText?: boolean;
  overlayMode?: "transparent" | "opaque";
  variables: QuestionnaireVariableMap;
  dynamicVariablesEndpoint?: string;
};

export const questionnaireRegistry: Record<string, QuestionnaireRegistryEntry> = {
  
  
  "self-trust": {
    slug: "self-trust",
    name: "Self Trust",
    themeKey: "selfTrust",
    theme: selfTrustTheme,
    dslPath: "src/config/questionnaires/selfTrustDsl.txt",
    showStepText: false,
    variables: {
      selfScoreMatchCount: "...",
      selfScoreAndFutureScoreMatchCount: "...",
      futureScoreMatchCount: "...",
    },
    dynamicVariablesEndpoint: "/api/questionnaires/self-trust/stats",
  },
  "garden-herbs": {
    slug: "garden-herbs",
    name: "Garden Herbs",
    themeKey: "gardenHerbs",
    theme: gardenHerbsTheme,
    dslPath: "src/config/questionnaires/gardenHerbsDsl.txt",
    showStepText: true,
    variables: {
      plant1: "Thyme",
      plant2: "Rosemary",
      plant3: "Oregano",
      plant4: "Mint",
      plant5: "Basil",
    },
    dynamicVariablesEndpoint: undefined,
  },
  seed: {
    slug: "seed",
    name: "Seed",
    themeKey: "seed",
    theme: seedTheme,
    dslPath: seedDslVersions[activeSeedDsl],
    showStepText: true,
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  invitation: {
    slug: "invitation",
    name: "Invitation",
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/invitationDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
      variables: {
        gatedAccess: {
          gateSlideId: "whatsapp-subscription",
          goto: "second-video",
          resumePromptSlideId: "continue-watching-choice",
          startFromBeginningSlideId: "home",
        },
        marketingQuestions: {
          skipWhenLoggedIn: true,
          skipSlideIds: ["performance-rating"],
          skipTarget: "second-video",
          answeredQuestionsTarget: "/questionnaire/auth-account?section=answered-questions",
        },
      },
    dynamicVariablesEndpoint: undefined,
  },

  "ticket-purchase-assistant": {
    slug: "ticket-purchase-assistant",
    name: "Ticket Purchase Assistant",
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/ticketPurchaseAssistantDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "escape-album": {
    slug: "escape-album",
    name: "Escape Album",
    themeKey: "escapeAlbum",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/escapeAlbumDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      purchaseAccess: {
        itemKey: "escape-album",
        gateSlideId: "escape-album-access",
        accessSlideId: "good-morning-video",
        storeTarget: "/questionnaire/invitation?slide=invitation-shop",
      },
    },
    dynamicVariablesEndpoint: undefined,
  },

  itasl: {
    slug: "itasl",
    name: "Invitation to Amity Sereavo Live",
    themeKey: "itasl",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/itaslDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      dripSequence: {
        sequenceKey: "itasl",
        days: 14,
      },
    },
    dynamicVariablesEndpoint: undefined,
  },

  "nursery-ops": {
  slug: "nursery-ops",
  name: "Nursery Operations",
  themeKey: "nurseryOps",
  theme: gardenHerbsTheme,
  dslPath: "src/config/questionnaires/nurseryOpsDsl.txt",
  showStepText: false,
  overlayMode: "opaque",
  
  variables: {
    nurseryBatches: [
      {
        value: "AA040826",
        code: "AA040826",
        plantName: "Malbar Spinach",
        startDate: "2026-04-08",
        quantityAlive: 74,
        intendedUse: "Retail",
        childCount: 74,
      },
      {
        value: "BA040826",
        code: "BA040826",
        plantName: "Rosemary",
        startDate: "2026-04-08",
        quantityAlive: 30,
        intendedUse: "Wholesale",
        childCount: 30,
      },
    ],
    nurseryBatchPlants: [
      {
        value: "AA040826-P001",
        code: "AA040826-P001",
        conditionStatus: "Good",
        location: "Greenhouse Shelf A1",
        labelStatus: "Not labeled",
      },
      {
        value: "AA040826-P002",
        code: "AA040826-P002",
        conditionStatus: "Fair",
        location: "Under Table 2",
        labelStatus: "Labeled",
      },
    ],
    },
    dynamicVariablesEndpoint: "/api/questionnaires/nursery-ops/batches",
  },

  "auth-signup": {
    slug: "auth-signup",
    name: "Sign Up",
    themeKey: "authSignup",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authSignupDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {
      authVerificationDelivery: "code",
      authVerificationMethod: "email",
      authVerificationExpiresInMinutes: 15,
      authVerificationExpiresInHours: null,
      authVerificationTarget: "account",
      authVerificationSuccessRedirect: "/dashboard",
    },
    dynamicVariablesEndpoint: undefined,
  },

  "auth-login": {
    slug: "auth-login",
    name: "Log In",
    themeKey: "authLogin",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authLoginDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "auth-forgot-password": {
    slug: "auth-forgot-password",
    name: "Forgot Password",
    themeKey: "authForgotPassword",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authForgotPasswordDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {
      authPasswordResetMethod: "email-link",
      authPasswordResetSuccessGoto: "forgot-password-sent",
    },
    dynamicVariablesEndpoint: undefined,
  },

  "auth-reset-password": {
    slug: "auth-reset-password",
    name: "Reset Password",
    themeKey: "authResetPassword",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authResetPasswordDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "auth-account": {
    slug: "auth-account",
    name: "Account",
    themeKey: "authAccount",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authAccountDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: "/api/account/profile",
  },

  "auth-update-info": {
    slug: "auth-update-info",
    name: "Update Account Info",
    themeKey: "authUpdateInfo",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authUpdateInfoDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },
  "auth-delete-account": {
    slug: "auth-delete-account",
    name: "Delete Account",
    themeKey: "authDeleteAccount",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/authDeleteAccountDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "generic-profile-flow": {
    slug: "generic-profile-flow",
    name: "Generic Profile Flow",
    themeKey: "genericProfileFlow",
    theme: gardenHerbsTheme,
    dslPath: "src/config/questionnaires/profileForms/genericProfileFlowDsl.txt",
    showStepText: true,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "home-gardener-plant-giveaway": {
    slug: "home-gardener-plant-giveaway",
    name: "Para-life Trees + The Nursery at Little Orchard Plant Giveaway",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/plantGiveawayDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: plantGiveawayShopCatalog,
    },
    dynamicVariablesEndpoint: undefined,
  },

  "little-orchard-shop": {
    slug: "little-orchard-shop",
    name: "Para-life Trees Little Orchard Shop",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/littleOrchardShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: littleOrchardShopCatalog,
      littleOrchardPlantShowEvent,
    },
    dynamicVariablesEndpoint: "/api/questionnaires/little-orchard-shop/catalog",
  },
} as const;

export async function getQuestionnaireBySlug(slug: string) {
  const entry =
    questionnaireRegistry[slug as keyof typeof questionnaireRegistry];

  if (!entry) return null;

  const currencyRates = await getCurrencyRateMap("USD");
  let resolvedVariables: QuestionnaireVariableMap = {
    ...entry.variables,
    supportedCurrencies: [...SUPPORTED_CURRENCIES],
    currencyRates,
    baseCurrencyCode: "USD",
  };

  if (entry.slug === "seed") {
    const seedCampaign = await getSeedCampaignData();
    const shopCatalog = await getPlantShopCatalog();

    const shopProductIds = new Set(
      shopCatalog.products.map((product) => product.id)
    );

    const promoEligibleItems = seedCampaign.campaignPlants.filter((plant) =>
      shopProductIds.has(plant.productId)
    );

    resolvedVariables = {
      ...resolvedVariables,
      ...seedCampaign.variables,
      shopCatalog,
      deliveryConfig,
      discountDefinitions,
      promoEligibleItems,
      promotionClosed: promoEligibleItems.length === 0,
      promotionDiscountPercent: 100,
      promotionDiscountLabel: "Questionnaire promotion",
    };
  }

  if (entry.slug === "invitation" || entry.slug === "ticket-purchase-assistant") {
    const shopCatalog = await getReusableShopCatalog({
      catalogKey: "invitationTickets",
      currencyCode: "USD",
      weightUnit: "lb",
    });
    const musicMerchShopCatalog = await getReusableShopCatalog({
      catalogKey: "musicMerch",
      currencyCode: "USD",
      weightUnit: "lb",
    });
    const ticketAddOnCatalog = await getReusableShopCatalog({
      catalogKey: "ticketAddOns",
      currencyCode: "USD",
      weightUnit: "lb",
    });
    const orderCatalog = await getReusableShopCatalog({
      catalogKey: "invitationOrder",
      currencyCode: "USD",
      weightUnit: "lb",
    });

      resolvedVariables = {
      ...resolvedVariables,
      shopCatalog,
      musicMerchShopCatalog,
      ticketAddOnCatalog,
      orderCatalog,
      deliveryConfig,
      discountDefinitions,
      mealMenus,
    };
  }

  const rawDsl = await loadDslText(entry.dslPath);
  const resolvedDsl = resolveDslTemplate(
    rawDsl,
    resolvedVariables as Record<string, string | number>
  );

  return {
    config: {
      slug: entry.slug,
      name: entry.name,
      themeKey: entry.themeKey,
      slides: parseQuestionnaireDsl(resolvedDsl).slides,
      variables: resolvedVariables,
      blocks: buildQuestionnaireBlocks(),
      dynamicVariablesEndpoint: entry.dynamicVariablesEndpoint,
      showStepText: entry.showStepText,
      overlayMode: entry.overlayMode,
    },
    theme: entry.theme,
  };
}
