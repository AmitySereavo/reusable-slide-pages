import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { resolveDslTemplate } from "@/lib/questionnaire/resolveDslTemplate";
import { loadDslText } from "@/lib/questionnaire/loadDslText";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { gardenHerbsTheme } from "@/config/themes/gardenHerbsTheme";
import { paraLifeGiveawayTheme } from "@/config/themes/paraLifeGiveawayTheme";
import { seedTheme } from "@/config/themes/seedTheme";
import { getReusableShopCatalog } from "@/lib/shop/getReusableShopCatalog";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currencies";
import { getCurrencyRateMap } from "@/lib/currency/rates";
import { deliveryConfig } from "@/config/delivery/deliveryConfig";
import { discountDefinitions } from "@/config/discounts/discountDefinitions";
import { mealMenus } from "@/config/meals/mealMenus";
import { littleOrchardPlantShowEvent } from "@/config/shops/littleOrchardShop";
import { getShopDisplayName } from "@/config/shopIdentities";
import type {
  ShopCatalog,
  QuestionnaireVariableMap,
  ThemeConfig,
} from "@/types/questionnaire";

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
  showSidebarChapters?: boolean;
  sidebarUtilityLinks?: Array<{
    href: string;
    label: string;
  }>;
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
  invitation: {
    slug: "invitation",
    name: "Invitation",
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/invitationDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    sidebarUtilityLinks: [
      { href: "/questionnaire/ticket-shop", label: "Ticket Shop" },
      { href: "/questionnaire/music-merch-shop", label: getShopDisplayName("music-merch-shop") },
    ],
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

  "ticket-shop": {
    slug: "ticket-shop",
    name: getShopDisplayName("ticket-shop"),
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/ticketShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "music-merch-shop": {
    slug: "music-merch-shop",
    name: getShopDisplayName("music-merch-shop"),
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/musicMerchShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopDisplayName: getShopDisplayName("music-merch-shop"),
    },
    dynamicVariablesEndpoint: undefined,
  },

  "artist-booking": {
    slug: "artist-booking",
    name: "Artiste Booking",
    themeKey: "invitation",
    theme: seedTheme,
    dslPath: "src/config/questionnaires/artistBookingDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
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
        storeTarget: "/questionnaire/music-merch-shop",
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
    name: getShopDisplayName("little-orchard-shop"),
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/littleOrchardShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: {
        currencyCode: "JMD",
        weightUnit: "lb",
        products: [],
      },
      shopDisplayName: getShopDisplayName("little-orchard-shop"),
      littleOrchardPlantShowEvent,
    },
    dynamicVariablesEndpoint: "/api/questionnaires/little-orchard-shop/catalog",
  },

  "bush-tea": {
    slug: "bush-tea",
    name: getShopDisplayName("bush-tea"),
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/bushTeaShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: {
        currencyCode: "JMD",
        weightUnit: "lb",
        products: [],
      },
      shopDisplayName: getShopDisplayName("bush-tea"),
      littleOrchardPlantShowEvent,
    },
    dynamicVariablesEndpoint: "/api/questionnaires/bush-tea/catalog",
  },

  "garden-package": {
    slug: "garden-package",
    name: getShopDisplayName("garden-package"),
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/gardenPackageDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: {
        currencyCode: "JMD",
        weightUnit: "lb",
        products: [],
      },
      shopDisplayName: getShopDisplayName("garden-package"),
      littleOrchardPlantShowEvent,
    },
    dynamicVariablesEndpoint: "/api/questionnaires/garden-package/catalog",
  },

  callaloo: {
    slug: "callaloo",
    name: getShopDisplayName("callaloo"),
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/callalooDsl.txt",
    showStepText: false,
    showSidebarChapters: true,
    overlayMode: "opaque",
    variables: {
      shopCatalog: {
        currencyCode: "JMD",
        weightUnit: "lb",
        products: [],
      },
      shopDisplayName: getShopDisplayName("callaloo"),
      littleOrchardPlantShowEvent,
    },
    dynamicVariablesEndpoint: "/api/questionnaires/callaloo/catalog",
  },

  "callaloo-recipe": {
    slug: "callaloo-recipe",
    name: "Para-life Trees Callaloo Recipe",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/callalooRecipeDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "seedling-shop": {
    slug: "seedling-shop",
    name: getShopDisplayName("seedling-shop"),
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/seedlingShopDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {
      shopCatalog: {
        currencyCode: "JMD",
        weightUnit: "lb",
        products: [],
      },
      shopDisplayName: getShopDisplayName("seedling-shop"),
    },
    dynamicVariablesEndpoint: "/api/questionnaires/seedling-shop/catalog",
  },

  "affiliate-sign-up": {
    slug: "affiliate-sign-up",
    name: "Para-life Trees Affiliate Sign-Up",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/affiliateSignUpDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: "/api/questionnaires/affiliate-sign-up/catalog",
  },

  "lettuce-grow-guide": {
    slug: "lettuce-grow-guide",
    name: "Para-life Trees Lettuce Seedling Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/lettuceGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "cabbage-grow-guide": {
    slug: "cabbage-grow-guide",
    name: "Para-life Trees Cabbage Seedling Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/cabbageGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "eggplant-grow-guide": {
    slug: "eggplant-grow-guide",
    name: "Para-life Trees Eggplant Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/eggplantGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "orange-ortanique-grow-guide": {
    slug: "orange-ortanique-grow-guide",
    name: "Para-life Trees Orange / Ortanique Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/orangeOrtaniqueGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "lychee-grow-guide": {
    slug: "lychee-grow-guide",
    name: "Para-life Trees Lychee Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/lycheeGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "wax-apple-grow-guide": {
    slug: "wax-apple-grow-guide",
    name: "Para-life Trees Wax Apple Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/waxAppleGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "lemon-balm-grow-guide": {
    slug: "lemon-balm-grow-guide",
    name: "Para-life Trees Lemon Balm Seedling Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/lemonBalmGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "black-pepper-grow-guide": {
    slug: "black-pepper-grow-guide",
    name: "Para-life Trees Black Pepper Plant Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/blackPepperGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "scotch-bonnet-grow-guide": {
    slug: "scotch-bonnet-grow-guide",
    name: "Para-life Trees Scotch Bonnet Pepper Seedling Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/scotchBonnetGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "slicing-tomato-grow-guide": {
    slug: "slicing-tomato-grow-guide",
    name: "Para-life Trees Slicing Tomato Seedling Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/slicingTomatoGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "green-onion-grow-guide": {
    slug: "green-onion-grow-guide",
    name: "Para-life Trees Scallion / Green Onion Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/greenOnionGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "sweet-pepper-grow-guide": {
    slug: "sweet-pepper-grow-guide",
    name: "Para-life Trees Sweet Pepper Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/sweetPepperGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "culinary-basil-grow-guide": {
    slug: "culinary-basil-grow-guide",
    name: "Para-life Trees Culinary Basil Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/culinaryBasilGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "dill-grow-guide": {
    slug: "dill-grow-guide",
    name: "Para-life Trees Dill Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/dillGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "tree-mint-grow-guide": {
    slug: "tree-mint-grow-guide",
    name: "Para-life Trees Jamaican Tree Mint Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/treeMintGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "mint-grow-guide": {
    slug: "mint-grow-guide",
    name: "Para-life Trees Peppermint, Spearmint and Black Mint Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/mintGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "cilantro-grow-guide": {
    slug: "cilantro-grow-guide",
    name: "Para-life Trees Cilantro Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/cilantroGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "parsley-grow-guide": {
    slug: "parsley-grow-guide",
    name: "Para-life Trees Parsley Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/parsleyGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "rosemary-grow-guide": {
    slug: "rosemary-grow-guide",
    name: "Para-life Trees Rosemary Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/rosemaryGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "marigold-grow-guide": {
    slug: "marigold-grow-guide",
    name: "Para-life Trees Marigold Grow Guide",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/marigoldGrowGuideDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },

  "project-docs": {
    slug: "project-docs",
    name: "Reusable Slide Pages Project Docs",
    themeKey: "paraLifeGiveaway",
    theme: paraLifeGiveawayTheme,
    dslPath: "src/config/questionnaires/projectDocsDsl.txt",
    showStepText: false,
    overlayMode: "opaque",
    variables: {},
    dynamicVariablesEndpoint: undefined,
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

  if (
    entry.slug === "invitation" ||
    entry.slug === "ticket-shop" ||
    entry.slug === "music-merch-shop" ||
    entry.slug === "ticket-purchase-assistant"
  ) {
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
      blocks: {},
      dynamicVariablesEndpoint: entry.dynamicVariablesEndpoint,
      showStepText: entry.showStepText,
      showSidebarChapters: entry.showSidebarChapters,
      sidebarUtilityLinks: entry.sidebarUtilityLinks,
      overlayMode: entry.overlayMode,
    },
    theme: entry.theme,
  };
}
