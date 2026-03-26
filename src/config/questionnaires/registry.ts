import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { selfTrustTheme } from "@/config/themes/selfTrustTheme";
import { gardenHerbsTheme } from "@/config/themes/gardenHerbsTheme";
import { selfTrustDsl } from "./selfTrustDsl";
import { gardenHerbsDsl } from "./gardenHerbsDsl";

export const questionnaireRegistry = {
  "self-trust": {
    slug: "self-trust",
    name: "Self Trust",
    themeKey: "selfTrust",
    theme: selfTrustTheme,
    dsl: selfTrustDsl,
    variables: {
      statsCount: 124,
      statsCount2: 57,
    },
  },
  "garden-herbs": {
    slug: "garden-herbs",
    name: "Garden Herbs",
    themeKey: "gardenHerbs",
    theme: gardenHerbsTheme,
    dsl: gardenHerbsDsl,
    variables: {
      plant1: "Thyme",
      plant2: "Rosemary",
      plant3: "Oregano",
      plant4: "Mint",
      plant5: "Basil",
    },
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
    },
    theme: entry.theme,
  };
}