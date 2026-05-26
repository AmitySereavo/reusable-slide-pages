import type { QuestionnaireAnswers, QuestionnaireVariableValue } from "@/types/questionnaire";

type AccountProfileAutofillSource = Record<string, unknown> | null | undefined;

const ACCOUNT_PROFILE_FIELD_MAP: Array<{
  answerKey: string;
  profileKey: string;
}> = [
  { answerKey: "fullName", profileKey: "name" },
  { answerKey: "email", profileKey: "email" },
  { answerKey: "phone", profileKey: "phone" },
  { answerKey: "country", profileKey: "country" },
  { answerKey: "city", profileKey: "city" },
  { answerKey: "addressLine1", profileKey: "addressLine1" },
  { answerKey: "addressLine2", profileKey: "addressLine2" },
  { answerKey: "parishOrRegion", profileKey: "parishOrRegion" },
  { answerKey: "postalCode", profileKey: "postalCode" },
];

function isEmptyAnswer(value: QuestionnaireVariableValue | undefined) {
  return value === undefined || value === null || String(value).trim() === "";
}

function getProfileString(profile: AccountProfileAutofillSource, key: string) {
  if (!profile || typeof profile !== "object") {
    return "";
  }

  const value = profile[key];

  return typeof value === "string" ? value.trim() : "";
}

export function applyAccountProfileAutofill(
  answers: QuestionnaireAnswers,
  profile: AccountProfileAutofillSource
): QuestionnaireAnswers {
  if (!profile || typeof profile !== "object") {
    return answers;
  }

  const nextAnswers: QuestionnaireAnswers = { ...answers };

  for (const item of ACCOUNT_PROFILE_FIELD_MAP) {
    if (!isEmptyAnswer(nextAnswers[item.answerKey])) {
      continue;
    }

    const profileValue = getProfileString(profile, item.profileKey);

    if (!profileValue) {
      continue;
    }

    nextAnswers[item.answerKey] = profileValue;
  }

  return nextAnswers;
}