"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./QuestionnaireShell.module.css";
import {
  DeliveryConfig,
  DeliverySelection,
  DiscountDefinition,
  DiscountedOrderSummary,
  FormField,
  PrimitiveValue,
  PromotionEligibleItem,
  QuestionnaireAnswers,
  QuestionnaireConfig,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ShopCart,
  ShopCatalog,
  ShopResolvedCartLine,
  SlideRouteRule,
  SlideSection,
  ThemeConfig,
} from "@/types/questionnaire";

import {
  getSlideIndexById,
  getVisibleSlides,
} from "@/lib/questionnaire/engine";

import {
  applyDiscountToShopLines,
  getDefaultPurchaseModeId,
  getDiscountDefinitionByCode,
  getShopCartTotalWeight,
  getShopCatalog,
  normalizeDiscountDefinitions,
  normalizeShopCart,
  removeShopLine,
  resolveShopSelectedLines,
  setShopLinePurchaseMode,
  setShopLineQuantity,
  summarizeDiscountedOrder,
  toggleShopLineSelected,
} from "@/lib/questionnaire/shop";

import {
  getDeliveryConfig,
  getDeliveryFeeJmd,
  isDeliverySelectionComplete,
  normalizeDeliverySelection,
} from "@/lib/questionnaire/delivery";

type Props = {
  config: QuestionnaireConfig;
  theme: ThemeConfig;
};

