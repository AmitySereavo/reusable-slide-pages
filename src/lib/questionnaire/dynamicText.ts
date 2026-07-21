import type {
  PrimitiveValue,
  QuestionnaireAnswers,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
} from "@/types/questionnaire";

export function replaceDynamicText(
  value: string | undefined,
  answers: QuestionnaireAnswers,
  variables?: QuestionnaireVariableMap
): string | undefined {
  if (value === undefined) return undefined;

  const resolveValueByKey = (key: string): string | undefined => {
    const answerValue = answers[key];
    if (isDisplayTokenValue(answerValue)) {
      return String(answerValue);
    }

    const variableValue = variables?.[key];
    if (isDisplayTokenValue(variableValue)) {
      return String(variableValue);
    }

    return undefined;
  };

  const resolveToken = (rawKey: string): string => {
    if (rawKey.startsWith("choose:")) {
      const expression = rawKey.slice("choose:".length);
      const [sourceKey, ...rawOptions] = expression
        .split("|")
        .map((part: string) => part.trim());

      const sourceResolved = resolveValueByKey(sourceKey);
      const normalizedSource = String(sourceResolved ?? "").trim();

      const options = new Map<string, string>();

      for (const option of rawOptions) {
        const eqIndex = option.indexOf("=");
        if (eqIndex === -1) continue;

        const key = option.slice(0, eqIndex).trim();
        const result = option.slice(eqIndex + 1).trim();

        if (key) {
          options.set(key, result);
        }
      }

      const chosen = options.get(normalizedSource) ?? options.get("default");

      if (chosen === undefined) {
        return `[${rawKey}]`;
      }

      if (chosen.startsWith("$")) {
        const referenced = resolveValueByKey(chosen.slice(1));
        return referenced ?? chosen;
      }

      return resolveText(chosen);
    }

    const resolved = resolveValueByKey(rawKey);
    if (resolved !== undefined) {
      return resolved;
    }

    return `[${rawKey}]`;
  };

  const resolveText = (input: string): string =>
    input.replace(/\[([^\]]+)\]/g, (_, rawKey: string) => resolveToken(rawKey));

  return resolveText(value);
}

function isDisplayTokenValue(
  value: QuestionnaireVariableValue | undefined
): value is PrimitiveValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
