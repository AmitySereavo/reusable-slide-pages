import type { QuestionnaireVariableMap } from "@/types/questionnaire";

export type MarketingQuestionsConfig = {
  skipWhenLoggedIn?: boolean;
  skipSlideIds?: string[];
  skipTarget?: string;
  answeredQuestionsTarget?: string;
};

export function getMarketingQuestionsConfig(
  variables: QuestionnaireVariableMap
): MarketingQuestionsConfig | null {
  const raw = variables.marketingQuestions;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return {
    skipWhenLoggedIn: record.skipWhenLoggedIn === true,
    skipSlideIds: Array.isArray(record.skipSlideIds)
      ? record.skipSlideIds.filter((item): item is string => typeof item === "string")
      : [],
    skipTarget:
      typeof record.skipTarget === "string" ? record.skipTarget : undefined,
    answeredQuestionsTarget:
      typeof record.answeredQuestionsTarget === "string"
        ? record.answeredQuestionsTarget
        : undefined,
  };
}

export type GatedAccessConfig = {
  gateSlideId?: string;
  goto?: string;
  resumePromptSlideId?: string;
  startFromBeginningSlideId?: string;
};

export type GatedAccessState = {
  hasAccess: boolean;
  goto?: string | null;
  resumePromptSlideId?: string | null;
  gateSlideId?: string | null;
};

export function getGatedAccessConfig(
  variables: QuestionnaireVariableMap
): GatedAccessConfig | null {
  const raw = variables.gatedAccess;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return {
    gateSlideId:
      typeof record.gateSlideId === "string" ? record.gateSlideId : undefined,
    goto: typeof record.goto === "string" ? record.goto : undefined,
    resumePromptSlideId:
      typeof record.resumePromptSlideId === "string"
        ? record.resumePromptSlideId
        : undefined,
    startFromBeginningSlideId:
      typeof record.startFromBeginningSlideId === "string"
        ? record.startFromBeginningSlideId
        : undefined,
  };
}

export type PurchaseAccessConfig = {
  itemKey?: string;
  gateSlideId?: string;
  accessSlideId?: string;
  storeTarget?: string;
};

export function getPurchaseAccessConfig(
  variables: QuestionnaireVariableMap
): PurchaseAccessConfig | null {
  const raw = variables.purchaseAccess;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return {
    itemKey: typeof record.itemKey === "string" ? record.itemKey : undefined,
    gateSlideId:
      typeof record.gateSlideId === "string" ? record.gateSlideId : undefined,
    accessSlideId:
      typeof record.accessSlideId === "string"
        ? record.accessSlideId
        : undefined,
    storeTarget:
      typeof record.storeTarget === "string" ? record.storeTarget : undefined,
  };
}
