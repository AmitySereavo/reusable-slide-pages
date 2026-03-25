import { QuestionnaireConfig } from "@/types/questionnaire";
import { parseQuestionnaireDsl } from "@/lib/questionnaire/parser";
import { selfTrustDsl } from "@/config/questionnaires/selfTrustDsl";

export const selfTrustFromDslConfig: QuestionnaireConfig = {
  slug: "self-trust",
  name: "Self Trust Assessment",
  themeKey: "selfTrust",
  slides: parseQuestionnaireDsl(selfTrustDsl).slides,
};