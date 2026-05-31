import type {
  DeliverySelection,
  DiscountDefinition,
  PromotionEligibleItem,
  QuestionnaireAnswers,
  QuestionnaireVariableValue,
} from "@/types/questionnaire";

export function isContactInfoComplete(
  answers: QuestionnaireAnswers,
  deliverySelection?: DeliverySelection
) {
  const fullName = String(answers.fullName ?? "").trim();
  const email = String(answers.email ?? "").trim();
  const phone = String(answers.phone ?? "").trim();

  if (!fullName) {
    return false;
  }

  if (deliverySelection?.method === "delivery") {
    return phone.length > 0;
  }

  return phone.length > 0 || email.length > 0;
}

export function normalizePromotionEligibleItems(
  value: QuestionnaireVariableValue | undefined
): PromotionEligibleItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, QuestionnaireVariableValue>;

      const productId =
        typeof record.productId === "string" ? record.productId : undefined;
      const slug =
        typeof record.slug === "string"
          ? record.slug.trim().toLowerCase()
          : undefined;
      const label = typeof record.label === "string" ? record.label : undefined;

      if (!productId || !slug || !label) {
        return null;
      }

      return {
        productId,
        slug,
        label,
      };
    })
    .filter(Boolean) as PromotionEligibleItem[];
}

export function resolvePromotionItem(
  items: PromotionEligibleItem[],
  requestedSlug: string
) {
  if (!items.length) {
    return null;
  }

  if (!requestedSlug) {
    return items[0];
  }

  return (
    items.find((item) => item.slug === requestedSlug.trim().toLowerCase()) ??
    items[0]
  );
}

export function buildPromotionDiscountDefinition(
  productId: string | undefined,
  label: string | undefined,
  percent: number | undefined,
  enabled: boolean
): DiscountDefinition | null {
  if (!enabled || !productId) {
    return null;
  }

  const amount =
    typeof percent === "number" && Number.isFinite(percent) ? percent : 100;

  return {
    code: "QUESTIONNAIRE_PROMO",
    label: label?.trim() || "Questionnaire promotion",
    active: true,
    type: "percentage",
    scope: "product",
    amount,
    productIds: [productId],
  };
}

export function hasPhoneNote() {
  return " (applies after phone number is entered)";
}