type ResolvedButtonStyle = {
  background: string;
  color: string;
  borderColor: string;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (clean.length !== 6) return null;

  const num = Number.parseInt(clean, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getContrastTextColor(background: string) {
  const rgb = hexToRgb(background);

  if (!rgb) return "#FFFFFF";

  const luminance =
    (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function withOpacity(color: string, opacity?: number) {
  if (opacity === undefined) return color;

  const normalized = Math.max(0, Math.min(1, opacity));
  const rgb = hexToRgb(color);

  if (!rgb) return color;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${normalized})`;
}

function resolveStyleColor(theme: ThemeConfig, styleKey?: string) {
  if (!styleKey) return null;

  if (styleKey === "primary") return theme.colors.primary;
  if (styleKey === "accent") return theme.colors.accent ?? theme.colors.primary;
  if (styleKey === "card") return theme.colors.card;
  if (styleKey === "text") return theme.colors.text;

  return theme.colors.lineColors?.[styleKey] ?? null;
}

function resolveButtonStyle(
  theme: ThemeConfig,
  styleKey: string | undefined,
  fallback: "primary" | "secondary"
): ResolvedButtonStyle {
  if (styleKey === "secondary") {
    return {
      background: "#FFFFFF",
      color: theme.colors.text,
      borderColor: theme.colors.border,
    };
  }

  if (styleKey === "ghost") {
    return {
      background: "transparent",
      color: theme.colors.text,
      borderColor: theme.colors.border,
    };
  }

  const resolvedColor = resolveStyleColor(theme, styleKey);

  if (resolvedColor) {
    return {
      background: resolvedColor,
      color: getContrastTextColor(resolvedColor),
      borderColor: resolvedColor,
    };
  }

  if (fallback === "primary") {
    return {
      background: theme.colors.primary,
      color: getContrastTextColor(theme.colors.primary),
      borderColor: theme.colors.primary,
    };
  }

  return {
    background: "#FFFFFF",
    color: theme.colors.text,
    borderColor: theme.colors.border,
  };
}

function isTransparentColor(value?: string) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "transparent" ||
    normalized === "none" ||
    normalized === "rgba(0,0,0,0)" ||
    normalized === "rgba(0, 0, 0, 0)"
  );
}

function isContactInfoComplete(
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

function normalizePromotionEligibleItems(
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
        typeof record.slug === "string" ? record.slug.trim().toLowerCase() : undefined;
      const label =
        typeof record.label === "string" ? record.label : undefined;

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

function resolvePromotionItem(
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

function buildPromotionDiscountDefinition(
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

function hasPhoneNote() {
  return " (applies after phone number is entered)";
}

export default function QuestionnaireShell({ config, theme }: Props) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCurrentVerticalVideoPlaying, setIsCurrentVerticalVideoPlaying] =
    useState(false);

  const slideBodyRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();

  const [dynamicVariables, setDynamicVariables] = useState<QuestionnaireVariableMap>(
    {}
  );

  const mergedVariables = useMemo<QuestionnaireVariableMap>(
    () => ({
      ...(config.variables ?? {}),
      ...dynamicVariables,
    }),
    [config.variables, dynamicVariables]
  );

  const discountDefinitions = useMemo<DiscountDefinition[]>(
    () => normalizeDiscountDefinitions(mergedVariables, "discountDefinitions"),
    [mergedVariables]
  );

  const requestedDiscountCode = useMemo(() => {
    const raw =
      searchParams.get("discount") ??
      searchParams.get("promo") ??
      searchParams.get("code") ??
      "";

    return raw.trim().toUpperCase();
  }, [searchParams]);

  const requestedPromotionSlug = useMemo(() => {
    const raw =
      searchParams.get("item") ??
      searchParams.get("plant") ??
      searchParams.get("promoItem") ??
      "";

    return raw.trim().toLowerCase();
  }, [searchParams]);

  const promotionEligibleItems = useMemo<PromotionEligibleItem[]>(
    () => normalizePromotionEligibleItems(mergedVariables.promoEligibleItems),
    [mergedVariables.promoEligibleItems]
  );

  const selectedPromotionItem = useMemo(
    () => resolvePromotionItem(promotionEligibleItems, requestedPromotionSlug),
    [promotionEligibleItems, requestedPromotionSlug]
  );

  const hasPromotionPhone = useMemo(
    () => String(answers.phone ?? "").trim().length > 0,
    [answers.phone]
  );

  const promotionDiscountDefinition = useMemo(
    () =>
      buildPromotionDiscountDefinition(
        selectedPromotionItem?.productId,
        typeof mergedVariables.promotionDiscountLabel === "string"
          ? mergedVariables.promotionDiscountLabel
          : undefined,
        typeof mergedVariables.promotionDiscountPercent === "number"
          ? mergedVariables.promotionDiscountPercent
          : undefined,
        hasPromotionPhone
      ),
    [
      selectedPromotionItem,
      mergedVariables.promotionDiscountLabel,
      mergedVariables.promotionDiscountPercent,
      hasPromotionPhone,
    ]
  );

  const activeDiscountCode = useMemo(
    () =>
      typeof answers.appliedDiscountCode === "string"
        ? answers.appliedDiscountCode.trim().toUpperCase()
        : "",
    [answers.appliedDiscountCode]
  );

  const urlDiscountDefinition = useMemo(
    () => getDiscountDefinitionByCode(discountDefinitions, activeDiscountCode),
    [discountDefinitions, activeDiscountCode]
  );

  const activeDiscountDefinition = useMemo(
    () => urlDiscountDefinition ?? promotionDiscountDefinition,
    [urlDiscountDefinition, promotionDiscountDefinition]
  );

  const evaluationContext = useMemo(
    () => ({
      ...mergedVariables,
      ...answers,
    }),
    [mergedVariables, answers]
  );

  const visibleSlides = useMemo(
    () =>
      getVisibleSlides(
        config.slides.map((slide) => ({
          ...slide,
          title:
            replaceDynamicText(slide.title, evaluationContext, mergedVariables) ??
            slide.title,
          subtitle: replaceDynamicText(
            slide.subtitle,
            evaluationContext,
            mergedVariables
          ),
          body: replaceDynamicText(slide.body, evaluationContext, mergedVariables),
          helperText: replaceDynamicText(
            slide.helperText,
            evaluationContext,
            mergedVariables
          ),
          sections: slide.sections?.map((section) => {
            if (section.type === "break") return section;
            if (section.type === "feature") return section;

            return {
              ...section,
              text:
                replaceDynamicText(
                  section.text,
                  evaluationContext,
                  mergedVariables
                ) ?? section.text,
            };
          }),
          choices: slide.choices?.map((choice) => ({
            ...choice,
            label:
              replaceDynamicText(choice.label, evaluationContext, mergedVariables) ??
              choice.label,
          })),
        })),
        evaluationContext
      ),
    [config.slides, evaluationContext, mergedVariables]
  );

  const currentSlide = visibleSlides[currentIndex];

  const isMediaSlide =
    (currentSlide?.type === "media" || currentSlide?.type === "video") &&
    Boolean(currentSlide?.mediaUrl || currentSlide?.embedUrl);

  const isVerticalMediaSlide =
    isMediaSlide && currentSlide?.mediaAspect === "vertical";

  const countableVisibleSlides = useMemo(
    () => visibleSlides.filter((slide) => slide.countStep !== false),
    [visibleSlides]
  );

  const countedSlidesBeforeCurrent = useMemo(
    () =>
      visibleSlides
        .slice(0, currentIndex)
        .filter((slide) => slide.countStep !== false).length,
    [visibleSlides, currentIndex]
  );

  const currentStepNumber =
    currentSlide?.countStep === false
      ? countedSlidesBeforeCurrent
      : countedSlidesBeforeCurrent + 1;

  const totalStepCount = countableVisibleSlides.length;

  const currentShopCatalog = useMemo(
    () =>
      currentSlide?.type === "shop"
        ? getShopCatalog(mergedVariables, currentSlide.catalogKey)
        : null,
    [mergedVariables, currentSlide]
  );

  const currentShopCart = useMemo<ShopCart>(
    () =>
      currentSlide?.type === "shop" && currentSlide.storeAs
        ? normalizeShopCart(answers[currentSlide.storeAs])
        : {},
    [answers, currentSlide]
  );

  const currentShopBaseSelectedLines = useMemo<ShopResolvedCartLine[]>(
    () =>
      currentSlide?.type === "shop"
        ? resolveShopSelectedLines(currentShopCatalog, currentShopCart)
        : [],
    [currentSlide, currentShopCatalog, currentShopCart]
  );

  const currentShopSelectedLines = useMemo<ShopResolvedCartLine[]>(
    () =>
      currentSlide?.type === "shop" && currentSlide.storeAs === "orderCart"
        ? applyDiscountToShopLines(
            currentShopBaseSelectedLines,
            activeDiscountDefinition
          )
        : currentShopBaseSelectedLines,
    [currentSlide, currentShopBaseSelectedLines, activeDiscountDefinition]
  );

  const currentShopSubtotal = useMemo(
    () => currentShopSelectedLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [currentShopSelectedLines]
  );

  const currentShopTotalWeight = useMemo(
    () =>
      currentSlide?.type === "shop"
        ? getShopCartTotalWeight(currentShopCatalog, currentShopCart)
        : 0,
    [currentSlide, currentShopCatalog, currentShopCart]
  );

  const currentDeliveryConfig = useMemo<DeliveryConfig | null>(
    () =>
      currentSlide?.type === "delivery"
        ? getDeliveryConfig(mergedVariables, currentSlide.deliveryConfigKey)
        : null,
    [mergedVariables, currentSlide]
  );

  const currentDeliverySelection = useMemo<DeliverySelection>(
    () =>
      currentSlide?.type === "delivery" && currentSlide.storeAs
        ? normalizeDeliverySelection(answers[currentSlide.storeAs])
        : {},
    [answers, currentSlide]
  );

  const currentDeliveryFee = useMemo(
    () =>
      currentSlide?.type === "delivery"
        ? getDeliveryFeeJmd(currentDeliveryConfig, currentDeliverySelection)
        : 0,
    [currentSlide, currentDeliveryConfig, currentDeliverySelection]
  );

  const sharedShopCatalog = useMemo(
    () => getShopCatalog(mergedVariables, "shopCatalog"),
    [mergedVariables]
  );

  const sharedOrderCart = useMemo<ShopCart>(
    () => normalizeShopCart(answers.orderCart),
    [answers.orderCart]
  );

  const sharedOrderBaseLines = useMemo<ShopResolvedCartLine[]>(
    () => resolveShopSelectedLines(sharedShopCatalog, sharedOrderCart),
    [sharedShopCatalog, sharedOrderCart]
  );

  const sharedOrderLines = useMemo<ShopResolvedCartLine[]>(
    () => applyDiscountToShopLines(sharedOrderBaseLines, activeDiscountDefinition),
    [sharedOrderBaseLines, activeDiscountDefinition]
  );

  const sharedDeliverySelection = useMemo<DeliverySelection>(
    () => normalizeDeliverySelection(answers.deliverySelection),
    [answers.deliverySelection]
  );

  const sharedDeliveryConfig = useMemo<DeliveryConfig | null>(
    () => getDeliveryConfig(mergedVariables, "deliveryConfig"),
    [mergedVariables]
  );

  const sharedDeliveryFee = useMemo(
    () => getDeliveryFeeJmd(sharedDeliveryConfig, sharedDeliverySelection),
    [sharedDeliveryConfig, sharedDeliverySelection]
  );

  const sharedOrderSummary = useMemo<DiscountedOrderSummary>(
    () => summarizeDiscountedOrder(sharedOrderLines, sharedDeliveryFee),
    [sharedOrderLines, sharedDeliveryFee]
  );

  const contactInfoComplete = useMemo(
    () => isContactInfoComplete(answers, sharedDeliverySelection),
    [answers, sharedDeliverySelection]
  );

  useEffect(() => {
    const endpoint = config.dynamicVariablesEndpoint;
    const selfScore = answers.selfScore;
    const futureScore = answers.futureScore;

    if (!endpoint || selfScore === undefined || futureScore === undefined) {
      return;
    }

    const controller = new AbortController();

    async function loadDynamicVariables() {
      try {
        const params = new URLSearchParams({
          selfScore: String(selfScore),
          futureScore: String(futureScore),
        });

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.variables) {
          return;
        }

        setDynamicVariables((prev: QuestionnaireVariableMap) => ({
          ...prev,
          ...data.variables,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Dynamic questionnaire variables error:", error);
      }
    }

    loadDynamicVariables();

    return () => controller.abort();
  }, [
    config.dynamicVariablesEndpoint,
    answers.selfScore,
    answers.futureScore,
  ]);

  useEffect(() => {
    if (!requestedDiscountCode) {
      return;
    }

    const matchedDiscount = getDiscountDefinitionByCode(
      discountDefinitions,
      requestedDiscountCode
    );

    if (!matchedDiscount) {
      return;
    }

    setAnswers((prev) => {
      const currentCode =
        typeof prev.appliedDiscountCode === "string"
          ? prev.appliedDiscountCode.trim().toUpperCase()
          : "";

      if (currentCode === matchedDiscount.code) {
        return prev;
      }

      return {
        ...prev,
        appliedDiscountCode: matchedDiscount.code,
      };
    });
  }, [discountDefinitions, requestedDiscountCode]);

  useEffect(() => {
    if (config.slug !== "seed") {
      return;
    }

    if (!selectedPromotionItem || !sharedShopCatalog) {
      return;
    }

    const existingSelectedLines = resolveShopSelectedLines(
      sharedShopCatalog,
      sharedOrderCart
    );

    if (existingSelectedLines.length > 0) {
      return;
    }

    const product = sharedShopCatalog.products.find(
      (item) => item.id === selectedPromotionItem.productId
    );

    const sizeOption = product?.sizeOptions[0];

    if (!product || !sizeOption) {
      return;
    }

    const purchaseModeId = getDefaultPurchaseModeId(sizeOption);

    const seededLine = {
      productId: product.id,
      sizeOptionId: sizeOption.id,
      selected: true,
      quantity: 1,
      ...(purchaseModeId ? { purchaseModeId } : {}),
    };

    setAnswers((prev) => ({
      ...prev,
      orderCart: {
        [`${product.id}::${sizeOption.id}`]: seededLine,
      },
    }));
  }, [
    config.slug,
    selectedPromotionItem,
    sharedShopCatalog,
    sharedOrderCart,
  ]);

  useEffect(() => {
    setIsCurrentVerticalVideoPlaying(false);

    if (isMediaSlide) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
      return;
    }

    slideBodyRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [currentSlide?.id, isMediaSlide]);

  function setAnswer(key: string, value: QuestionnaireVariableValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function updateCurrentShopCart(updater: (cart: ShopCart) => ShopCart) {
    if (currentSlide?.type !== "shop" || !currentSlide.storeAs) return;

    const nextCart = updater(currentShopCart);
    setAnswer(currentSlide.storeAs, nextCart);
  }

  function updateCurrentDeliverySelection(
    updater: (selection: DeliverySelection) => DeliverySelection
  ) {
    if (currentSlide?.type !== "delivery" || !currentSlide.storeAs) return;

    const nextSelection = updater(currentDeliverySelection);
    const nextFee = getDeliveryFeeJmd(currentDeliveryConfig, nextSelection);

    setAnswer(currentSlide.storeAs, {
      ...nextSelection,
      deliveryFeeJmd: nextFee,
    });
  }

  function isExternalTarget(value: string) {
    return /^https?:\/\//i.test(value);
  }

  function openExternalTarget(value: string) {
    window.open(value, "_blank", "noopener,noreferrer");
  }

  function goToTarget(target: string) {
    if (isExternalTarget(target)) {
      openExternalTarget(target);
      return;
    }

    const targetIndex = getSlideIndexById(visibleSlides, target);

    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex(targetIndex);
    }
  }

  function resetNurseryOpsSession() {
    setAnswers({});
    setHistory([]);
    setSubmitError(null);

    const homeIndex = getSlideIndexById(visibleSlides, "nursery-ops-home");
    setCurrentIndex(homeIndex === -1 ? 0 : homeIndex);
  }

  function handleChoiceClick(value: PrimitiveValue, goto?: string) {
    if (currentSlide?.storeAs) {
      setAnswer(currentSlide.storeAs, value);
    }

    if (goto) {
      goToTarget(goto);
    }
  }

  function parseRulePrimitive(raw: string): PrimitiveValue {
    const trimmed = raw.trim();

    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;

    const num = Number(trimmed);
    return Number.isNaN(num) ? trimmed : num;
  }

  function evaluateRouteRule(rule: SlideRouteRule) {
    const actual = evaluationContext[rule.field];

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

  function resolveRouteRuleTarget(rules: SlideRouteRule[] | undefined) {
    if (!rules?.length) return null;

    const match = rules.find((rule) => evaluateRouteRule(rule));
    return match?.goto ?? null;
  }

  function next() {
    if (!currentSlide) return;

    if (currentSlide.completionCheck === "contact") {
      if (contactInfoComplete && currentSlide.gotoIfComplete) {
        goToTarget(currentSlide.gotoIfComplete);
        return;
      }

      if (!contactInfoComplete && currentSlide.gotoIfIncomplete) {
        goToTarget(currentSlide.gotoIfIncomplete);
        return;
      }
    }

    if (currentSlide.type === "shop" && currentSlide.shopMode === "browse") {
      if (currentSlide.deliveryGoto) {
        goToTarget(currentSlide.deliveryGoto);
        return;
      }

      if (currentSlide.reviewGoto) {
        goToTarget(currentSlide.reviewGoto);
        return;
      }
    }

    const conditionalTarget = resolveRouteRuleTarget(currentSlide.routeRules);
    if (conditionalTarget) {
      goToTarget(conditionalTarget);
      return;
    }

    if (currentSlide.goto) {
      goToTarget(currentSlide.goto);
      return;
    }

    if (currentIndex < visibleSlides.length - 1) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function back() {
    if (!currentSlide) return;

    if (currentSlide.backGoto) {
      goToTarget(currentSlide.backGoto);
      return;
    }

    const conditionalBackTarget = resolveRouteRuleTarget(
      currentSlide.backRouteRules
    );
    if (conditionalBackTarget) {
      goToTarget(conditionalBackTarget);
      return;
    }

    if (history.length > 0) {
      const previousIndex = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentIndex(previousIndex);
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function canGoNext() {
    if (!currentSlide) return false;

    if (currentSlide.type === "shop") {
      return currentShopSelectedLines.length > 0;
    }

    if (currentSlide.type === "delivery") {
      return isDeliverySelectionComplete(
        currentDeliveryConfig,
        currentDeliverySelection
      );
    }

    if (currentSlide.type === "score" && currentSlide.storeAs) {
      return answers[currentSlide.storeAs] !== undefined;
    }

    if (currentSlide.type === "choice" && currentSlide.storeAs) {
      return answers[currentSlide.storeAs] !== undefined;
    }

    if (
      (currentSlide.type === "form" || currentSlide.type === "contact") &&
      currentSlide.fields?.length
    ) {
      return currentSlide.fields.every((field) => {
        if (!field.required) return true;

        const value = answers[field.name];
        if (field.type === "checkbox") return value === true;

        return String(value ?? "").trim().length > 0;
      });
    }

    return true;
  }


  function getLeadPayload() {
    return {
      questionnaireSlug: config.slug,
      fullName: String(answers.fullName ?? "").trim(),
      email: String(answers.email ?? "").trim(),
      phone: String(answers.phone ?? "").trim(),
      whatsappOptIn:
        answers.whatsappOptIn === true || answers.sendByWhatsapp === true,
      answers,
    };
  }

  function getNurseryBatchPayload() {
  return {
    questionnaireSlug: config.slug,
    action: "createNurseryBatch",
    answers,
  };
  }

  function getNurseryActivityPayload() {
    return {
      questionnaireSlug: config.slug,
      action: "logNurseryActivity",
      answers,
    };
  }

  function getNurseryTransplantPayload() {
    return {
      questionnaireSlug: config.slug,
      action: "recordNurseryTransplant",
      answers,
    };
  }

 async function runSlideAction(runName: string) {
  const actionMap: Record<
    string,
    { url: string; payload: () => Record<string, unknown> }
  > = {
    submitLead: {
      url: "/api/questionnaires/submit",
      payload: getLeadPayload,
    },
    createNurseryBatch: {
      url: "/api/nursery-ops/create-batch",
      payload: getNurseryBatchPayload,
    },
    logNurseryActivity: {
      url: "/api/nursery-ops/log-activity",
      payload: getNurseryActivityPayload,
    },
    recordNurseryTransplant: {
      url: "/api/nursery-ops/record-transplant",
      payload: getNurseryTransplantPayload,
    },
  };

  const action = actionMap[runName];

  if (!action) {
    return true;
  }

  setIsSubmitting(true);
  setSubmitError(null);

  try {
    const response = await fetch(action.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action.payload()),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Failed to run action.");
    }

    if (
      runName === "createNurseryBatch" &&
      data?.generatedBatchCode &&
      typeof data.generatedBatchCode === "string"
    ) {
      setAnswers((prev) => ({
        ...prev,
        opsGeneratedBatchCode: data.generatedBatchCode,
      }));
    }

      return true;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to run action."
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNext() {
    if (!currentSlide || !canGoNext() || isSubmitting) return;

    if (currentSlide.run) {
      const ok = await runSlideAction(currentSlide.run);
      if (!ok) return;
    }

    next();
  }

  if (!currentSlide) {
    return <main>No slides available.</main>;
  }

  const progress =
    totalStepCount > 0
      ? (Math.max(currentStepNumber, 0) / totalStepCount) * 100
      : 0;

  const showBackButton = currentSlide.showBack !== false;
  const showNextButton = currentSlide.showNext !== false;
  const hasVisibleNav = showBackButton || showNextButton;
  const showStepText =
    config.showStepText !== false && currentSlide.showStepText !== false;
  const hasPinnedChoices = Boolean(currentSlide.choices?.length);

  const backButtonStyle = resolveButtonStyle(
    theme,
    currentSlide.backStyleKey,
    "secondary"
  );

  const nextButtonStyle = resolveButtonStyle(
    theme,
    currentSlide.nextStyleKey,
    "primary"
  );

  const nextLabel =
    currentSlide.type === "shop" && currentSlide.shopMode === "review"
      ? `${
          sharedOrderSummary.grandTotal > 0
            ? currentSlide.nextLabel ?? "Pay now"
            : currentSlide.nextLabel ?? "Continue"
        } · ${formatCurrency(
          sharedOrderSummary.grandTotal,
          sharedShopCatalog?.currencyCode ?? "JMD"
        )}`
      : currentSlide.type === "shop"
        ? `${currentSlide.nextLabel ?? "Checkout"} · ${formatCurrency(
            currentShopSubtotal,
            currentShopCatalog?.currencyCode
          )}`
        : currentSlide.type === "delivery"
          ? `${currentSlide.nextLabel ?? "Review order"} · ${formatCurrency(
              sharedOrderSummary.subtotal + currentDeliveryFee,
              sharedShopCatalog?.currencyCode ?? "JMD"
            )}`
          : isSubmitting
            ? "Submitting..."
            : currentSlide.nextLabel ?? "Next";

    const stageBackgroundColor = isMediaSlide
      ? "#000000"
      : currentSlide.pageBackgroundColor ??
        withOpacity(theme.colors.card, currentSlide.cardOpacity);

    const resolvedProgressOverlayBackground =
      currentSlide.progressOverlayBackgroundColor ??
      (isMediaSlide
        ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0))"
        : "transparent");

    const resolvedActionBarBackground =
      currentSlide.actionBarBackgroundColor ?? "transparent";

    const resolvedProgressOverlayTextColor =
      currentSlide.progressOverlayTextColor ??
      (isTransparentColor(currentSlide.progressOverlayBackgroundColor)
        ? theme.colors.text
        : currentSlide.progressOverlayBackgroundColor
          ? getContrastTextColor(currentSlide.progressOverlayBackgroundColor)
          : isMediaSlide
            ? "#FFFFFF"
            : theme.colors.text);

    const resolvedActionBarTextColor =
      currentSlide.actionBarTextColor ??
      (isTransparentColor(currentSlide.actionBarBackgroundColor)
        ? theme.colors.text
        : currentSlide.actionBarBackgroundColor
          ? getContrastTextColor(currentSlide.actionBarBackgroundColor)
          : theme.colors.text);

    const actionBarHidden =
      isCurrentVerticalVideoPlaying && isVerticalMediaSlide;

    const isNurseryOps = config.slug === "nursery-ops";

  return (
    <main
      className={styles.page}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      <div className={styles.pageInner}>
        <div
          className={`${styles.card} ${isMediaSlide ? styles.cardMedia : ""}`}
          style={{
            borderColor: theme.colors.border,
            borderRadius: theme.radius?.card ?? "24px",
            boxShadow: theme.shadow?.card,
          }}
        >
          <div
            className={`${styles.slideStage} ${isMediaSlide ? styles.slideStageMedia : ""}`}
            style={{
              backgroundColor: stageBackgroundColor,
              backgroundImage: currentSlide.pageBackgroundImage
                ? `url(${currentSlide.pageBackgroundImage})`
                : undefined,
              backgroundSize: currentSlide.pageBackgroundSize ?? "cover",
              backgroundPosition: currentSlide.pageBackgroundPosition ?? "center",
              backgroundRepeat: currentSlide.pageBackgroundImage
                ? "no-repeat"
                : undefined,
            }}
          >
            <div
              className={styles.progressOverlay}
              style={{
                background: resolvedProgressOverlayBackground,
                color: resolvedProgressOverlayTextColor,
              }}
            >
              <div className={styles.overlayFrame}>
                {isNurseryOps ? (
                  <div className={styles.persistentTopActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => goToTarget("nursery-ops-home")}
                    >
                      Return Home
                    </button>

                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={resetNurseryOpsSession}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              
                {showStepText ? (
                  <div className={styles.stepText}>
                    Slide {currentStepNumber} of {totalStepCount}
                  </div>
                ) : null}

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${progress}%`,
                      background: theme.colors.primary,
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              ref={slideBodyRef}
              className={`${styles.slideBody} ${
                isMediaSlide ? styles.slideBodyMedia : ""
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  className={isMediaSlide ? styles.mediaStage : styles.slideContentFrame}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isMediaSlide ? (
                    <>
                      <MediaRenderer
                        slide={currentSlide}
                        onVerticalVideoPlayingChange={
                          setIsCurrentVerticalVideoPlaying
                        }
                      />

                      {hasRenderableSections(currentSlide.sections) ? (
                        <div className={styles.mediaTextOverlay}>
                          {renderSections(
                            currentSlide.sections,
                            theme,
                            answers,
                            currentSlide.storeAs,
                            setAnswer
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {renderSections(
                        currentSlide.sections,
                        theme,
                        answers,
                        currentSlide.storeAs,
                        setAnswer
                      )}

                      {currentSlide.type === "shop" ? (
                        <ShopSlideRenderer
                          slideMode={currentSlide.shopMode ?? "browse"}
                          catalog={currentShopCatalog}
                          cart={currentShopCart}
                          selectedLines={
                            currentSlide.shopMode === "review"
                              ? sharedOrderLines
                              : currentShopSelectedLines
                          }
                          totalWeight={
                            currentSlide.shopMode === "review"
                              ? sharedOrderLines.reduce(
                                  (sum, line) => sum + (line.lineWeight ?? 0),
                                  0
                                )
                              : currentShopTotalWeight
                          }
                          deliveryFee={
                            currentSlide.shopMode === "review"
                              ? sharedOrderSummary.deliveryFee
                              : 0
                          }
                          discountTotal={
                            currentSlide.shopMode === "review"
                              ? sharedOrderSummary.discountTotal
                              : 0
                          }
                          grandTotal={
                            currentSlide.shopMode === "review"
                              ? sharedOrderSummary.grandTotal
                              : currentShopSubtotal
                          }
                          activeDiscountLabel={activeDiscountDefinition?.label}
                          theme={theme}
                          answers={answers}
                          onToggleLine={(productId, sizeOptionId, selected) =>
                            updateCurrentShopCart((cart) =>
                              toggleShopLineSelected(
                                cart,
                                currentShopCatalog,
                                productId,
                                sizeOptionId,
                                selected
                              )
                            )
                          }
                          onSetQuantity={(productId, sizeOptionId, quantity) =>
                            updateCurrentShopCart((cart) =>
                              setShopLineQuantity(
                                cart,
                                productId,
                                sizeOptionId,
                                quantity
                              )
                            )
                          }
                          onSetPurchaseMode={(
                            productId,
                            sizeOptionId,
                            purchaseModeId
                          ) =>
                            updateCurrentShopCart((cart) =>
                              setShopLinePurchaseMode(
                                cart,
                                productId,
                                sizeOptionId,
                                purchaseModeId
                              )
                            )
                          }
                          onRemoveLine={(productId, sizeOptionId) => {
                            if (currentSlide.shopMode === "review") {
                              if (sharedOrderLines.length <= 1) {
                                goToTarget("plant-shop");
                                return;
                              }
                            }

                            updateCurrentShopCart((cart) =>
                              removeShopLine(cart, productId, sizeOptionId)
                            );
                          }}
                          onAdjustLine={(productId, sizeOptionId) => {
                            if (currentSlide.shopMode === "review") {
                              const targetKey = `${productId}::${sizeOptionId}`;

                              setAnswers((prev) => ({
                                ...prev,
                                shopFocusLineKey: targetKey,
                              }));

                              goToTarget("plant-shop");
                            }
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "delivery" ? (
                        <DeliverySlideRenderer
                          config={currentDeliveryConfig}
                          selection={currentDeliverySelection}
                          theme={theme}
                          onChange={(patch) =>
                            updateCurrentDeliverySelection((prev) => ({
                              ...prev,
                              ...patch,
                            }))
                          }
                        />
                      ) : null}

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" ? (
                        <ReviewSummaryRenderer
                          answers={answers}
                          deliverySelection={sharedDeliverySelection}
                          deliveryConfig={getDeliveryConfig(
                            mergedVariables,
                            "deliveryConfig"
                          )}
                          onAdjustDelivery={() => goToTarget("delivery-options")}
                          onAdjustContact={() => goToTarget("contact-details")}
                        />
                      ) : null}

                      {(currentSlide.type === "form" ||
                        currentSlide.type === "contact") &&
                      currentSlide.fields?.length ? (
                        <div
                          className={styles.formGrid}
                          style={{ marginTop: "20px" }}
                        >
                          {currentSlide.fields.map((field) => (
                            <FormFieldRenderer
                              key={field.name}
                              field={field}
                              theme={theme}
                              answers={answers}
                              variables={mergedVariables}
                              setAnswer={setAnswer}
                            />
                          ))}
                        </div>
                      ) : null}

                      {submitError ? (
                        <p className={styles.formError}>{submitError}</p>
                      ) : null}

                      <div className={styles.scrollBottomSpacer} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {hasPinnedChoices || hasVisibleNav ? (
              <div
                className={`${styles.actionBarOverlay} ${
                  actionBarHidden ? styles.actionBarShifted : ""
                }`}
                style={{
                  background: resolvedActionBarBackground,
                  color: resolvedActionBarTextColor,
                }}
              >
                <div className={styles.overlayFrame}>
                  {hasPinnedChoices ? (
                    <div className={styles.choiceStack}>
                      {currentSlide.choices?.map((choice) => {
                        const selected =
                          currentSlide.storeAs &&
                          answers[currentSlide.storeAs] === choice.value;

                        const choiceStyle = resolveButtonStyle(
                          theme,
                          choice.styleKey ?? currentSlide.buttonStyleKey,
                          "secondary"
                        );

                        return (
                          <button
                            key={`${currentSlide.id}-${String(choice.value)}`}
                            type="button"
                            onClick={() =>
                              handleChoiceClick(choice.value, choice.goto)
                            }
                            className={`${styles.secondaryButton} ${styles.actionButton}`}
                            style={{
                              borderColor: choiceStyle.borderColor,
                              background:
                                choice.styleKey || currentSlide.buttonStyleKey
                                  ? choiceStyle.background
                                  : selected
                                    ? choiceStyle.background
                                    : "#FFFFFF",
                              color:
                                choice.styleKey || currentSlide.buttonStyleKey
                                  ? choiceStyle.color
                                  : selected
                                    ? choiceStyle.color
                                    : resolvedActionBarTextColor,
                              opacity: selected ? 1 : 0.96,
                            }}
                          >
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {currentSlide.type === "shop" && currentSlide.shopMode === "review" ? (
                    <div className={styles.orderWeightSummary}>
                      Total order weight:{" "}
                      {formatWeight(
                        sharedOrderLines.reduce(
                          (sum, line) => sum + (line.lineWeight ?? 0),
                          0
                        ),
                        sharedShopCatalog?.weightUnit
                      )}
                    </div>
                  ) : null}

                  {currentSlide.type === "delivery" ? (
                    <div className={styles.orderWeightSummary}>
                      Items:{" "}
                      {formatCurrency(
                        sharedOrderSummary.subtotal,
                        sharedShopCatalog?.currencyCode ?? "JMD"
                      )}{" "}
                      · Delivery: {formatCurrency(currentDeliveryFee, "JMD")} · Total:{" "}
                      {formatCurrency(
                        sharedOrderSummary.subtotal + currentDeliveryFee,
                        sharedShopCatalog?.currencyCode ?? "JMD"
                      )}
                    </div>
                  ) : null}

                  {hasVisibleNav ? (
                    <div className={styles.navRow}>
                      {showNextButton ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={!canGoNext() || isSubmitting}
                          className={`${styles.primaryButton} ${styles.actionButton}`}
                          style={{
                            background: nextButtonStyle.background,
                            color: nextButtonStyle.color,
                            borderColor: nextButtonStyle.borderColor,
                            borderRadius: theme.radius?.button ?? "14px",
                          }}
                        >
                          {nextLabel}
                        </button>
                      ) : null}

                      {showBackButton ? (
                        <button
                          type="button"
                          onClick={back}
                          disabled={
                            ((currentIndex === 0 &&
                              history.length === 0 &&
                              !currentSlide.backGoto &&
                              !currentSlide.backRouteRules?.length) ||
                              isSubmitting)
                          }
                          className={`${styles.secondaryButton} ${styles.actionButton}`}
                          style={{
                            borderColor: backButtonStyle.borderColor,
                            background: backButtonStyle.background,
                            color:
                              backButtonStyle.background === "transparent"
                                ? resolvedActionBarTextColor
                                : backButtonStyle.color,
                          }}
                        >
                          {currentSlide.backLabel ?? "Back"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function DeliverySlideRenderer({
  config,
  selection,
  theme,
  onChange,
}: {
  config: DeliveryConfig | null;
  selection: DeliverySelection;
  theme: ThemeConfig;
  onChange: (patch: Partial<DeliverySelection>) => void;
}) {
  const regionOptions =
    selection.countryCode && config
      ? config.regionOptions[selection.countryCode] ?? []
      : [];

  if (!config) {
    return <p className={styles.body}>Delivery options are not available yet.</p>;
  }

  return (
    <div className={styles.deliveryStack}>
      <div className={styles.deliveryMethodStack}>
        <label className={styles.deliveryMethodRow}>
          <input
            type="radio"
            name="delivery-method"
            checked={selection.method === "pickup_stable"}
            onChange={() =>
              onChange({
                method: "pickup_stable",
                popupShopLocationId: undefined,
                countryCode: undefined,
                regionCode: undefined,
                addressLine1: undefined,
                addressLine2: undefined,
                apartmentOrUnit: undefined,
                cityOrTown: undefined,
                postalCode: undefined,
              })
            }
          />
          <span>Pick up at a stable location</span>
        </label>

        {selection.method === "pickup_stable" ? (
          <div className={styles.deliveryNestedList}>
            {config.stablePickupLocations.map((location) => (
              <label key={location.id} className={styles.deliveryChoiceCard}>
                <input
                  type="radio"
                  name="stable-pickup"
                  checked={selection.stablePickupLocationId === location.id}
                  onChange={() =>
                    onChange({ stablePickupLocationId: location.id })
                  }
                />
                <div className={styles.deliveryChoiceBody}>
                  <div className={styles.deliveryChoiceTitle}>{location.label}</div>
                  <div className={styles.deliveryChoiceMeta}>
                    {location.pickupWindowLabel}
                  </div>
                  {selection.stablePickupLocationId === location.id && location.notes ? (
                    <div className={styles.deliveryChoiceNote}>{location.notes}</div>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        ) : null}

        <label className={styles.deliveryMethodRow}>
          <input
            type="radio"
            name="delivery-method"
            checked={selection.method === "pickup_popup"}
            onChange={() =>
              onChange({
                method: "pickup_popup",
                stablePickupLocationId: undefined,
                countryCode: undefined,
                regionCode: undefined,
                addressLine1: undefined,
                addressLine2: undefined,
                apartmentOrUnit: undefined,
                cityOrTown: undefined,
                postalCode: undefined,
              })
            }
          />
          <span>Pick up at the next pop-up shop</span>
        </label>

        {selection.method === "pickup_popup" ? (
          <div className={styles.deliveryNestedList}>
            {config.popupShopLocations.map((location) => (
              <label key={location.id} className={styles.deliveryChoiceCard}>
                <input
                  type="radio"
                  name="popup-pickup"
                  checked={selection.popupShopLocationId === location.id}
                  onChange={() =>
                    onChange({ popupShopLocationId: location.id })
                  }
                />
                <div className={styles.deliveryChoiceBody}>
                  <div className={styles.deliveryChoiceTitle}>{location.label}</div>
                  <div className={styles.deliveryChoiceMeta}>
                    {location.eventDateLabel}
                  </div>
                  {selection.popupShopLocationId === location.id && location.notes ? (
                    <div className={styles.deliveryChoiceNote}>{location.notes}</div>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        ) : null}

        <label className={styles.deliveryMethodRow}>
          <input
            type="radio"
            name="delivery-method"
            checked={selection.method === "delivery"}
            onChange={() =>
              onChange({
                method: "delivery",
                stablePickupLocationId: undefined,
                popupShopLocationId: undefined,
              })
            }
          />
          <span>Deliver to my address</span>
        </label>

        {selection.method === "delivery" ? (
          <div className={styles.deliveryFormGrid}>
            <select
              className={styles.input}
              value={selection.countryCode ?? ""}
              onChange={(event) =>
                onChange({
                  countryCode:
                    (event.target.value as DeliverySelection["countryCode"]) ||
                    undefined,
                  regionCode: undefined,
                })
              }
              style={{ borderColor: theme.colors.border }}
            >
              <option value="">Select country</option>
              {config.countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>

            <select
              className={styles.input}
              value={selection.regionCode ?? ""}
              onChange={(event) =>
                onChange({
                  regionCode: event.target.value || undefined,
                })
              }
              style={{ borderColor: theme.colors.border }}
              disabled={!selection.countryCode}
            >
              <option value="">
                {selection.countryCode ? "Select parish / state / province" : "Select country first"}
              </option>
              {regionOptions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </select>

            <input
              className={styles.input}
              value={selection.addressLine1 ?? ""}
              onChange={(event) =>
                onChange({ addressLine1: event.target.value })
              }
              placeholder="Street address"
              style={{ borderColor: theme.colors.border }}
            />

            <input
              className={styles.input}
              value={selection.addressLine2 ?? ""}
              onChange={(event) =>
                onChange({ addressLine2: event.target.value })
              }
              placeholder="Address line 2 (optional)"
              style={{ borderColor: theme.colors.border }}
            />

            <input
              className={styles.input}
              value={selection.apartmentOrUnit ?? ""}
              onChange={(event) =>
                onChange({ apartmentOrUnit: event.target.value })
              }
              placeholder="Apartment / unit / suite"
              style={{ borderColor: theme.colors.border }}
            />

            <input
              className={styles.input}
              value={selection.cityOrTown ?? ""}
              onChange={(event) =>
                onChange({ cityOrTown: event.target.value })
              }
              placeholder="City / town"
              style={{ borderColor: theme.colors.border }}
            />

            <input
              className={styles.input}
              value={selection.postalCode ?? ""}
              onChange={(event) =>
                onChange({ postalCode: event.target.value })
              }
              placeholder="Postal code"
              style={{ borderColor: theme.colors.border }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewSummaryRenderer({
  answers,
  deliverySelection,
  deliveryConfig,
  onAdjustDelivery,
  onAdjustContact,
}: {
  answers: QuestionnaireAnswers;
  deliverySelection: DeliverySelection;
  deliveryConfig: DeliveryConfig | null;
  onAdjustDelivery: () => void;
  onAdjustContact: () => void;
}) {
  const stablePickup = deliveryConfig?.stablePickupLocations.find(
    (location) => location.id === deliverySelection.stablePickupLocationId
  );

  const popupPickup = deliveryConfig?.popupShopLocations.find(
    (location) => location.id === deliverySelection.popupShopLocationId
  );

  const region =
    deliverySelection.countryCode && deliverySelection.regionCode
      ? deliveryConfig?.regionOptions[deliverySelection.countryCode]?.find(
          (item) => item.code === deliverySelection.regionCode
        )
      : undefined;

  const country = deliverySelection.countryCode
    ? deliveryConfig?.countries.find(
        (item) => item.code === deliverySelection.countryCode
      )
    : undefined;

  return (
    <div className={styles.reviewSummaryStack}>
      <div className={styles.reviewSummaryCard}>
        <div className={styles.reviewSummaryHeader}>
          <div className={styles.reviewSummaryTitle}>Delivery / Pickup</div>
          <button
            type="button"
            className={styles.linkButton}
            onClick={onAdjustDelivery}
          >
            Adjust
          </button>
        </div>

        <div className={styles.reviewSummaryBody}>
          {deliverySelection.method === "pickup_stable" && stablePickup ? (
            <>
              <div>{stablePickup.label}</div>
              <div>{stablePickup.pickupWindowLabel}</div>
            </>
          ) : null}

          {deliverySelection.method === "pickup_popup" && popupPickup ? (
            <>
              <div>{popupPickup.label}</div>
              <div>{popupPickup.eventDateLabel}</div>
            </>
          ) : null}

          {deliverySelection.method === "delivery" ? (
            <>
              <div>Deliver to address</div>
              <div>
                {[deliverySelection.addressLine1, deliverySelection.addressLine2]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              <div>
                {[
                  deliverySelection.apartmentOrUnit,
                  deliverySelection.cityOrTown,
                  region?.label,
                  country?.label,
                  deliverySelection.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              <div>
                Delivery fee:{" "}
                {formatCurrency(deliverySelection.deliveryFeeJmd ?? 0, "JMD")}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className={styles.reviewSummaryCard}>
        <div className={styles.reviewSummaryHeader}>
          <div className={styles.reviewSummaryTitle}>Contact information</div>
          <button
            type="button"
            className={styles.linkButton}
            onClick={onAdjustContact}
          >
            Adjust
          </button>
        </div>

        <div className={styles.reviewSummaryBody}>
          <div>{String(answers.fullName ?? "").trim() || "No name added yet."}</div>
          {String(answers.phone ?? "").trim() ? (
            <div>{String(answers.phone ?? "").trim()}</div>
          ) : null}
          {String(answers.email ?? "").trim() ? (
            <div>{String(answers.email ?? "").trim()}</div>
          ) : null}
        </div>

        {deliverySelection.method === "delivery" ? (
          <div className={styles.contactNote}>
            Phone number is required for delivery orders.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShopSlideRenderer({
  slideMode,
  catalog,
  cart,
  selectedLines,
  totalWeight,
  deliveryFee,
  discountTotal,
  grandTotal,
  activeDiscountLabel,
  theme,
  answers,
  onToggleLine,
  onSetQuantity,
  onSetPurchaseMode,
  onRemoveLine,
  onAdjustLine,
}: {
  slideMode: "browse" | "review";
  catalog: ShopCatalog | null;
  cart: ShopCart;
  selectedLines: ShopResolvedCartLine[];
  totalWeight: number;
  deliveryFee: number;
  discountTotal: number;
  grandTotal: number;
  activeDiscountLabel?: string;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  onToggleLine: (
    productId: string,
    sizeOptionId: string,
    selected: boolean
  ) => void;
  onSetQuantity: (
    productId: string,
    sizeOptionId: string,
    quantity: number
  ) => void;
  onSetPurchaseMode: (
    productId: string,
    sizeOptionId: string,
    purchaseModeId?: string
  ) => void;
  onRemoveLine: (productId: string, sizeOptionId: string) => void;
  onAdjustLine?: (productId: string, sizeOptionId: string) => void;
}) {
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>(
    {}
  );
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (slideMode === "review") {
      const nextExpanded: Record<string, boolean> = {};
      for (const line of selectedLines) {
        nextExpanded[line.productId] = true;
      }
      setExpandedProducts(nextExpanded);
    }
  }, [slideMode, selectedLines]);

  const focusedLineKey =
    typeof answers.shopFocusLineKey === "string" ? answers.shopFocusLineKey : "";

  useEffect(() => {
    if (slideMode !== "browse" || !focusedLineKey) {
      return;
    }

    const [productId] = focusedLineKey.split("::");
    if (!productId) {
      return;
    }

    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: true,
    }));

    const node = productRefs.current[productId];

    if (node) {
      window.requestAnimationFrame(() => {
        node.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [slideMode, focusedLineKey]);

  if (!catalog?.products.length) {
    return <p className={styles.body}>No shop items available yet.</p>;
  }

  const products =
    slideMode === "review"
      ? catalog.products.filter((product) =>
          selectedLines.some((line) => line.productId === product.id)
        )
      : catalog.products;

  return (
    <div className={styles.shopStack}>
      {products.map((product) => {
        const isExpanded =
          slideMode === "review" || expandedProducts[product.id] === true;

        const firstReviewLine = selectedLines.find(
          (line) => line.productId === product.id
        );

        return (
          <div
            key={product.id}
            ref={(node) => {
              productRefs.current[product.id] = node;
            }}
            className={styles.productPanel}
            style={{ borderColor: theme.colors.border }}
          >
            <div className={styles.productPanelHeader}>
              <div className={styles.productHeaderMain}>
                <div className={styles.productImageWrap}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className={styles.productImage}
                    />
                  ) : (
                    <div
                      className={styles.productImageFallback}
                      style={{ borderColor: theme.colors.border }}
                    />
                  )}
                </div>

                <div className={styles.productHeaderText}>
                  <div className={styles.productTitleRow}>
                    <div className={styles.productTitleGroup}>
                      <h3 className={styles.productTitle}>{product.title}</h3>
                      {slideMode === "review" ? (
                        <span className={styles.cartItemBadge}>Cart item</span>
                      ) : null}
                    </div>

                    {slideMode === "review" && firstReviewLine ? (
                      <button
                        type="button"
                        className={styles.adjustLinkButton}
                        onClick={() =>
                          onAdjustLine?.(product.id, firstReviewLine.sizeOptionId)
                        }
                      >
                        Adjust
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {slideMode === "browse" ? (
                <button
                  type="button"
                  className={styles.seeCostButton}
                  onClick={() =>
                    setExpandedProducts((prev) => ({
                      ...prev,
                      [product.id]: !prev[product.id],
                    }))
                  }
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  {isExpanded ? "Hide details" : "See details"}
                </button>
              ) : null}
            </div>

            {isExpanded ? (
              <div className={styles.sizeRows}>
                {product.sizeOptions
                  .filter((sizeOption) => {
                    if (slideMode === "browse") return true;

                    return selectedLines.some(
                      (line) =>
                        line.productId === product.id &&
                        line.sizeOptionId === sizeOption.id
                    );
                  })
                  .map((sizeOption) => {
                    const lineKey = `${product.id}::${sizeOption.id}`;
                    const cartLine = cart[lineKey];
                    const resolvedLine =
                      slideMode === "review"
                        ? selectedLines.find(
                            (line) =>
                              line.productId === product.id &&
                              line.sizeOptionId === sizeOption.id
                          )
                        : undefined;

                    const selected =
                      slideMode === "review" ? true : cartLine?.selected === true;
                    const quantity = Math.max(1, cartLine?.quantity ?? 1);
                    const activePurchaseMode =
                      sizeOption.purchaseModes?.find(
                        (mode) => mode.id === cartLine?.purchaseModeId
                      ) ?? sizeOption.purchaseModes?.[0];

                    const unitPrice =
                      slideMode === "review"
                        ? resolvedLine?.unitPrice ??
                          sizeOption.price + (activePurchaseMode?.priceAdjustment ?? 0)
                        : sizeOption.price + (activePurchaseMode?.priceAdjustment ?? 0);

                    return (
                      <div
                        key={sizeOption.id}
                        className={styles.sizeRowBlock}
                        style={{ borderTopColor: theme.colors.border }}
                      >
                        <div className={styles.sizeRow}>
                          {slideMode === "browse" ? (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                const nextSelected = event.target.checked;

                                if (
                                  nextSelected &&
                                  sizeOption.purchaseModes?.length &&
                                  !cartLine?.purchaseModeId
                                ) {
                                  onSetPurchaseMode(
                                    product.id,
                                    sizeOption.id,
                                    getDefaultPurchaseModeId(sizeOption)
                                  );
                                }

                                onToggleLine(
                                  product.id,
                                  sizeOption.id,
                                  nextSelected
                                );
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className={styles.removeLineButton}
                              onClick={() => onRemoveLine(product.id, sizeOption.id)}
                              style={{
                                borderColor: theme.colors.border,
                                color: theme.colors.text,
                              }}
                            >
                              Remove
                            </button>
                          )}

                          <div className={styles.sizeLabel}>{sizeOption.label}</div>

                          <div className={styles.sizePrice}>
                            {resolvedLine?.baseUnitPrice !== undefined &&
                            resolvedLine.baseUnitPrice > unitPrice ? (
                              <div>
                                <div
                                  style={{
                                    textDecoration: "line-through",
                                    opacity: 0.6,
                                    fontSize: "0.9em",
                                  }}
                                >
                                  {formatCurrency(
                                    resolvedLine.baseUnitPrice,
                                    catalog.currencyCode
                                  )}
                                </div>
                                <div>
                                  {formatCurrency(unitPrice, catalog.currencyCode)}
                                </div>
                              </div>
                            ) : (
                              formatCurrency(unitPrice, catalog.currencyCode)
                            )}
                          </div>

                          <QuantityControl
                            quantity={quantity}
                            disabled={slideMode === "browse" ? !selected : false}
                            onDecrease={() =>
                              onSetQuantity(product.id, sizeOption.id, quantity - 1)
                            }
                            onIncrease={() =>
                              onSetQuantity(product.id, sizeOption.id, quantity + 1)
                            }
                            theme={theme}
                          />
                        </div>

                        {slideMode === "browse" && sizeOption.purchaseModes?.length ? (
                          <div className={styles.purchaseModes}>
                            {sizeOption.purchaseModes.map((mode) => {
                              const checked =
                                (cartLine?.purchaseModeId ?? activePurchaseMode?.id) ===
                                mode.id;

                              return (
                                <label
                                  key={mode.id}
                                  className={styles.purchaseModeOption}
                                >
                                  <input
                                    type="radio"
                                    name={`${product.id}-${sizeOption.id}-purchase-mode`}
                                    checked={checked}
                                    disabled={slideMode === "browse" ? !selected : true}
                                    onChange={() =>
                                      onSetPurchaseMode(
                                        product.id,
                                        sizeOption.id,
                                        mode.id
                                      )
                                    }
                                  />
                                  <span>{mode.label}</span>
                                  {mode.priceAdjustment !== 0 ? (
                                    <span className={styles.purchaseModePrice}>
                                      {mode.priceAdjustment > 0 ? "+" : ""}
                                      {formatCurrency(
                                        mode.priceAdjustment,
                                        catalog.currencyCode
                                      )}
                                    </span>
                                  ) : null}
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        {slideMode === "review" ? (
                          <div className={styles.reviewMetaRow}>
                            {resolvedLine?.purchaseModeLabel ? (
                              <span>{resolvedLine.purchaseModeLabel}</span>
                            ) : null}

                            {sizeOption.weight !== undefined ? (
                              <span>
                                Weight:{" "}
                                {formatWeight(
                                  sizeOption.weight * quantity,
                                  catalog.weightUnit
                                )}
                              </span>
                            ) : null}

                            {resolvedLine?.discountLabel && resolvedLine.lineDiscount ? (
                              <span>
                                {resolvedLine.discountLabel} · -
                                {formatCurrency(
                                  resolvedLine.lineDiscount,
                                  catalog.currencyCode
                                )}
                              </span>
                            ) : null}

                            <span>
                              Line total:{" "}
                              {formatCurrency(
                                resolvedLine?.lineTotal ?? unitPrice * quantity,
                                catalog.currencyCode
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
      })}

      {slideMode === "review" ? (
        <div className={styles.reviewTotals}>
          {activeDiscountLabel ? (
            <div>
              Discount: {activeDiscountLabel}
              {String(activeDiscountLabel).toLowerCase().includes("questionnaire")
                ? hasPhoneNote()
                : null}
            </div>
          ) : null}
          <div>
            Delivery fee: {formatCurrency(deliveryFee, catalog.currencyCode)}
          </div>
          <div>
            Discount total: -
            {formatCurrency(discountTotal, catalog.currencyCode)}
          </div>
          <div>
            Total order weight: {formatWeight(totalWeight, catalog.weightUnit)}
          </div>
          <div style={{ fontWeight: 700 }}>
            Total due: {formatCurrency(grandTotal, catalog.currencyCode)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuantityControl({
  quantity,
  disabled,
  onDecrease,
  onIncrease,
  theme,
}: {
  quantity: number;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  theme: ThemeConfig;
}) {
  return (
    <div className={styles.quantityControl}>
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={onDecrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        -
      </button>
      <span className={styles.quantityValue}>{quantity}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onIncrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        +
      </button>
    </div>
  );
}

function FormFieldRenderer({
  field,
  theme,
  answers,
  variables,
  setAnswer,
}: {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  variables?: QuestionnaireVariableMap;
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void;
}) {
  const resolvedLabel =
    replaceDynamicText(field.label, answers, variables) ?? field.label;

  const resolvedPlaceholder = replaceDynamicText(
    field.placeholder ?? field.label,
    answers,
    variables
  );

  if (field.type === "checkbox") {
    return (
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={Boolean(answers[field.name] ?? false)}
          onChange={(e) => setAnswer(field.name, e.target.checked)}
        />
        {resolvedLabel}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        className={styles.input}
        placeholder={resolvedPlaceholder}
        value={String(answers[field.name] ?? "")}
        onChange={(e) => setAnswer(field.name, e.target.value)}
        style={{
          borderColor: theme.colors.border,
          minHeight: "120px",
          resize: "vertical",
        }}
      />
    );
  }

  if (field.type === "date") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayValue = `${yyyy}-${mm}-${dd}`;

    return (
      <div style={{ display: "grid", gap: "10px" }}>
        <input
          className={styles.input}
          type="date"
          value={String(answers[field.name] ?? "")}
          onChange={(e) => setAnswer(field.name, e.target.value)}
          style={{ borderColor: theme.colors.border }}
        />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setAnswer(field.name, todayValue)}
          style={{
            borderColor: theme.colors.border,
            background: "#FFFFFF",
            color: theme.colors.text,
          }}
        >
          Use today
        </button>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <select
        className={styles.input}
        value={String(answers[field.name] ?? "")}
        onChange={(e) => setAnswer(field.name, e.target.value)}
        style={{ borderColor: theme.colors.border }}
      >
        <option value="">{resolvedPlaceholder || `Select ${resolvedLabel}`}</option>
        {(field.options ?? []).map((option) => (
          <option key={`${field.name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={styles.input}
      type={field.type}
      placeholder={resolvedPlaceholder}
      value={String(answers[field.name] ?? "")}
      onChange={(e) => setAnswer(field.name, e.target.value)}
      style={{ borderColor: theme.colors.border }}
    />
  );
}

function MediaRenderer({
  slide,
  onVerticalVideoPlayingChange,
}: {
  slide: {
    title: string;
    mediaUrl?: string;
    embedUrl?: string;
    mediaType?: "image" | "video";
    mediaAspect?: "horizontal" | "vertical" | "square";
    autoplay?: boolean;
  };
  onVerticalVideoPlayingChange?: (isPlaying: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(slide.autoplay === true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsMuted(slide.autoplay === true);
    setIsPlaying(false);
  }, [slide.mediaUrl, slide.embedUrl, slide.autoplay]);

  const isVerticalVideo =
    slide.mediaAspect === "vertical" &&
    slide.mediaType === "video" &&
    !slide.embedUrl;

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      void video.play().catch(() => null);
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  if (slide.embedUrl) {
    const embedSrc = appendYouTubeInlineParams(slide.embedUrl, {
      autoplay: slide.autoplay === true,
    });

    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : ""
          }`}
        >
          <iframe
            className={styles.mediaFrame}
            src={embedSrc}
            title={slide.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (slide.mediaType === "image" && slide.mediaUrl) {
    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : ""
          }`}
        >
          <img
            className={styles.mediaImage}
            src={slide.mediaUrl}
            alt={slide.title}
          />
        </div>
      </div>
    );
  }

  if (slide.mediaUrl) {
    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : ""
          }`}
        >
          <video
            ref={videoRef}
            className={styles.mediaVideo}
            src={slide.mediaUrl}
            controls={false}
            playsInline
            preload="metadata"
            autoPlay={slide.autoplay === true}
            muted={slide.autoplay === true}
            onClick={togglePlayPause}
            onPlay={() => {
              setIsPlaying(true);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(true);
              }
            }}
            onPause={() => {
              setIsPlaying(false);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(false);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(false);
              }
            }}
            onVolumeChange={(e) => {
              const video = e.currentTarget;
              setIsMuted(video.muted || video.volume === 0);
            }}
          />

          <button
            type="button"
            className={styles.mediaMuteButton}
            onClick={toggleMute}
          >
            {isMuted ? "Sound on" : "Mute"}
          </button>

          {!isPlaying ? (
            <button
              type="button"
              className={styles.mediaPlayOverlay}
              onClick={togglePlayPause}
              aria-label="Play video"
            >
              <span className={styles.mediaPlayTriangle} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

function appendYouTubeInlineParams(
  url: string,
  options?: { autoplay?: boolean }
) {
  if (!/youtube\.com|youtu\.be/i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);

    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("rel", "0");

    if (options?.autoplay) {
      parsed.searchParams.set("autoplay", "1");
      parsed.searchParams.set("mute", "1");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function renderSections(
  sections: SlideSection[] | undefined,
  theme: ThemeConfig,
  answers: QuestionnaireAnswers,
  storeAs: string | undefined,
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void
) {
  if (!sections?.length) return null;

  return (
    <div className={styles.storyStack}>
      {sections.map((section, index) => {
        if (section.type === "break") {
          return <div key={`break-${index}`} style={{ height: "18px" }} />;
        }

        if (section.type === "heading") {
          return (
            <h1
              key={`heading-${index}`}
              className={styles.title}
              style={{
                color:
                  (section.colorKey &&
                    theme.colors.lineColors?.[section.colorKey]) ??
                  theme.colors.accent ??
                  theme.colors.primary,
              }}
            >
              {section.text}
            </h1>
          );
        }

        if (section.type === "subheading") {
          return (
            <p
              key={`subheading-${index}`}
              className={styles.subtitle}
              style={{
                color:
                  (section.colorKey &&
                    theme.colors.lineColors?.[section.colorKey]) ??
                  theme.colors.subtitle ??
                  theme.colors.primary,
              }}
            >
              {section.text}
            </p>
          );
        }

        if (section.type === "feature") {
          if (section.feature.type === "numberscale") {
            return (
              <div key={`feature-${index}`} className={styles.scoreGrid}>
                {section.feature.options.map((option) => {
                  const selected = answers[storeAs ?? ""] === option.value;

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      disabled={option.disabled}
                      onClick={() =>
                        !option.disabled && storeAs && setAnswer(storeAs, option.value)
                      }
                      className={styles.scoreButton}
                      style={{
                        borderColor: theme.colors.border,
                        background: option.disabled
                          ? theme.colors.disabled
                          : selected
                            ? theme.colors.primary
                            : theme.colors.card,
                        color: option.disabled
                          ? "#666666"
                          : selected
                            ? "#FFFFFF"
                            : theme.colors.text,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            );
          }

          return null;
        }

        return (
          <p
            key={`paragraph-${index}`}
            className={styles.body}
            style={{
              color:
                (section.colorKey &&
                  theme.colors.lineColors?.[section.colorKey]) ??
                theme.colors.text,
            }}
          >
            {section.text}
          </p>
        );
      })}
    </div>
  );
}

function replaceDynamicText(
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

      const chosen =
        options.get(normalizedSource) ??
        options.get("default");

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

function hasRenderableSections(sections: SlideSection[] | undefined) {
  if (!sections?.length) return false;

  return sections.some((section) => section.type !== "break");
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

function formatCurrency(amount: number, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}

function formatWeight(weight: number, weightUnit = "lb") {
  return `${weight.toLocaleString()} ${weightUnit}`;
}