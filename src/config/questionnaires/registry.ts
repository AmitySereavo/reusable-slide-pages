import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { gardenHerbsTheme } from "@/config/themes/gardenHerbsTheme";
import { seedTheme } from "@/config/themes/seedTheme";
import { selfTrustDsl } from "./selfTrustDsl";
import { gardenHerbsDsl } from "./gardenHerbsDsl";
import { seedDsl } from "./seedDsl";

export const questionnaireRegistry = {
  "self-trust": {
    slug: "self-trust",
    name: "Self Trust",
    themeKey: "selfTrust",
    theme: selfTrustTheme,
    dsl: selfTrustDsl,
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
    dsl: gardenHerbsDsl,
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
    dsl: seedDsl,
    showStepText: true,
    variables: {},
    dynamicVariablesEndpoint: undefined,
  },
} as const;

export function getQuestionnaireBySlug(slug: string) {
  const entry =
    questionnaireRegistry[slug as keyof typeof questionnaireRegistry];

  if (!entry) return null;

  return {
    config: {
      slug: entry.slug,
      name: entry.name,
      themeKey: entry.themeKey,
      slides: parseQuestionnaireDsl(entry.dsl).slides,
      variables: entry.variables,
      dynamicVariablesEndpoint: entry.dynamicVariablesEndpoint,
      showStepText: entry.showStepText,
    },
    theme: entry.theme,
  };
}