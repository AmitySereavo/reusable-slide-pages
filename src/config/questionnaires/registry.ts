import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { resolveDslTemplate } from "@/lib/questionnaire/resolveDslTemplate";
import { loadDslText } from "@/lib/questionnaire/loadDslText";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { gardenHerbsTheme } from "@/config/themes/gardenHerbsTheme";
import { seedTheme } from "@/config/themes/seedTheme";
import { seedDslVersions } from "./seedDslVersions";
import { getSeedCampaignData } from "@/lib/plants/getSeedCampaignData";
import { getPlantShopCatalog } from "@/lib/plants/getPlantShopCatalog";
import { deliveryConfig } from "@/config/delivery/deliveryConfig";
import { discountDefinitions } from "@/config/discounts/discountDefinitions";

const activeSeedDsl = "v2";

export const questionnaireRegistry = {
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
} as const;

export async function getQuestionnaireBySlug(slug: string) {
  const entry =
    questionnaireRegistry[slug as keyof typeof questionnaireRegistry];

  if (!entry) return null;

  let resolvedVariables = entry.variables;

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

  const rawDsl = await loadDslText(entry.dslPath);
  const resolvedDsl = resolveDslTemplate(rawDsl, resolvedVariables);

  return {
    config: {
      slug: entry.slug,
      name: entry.name,
      themeKey: entry.themeKey,
      slides: parseQuestionnaireDsl(resolvedDsl).slides,
      variables: resolvedVariables,
      dynamicVariablesEndpoint: entry.dynamicVariablesEndpoint,
      showStepText: entry.showStepText,
    },
    theme: entry.theme,
  };
}