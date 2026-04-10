import {
  ConditionRule,
  PrimitiveValue,
  QuestionnaireAnswers,
  Slide,
} from "@/types/questionnaire";

export function parseRulePrimitive(raw: string): PrimitiveValue {
  const trimmed = raw.trim();

  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;

  const num = Number(trimmed);
  return Number.isNaN(num) ? trimmed : num;
}

export function evaluateConditionRule(
  rule: ConditionRule,
  context: QuestionnaireAnswers
) {
  const actual = context[rule.field];

  if (actual === undefined || actual === null) {
    return false;
  }

  switch (rule.operator) {
    case "eq":
      return actual === parseRulePrimitive(rule.value);

    case "neq":
      return actual !== parseRulePrimitive(rule.value);

    case "gt":
      return Number(actual) > Number(rule.value);

    case "gte":
      return Number(actual) >= Number(rule.value);

    case "lt":
      return Number(actual) < Number(rule.value);

    case "lte":
      return Number(actual) <= Number(rule.value);

    case "between": {
      const [minRaw, maxRaw] = rule.value.split("..").map((part) => part.trim());
      const actualNum = Number(actual);
      const min = Number(minRaw);
      const max = Number(maxRaw);

      if (
        Number.isNaN(actualNum) ||
        Number.isNaN(min) ||
        Number.isNaN(max)
      ) {
        return false;
      }

      return actualNum >= min && actualNum <= max;
    }

    case "in": {
      const allowedValues = rule.value
        .split(",")
        .map((part) => parseRulePrimitive(part));

      return allowedValues.some((item) => item === actual);
    }

    default:
      return false;
  }
}

export function getVisibleSlides(
  slides: Slide[],
  context: QuestionnaireAnswers
) {
  return slides.filter((slide) => {
    if (slide.showIf) {
      const answer = context[slide.showIf.field];

      if (
        typeof answer !== "string" &&
        typeof answer !== "number" &&
        typeof answer !== "boolean"
      ) {
        return false;
      }

      if (!slide.showIf.in.includes(answer)) {
        return false;
      }
    }

    if (slide.showIfRules?.length) {
      return slide.showIfRules.every((rule) =>
        evaluateConditionRule(rule, context)
      );
    }

    return true;
  });
}

export function getSlideIndexById(slides: Slide[], id: string) {
  return slides.findIndex((slide) => slide.id === id);
}