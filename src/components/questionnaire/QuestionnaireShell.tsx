"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import VerificationCodePanel from "@/customerAccess/components/VerificationCodePanel";
import AuthFormSlideRenderer from "./renderers/AuthFormSlideRenderer";
import AnnotatedTextSlideRenderer from "./renderers/AnnotatedTextSlideRenderer";
import SlideFooterActions from "./renderers/SlideFooterActions";
import AuthFooter from "@/customerAccess/components/AuthFooter";
import styles from "./QuestionnaireShell.module.css";
import {
  PrimitiveValue,
  RecordListItem,
  AnnotatedTextMode,
  Slide,
  SlideRouteRule,

  DataBlockAction,
  DataBlockDefinition,
  DataBlockSectionAction,
  DeliveryConfig,
  DeliverySelection,
  DiscountDefinition,
  DiscountedOrderSummary,
  DownloadButton,
  SlideFooterAction,
  FormField,
  PromotionEligibleItem,
  QuestionnaireAnswers,
  QuestionnaireConfig,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ShopCart,
  ShopCatalog,
  ShopCatalogProduct,
  ShopPurchaseRecipient,
  ShopResolvedCartLine,
  TicketAssignment,
  TicketAssignments,
  MealMenu,
  MealSelections,
  SlideSection,
  ThemeConfig,
  ShopCatalogSizeOption,
  TextPanelMode,
} from "@/types/questionnaire";

import { clearQuestionnaireVisitorState } from "@/lib/questionnaire/visitorState";
import {
  SUPPORTED_CURRENCIES,
  convertMoney,
  convertShopCatalogCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency/currencies";

import {
  evaluateConditionRule,
  getSlideIndexById,
  getVisibleSlides,
} from "@/lib/questionnaire/engine";

import {
  applyDiscountToShopLines,
  hasPhysicalFulfillmentItems,
  getDefaultPurchaseModeId,
  getDiscountDefinitionByCode,
  getShopCartTotalWeight,
  getShopCatalog,
  normalizeDiscountDefinitions,
  normalizeShopCart,
  removeShopLine,
  resolveShopCartLines,
  resolveShopSelectedLines,
  setShopLinePurchaseMode,
  setShopLinePurchaseRecipients,
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

import {
  getMealGroupTotal,
  getMealMenu,
  getMealRequiredLines,
  hasMealSelectionItems,
  isMealSelectionComplete,
  normalizeMealSelections,
  setMealOptionQuantity,
} from "@/lib/questionnaire/meals";

import {
  areRequiredTicketMealsComplete,
  buildTicketAssignmentsFromLines,
  calculateSingleTicketMealExtraTotal,
  calculateTicketMealExtraTotal,
  getTicketMealGroupTotal,
  getTicketMealOptionExtraTotal,
  getTicketMealSelectionSummary,
  getTicketsNeedingMeal,
  hasTicketsNeedingMeal,
  normalizeTicketAssignments,
  setTicketMealOptionQuantity,
  updateTicketAssignmentBoolean,
  updateTicketAssignmentField,
  updateTicketOwnerPaymentMode,
} from "@/lib/questionnaire/tickets";

import { prefillFirstTicketFromContact } from "@/lib/questionnaire/ticketAutofill";

import {
  getGatedAccessConfig,
  getMarketingQuestionsConfig,
  getPurchaseAccessConfig,
  type GatedAccessState,
} from "@/lib/questionnaire/accessConfig";

import {
  getSavedVideoResumeSeconds,
  getVideoStartSecondsForSlide,
  shouldShowVideoResumePrompt,
  type VideoResumeDecision,
} from "@/lib/questionnaire/videoResume";

import { useAuthSession } from "./hooks/useAuthSession";
import { useUrlSyncedSlide } from "./hooks/useUrlSyncedSlide";
import { useAccountProfileAutofill } from "./hooks/useAccountProfileAutofill";
import { useQuestionnaireEngagement } from "./hooks/useQuestionnaireEngagement";
import { useGatedAccessStatus } from "./hooks/useGatedAccessStatus";
import { useLoginReturnSlide } from "./hooks/useLoginReturnSlide";
import { useLoggedInGateBypass } from "./hooks/useLoggedInGateBypass";

import {
  getContrastTextColor,
  isTransparentColor,
  resolveButtonStyle,
  shouldShowAuthFooter,
  withOpacity,
} from "@/lib/questionnaire/display";

import {
  formatBlockRowValue,
  getDisplayValueFromBlockRow,
  getPrimitiveRecordValue,
  getRecordArray,
  getRecordListItems,
  getSelectedRecordFromSource,
  shouldShowBlockItem,
} from "@/lib/questionnaire/records";

import {
  buildPromotionDiscountDefinition,
  hasPhoneNote,
  isContactInfoComplete,
  normalizePromotionEligibleItems,
  resolvePromotionItem,
} from "@/lib/questionnaire/contactAndPromotion";

import {
  getQuestionnaireDownloadUrl,
  openQuestionnaireDownload,
} from "@/lib/questionnaire/downloads";

import {
  buildQuestionnaireLoginHref,
  readLoginReturnToFromSearch,
} from "@/lib/questionnaire/authNavigation";

import {
  getPasswordRequirementResults,
  getPasswordStrength,
} from "@/customerAccess/utils/passwordPolicy";

import {
  readLocalEngagementSnapshot,
  writeLocalQuestionAnswer,
  writeLocalVideoProgress,
} from "@/lib/questionnaire/engagementTracking";

type Props = {
  config: QuestionnaireConfig;
  theme: ThemeConfig;
};

const CHECKOUT_DRAFT_SLUG = "invitation";
const CHECKOUT_DRAFT_KEYS = [
  "fullName",
  "email",
  "phone",
  "whatsappOptIn",
  "sendByWhatsapp",
  "orderCart",
  "ticketAssignments",
  "deliverySelection",
  "selectedMealTicketCode",
  "appliedDiscountCode",
  "invitationOrderRequestKey",
] as const;
const CHECKOUT_RESERVATION_SECONDS = 25;

function getCheckoutDraftStorageKey(questionnaireSlug: string) {
  return `questionnaire:${questionnaireSlug}:answers`;
}

function readCheckoutDraft(questionnaireSlug: string): QuestionnaireAnswers {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(
    getCheckoutDraftStorageKey(questionnaireSlug)
  );

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as QuestionnaireAnswers;
  } catch {
    return {};
  }
}

function getCheckoutDraft(answers: QuestionnaireAnswers): QuestionnaireAnswers {
  const draft: QuestionnaireAnswers = {};

  for (const key of CHECKOUT_DRAFT_KEYS) {
    const value = answers[key];

    if (value !== undefined && value !== "") {
      draft[key] = value;
    }
  }

  return draft;
}

function hasCheckoutDraftValue(draft: QuestionnaireAnswers) {
  return Object.keys(draft).length > 0;
}

function writeCheckoutDraft(
  questionnaireSlug: string,
  answers: QuestionnaireAnswers
) {
  if (typeof window === "undefined") {
    return;
  }

  const draft = getCheckoutDraft(answers);
  const storageKey = getCheckoutDraftStorageKey(questionnaireSlug);

  if (!hasCheckoutDraftValue(draft)) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function clearCheckoutDraft(questionnaireSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getCheckoutDraftStorageKey(questionnaireSlug));
}


type VideoSeekRequest = {
  id: string;
  percent?: number;
  seconds?: number;
  play?: boolean;
  pauseAtSeconds?: number;
};

type TimedTextAudioRequest = {
  id: string;
  src: string;
  seconds: number;
  pauseAtSeconds?: number;
};

type MediaControlRequest = {
  id: string;
  action: "toggle-mute" | "toggle-play";
};

type MediaState = {
  isMuted: boolean;
  isPlaying: boolean;
};

function isInternalOnlyPurchaseMode(
  purchaseModes: NonNullable<ShopCatalogSizeOption["purchaseModes"]>
) {
  return (
    purchaseModes.length === 1 &&
    (purchaseModes[0]?.id === "standard" ||
      purchaseModes[0]?.id === "default" ||
      purchaseModes[0]?.id === "standard-invitation")
  );
}

function isHiddenTicketDeliveryPurchaseMode(modeId: string | undefined) {
  return modeId === "digital-invitation" || modeId === "physical-invitation";
}

function getVisiblePurchaseModes(
  product: ShopCatalogProduct,
  sizeOption: ShopCatalogSizeOption
) {
  const purchaseModes = sizeOption.purchaseModes ?? [];

  if (product.fulfillmentType !== "ticket") {
    return purchaseModes;
  }

  return purchaseModes.filter(
    (mode) => !isHiddenTicketDeliveryPurchaseMode(mode.id)
  );
}


export default function QuestionnaireShell({ config, theme }: Props) {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [cartInventoryNotices, setCartInventoryNotices] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [
    checkoutReservationSecondsRemaining,
    setCheckoutReservationSecondsRemaining,
  ] = useState(CHECKOUT_RESERVATION_SECONDS);

  useAccountProfileAutofill({ setAnswers });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [authVerificationContext, setAuthVerificationContext] = useState<{
    identifier: string;
    delivery?: "code" | "link";
    method?: string;
    target?: string | null;
    successRedirect?: string | null;
    expiresInMinutes?: number;
    expiresInHours?: number;
    phoneChannel?: string | null;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
 
  const {
    authSessionUser,
    setAuthSessionUser,
    isAuthSessionLoaded,
    setIsAuthSessionLoaded,
  } = useAuthSession();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isTrackSidebarOpen, setIsTrackSidebarOpen] = useState(false);
  const [guestShopCurrencyCode, setGuestShopCurrencyCode] = useState("USD");
  const [activeFooterTextPanel, setActiveFooterTextPanel] = useState<{
    id: string;
    label: string;
    sourceUrl: string;
    mode?: AnnotatedTextMode;
  } | null>(null);
  const [textPanelMode, setTextPanelMode] = useState<TextPanelMode>("song");
  const [answeredQuestionSlideIds, setAnsweredQuestionSlideIds] = useState<
    string[]
  >([]);
  const [dbVideoProgressBySlideId, setDbVideoProgressBySlideId] = useState<
    Record<string, number>
  >({});

  useQuestionnaireEngagement({
    questionnaireSlug: config.slug,
    authSessionUserId: authSessionUser?.id,
    isAuthSessionLoaded,
    setAnsweredQuestionSlideIds,
    setDbVideoProgressBySlideId,
  });

  const [videoResumeDecisionBySlideId, setVideoResumeDecisionBySlideId] =
  useState<Record<string, VideoResumeDecision>>({});

  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [deleteBatchError, setDeleteBatchError] = useState<string | null>(null);
  const [deleteBatchConfirmation, setDeleteBatchConfirmation] = useState("");
  const [batchDataRefreshKey, setBatchDataRefreshKey] = useState(0);
  const [isCurrentVerticalVideoPlaying, setIsCurrentVerticalVideoPlaying] =
    useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoCurrentTimeSeconds, setVideoCurrentTimeSeconds] = useState(0);
  const [videoSeekRequest, setVideoSeekRequest] =
    useState<VideoSeekRequest | null>(null);
  const [timedTextAudioRequest, setTimedTextAudioRequest] =
    useState<TimedTextAudioRequest | null>(null);
  const [mediaControlRequest, setMediaControlRequest] =
    useState<MediaControlRequest | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({
    isMuted: false,
    isPlaying: false,
  });

  const previousVideoTimeRef = useRef(0);
  const slideBodyRef = useRef<HTMLDivElement | null>(null);
  const actionInFlightRef = useRef(false);
  const invitationOrderRequestKeyRef = useRef<string | null>(null);
  const shopReservationKeyRef = useRef<string | null>(null);
  const checkoutDraftHydratedRef = useRef(false);
  const shouldSkipNextCheckoutDraftWriteRef = useRef(true);
  const checkoutDraftCompletedRef = useRef(false);
  const searchParams = useSearchParams();

  
  const [gatedAccessState, setGatedAccessState] =
    useState<GatedAccessState | null>(null);
  const [purchasedItemKeys, setPurchasedItemKeys] = useState<string[]>([]);
  const [isPurchaseAccessLoaded, setIsPurchaseAccessLoaded] = useState(false);

  const [videoResumeOverrides, setVideoResumeOverrides] = useState<
    Record<string, number>
  >({});



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

  const gatedAccessConfig = useMemo(
    () => getGatedAccessConfig(mergedVariables),
    [mergedVariables]
  );

  const marketingQuestionsConfig = useMemo(
    () => getMarketingQuestionsConfig(mergedVariables),
    [mergedVariables]
  );

  const purchaseAccessConfig = useMemo(
    () => getPurchaseAccessConfig(mergedVariables),
    [mergedVariables]
  );

  useEffect(() => {
    if (config.slug !== CHECKOUT_DRAFT_SLUG) {
      checkoutDraftHydratedRef.current = true;
      shouldSkipNextCheckoutDraftWriteRef.current = false;
      return;
    }

    const draft = readCheckoutDraft(config.slug);

    checkoutDraftHydratedRef.current = true;

    if (!hasCheckoutDraftValue(draft)) {
      return;
    }

    const draftOrderRequestKey = String(
      draft.invitationOrderRequestKey ?? ""
    ).trim();

    if (draftOrderRequestKey) {
      invitationOrderRequestKeyRef.current = draftOrderRequestKey;
    }

    const draftReservationKey = String(
      draft.shopReservationKey ?? ""
    ).trim();

    if (draftReservationKey) {
      shopReservationKeyRef.current = draftReservationKey;
    }

    setAnswers((prev) => ({
      ...prev,
      ...draft,
    }));
  }, [config.slug]);

  useEffect(() => {
    if (
      config.slug !== CHECKOUT_DRAFT_SLUG ||
      !checkoutDraftHydratedRef.current ||
      checkoutDraftCompletedRef.current
    ) {
      return;
    }

    if (shouldSkipNextCheckoutDraftWriteRef.current) {
      shouldSkipNextCheckoutDraftWriteRef.current = false;
      return;
    }

    writeCheckoutDraft(config.slug, answers);
  }, [answers, config.slug]);


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

  const requestedTicketCode = useMemo(() => {
    return String(searchParams.get("ticketCode") ?? "").trim();
  }, [searchParams]);

  const isTicketOwnerPortalFlow = useMemo(() => {
    return searchParams.get("ticketOwner") === "1";
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

  const selectedBatchRecord = useMemo(
    () =>
      getSelectedRecordFromSource(
        mergedVariables,
        "nurseryBatches",
        String(answers.opsSelectedBatchCode ?? "").trim()
      ),
    [mergedVariables, answers.opsSelectedBatchCode]
  );

  const selectedBatchSubsetRecord = useMemo(
    () =>
      getSelectedRecordFromSource(
        mergedVariables,
        "nurseryBatchSubsets",
        String(answers.opsSelectedBatchSubsetCode ?? "").trim()
      ),
    [mergedVariables, answers.opsSelectedBatchSubsetCode]
  );

  const selectedTransplantRecord = useMemo(
    () =>
      getSelectedRecordFromSource(
        mergedVariables,
        "nurseryTransplantedIndividuals",
        String(answers.opsSelectedTransplantCode ?? "").trim()
      ),
    [mergedVariables, answers.opsSelectedTransplantCode]
  );


  const evaluationContext = useMemo<QuestionnaireAnswers>(
    () => ({
      ...mergedVariables,
      ...answers,
      selectedBatchCode:
        typeof selectedBatchRecord?.code === "string"
          ? selectedBatchRecord.code
          : String(answers.opsSelectedBatchCode ?? "").trim(),
      selectedBatchPlantName:
        typeof selectedBatchRecord?.plantName === "string"
          ? selectedBatchRecord.plantName
          : "",
      selectedBatchSubsetCode:
        typeof selectedBatchSubsetRecord?.code === "string"
          ? selectedBatchSubsetRecord.code
          : String(answers.opsSelectedBatchSubsetCode ?? "").trim(),
      selectedBatchSubsetPlantName:
        typeof selectedBatchSubsetRecord?.plantName === "string"
          ? selectedBatchSubsetRecord.plantName
          : "",
      selectedTransplantCode:
        typeof selectedTransplantRecord?.code === "string"
          ? selectedTransplantRecord.code
          : String(answers.opsSelectedTransplantCode ?? "").trim(),
      selectedTransplantPlantName:
        typeof selectedTransplantRecord?.plantName === "string"
          ? selectedTransplantRecord.plantName
          : "",
    }),
    [
      mergedVariables,
      answers,
      selectedBatchRecord,
      selectedBatchSubsetRecord,
      selectedTransplantRecord,
    ]
  );

  const resolvedBlocks = useMemo<Record<string, DataBlockDefinition>>(() => {
    const registryBlocks = config.blocks ?? {};
    const nextBlocks: Record<string, DataBlockDefinition> = {};

    for (const [blockKey, block] of Object.entries(registryBlocks)) {
      const resolvedSourceKey = block.sourceKey;
            const selectedValue =
        resolvedSourceKey === "nurseryBatches"
          ? String(answers.opsSelectedBatchCode ?? "").trim()
          : resolvedSourceKey === "nurseryBatchSubsets"
            ? String(answers.opsSelectedBatchSubsetCode ?? "").trim()
            : resolvedSourceKey === "nurseryTransplantedIndividuals"
              ? String(answers.opsSelectedTransplantCode ?? "").trim()
              : "";

      const blockSourceRecord = resolvedSourceKey
        ? getSelectedRecordFromSource(
            mergedVariables,
            resolvedSourceKey,
            selectedValue
          )
        : null;

      const rowContext: QuestionnaireAnswers = {
        ...evaluationContext,
        ...(blockSourceRecord ?? {}),
      };

      nextBlocks[blockKey] = {
        ...block,
               sections: block.sections.map((section) => ({
          ...section,
          action:
            section.action && shouldShowBlockItem(section.action, rowContext)
              ? section.action
              : undefined,
          rows: section.rows.map((row) => {
            const resolvedValue =
              getDisplayValueFromBlockRow(row) ??
              (row.valueField
                ? (() => {
                    const sourceValue = blockSourceRecord?.[row.valueField];
                    return typeof sourceValue === "string" ||
                      typeof sourceValue === "number" ||
                      typeof sourceValue === "boolean"
                      ? sourceValue
                      : undefined;
                  })()
                : undefined);

            return {
              ...row,
              value: resolvedValue,
            };
          }),
        })),
        actions: block.actions?.filter((action) =>
          shouldShowBlockItem(action, rowContext)
        ),
      };
    }

    return nextBlocks;
  }, [
    config.blocks,
    mergedVariables,
    answers.opsSelectedBatchCode,
    answers.opsSelectedBatchSubsetCode,
    answers.opsSelectedTransplantCode,
    evaluationContext,
  ]);

  
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
          blockKey: slide.blockKey,
          blockSourceKey: slide.blockSourceKey,
        })),
        evaluationContext
      ),
    [config.slides, evaluationContext, mergedVariables]
  );

  useGatedAccessStatus({
    questionnaireSlug: config.slug,
    gatedAccessConfig,
    authSessionUserId: authSessionUser?.id,
    isAuthSessionLoaded,
    searchParams,
    visibleSlides,
    setAuthSessionUser,
    setGatedAccessState,
    setHistory,
    setCurrentIndex,
  });

  const currentSlide = visibleSlides[currentIndex];
  const activeFooterPanelSlide = useMemo<Slide | null>(() => {
    if (!activeFooterTextPanel || !currentSlide) {
      return null;
    }

    return {
      id: `${currentSlide.id}-${activeFooterTextPanel.id}-panel`,
      type: "annotatedtext",
      title: activeFooterTextPanel.label,
      annotatedTextSourceUrl: activeFooterTextPanel.sourceUrl,
      annotatedTextMode: activeFooterTextPanel.mode,
    };
  }, [activeFooterTextPanel, currentSlide]);

  useEffect(() => {
    setActiveFooterTextPanel(null);
  }, [currentSlide?.id]);

  const sidebarSlideLinks = useMemo(
    () =>
      visibleSlides
        .filter(
          (slide) =>
            (slide.type === "media" || slide.type === "video") &&
            (slide.mediaType === "video" || Boolean(slide.mediaUrl))
        )
        .map((slide) => ({
          id: slide.id,
          label: slide.title || slide.id,
        })),
    [visibleSlides]
  );

  const sidebarAlbumDownloadItemId = useMemo(() => {
    for (const slide of visibleSlides) {
      const requests = slide.downloadRequests;

      if (!requests) {
        continue;
      }

      for (const request of Object.values(requests)) {
        if (request?.scope === "album" && request.itemId) {
          return request.itemId;
        }
      }
    }

    return null;
  }, [visibleSlides]);

  const dashboardSidebarLinks = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard#dashboard-projects", label: "Projects" },
      { href: "/dashboard#dashboard-tickets", label: "Tickets" },
      { href: "/dashboard#dashboard-inventory", label: "Inventory" },
      { href: "/dashboard#dashboard-currencies", label: "Currencies" },
    ],
    []
  );

  const hasLeftSidebarContent =
    dashboardSidebarLinks.length > 0 ||
    sidebarSlideLinks.length > 0 ||
    Boolean(sidebarAlbumDownloadItemId);

  useEffect(() => {
    if (!purchaseAccessConfig?.itemKey) {
      setPurchasedItemKeys([]);
      setIsPurchaseAccessLoaded(true);
      return;
    }

    if (!isAuthSessionLoaded) {
      return;
    }

    if (!authSessionUser?.id) {
      setPurchasedItemKeys([]);
      setIsPurchaseAccessLoaded(true);
      return;
    }

    const controller = new AbortController();

    async function loadPurchasedItems() {
      setIsPurchaseAccessLoaded(false);

      try {
        const response = await fetch("/api/account/purchased-items", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !Array.isArray(data?.items)) {
          setPurchasedItemKeys([]);
          return;
        }

        setPurchasedItemKeys(
          data.items
            .map((item: { itemKey?: unknown }) =>
              typeof item.itemKey === "string" ? item.itemKey : null
            )
            .filter((itemKey: string | null): itemKey is string =>
              Boolean(itemKey)
            )
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setPurchasedItemKeys([]);
        }
      } finally {
        setIsPurchaseAccessLoaded(true);
      }
    }

    loadPurchasedItems();

    return () => {
      controller.abort();
    };
  }, [authSessionUser?.id, isAuthSessionLoaded, purchaseAccessConfig?.itemKey]);

  useEffect(() => {
    if (
      !purchaseAccessConfig?.itemKey ||
      !purchaseAccessConfig.gateSlideId ||
      !isPurchaseAccessLoaded ||
      !currentSlide
    ) {
      return;
    }

    const hasPurchasedItem = purchasedItemKeys.includes(
      purchaseAccessConfig.itemKey
    );

    const gateIndex = getSlideIndexById(
      visibleSlides,
      purchaseAccessConfig.gateSlideId
    );

    if (gateIndex === -1) {
      return;
    }

    if (hasPurchasedItem) {
      if (currentSlide.id !== purchaseAccessConfig.gateSlideId) {
        return;
      }

      const accessSlideId = purchaseAccessConfig.accessSlideId;
      const accessIndex = accessSlideId
        ? getSlideIndexById(visibleSlides, accessSlideId)
        : -1;

      if (accessIndex !== -1) {
        setHistory((prev) => [...prev, currentIndex]);
        setCurrentIndex(accessIndex);
      }

      return;
    }

    if (currentSlide.id !== purchaseAccessConfig.gateSlideId) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex(gateIndex);
    }
  }, [
    currentIndex,
    currentSlide,
    isPurchaseAccessLoaded,
    purchaseAccessConfig,
    purchasedItemKeys,
    visibleSlides,
  ]);
  useUrlSyncedSlide({
    currentIndex,
    currentSlide,
    visibleSlides,
    searchParams,
    setHistory,
    setCurrentIndex,
  });

  useLoginReturnSlide({
    authSessionUserId: authSessionUser?.id,
    currentIndex,
    isAuthSessionLoaded,
    searchParams,
    visibleSlides,
    setHistory,
    setCurrentIndex,
  });

  useLoggedInGateBypass({
    authSessionUserId: authSessionUser?.id,
    currentIndex,
    currentSlide,
    gatedAccessConfig,
    isAuthSessionLoaded,
    visibleSlides,
    setHistory,
    setCurrentIndex,
  });

  const shouldShowOverlayTitle = currentSlide?.titlePlacement === "progress_overlay";


  const resolvedOverlayTitle = shouldShowOverlayTitle
    ? replaceDynamicText(currentSlide?.title, evaluationContext, mergedVariables)
    : undefined;

  const resolvedOverlaySubtitle = shouldShowOverlayTitle
    ? replaceDynamicText(currentSlide?.subtitle, evaluationContext, mergedVariables)
    : undefined;

  const currentRecordListItems = useMemo<RecordListItem[]>(() => {
    if (currentSlide?.type !== "recordlist") {
      return [];
    }

    if (currentSlide.id === "batch-subsets-list") {
      const selectedBatchCode = String(answers.opsSelectedBatchCode ?? "").trim();

      return getRecordListItems(
        {
          ...mergedVariables,
          nurseryBatchSubsets: getRecordArray(
            mergedVariables,
            "nurseryBatchSubsets"
          ).filter((record) => record.batchCode === selectedBatchCode),
        },
        currentSlide
      );
    }

      if (currentSlide.id === "batch-transplants-list") {
      const selectedBatchCode = String(answers.opsSelectedBatchCode ?? "").trim();

      return getRecordListItems(
        {
          ...mergedVariables,
          nurseryTransplantedIndividuals: getRecordArray(
            mergedVariables,
            "nurseryTransplantedIndividuals"
          ).filter((record) => record.batchCode === selectedBatchCode),
        },
        currentSlide
      );
    }

    if (currentSlide.id === "subset-transplants-list") {
      const selectedBatchSubsetId =
        typeof selectedBatchSubsetRecord?.id === "string"
          ? selectedBatchSubsetRecord.id
          : "";

      return getRecordListItems(
        {
          ...mergedVariables,
          nurseryTransplantedIndividuals: getRecordArray(
            mergedVariables,
            "nurseryTransplantedIndividuals"
          ).filter((record) => {
            const parentUnitId =
              typeof record.parentUnitId === "string" ? record.parentUnitId : "";
         return selectedBatchSubsetId
              ? parentUnitId === selectedBatchSubsetId
              : false;
          }),
        },
        currentSlide
      );
    }

    return getRecordListItems(mergedVariables, currentSlide);
  }, [
    mergedVariables,
    currentSlide,
    answers.opsSelectedBatchCode,
    selectedBatchSubsetRecord,
  ]);

  const currentBlock = useMemo<DataBlockDefinition | null>(() => {
    if (!currentSlide?.blockKey) {
      return null;
    }

    return resolvedBlocks[currentSlide.blockKey] ?? null;
  }, [currentSlide, resolvedBlocks]);

    const selectedRecord = useMemo(() => {
    if (currentBlock?.sourceKey === "nurseryTransplantedIndividuals") {
      return selectedTransplantRecord;
    }

    if (currentBlock?.sourceKey === "nurseryBatchSubsets") {
      return selectedBatchSubsetRecord;
    }

    if (currentBlock?.sourceKey === "nurseryBatches") {
      return selectedBatchRecord;
    }

    return null;
  }, [
    currentBlock,
    selectedTransplantRecord,
    selectedBatchSubsetRecord,
    selectedBatchRecord,
  ]);
    const currentDeleteAction = useMemo<DataBlockAction | null>(() => {
    if (!currentBlock?.actions?.length) {
      return null;
    }

    return (
      currentBlock.actions.find((action) => action.kind === "delete_record") ??
      null
    );
  }, [currentBlock]);

  const isMediaSlide =
    (currentSlide?.type === "media" || currentSlide?.type === "video") &&
    Boolean(currentSlide?.mediaUrl || currentSlide?.embedUrl);

  const isVerticalMediaSlide =
    isMediaSlide && currentSlide?.mediaAspect === "vertical";

  const isVideoProgressMode =
    isMediaSlide &&
    currentSlide?.mediaType === "video" &&
    currentSlide.progressMode === "video" &&
    Boolean(currentSlide.mediaUrl) &&
    !currentSlide.embedUrl;

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

    const [visiblePasswordFields, setVisiblePasswordFields] = useState<
    Record<string, boolean>
  >({});

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

  const currencyRates = useMemo(() => {
    const value = mergedVariables.currencyRates;

    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, number>)
      : {};
  }, [mergedVariables]);

  const activeShopCurrencyCode = normalizeCurrencyCode(
    authSessionUser?.preferredCurrencyCode ?? guestShopCurrencyCode
  );

  const jmdToActiveCurrencyRate = useMemo(() => {
    if (activeShopCurrencyCode === "JMD") {
      return 1;
    }

    const jmdRate = Number(currencyRates.JMD ?? 1);
    const targetRate = Number(currencyRates[activeShopCurrencyCode] ?? 1);

    if (!Number.isFinite(jmdRate) || jmdRate <= 0) {
      return 1;
    }

    return targetRate / jmdRate;
  }, [activeShopCurrencyCode, currencyRates]);

  const usdToActiveCurrencyRate = useMemo(() => {
    if (activeShopCurrencyCode === "USD") {
      return 1;
    }

    const targetRate = Number(currencyRates[activeShopCurrencyCode] ?? 1);

    return Number.isFinite(targetRate) && targetRate > 0 ? targetRate : 1;
  }, [activeShopCurrencyCode, currencyRates]);

  const currentShopDisplayCatalog = useMemo(() => {
    const baseCurrencyCode = currentShopCatalog?.currencyCode ?? "USD";
    const rate =
      baseCurrencyCode === activeShopCurrencyCode
        ? 1
        : Number(currencyRates[activeShopCurrencyCode] ?? 1);

    return convertShopCatalogCurrency(
      currentShopCatalog,
      activeShopCurrencyCode,
      rate
    );
  }, [currentShopCatalog, activeShopCurrencyCode, currencyRates]);

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
        ? resolveShopSelectedLines(currentShopDisplayCatalog, currentShopCart)
        : [],
    [currentSlide, currentShopDisplayCatalog, currentShopCart]
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

  const currentShopTotalWeight = useMemo(
    () =>
      currentSlide?.type === "shop"
        ? getShopCartTotalWeight(currentShopDisplayCatalog, currentShopCart)
        : 0,
    [currentSlide, currentShopDisplayCatalog, currentShopCart]
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

  const currentDeliveryFeeDisplay = useMemo(
    () => convertMoney(currentDeliveryFee, jmdToActiveCurrencyRate),
    [currentDeliveryFee, jmdToActiveCurrencyRate]
  );

  const sharedShopCatalog = useMemo(
    () =>
      getShopCatalog(mergedVariables, "orderCatalog") ??
      getShopCatalog(mergedVariables, "shopCatalog"),
    [mergedVariables]
  );

  const sharedShopDisplayCatalog = useMemo(() => {
    const baseCurrencyCode = sharedShopCatalog?.currencyCode ?? "USD";
    const rate =
      baseCurrencyCode === activeShopCurrencyCode
        ? 1
        : Number(currencyRates[activeShopCurrencyCode] ?? 1);

    return convertShopCatalogCurrency(
      sharedShopCatalog,
      activeShopCurrencyCode,
      rate
    );
  }, [sharedShopCatalog, activeShopCurrencyCode, currencyRates]);

  const sharedOrderCart = useMemo<ShopCart>(
    () => normalizeShopCart(answers.orderCart),
    [answers.orderCart]
  );

  const sharedOrderCartLines = useMemo<ShopResolvedCartLine[]>(
    () => resolveShopCartLines(sharedShopDisplayCatalog, sharedOrderCart),
    [sharedShopDisplayCatalog, sharedOrderCart]
  );

  const sharedOrderBaseLines = useMemo<ShopResolvedCartLine[]>(
    () => resolveShopSelectedLines(sharedShopDisplayCatalog, sharedOrderCart),
    [sharedShopDisplayCatalog, sharedOrderCart]
  );

  const sharedOrderLines = useMemo<ShopResolvedCartLine[]>(
    () => applyDiscountToShopLines(sharedOrderBaseLines, activeDiscountDefinition),
    [sharedOrderBaseLines, activeDiscountDefinition]
  );

  useEffect(() => {
    if (config.slug !== CHECKOUT_DRAFT_SLUG || sharedOrderLines.length === 0) {
      setCheckoutReservationSecondsRemaining(CHECKOUT_RESERVATION_SECONDS);
      return;
    }

    const timerId = window.setInterval(() => {
      setCheckoutReservationSecondsRemaining((seconds) =>
        Math.max(0, seconds - 1)
      );
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [config.slug, sharedOrderLines.length]);

  useEffect(() => {
    if (
      config.slug !== CHECKOUT_DRAFT_SLUG ||
      sharedOrderLines.length === 0 ||
      checkoutReservationSecondsRemaining !== 0
    ) {
      return;
    }

    void releaseShopCartReservation();
  }, [checkoutReservationSecondsRemaining, config.slug, sharedOrderLines.length]);

  const sharedTicketOrderLines = useMemo<ShopResolvedCartLine[]>(
    () =>
      sharedOrderLines.filter((line) => line.fulfillmentType === "ticket"),
    [sharedOrderLines]
  );

  const currentTicketAssignments = useMemo<TicketAssignments>(
    () => {
      const existingAssignments = normalizeTicketAssignments(
        answers.ticketAssignments
      );

      if (
        isTicketOwnerPortalFlow &&
        requestedTicketCode &&
        existingAssignments.some(
          (assignment) => assignment.ticketCode === requestedTicketCode
        )
      ) {
        return existingAssignments.filter(
          (assignment) => assignment.ticketCode === requestedTicketCode
        );
      }

      return prefillFirstTicketFromContact(
        buildTicketAssignmentsFromLines({
          lines: sharedTicketOrderLines,
          existingAssignments,
        }),
        answers
      );
    },
    [
      isTicketOwnerPortalFlow,
      requestedTicketCode,
      sharedTicketOrderLines,
      answers.ticketAssignments,
      answers.fullName,
      answers.email,
      answers.phone,
    ]
  );

  const latestTicketAssignmentsRef = useRef<TicketAssignments>(
    currentTicketAssignments
  );

  useEffect(() => {
    latestTicketAssignmentsRef.current = currentTicketAssignments;
  }, [currentTicketAssignments]);

  useEffect(() => {
    if (config.slug !== CHECKOUT_DRAFT_SLUG || isTicketOwnerPortalFlow) {
      return;
    }

    const savedAssignments = normalizeTicketAssignments(
      answers.ticketAssignments
    );

    if (!savedAssignments.length) {
      return;
    }

    const activeTicketCodes = new Set(
      currentTicketAssignments.map((assignment) => assignment.ticketCode)
    );
    const hasStaleAssignments = savedAssignments.some(
      (assignment) => !activeTicketCodes.has(assignment.ticketCode)
    );

    if (!hasStaleAssignments && savedAssignments.length === activeTicketCodes.size) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      ticketAssignments: currentTicketAssignments,
    }));
  }, [
    answers.ticketAssignments,
    config.slug,
    currentTicketAssignments,
    isTicketOwnerPortalFlow,
  ]);

  useEffect(() => {
    if (!requestedTicketCode) {
      return;
    }

    setAnswers((prev) => {
      if (String(prev.selectedMealTicketCode ?? "") === requestedTicketCode) {
        return prev;
      }

      return {
        ...prev,
        selectedMealTicketCode: requestedTicketCode,
        ticketOwnerPortalFlow: isTicketOwnerPortalFlow,
      };
    });
  }, [requestedTicketCode, isTicketOwnerPortalFlow]);

  useEffect(() => {
    if (!requestedTicketCode || !isTicketOwnerPortalFlow) {
      return;
    }

    const existingAssignments = normalizeTicketAssignments(
      answers.ticketAssignments
    );

    if (
      existingAssignments.some(
        (assignment) => assignment.ticketCode === requestedTicketCode
      )
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadTicketOwnerContext() {
      try {
        const response = await fetch(
          `/api/invitation/tickets/${encodeURIComponent(
            requestedTicketCode
          )}/context`,
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.assignment) {
          return;
        }

        setAnswers((prev) => ({
          ...prev,
          ...(data.answers && typeof data.answers === "object"
            ? data.answers
            : {}),
          selectedMealTicketCode: requestedTicketCode,
          ticketOwnerPortalFlow: true,
          ticketAssignments: [data.assignment],
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Ticket owner context load error:", error);
      }
    }

    void loadTicketOwnerContext();

    return () => controller.abort();
  }, [
    requestedTicketCode,
    isTicketOwnerPortalFlow,
    answers.ticketAssignments,
  ]);  

  const currentMealMenu = useMemo<MealMenu | null>(() => {
    const firstMenuId = getTicketsNeedingMeal(
      currentTicketAssignments
    )[0]?.mealMenuId;

    return convertMealMenuCurrency(
      getMealMenu(
        mergedVariables,
        currentSlide?.mealMenuKey ?? "mealMenus",
        firstMenuId
      ),
      usdToActiveCurrencyRate
    );
  }, [
    currentSlide,
    currentTicketAssignments,
    mergedVariables,
    usdToActiveCurrencyRate,
  ]);

  async function saveTicketOwnerMealSelection(nextAssignments: TicketAssignments) {
    if (!isTicketOwnerPortalFlow || !requestedTicketCode) {
      return true;
    }

    const assignment = nextAssignments.find(
      (item) => item.ticketCode === requestedTicketCode
    );

    if (!assignment) {
      return false;
    }

    const mealExtraTotal = calculateSingleTicketMealExtraTotal({
      menu: currentMealMenu,
      assignment,
    });

    try {
      const response = await fetch(
        `/api/invitation/tickets/${encodeURIComponent(
          requestedTicketCode
        )}/context`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            mealSelection: assignment.mealSelection ?? {},
            mealExtraTotal,
            wantsExtraFood: assignment.wantsExtraFood === true,
            hasMealNotes: assignment.hasMealNotes === true,
            mealNotes: assignment.mealNotes ?? "",
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok !== true) {
        console.error("Ticket owner meal save failed:", data);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Ticket owner meal save error:", error);
      return false;
    }
  }

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

  const sharedDeliveryFeeDisplay = useMemo(
    () => convertMoney(sharedDeliveryFee, jmdToActiveCurrencyRate),
    [sharedDeliveryFee, jmdToActiveCurrencyRate]
  );

  const sharedOrderSummary = useMemo<DiscountedOrderSummary>(
    () => summarizeDiscountedOrder(sharedOrderLines, sharedDeliveryFeeDisplay),
    [sharedOrderLines, sharedDeliveryFeeDisplay]
  );

  useEffect(() => {
    if (!answers.deliverySelection || sharedDeliverySelection.method !== "delivery") {
      return;
    }

    if (
      sharedDeliverySelection.deliveryFee === sharedDeliveryFeeDisplay &&
      sharedDeliverySelection.deliveryCurrencyCode === activeShopCurrencyCode &&
      sharedDeliverySelection.deliveryBaseFee === sharedDeliveryFee &&
      sharedDeliverySelection.deliveryBaseCurrencyCode === "JMD"
    ) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      deliverySelection: {
        ...sharedDeliverySelection,
        deliveryFee: sharedDeliveryFeeDisplay,
        deliveryCurrencyCode: activeShopCurrencyCode,
        deliveryBaseFee: sharedDeliveryFee,
        deliveryBaseCurrencyCode: "JMD",
      },
    }));
  }, [
    activeShopCurrencyCode,
    answers.deliverySelection,
    sharedDeliveryFee,
    sharedDeliveryFeeDisplay,
    sharedDeliverySelection,
  ]);

  const sharedMealMenu = useMemo<MealMenu | null>(() => {
    const firstMenuId = getTicketsNeedingMeal(
      currentTicketAssignments
    )[0]?.mealMenuId;

    return convertMealMenuCurrency(
      getMealMenu(mergedVariables, "mealMenus", firstMenuId),
      usdToActiveCurrencyRate
    );
  }, [currentTicketAssignments, mergedVariables, usdToActiveCurrencyRate]);

    const sharedMealExtraTotal = useMemo(
    () =>
      calculateTicketMealExtraTotal({
        menu: sharedMealMenu,
        assignments: currentTicketAssignments,
      }),
    [sharedMealMenu, currentTicketAssignments]
  );

  const sharedTicketOwnerAddonBudgetTotal = useMemo(
    () =>
      currentTicketAssignments.reduce((sum, assignment) => {
        if (
          assignment.ticketOwnerPaymentMode !==
          "owner_selects_sender_pays_addons"
        ) {
          return sum;
        }

        const budget = Number(assignment.ticketOwnerAddonBudget ?? 0);

        return sum + (Number.isFinite(budget) ? Math.max(0, budget) : 0);
      }, 0),
    [currentTicketAssignments]
  );

  const sharedTicketUpgradeTotal = useMemo(
    () =>
      currentTicketAssignments.reduce(
        (sum, assignment) =>
          sum +
          getTicketAssignmentUpgradePrice(
            sharedShopDisplayCatalog,
            assignment
          ),
        0
      ),
    [currentTicketAssignments, sharedShopDisplayCatalog]
  );

  const sharedOrderSubtotalWithMeals =
    sharedOrderSummary.subtotal +
    sharedMealExtraTotal +
    sharedTicketOwnerAddonBudgetTotal +
    sharedTicketUpgradeTotal;

  const sharedOrderGrandTotalWithMeals =
    sharedOrderSummary.grandTotal +
    sharedMealExtraTotal +
    sharedTicketOwnerAddonBudgetTotal +
    sharedTicketUpgradeTotal;

  const sidePanelCartTotal = sharedOrderGrandTotalWithMeals;
  const sidePanelCartCurrencyCode =
    sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode;
  const contactInfoComplete = useMemo(
    () => isContactInfoComplete(answers, sharedDeliverySelection),
    [answers, sharedDeliverySelection]
  );

  useEffect(() => {
    const endpoint = config.dynamicVariablesEndpoint;
    if (!endpoint) {
      return;
    }

    const controller = new AbortController();
    async function loadDynamicVariables() {
      try {
        let requestUrl = endpoint;

        if (config.slug === "self-trust") {
          const selfScore = answers.selfScore;
          const futureScore = answers.futureScore;

          if (selfScore === undefined || futureScore === undefined) {
            return;
          }

          const params = new URLSearchParams({
            selfScore: String(selfScore),
            futureScore: String(futureScore),
          });

          requestUrl = `${endpoint}?${params.toString()}`;
        }

        if (!requestUrl) {
          return;
        }

        const response = await fetch(requestUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
          return;
        }

        const nextVariables =
          data.variables && typeof data.variables === "object"
            ? data.variables
            : {
                ...(Array.isArray(data.nurseryBatches)
                  ? { nurseryBatches: data.nurseryBatches }
                  : {}),
                ...(Array.isArray(data.nurseryBatchSubsets)
                  ? { nurseryBatchSubsets: data.nurseryBatchSubsets }
                  : {}),
                ...(Array.isArray(data.nurseryTransplantedIndividuals)
                  ? {
                      nurseryTransplantedIndividuals:
                        data.nurseryTransplantedIndividuals,
                    }
                  : {}),
              };

        if (!Object.keys(nextVariables).length) {
          return;
        }

        setDynamicVariables((prev: QuestionnaireVariableMap) => ({
          ...prev,
          ...nextVariables,
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
    config.slug,
    config.dynamicVariablesEndpoint,
    answers.selfScore,
    answers.futureScore,
    answers.opsGeneratedBatchCode,
    batchDataRefreshKey,
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
    setVideoProgress(0);
    setVideoSeekRequest(null);
    setMediaControlRequest(null);
    setMediaState({
      isMuted: false,
      isPlaying: false,
    });
    previousVideoTimeRef.current = 0;
    setDownloadNotice(null);
    setSubmitError(null);

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

    function togglePasswordFieldVisibility(fieldName: string) {
    setVisiblePasswordFields((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  }

  function setAnswer(key: string, value: QuestionnaireVariableValue) {
    resetCheckoutReservation();

    if (
      currentSlide?.id &&
      marketingQuestionsConfig?.skipSlideIds?.includes(currentSlide.id)
    ) {
      writeLocalQuestionAnswer({
        questionnaireSlug: config.slug,
        slideId: currentSlide.id,
        questionKey: key,
        answer: value as PrimitiveValue,
      });
    }

    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function resetCheckoutReservation() {
    if (config.slug !== CHECKOUT_DRAFT_SLUG) {
      return;
    }

    setCheckoutReservationSecondsRemaining(CHECKOUT_RESERVATION_SECONDS);
  }

  function getShopReservationKey() {
    if (!shopReservationKeyRef.current) {
      const randomPart =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      shopReservationKeyRef.current = `shop-${config.slug}-${randomPart}`;
    }

    return shopReservationKeyRef.current;
  }

  async function reserveShopCartInventory(
    cart: ShopCart,
    catalogKey?: string
  ) {
    if (config.slug !== CHECKOUT_DRAFT_SLUG) {
      return cart;
    }

    const hasSelectedLines = Object.values(cart).some(
      (line) => line.selected === true && line.quantity > 0
    );

    if (!hasSelectedLines) {
      setCartInventoryNotices([]);
      return cart;
    }

    const reservationKey = getShopReservationKey();

    try {
      const response = await fetch("/api/shop/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationKey,
          catalogKey,
          cart,
          expiresInSeconds: CHECKOUT_RESERVATION_SECONDS,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setCartInventoryNotices([
          payload?.error ||
            "Inventory could not be reserved. Please review your cart before checkout.",
        ]);
        return cart;
      }

      const nextCart =
        payload?.cart && typeof payload.cart === "object"
          ? normalizeShopCart(payload.cart)
          : cart;
      const notices = Array.isArray(payload?.notices)
        ? payload.notices
            .map((notice: { message?: unknown }) =>
              typeof notice.message === "string" ? notice.message : ""
            )
            .filter(Boolean)
        : [];

      setCartInventoryNotices(notices);
      resetCheckoutReservation();

      setAnswers((prev) => {
        const nextAnswers: QuestionnaireAnswers = {
          ...prev,
          shopReservationKey: reservationKey,
          ...(currentSlide?.storeAs ? { [currentSlide.storeAs]: nextCart } : {}),
        };

        if (currentSlide?.storeAs === "orderCart") {
          const nextTicketLines = resolveShopSelectedLines(
            sharedShopDisplayCatalog,
            nextCart
          ).filter((line) => line.fulfillmentType === "ticket");

          nextAnswers.ticketAssignments = prefillFirstTicketFromContact(
            buildTicketAssignmentsFromLines({
              lines: nextTicketLines,
              existingAssignments: normalizeTicketAssignments(
                prev.ticketAssignments
              ),
            }),
            nextAnswers
          );
        }

        return nextAnswers;
      });

      return nextCart;
    } catch {
      setCartInventoryNotices([
        "Inventory could not be reserved. Please review your cart before checkout.",
      ]);
      return cart;
    }
  }

  async function releaseShopCartReservation() {
    const reservationKey = shopReservationKeyRef.current;

    if (!reservationKey) {
      return;
    }

    try {
      await fetch(
        `/api/shop/reservations?reservationKey=${encodeURIComponent(
          reservationKey
        )}`,
        { method: "DELETE" }
      );
    } catch {
      // The next reservation attempt will clean up expired holds server-side.
    }
  }

  function getAllFormFieldNames() {
    return Array.from(
      new Set(
        config.slides.flatMap((slide) =>
          slide.fields?.map((field) => field.name) ?? []
        )
      )
    );
  }

  function clearAllFormFieldAnswers() {
    const formFieldNames = getAllFormFieldNames();

    if (!formFieldNames.length) {
      return;
    }

    setAnswers((prev) => {
      const nextAnswers = { ...prev };

      for (const fieldName of formFieldNames) {
        nextAnswers[fieldName] = undefined;
      }

      return nextAnswers;
    });
  }

  function updateCurrentShopCart(
    updater: (cart: ShopCart) => ShopCart,
    options: { reserveInventory?: boolean } = {}
  ) {
    if (currentSlide?.type !== "shop" || !currentSlide.storeAs) return;

    const storeKey = currentSlide.storeAs;
    const nextCart = updater(currentShopCart);
    resetCheckoutReservation();

    if (storeKey === "orderCart") {
      const nextTicketLines = resolveShopSelectedLines(
        sharedShopDisplayCatalog,
        nextCart
      ).filter((line) => line.fulfillmentType === "ticket");
      const nextTicketAssignments = prefillFirstTicketFromContact(
        buildTicketAssignmentsFromLines({
          lines: nextTicketLines,
          existingAssignments: normalizeTicketAssignments(
            answers.ticketAssignments
          ),
        }),
        answers
      );

      setAnswers((prev) => ({
        ...prev,
        [storeKey]: nextCart,
        ticketAssignments: nextTicketAssignments,
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [storeKey]: nextCart,
      }));
    }

    const shouldReserveInventory =
      options.reserveInventory ||
      (currentSlide.shopMode === "review" &&
        Object.values(nextCart).some(
          (line) => line.selected === true && line.quantity > 0
        ));

    if (shouldReserveInventory) {
      void reserveShopCartInventory(nextCart, currentSlide.catalogKey);
    }
  }

  function updateCurrentDeliverySelection(
    updater: (selection: DeliverySelection) => DeliverySelection
  ) {
    if (currentSlide?.type !== "delivery" || !currentSlide.storeAs) return;

    const nextSelection = updater(currentDeliverySelection);
    const nextBaseFee = getDeliveryFeeJmd(currentDeliveryConfig, nextSelection);
    const nextFee = convertMoney(nextBaseFee, jmdToActiveCurrencyRate);

    setAnswer(currentSlide.storeAs, {
      ...nextSelection,
      deliveryFee: nextFee,
      deliveryCurrencyCode: activeShopCurrencyCode,
      deliveryBaseFee: nextBaseFee,
      deliveryBaseCurrencyCode: "JMD",
    });
  }

  function isExternalTarget(value: string) {
    return /^https?:\/\//i.test(value);
  }

  function openExternalTarget(value: string) {
    window.open(value, "_blank", "noopener,noreferrer");
  }

  function getCurrentReturnToPath() {
    const returnUrl = new URL(window.location.href);

    if (currentSlide?.id) {
      returnUrl.searchParams.set("loginReturnSlide", currentSlide.id);
    }

    return `${returnUrl.pathname}${returnUrl.search}`;
  }

  function getAuthLoginHref() {
    return buildQuestionnaireLoginHref(getCurrentReturnToPath());
  }

  function handleAuthLoginClick() {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);
    window.location.href = getAuthLoginHref();
  }

  function handleAccountMenuLink(target: string) {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);
    window.location.href = target;
  }

  function getSlideHref(slideId: string) {
    return `/questionnaire/${encodeURIComponent(config.slug)}?slide=${encodeURIComponent(
      slideId
    )}`;
  }

  function handleTrackSidebarSlideClick() {
    setIsTrackSidebarOpen(false);
    setIsAccountMenuOpen(false);
  }

  function handleSidebarAlbumDownload(itemId: string, format: "wav" | "mp3") {
    setIsTrackSidebarOpen(false);
    setIsAccountMenuOpen(false);
    triggerDownload(
      `${itemId}-${format}`,
      `Full Album ${format.toUpperCase()}`
    );
  }

  function getLoginReturnToTarget() {
    const returnTo = readLoginReturnToFromSearch(searchParams);

    if (!returnTo) {
      return null;
    }

    return returnTo;
  }

  function handleAnsweredQuestionsClick() {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);
    const target = marketingQuestionsConfig?.answeredQuestionsTarget;

    if (target) {
      window.location.href = target;
    }
  }

  async function handleAuthLogoutClick() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Logout failed.");
      }

      setAuthSessionUser(null);
      setIsAccountMenuOpen(false);
      setIsTrackSidebarOpen(false);

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClearVisitorState() {
    setIsAccountMenuOpen(false);

    try {
      await clearQuestionnaireVisitorState({
        questionnaireSlug: config.slug,
      });

      setGatedAccessState(null);
      setAuthSessionUser(null);
      setIsAuthSessionLoaded(true);
      setAnsweredQuestionSlideIds([]);
      setDbVideoProgressBySlideId({});
      setVideoResumeOverrides({});
      setVideoResumeDecisionBySlideId({});
    } finally {
      window.location.href = window.location.pathname;
    }
  }

  function goToTarget(target: string) {
    const shouldSkipMarketingQuestion =
      marketingQuestionsConfig?.skipWhenLoggedIn === true &&
      marketingQuestionsConfig.skipSlideIds?.includes(target) &&
      answeredQuestionSlideIds.includes(target) &&
      Boolean(marketingQuestionsConfig.skipTarget);

    if (shouldSkipMarketingQuestion && marketingQuestionsConfig?.skipTarget) {
      target = marketingQuestionsConfig.skipTarget;
    }

    if (isExternalTarget(target)) {
      openExternalTarget(target);
      return;
    }

    if (target.startsWith("/")) {
      window.location.href = target;
      return;
    }

    const shouldBypassGate =
      target === gatedAccessConfig?.gateSlideId &&
      (gatedAccessState?.hasAccess || authSessionUser?.id);

    const gatedTarget = shouldBypassGate
      ? gatedAccessState?.goto || gatedAccessConfig?.goto || target
      : target;

    if (
        gatedAccessState?.hasAccess &&
        !authSessionUser?.id &&
        gatedTarget === (gatedAccessState.goto || gatedAccessConfig?.goto)
      ) {
        const resumeSeconds = getSavedVideoResumeSeconds(
          dbVideoProgressBySlideId,
          gatedTarget
        );

        if (resumeSeconds > 0) {
          setVideoResumeOverrides((prev) => ({
            ...prev,
            [gatedTarget]: resumeSeconds,
          }));
        }
      }

    const targetIndex = getSlideIndexById(visibleSlides, gatedTarget);

    if (targetIndex !== -1) {
      const targetSlide = visibleSlides[targetIndex];
      const nextUrl = new URL(window.location.href);

      if (targetSlide?.syncUrl) {
        nextUrl.searchParams.set("slide", targetSlide.id);
      } else {
        nextUrl.searchParams.delete("slide");
      }

      window.history.replaceState(
        null,
        "",
        `${nextUrl.pathname}${nextUrl.search}`
      );
    }

    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex(targetIndex);
    }
  }

  function handleVideoProgressInput(value: string) {
    if (!currentSlide) {
      return;
    }

    const nextProgress = Number(value);

    if (!Number.isFinite(nextProgress)) {
      return;
    }

    const clampedProgress = Math.max(0, Math.min(100, nextProgress));

    setVideoProgress(clampedProgress);

    setVideoSeekRequest({
      id: `${currentSlide.id}-${Date.now()}`,
      percent: clampedProgress,
    });
  }

  function handleVideoProgressChange(payload: {
    currentTime: number;
    duration: number;
  }) {
    if (!currentSlide) {
      return;
    }

    const { currentTime, duration } = payload;
    setVideoCurrentTimeSeconds(currentTime);

    if (Number.isFinite(duration) && duration > 0) {
      setVideoProgress((currentTime / duration) * 100);
    } else {
      setVideoProgress(0);
    }

    const previousTime = previousVideoTimeRef.current;

    for (const route of currentSlide.videoRoutes ?? []) {
      const crossedRoute =
        previousTime < route.atSeconds && currentTime >= route.atSeconds;

      if (!crossedRoute) {
        continue;
      }

      previousVideoTimeRef.current = currentTime;
      goToTarget(route.goto);
      return;
    }

    previousVideoTimeRef.current = currentTime;
  }

  async function handleAccountCurrencyChange(currencyCode: string) {
    const nextCurrencyCode = normalizeCurrencyCode(currencyCode);

    if (!authSessionUser) {
      setGuestShopCurrencyCode(nextCurrencyCode);
      return;
    }

    setAuthSessionUser({
      ...authSessionUser,
      preferredCurrencyCode: nextCurrencyCode,
    });

    try {
      await fetch("/api/account/currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currencyCode: nextCurrencyCode }),
      });
    } catch {
      // Session refresh or the next manual change can retry this preference.
    }
  }

  function handleTimedTextLineClick(payload: {
    startSeconds: number;
    endSeconds?: number;
    playMode: "continue" | "line";
  }) {
    if (!currentSlide) {
      return;
    }

    const pauseAtSeconds =
      payload.playMode === "line" &&
      typeof payload.endSeconds === "number" &&
      payload.endSeconds > payload.startSeconds
        ? payload.endSeconds
        : undefined;
    const timedTextAudioSource =
      payload.playMode === "line"
        ? currentSlide.textPanelLinesMediaUrl || currentSlide.textPanelSongMediaUrl
        : currentSlide.textPanelSongMediaUrl;

    if (timedTextAudioSource) {
      setTimedTextAudioRequest({
        id: `${currentSlide.id}-timed-text-audio-${Date.now()}`,
        src: timedTextAudioSource,
        seconds: payload.startSeconds,
        pauseAtSeconds,
      });
      return;
    }

    setVideoSeekRequest({
      id: `${currentSlide.id}-timed-text-${Date.now()}`,
      seconds: payload.startSeconds,
      play: true,
      pauseAtSeconds,
    });
  }

  function handleCustomTextMerchRequest(selectedText: string) {
    const phrase = selectedText.trim().replace(/\s+/g, " ");

    if (!phrase) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      customLyricMerchPhrase: phrase,
      customLyricMerchTrack: currentSlide?.title ?? "",
      customLyricMerchSignature: true,
    }));
    setActiveFooterTextPanel(null);
    goToTarget("custom-lyric-merch");
  }


  function resetQuestionnaireSession() {
    clearCheckoutDraft(config.slug);
    checkoutDraftCompletedRef.current = false;
    setAnswers({});
    setHistory([]);
    setSubmitError(null);
    setDeleteBatchError(null);
    setDeleteBatchConfirmation("");
    setCurrentIndex(0);
  }

  function handleReturnHome() {
    clearAllFormFieldAnswers();
    goToTarget("home");
  }

  function handleCancel() {
    clearAllFormFieldAnswers();

    if (currentSlide?.cancelGoto) {
      goToTarget(currentSlide.cancelGoto);
      return;
    }

    if (currentSlide?.backGoto) {
      goToTarget(currentSlide.backGoto);
      return;
    }

    back();
  }

  function handleChoiceClick(value: PrimitiveValue, goto?: string) {
    const normalizedValue = String(value);

    if (currentSlide?.storeAs) {
      setAnswer(currentSlide.storeAs, value);
    }

      if (
    currentSlide?.id === gatedAccessConfig?.resumePromptSlideId &&
    normalizedValue === "continue"
  ) {
    const target = gatedAccessState?.goto || gatedAccessConfig?.goto;

    if (target) {
      const dbResumeSeconds = dbVideoProgressBySlideId[target] ?? 0;

      if (dbResumeSeconds > 0) {
        setVideoResumeOverrides((prev) => ({
          ...prev,
          [target]: dbResumeSeconds,
        }));
      }

      goToTarget(target);
      return;
    }
  }

  if (
      currentSlide?.id === gatedAccessConfig?.resumePromptSlideId &&
      normalizedValue === "beginning"
    ) {
      const beginningTarget =
      gatedAccessConfig?.startFromBeginningSlideId || goto || "home";

    if (gatedAccessConfig?.goto) {
      setVideoResumeOverrides((prev) => {
        const next = { ...prev };
        delete next[gatedAccessConfig.goto as string];
        return next;
      });
    }
      goToTarget(beginningTarget);
      return;
    }

    if (goto) {
      goToTarget(goto);
      return;
    }

    next();
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

async function next() {
  if (!currentSlide) return;

  if (currentSlide.run) {
    const ok = await runSlideAction(currentSlide.run);

    if (!ok) {
      return;
    }

  if (
    currentSlide.run === "submitSignup" ||
    currentSlide.run === "submitLogin" ||
    currentSlide.run === "startDeleteAccount" ||
    currentSlide.run === "submitDeleteAccount"
  ) {
    if (
      currentSlide.run === "submitLogin" &&
      currentSlide.id === purchaseAccessConfig?.gateSlideId &&
      currentSlide.goto
    ) {
      goToTarget(currentSlide.goto);
    }

    return;
  }
  }

    const shouldReturnToCart =
      String(answers.cartReturnTarget ?? "") === "review-order";

    if (shouldReturnToCart && currentSlide.id !== "review-order") {
      setAnswer("cartReturnTarget", "");
      setAnswer("mealReturnTarget", "");
      goToTarget("review-order");
      return;
    }

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
      if (currentShopSelectedLines.length === 0) {
        setSubmitError("Select at least one item before checkout.");
        return;
      }

      if (currentSlide.contactGoto && !contactInfoComplete) {
        goToTarget(currentSlide.contactGoto);
        return;
      }

      if (currentSlide.ticketGoto || sharedTicketOrderLines.length > 0) {
        setAnswer(
          "ticketAssignments",
          prefillFirstTicketFromContact(
            buildTicketAssignmentsFromLines({
              lines: sharedTicketOrderLines,
              existingAssignments: normalizeTicketAssignments(
                answers.ticketAssignments
              ),
            }),
            answers
          )
        );
        goToTarget(currentSlide.ticketGoto || "ticket-details");
        return;
      }

    if (
      currentSlide.deliveryGoto &&
      hasPhysicalFulfillmentItems(currentShopDisplayCatalog, currentShopCart)
    ) {
      goToTarget(currentSlide.deliveryGoto);
      return;
    }

    if (currentSlide.contactGoto) {
      goToTarget(currentSlide.contactGoto);
      return;
    }

    if (currentSlide.reviewGoto) {
      goToTarget(currentSlide.reviewGoto);
      return;
    }
    }

    if (currentSlide.type === "tickets") {
      const nextAssignments = prefillFirstTicketFromContact(
        buildTicketAssignmentsFromLines({
          lines: sharedTicketOrderLines,
          existingAssignments: normalizeTicketAssignments(
            answers.ticketAssignments
          ),
        }),
        answers
      );

      setAnswer("ticketAssignments", nextAssignments);

      if (
        currentSlide.deliveryGoto &&
        hasPhysicalFulfillmentItems(sharedShopDisplayCatalog, sharedOrderCart)
      ) {
        goToTarget(currentSlide.deliveryGoto);
        return;
      }

      if (currentSlide.contactGoto && !contactInfoComplete) {
        goToTarget(currentSlide.contactGoto);
        return;
      }

      if (currentSlide.reviewGoto) {
        goToTarget(currentSlide.reviewGoto);
        return;
      }
    }

    if (currentSlide.type === "meal") {
      if (isTicketOwnerPortalFlow && requestedTicketCode) {
        void saveTicketOwnerMealSelection(latestTicketAssignmentsRef.current).then((saved) => {
          if (!saved) {
            setSubmitError("Your meal selections could not be saved. Please try again.");
            return;
          }

          window.location.href = `/invitation/tickets/${encodeURIComponent(
            requestedTicketCode
          )}`;
        });

        return;
      }

      const mealReturnTarget =
        String(answers.mealReturnTarget ?? "") === "review-order"
          ? "review-order"
          : "ticket-details";

      if (mealReturnTarget === "review-order") {
        setAnswer("mealReturnTarget", "");
      }

      goToTarget(mealReturnTarget);
      return;
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
  }// End of  next() function

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

    if (currentSlide.type === "meal") {
      return true;
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
        const requiredFieldsFilled = currentSlide.fields.every((field) => {
        if (!field.required) return true;

        const value = answers[field.name];
        if (field.type === "checkbox") return value === true;

        return String(value ?? "").trim().length > 0;
      });

      if (!requiredFieldsFilled) {
        return false;
      }

      const hasPasswordField = currentSlide.fields.some(
        (field) => field.name === "password"
      );
      const hasConfirmPasswordField = currentSlide.fields.some(
        (field) => field.name === "confirmPassword"
      );

      if (hasPasswordField && hasConfirmPasswordField) {
        return (
          String(answers.password ?? "").length > 0 &&
          String(answers.password ?? "") ===
            String(answers.confirmPassword ?? "")
        );
      }

      return true;
    }

    if (currentSlide.type === "recordlist" && currentSlide.storeAs) {
      return String(answers[currentSlide.storeAs] ?? "").trim().length > 0;
    }

    return true;
  }

  function getAuthSignupPayload() {
    const firstName = String(answers.firstName ?? "").trim();
    const lastName = String(answers.lastName ?? "").trim();
    const fullName =
      String(answers.fullName ?? "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ");

    const identifier =
      String(answers.identifier ?? "").trim() ||
      String(answers.email ?? "").trim() ||
      String(answers.phone ?? "").trim();

    return {
      name: fullName,
      fullName,
      firstName,
      lastName,
      identifier,
      email: String(answers.email ?? "").trim(),
      phone: String(answers.phone ?? "").trim(),
      password: String(answers.password ?? ""),
      confirmPassword: String(answers.confirmPassword ?? ""),
      country: String(answers.country ?? "").trim(),
      city: String(answers.city ?? "").trim(),
      addressLine1: String(answers.addressLine1 ?? "").trim(),
      addressLine2: String(answers.addressLine2 ?? "").trim(),
      parishOrRegion: String(answers.parishOrRegion ?? "").trim(),
      postalCode: String(answers.postalCode ?? "").trim(),
    };
  }

  function getAuthIdentifierPayload() {
    const identifier =
      String(answers.identifier ?? "").trim() ||
      String(answers.email ?? "").trim() ||
      String(answers.phone ?? "").trim();

    return {
      identifier,
    };
  }

  function getAuthVerificationStartPayload() {
    const identifier =
      String(answers.identifier ?? "").trim() ||
      String(answers.email ?? "").trim() ||
      String(answers.phone ?? "").trim();

    const delivery: "code" | "link" =
      mergedVariables.authVerificationDelivery === "link" ? "link" : "code";

    const method =
      typeof mergedVariables.authVerificationMethod === "string"
        ? mergedVariables.authVerificationMethod
        : "email";

    const target =
      typeof mergedVariables.authVerificationTarget === "string"
        ? mergedVariables.authVerificationTarget
        : "account";

    const successRedirect =
      typeof mergedVariables.authVerificationSuccessRedirect === "string"
        ? mergedVariables.authVerificationSuccessRedirect
        : "/dashboard";

    const expiresInMinutesRaw =
      typeof mergedVariables.authVerificationExpiresInMinutes === "number"
        ? mergedVariables.authVerificationExpiresInMinutes
        : Number(mergedVariables.authVerificationExpiresInMinutes);

    const expiresInHoursRaw =
      typeof mergedVariables.authVerificationExpiresInHours === "number"
        ? mergedVariables.authVerificationExpiresInHours
        : Number(mergedVariables.authVerificationExpiresInHours);

    return {
      identifier,
      method,
      delivery,
      target,
      successRedirect,
      phoneChannel: null,
      ...(Number.isFinite(expiresInMinutesRaw) && expiresInMinutesRaw > 0
        ? { expiresInMinutes: expiresInMinutesRaw }
        : {}),
      ...(Number.isFinite(expiresInHoursRaw) && expiresInHoursRaw > 0
        ? { expiresInHours: expiresInHoursRaw }
        : {}),
    };
  }

  function getAuthLoginPayload() {
    return {
      identifier: String(answers.identifier ?? "").trim(),
      password: String(answers.password ?? ""),
    };
  }

  function getDeleteAccountPayload() {
    return {
      confirmation: String(answers.deleteConfirmation ?? "").trim(),
      deleteCode: String(answers.deleteCode ?? "").trim(),
    };
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

  function getInvitationOrderPayload() {
    const normalizedTicketAssignments = currentTicketAssignments.map(
      (assignment) => ({
        ...assignment,
        ownerName: String(assignment.ownerName ?? "").trim(),
        ownerEmail: String(assignment.ownerEmail ?? "").trim(),
        ownerPhone: "",
        emailTicketToOwner:
          assignment.isPurchaserTicket === true
            ? false
            : assignment.emailTicketToOwner === true,
        ticketOwnerPaymentMode:
          assignment.ticketOwnerPaymentMode ??
          "purchaser_pays_ticket_and_addons",
        ticketOwnerAddonBudget:
          typeof assignment.ticketOwnerAddonBudget === "number" &&
          Number.isFinite(assignment.ticketOwnerAddonBudget)
            ? Math.max(0, assignment.ticketOwnerAddonBudget)
            : 0,
      })
    );

    const existingOrderRequestKey = String(
      answers.invitationOrderRequestKey ?? ""
    ).trim();

    if (existingOrderRequestKey) {
      invitationOrderRequestKeyRef.current = existingOrderRequestKey;
    }

    if (!invitationOrderRequestKeyRef.current) {
      invitationOrderRequestKeyRef.current = `invitation-${config.slug}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
    }

    const orderRequestKey = invitationOrderRequestKeyRef.current;

    if (!existingOrderRequestKey) {
      setAnswers((prev) => ({
        ...prev,
        invitationOrderRequestKey: orderRequestKey,
      }));
    }

    return {
      questionnaireSlug: config.slug,
      orderRequestKey,
      fullName: String(answers.fullName ?? "").trim(),
      email: String(answers.email ?? "").trim(),
      phone: String(answers.phone ?? "").trim(),
      whatsappOptIn:
        answers.whatsappOptIn === true || answers.sendByWhatsapp === true,
      currencyCode: sharedShopDisplayCatalog?.currencyCode ?? "USD",
      orderCart: sharedOrderCart,
      resolvedLines: sharedOrderLines,
      ticketAssignments: normalizedTicketAssignments,
      deliverySelection: sharedDeliverySelection,
      orderSummary: {
        ...sharedOrderSummary,
        subtotal: sharedOrderSubtotalWithMeals,
        grandTotal: sharedOrderGrandTotalWithMeals,
        ticketOwnerAddonBudgetTotal: sharedTicketOwnerAddonBudgetTotal,
      },
      answers: {
        ...answers,
        invitationOrderRequestKey: orderRequestKey,
      },
    };
  }

  function getAuthForgotPasswordPayload() {
    return {
      identifier: String(answers.identifier ?? "").trim(),
      phoneChannel:
        typeof mergedVariables.authPasswordResetPhoneChannel === "string"
          ? mergedVariables.authPasswordResetPhoneChannel
          : undefined,
    };
  }

  function getAuthResetPasswordPayload() {
    return {
      token:
        searchParams.get("token") ||
        String(answers.passwordResetToken ?? "").trim(),
      password: String(answers.password ?? ""),
      confirmPassword: String(answers.confirmPassword ?? ""),
    };
  }

  function getAccountEmailRequestPayload() {
    return {
      email: String(answers.accountEmailAddress ?? "").trim(),
    };
  }

  function getAccountEmailVerificationPayload() {
    return {
      email: String(answers.accountEmailAddress ?? "").trim(),
      code: String(answers.accountEmailCode ?? "").trim(),
    };
  }

  function getAuthUpdateInfoPayload() {
    const firstName = String(answers.firstName ?? "").trim();
    const lastName = String(answers.lastName ?? "").trim();

    const name =
      String(answers.fullName ?? "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ");

    return {
      name,
      country: String(answers.country ?? "").trim(),
      city: String(answers.city ?? "").trim(),
      addressLine1: String(answers.addressLine1 ?? "").trim(),
      addressLine2: String(answers.addressLine2 ?? "").trim(),
      parishOrRegion: String(answers.parishOrRegion ?? "").trim(),
      postalCode: String(answers.postalCode ?? "").trim(),
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
    if (actionInFlightRef.current) {
      return false;
    }

    actionInFlightRef.current = true;
    setSubmitError(null);

    const actionMap: Record<
    string,
    {
      url: string;
      payload: () => Record<string, unknown>;
      successGoto?: string;
    }
  > = {
    checkSignupIdentifier: {
      url: "/api/signup/check-identifier",
      payload: getAuthIdentifierPayload,
    },

    submitSignup: {
      url: "/api/signup",
      payload: getAuthSignupPayload,
      successGoto: "signup-verify",
    },
    submitLogin: {
      url: "/api/login",
      payload: getAuthLoginPayload,
      successGoto: "login-success",
    },
    submitUpdateInfo: {
      url: "/api/account/update-info",
      payload: getAuthUpdateInfoPayload,
      successGoto: "account-saved",
    },
    requestAccountEmailUpdate: {
      url: "/api/account/email-addresses/request",
      payload: getAccountEmailRequestPayload,
      successGoto: "account-update-email-code",
    },
    submitAccountEmailVerification: {
      url: "/api/account/email-addresses/verify",
      payload: getAccountEmailVerificationPayload,
      successGoto: "account-saved",
    },
    startDeleteAccount: {
      url: "/api/account/delete/start",
      payload: getDeleteAccountPayload,
      successGoto: "delete-account-code",
    },
    submitDeleteAccount: {
      url: "/api/account/delete",
      payload: getDeleteAccountPayload,
      successGoto: "delete-account-confirmed",
    },
    submitLead: {
      url: "/api/questionnaires/submit",
      payload: getLeadPayload,
    },

    submitInvitationOrder: {
      url: "/api/invitation/orders/create",
      payload: getInvitationOrderPayload,
    },

    submitForgotPassword: {
      url: "/api/password/forgot",
      payload: getAuthForgotPasswordPayload,
      successGoto: "forgot-password-sent",
    },

    submitResetPassword: {
      url: "/api/password/reset",
      payload: getAuthResetPasswordPayload,
      successGoto: "reset-password-success",
    },

    createNurseryBatch: {
      url: "/api/questionnaires/nursery-ops/create-batch",
      payload: getNurseryBatchPayload,
    },
    logNurseryActivity: {
      url: "/api/questionnaires/nursery-ops/log-activity",
      payload: getNurseryActivityPayload,
    },
    recordNurseryTransplant: {
      url: "/api/questionnaires/nursery-ops/record-transplant",
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
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action.payload()),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Failed to run action.");
    }

    setSubmitError(null);

    if (runName === "requestAccountEmailUpdate") {
      const requestedEmail =
        typeof data?.emailAddress?.email === "string"
          ? data.emailAddress.email
          : String(answers.accountEmailAddress ?? "").trim();

      setAuthVerificationContext({
        identifier: requestedEmail,
        delivery: "code",
        method: "email",
        target: "accountEmailUpdate",
        successRedirect: null,
        phoneChannel: null,
      });
    }

    if (runName === "submitSignup") {
      const verificationResponse = await fetch("/api/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getAuthVerificationStartPayload()),
      });

      const verificationData = await verificationResponse
        .json()
        .catch(() => null);

      if (!verificationResponse.ok) {
        throw new Error(
          verificationData?.error ||
            verificationData?.details ||
            "Account was created, but the verification message could not be sent."
        );
      }

      if (verificationData?.deliveryResult?.ok === false) {
        throw new Error(
          verificationData.deliveryResult?.error?.message ||
            "Account was created, but the verification message could not be delivered."
        );
      }
      setAuthVerificationContext(getAuthVerificationStartPayload());
    }

    if (runName === "submitLogin" && data?.user?.id) {
      setAuthSessionUser({
        id: String(data.user.id),
        name: typeof data.user.name === "string" ? data.user.name : null,
        email: typeof data.user.email === "string" ? data.user.email : null,
        phone: typeof data.user.phone === "string" ? data.user.phone : null,
      });
      setIsAuthSessionLoaded(true);
    }

      if (
        runName === "checkSignupIdentifier" &&
        data?.exists === true &&
        data?.verified === true
    ) {
      throw new Error(
        data?.message ||
          "An account already exists with this email address or phone number. Please log in instead."
      );
    }

    if (
      runName === "checkSignupIdentifier" &&
      data?.exists === true &&
      data?.needsVerification === true
    ) {
      const verificationPayload = getAuthVerificationStartPayload();

      const verificationResponse = await fetch("/api/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verificationPayload),
      });

      const verificationData = await verificationResponse
        .json()
        .catch(() => null);

      if (!verificationResponse.ok) {
        throw new Error(
          verificationData?.error ||
            verificationData?.details ||
            "Account already exists but still needs verification, but the verification message could not be sent."
        );
      }

      if (verificationData?.deliveryResult?.ok === false) {
        throw new Error(
          verificationData.deliveryResult?.error?.message ||
            "Account already exists but still needs verification, but the verification message could not be delivered."
        );
      }

      setAuthVerificationContext(verificationPayload);
      setSubmitError(
        data?.message ||
          "Account already exists but still needs verification. We sent a new verification code."
      );

      goToTarget("signup-verify");

      return false;
    }

    if (runName === "submitDeleteAccount") {
      setAnswers((prev) => ({
        ...prev,
        deleteAccountStatus:
          typeof data?.status === "string" ? data.status : "received",
        deleteAccountMessage:
          typeof data?.message === "string"
            ? data.message
            : "Your account deletion request has been received.",
        deleteAccountScheduledAt:
          typeof data?.deletionScheduledAt === "string"
            ? data.deletionScheduledAt
            : "",
      }));
    }

    if (runName === "submitInvitationOrder") {
      clearCheckoutDraft(config.slug);
      checkoutDraftCompletedRef.current = true;
      setAnswers((prev) => ({
        ...prev,
        invitationOrderId:
          typeof data?.order?.id === "string" ? data.order.id : "",
        invitationOrderCode:
          typeof data?.order?.orderCode === "string"
            ? data.order.orderCode
            : "",
        invitationGuestPortalLinksSent:
          typeof data?.guestPortalLinksSent === "number"
            ? data.guestPortalLinksSent
            : 0,
      }));
    }

    if (action.successGoto) {
      setSubmitError(null);
      goToTarget(action.successGoto);
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
        actionInFlightRef.current = false;
        setIsSubmitting(false);
      }
  }

  async function handleDeleteRecord() {
    if (!selectedRecord || isDeletingBatch || !currentDeleteAction) {
      return;
    }

    const confirmationPhrase =
      currentDeleteAction.confirmationPhrase?.trim() || "delete record";

    if (deleteBatchConfirmation.trim() !== confirmationPhrase) {
      setDeleteBatchError(`Type "${confirmationPhrase}" to confirm deletion.`);
      return;
    }

    const deleteEndpoint = currentDeleteAction.deleteEndpoint?.trim();
    const deleteIdField = currentDeleteAction.deleteIdField?.trim();
    const deleteCodeField = currentDeleteAction.deleteCodeField?.trim();
    const deleteIdPayloadKey =
      currentDeleteAction.deleteIdPayloadKey?.trim() || "recordId";
    const deleteCodePayloadKey =
      currentDeleteAction.deleteCodePayloadKey?.trim() || "recordCode";
    const deleteConfirmationPayloadKey =
      currentDeleteAction.deleteConfirmationPayloadKey?.trim() || "confirmation";

    if (!deleteEndpoint) {
      setDeleteBatchError("Delete endpoint is not configured.");
      return;
    }

    const recordId = getPrimitiveRecordValue(selectedRecord, deleteIdField);
    const recordCode = getPrimitiveRecordValue(selectedRecord, deleteCodeField);

    setIsDeletingBatch(true);
    setDeleteBatchError(null);

    try {
      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(deleteIdField ? { [deleteIdPayloadKey]: recordId } : {}),
          ...(deleteCodeField ? { [deleteCodePayloadKey]: recordCode } : {}),
          [deleteConfirmationPayloadKey]: deleteBatchConfirmation,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete record.");
      }

      setDynamicVariables((prev) => {
        const nextState: QuestionnaireVariableMap = { ...prev };

        for (const sourceKey of currentDeleteAction.deleteRefreshSources ?? []) {
          if (!Array.isArray(prev[sourceKey])) {
            continue;
          }

          nextState[sourceKey] = prev[sourceKey]?.filter((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return true;
            }

            const record = item as Record<string, QuestionnaireVariableValue>;
            const sourceId = getPrimitiveRecordValue(record, deleteIdField);
            const sourceCode = getPrimitiveRecordValue(record, deleteCodeField);
            const relatedBatchCode =
              typeof record.batchCode === "string" ? record.batchCode : undefined;

            if (deleteIdField && recordId !== undefined && sourceId === recordId) {
              return false;
            }

            if (deleteCodeField && recordCode !== undefined && sourceCode === recordCode) {
              return false;
            }

            if (deleteCodeField && recordCode !== undefined && relatedBatchCode === recordCode) {
              return false;
            }

            return true;
          });
        }

        return nextState;
      });

      setAnswers((prev) => {
        const nextAnswers = { ...prev };

        for (const key of currentDeleteAction.deleteClearAnswerKeys ?? []) {
          nextAnswers[key] = undefined;
        }

        return nextAnswers;
      });

      setDeleteBatchConfirmation("");
      setBatchDataRefreshKey((prev) => prev + 1);
      goToTarget(currentDeleteAction.deleteSuccessGoto ?? "home");
    } catch (error) {
      setDeleteBatchError(
        error instanceof Error ? error.message : "Failed to delete record."
      );
    } finally {
      setIsDeletingBatch(false);
    }
  }

function triggerDownload(downloadKey: string, label?: string) {
  setDownloadNotice(openQuestionnaireDownload(downloadKey, label));
}

function handleDownloadButtonClick(downloadButton: DownloadButton) {
  const requestKey = currentSlide?.downloadRequestKey;
  const requestTarget = currentSlide?.downloadRequests?.[downloadButton.key];

  if (requestKey && requestTarget) {
    setAnswers((prev) => ({
      ...prev,
      [requestKey]: downloadButton.key,
    }));

    const downloadFormatSlideId =
      visibleSlides.find((slide) => slide.downloadFormatOptions?.length)?.id ??
      null;

    if (downloadFormatSlideId) {
      goToTarget(downloadFormatSlideId);
      return;
    }

    setDownloadNotice("Choose MP3 or WAV to continue.");
    return;
  }

  triggerDownload(downloadButton.key, downloadButton.label);
}

function handleFooterAction(action: SlideFooterAction) {
  if (action.kind === "media") {
    const mediaAction = action.target ?? action.key;

    if (mediaAction === "toggle-mute" || mediaAction === "toggle-play") {
      setMediaControlRequest({
        id: `${currentSlide.id}-${mediaAction}-${Date.now()}`,
        action: mediaAction,
      });
    }

    return;
  }

  if (action.kind === "goto") {
    const target = action.target ?? action.key;

    if (target) {
      const targetSlide = visibleSlides.find((slide) => slide.id === target);

      if (targetSlide?.type === "annotatedtext") {
        setActiveFooterTextPanel((current) =>
          current?.id === targetSlide.id
            ? null
            : {
                id: targetSlide.id,
                label: action.label,
                sourceUrl: targetSlide.annotatedTextSourceUrl ?? "",
                mode: targetSlide.annotatedTextMode,
              }
        );
        return;
      }

      goToTarget(target);
    }

    return;
  }

  if (action.kind === "textpanel") {
    const sourceUrl = action.target ?? action.href;

    if (sourceUrl) {
      setActiveFooterTextPanel((current) =>
        current?.id === action.key && current.sourceUrl === sourceUrl
          ? null
          : {
              id: action.key,
              label: action.label,
              sourceUrl,
              mode: getFooterTextPanelMode(action),
            }
      );
    }

    return;
  }

  if (action.kind === "download") {
    triggerDownload(action.key, action.label);
    return;
  }

  if (action.kind === "auth") {
    if (action.key === "logout") {
      void handleAuthLogoutClick();
      return;
    }

    handleAuthLoginClick();
    return;
  }

  if (action.kind === "link" && action.href) {
    if (isExternalTarget(action.href)) {
      openExternalTarget(action.href);
      return;
    }

    window.location.href = action.href;
  }
}

function getFooterTextPanelMode(action: SlideFooterAction): AnnotatedTextMode | undefined {
  const key = action.key.toLowerCase();
  const label = action.label.toLowerCase();

  if (key === "lyrics" || label === "lyrics") {
    return "lyrics";
  }

  return undefined;
}

function getCurrentDownloadRequest() {
  const requestKey = currentSlide?.downloadRequestKey;

  if (!requestKey) {
    return null;
  }

  const selectedRequestKey = String(answers[requestKey] ?? "");

  if (!selectedRequestKey) {
    return null;
  }

  return currentSlide.downloadRequests?.[selectedRequestKey] ?? null;
}

function triggerDownloadRequest(format: "mp3" | "wav", label?: string) {
  const request = getCurrentDownloadRequest();

  if (!request) {
    setDownloadNotice("Choose what you want to download first.");
    return;
  }

  const baseDownloadKey =
    request.itemId ?? (request.scope === "album" ? "album" : "");

  if (!baseDownloadKey) {
    setDownloadNotice("This download is not configured yet.");
    return;
  }

  const downloadKey = `${baseDownloadKey}-${format}`;

  setDownloadNotice(openQuestionnaireDownload(downloadKey, label));
}

  
async function handleNext() {
  if (!currentSlide || !canGoNext() || isSubmitting) return;

  if (config.slug === "auth-login" && currentSlide.id === "login-success") {
    const returnTo = getLoginReturnToTarget();

    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
  }

  if (currentSlide.run) {
    const ok = await runSlideAction(currentSlide.run);
    if (!ok) return;
  }

  if (currentSlide.downloadKey) {
    window.location.href = getQuestionnaireDownloadUrl(currentSlide.downloadKey);

    return;
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
  const inlineChoices =
    currentSlide.choicePlacement === "inline" ? currentSlide.choices : undefined;
  const pinnedChoices =
    currentSlide.choicePlacement === "inline" ? undefined : currentSlide.choices;
  const showStepText =
  config.showStepText !== false && currentSlide.showStepText !== false;

  const showProgressBar = currentSlide.showProgressBar !== false;
  const isFooterEdgeProgress =
    showProgressBar && currentSlide.progressPlacement === "footer-edge";
  const progressControl = showProgressBar ? (
    isVideoProgressMode ? (
      <input
        className={styles.videoProgressInput}
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={videoProgress}
        aria-label="Video progress"
        onChange={(event) => handleVideoProgressInput(event.target.value)}
        style={{
          accentColor: theme.colors.primary,
        }}
      />
    ) : (
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${progress}%`,
            background: theme.colors.primary,
          }}
        />
      </div>
    )
  ) : null;
  const hasPinnedChoices = Boolean(pinnedChoices?.length);
  const hasDownloadButtons = Boolean(currentSlide.downloadButtons?.length);
  const footerActions = currentSlide.footerActions ?? [];
  const hasFooterActions = footerActions.length > 0;
  const shouldShowAccountMenu = true;
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

  const selectedMealTicket =
    currentSlide.type === "meal"
      ? currentTicketAssignments.find(
          (assignment) =>
            assignment.ticketCode === String(answers.selectedMealTicketCode ?? "")
        ) ?? null
      : null;

  const selectedMealExtraTotal =
    currentSlide.type === "meal" && selectedMealTicket
      ? calculateSingleTicketMealExtraTotal({
          menu: currentMealMenu,
          assignment: selectedMealTicket,
        })
      : 0;

  const mealNextLabel =
    String(answers.cartReturnTarget ?? "") === "review-order" ||
    String(answers.mealReturnTarget ?? "") === "review-order"
      ? "Back to cart"
      : currentSlide.nextLabel ?? "Back to ticket details";

  const cartReturnActive =
    String(answers.cartReturnTarget ?? "") === "review-order" &&
    currentSlide.id !== "review-order";

  const nextLabel =
    cartReturnActive && currentSlide.type === "shop"
      ? `Back to cart Â· ${formatCurrency(
          sharedOrderGrandTotalWithMeals,
          sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode
        )}`
      : cartReturnActive && currentSlide.type === "delivery"
        ? `Back to cart Â· ${formatCurrency(
            sharedOrderSubtotalWithMeals + currentDeliveryFeeDisplay,
            sharedShopDisplayCatalog?.currencyCode ?? "JMD"
          )}`
      : cartReturnActive && currentSlide.type !== "meal"
        ? "Back to cart"
      : currentSlide.type === "shop" && currentSlide.shopMode === "review"
      ? `${
          sharedOrderGrandTotalWithMeals > 0
            ? currentSlide.nextLabel ?? "Pay now"
            : currentSlide.nextLabel ?? "Continue"
        } · ${formatCurrency(
          sharedOrderGrandTotalWithMeals,
          sharedShopDisplayCatalog?.currencyCode ?? "JMD"
        )}`
      : currentSlide.type === "shop"
        ? `${currentSlide.nextLabel ?? "Checkout"} · ${formatCurrency(
            sharedOrderGrandTotalWithMeals,
            sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode
          )}`
        : currentSlide.type === "delivery"
          ? `${currentSlide.nextLabel ?? "Review order"} · ${formatCurrency(
              sharedOrderSubtotalWithMeals + currentDeliveryFeeDisplay,
              sharedShopDisplayCatalog?.currencyCode ?? "JMD"
            )}`
      : currentSlide.type === "meal"
        ? `${mealNextLabel} · ${formatCurrency(
            selectedMealExtraTotal,
            sharedShopDisplayCatalog?.currencyCode ?? "USD"
          )}`
      : isSubmitting
        ? "Submitting..."
        : currentSlide.nextLabel ?? "Next";

    const stageBackgroundColor = isMediaSlide
      ? "#000000"
      : currentSlide.pageBackgroundColor ??
        withOpacity(theme.colors.card, currentSlide.cardOpacity);

    const questionnaireOverlayMode = config.overlayMode ?? "transparent";

    const resolvedProgressOverlayBackground =
      currentSlide.progressOverlayBackgroundColor ??
      (isMediaSlide
        ? "transparent"
        : questionnaireOverlayMode === "opaque"
          ? "rgba(255,255,255,0.98)"
          : "transparent");

    const resolvedActionBarBackground =
      currentSlide.actionBarBackgroundColor ??
      (questionnaireOverlayMode === "opaque"
        ? "rgba(255,255,255,0.98)"
        : "transparent");

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

    const sharedOrderHasWeight = sharedOrderLines.some(
      (line) => typeof line.lineWeight === "number" && line.lineWeight > 0
    );

    const sharedOrderHasDeliveryFee =
      sharedOrderSummary.deliveryFee > 0 ||
      sharedDeliverySelection.method === "delivery";

    const sharedOrderNeedsFulfillment = sharedOrderLines.some(
      (line) => line.requiresPhysicalFulfillment === true
    );

    const sharedOrderHasDiscount =
      sharedOrderSummary.discountTotal > 0;

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
            borderColor: "transparent",
            borderRadius: "0",
            boxShadow: "none",
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
                {currentSlide.showReturnHome ||
                currentSlide.showCancel ||
                shouldShowAccountMenu ? (
                  <div className={styles.topUtilityRow}>
                    {hasLeftSidebarContent ? (
                      <div className={styles.sidebarToggleWrap}>
                        <button
                          type="button"
                          className={`${styles.sidebarToggleButton} ${styles.sidebarToggleButtonLeft}`}
                          onClick={() => {
                            setIsTrackSidebarOpen((prev) => !prev);
                            setIsAccountMenuOpen(false);
                          }}
                          aria-label="Open content sidebar"
                          aria-expanded={isTrackSidebarOpen}
                        >
                          <img
                            src="/icons/ui/sidebar-left.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        </button>

                        {isTrackSidebarOpen ? (
                          <>
                            <button
                              type="button"
                              className={styles.sidebarBackdrop}
                              aria-label="Close content sidebar"
                              onClick={() => setIsTrackSidebarOpen(false)}
                            />
                            <aside
                              className={`${styles.sidebarPanel} ${styles.sidebarPanelLeft}`}
                              aria-label="Content navigation"
                            >
                            <div className={styles.sidebarTitle}>
                              {config.slug
                                .split("-")
                                .map(
                                  (part) =>
                                    part.charAt(0).toUpperCase() + part.slice(1)
                                )
                                .join(" ") || "Content"}
                            </div>

                            {dashboardSidebarLinks.length ? (
                              <div className={styles.sidebarLinkList}>
                                {dashboardSidebarLinks.map((link) => (
                                  <a
                                    key={link.href}
                                    className={styles.sidebarLink}
                                    href={link.href}
                                  >
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            ) : null}

                            {sidebarSlideLinks.length ? (
                              <div className={styles.sidebarLinkList}>
                                {dashboardSidebarLinks.length ? (
                                  <div className={styles.sidebarDivider} />
                                ) : null}
                                {sidebarSlideLinks.map((track) => (
                                <a
                                  key={track.id}
                                  className={styles.sidebarLink}
                                  href={getSlideHref(track.id)}
                                  onClick={handleTrackSidebarSlideClick}
                                >
                                  {track.label}
                                </a>
                              ))}
                              </div>
                            ) : null}

                            {sidebarAlbumDownloadItemId ? (
                              <>
                                <div className={styles.sidebarDivider} />

                                <button
                                  type="button"
                                  className={styles.sidebarLink}
                                  onClick={() =>
                                    handleSidebarAlbumDownload(
                                      sidebarAlbumDownloadItemId,
                                      "wav"
                                    )
                                  }
                                >
                                  <img
                                    src="/icons/footer-controls/download.svg"
                                    alt=""
                                    aria-hidden="true"
                                  />
                                  WAV - Full Album
                                </button>

                                <button
                                  type="button"
                                  className={styles.sidebarLink}
                                  onClick={() =>
                                    handleSidebarAlbumDownload(
                                      sidebarAlbumDownloadItemId,
                                      "mp3"
                                    )
                                  }
                                >
                                  <img
                                    src="/icons/footer-controls/download.svg"
                                    alt=""
                                    aria-hidden="true"
                                  />
                                  MP3 - Full Album
                                </button>
                              </>
                            ) : null}
                            </aside>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {shouldShowAccountMenu ? (
                      <div className={styles.accountMenuWrap}>
                        <button
                          type="button"
                          className={styles.menuButton}
                          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                          aria-label="Open account menu"
                          aria-expanded={isAccountMenuOpen}
                        >
                          ☰
                        </button>

                        {isAccountMenuOpen ? (
                          <>
                            <button
                              type="button"
                              className={styles.sidebarBackdrop}
                              aria-label="Close account menu"
                              onClick={() => setIsAccountMenuOpen(false)}
                            />
                            <div className={styles.accountMenuPanel}>
                            {authSessionUser?.name ? (
                              <div className={styles.accountMenuName}>
                                <span>{authSessionUser.name}</span>
                                <span className={styles.accountMenuCredit}>
                                  Purchased credit:{" "}
                                  {formatCurrency(
                                    authSessionUser.storeCreditPurchasedBalance ?? 0,
                                    authSessionUser.storeCreditCurrencyCode ?? "USD"
                                  )}
                                </span>
                                <span className={styles.accountMenuCredit}>
                                  Returned credit:{" "}
                                  {formatCurrency(
                                    authSessionUser.storeCreditReturnedBalance ?? 0,
                                    authSessionUser.storeCreditCurrencyCode ?? "USD"
                                  )}
                                </span>
                                <label className={styles.accountCurrencyControl}>
                                  <span>Account currency</span>
                                  <select
                                    value={activeShopCurrencyCode}
                                    onChange={(event) =>
                                      handleAccountCurrencyChange(
                                        event.target.value
                                      )
                                    }
                                  >
                                    {SUPPORTED_CURRENCIES.map((currencyCode) => (
                                      <option
                                        key={currencyCode}
                                        value={currencyCode}
                                      >
                                        {currencyCode}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              className={`${styles.accountMenuItem} ${styles.accountMenuCartItem}`}
                              onClick={() =>
                                handleAccountMenuLink(
                                  "/questionnaire/invitation?slide=review-order"
                                )
                              }
                            >
                              <span>Cart</span>
                              <span>
                                {formatCurrency(
                                  sidePanelCartTotal,
                                  sidePanelCartCurrencyCode
                                )}
                              </span>
                            </button>

                            {authSessionUser ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account"
                                    )
                                  }
                                >
                                  Account
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=purchased-items"
                                    )
                                  }
                                >
                                  Purchased Items
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=purchase-for-others"
                                    )
                                  }
                                >
                                  Purchase for others
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=my-tickets"
                                    )
                                  }
                                >
                                  My Tickets
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=receipts"
                                    )
                                  }
                                >
                                  Receipts
                                </button>

                                {marketingQuestionsConfig ? (
                                  <button
                                    type="button"
                                    className={styles.accountMenuItem}
                                    onClick={handleAnsweredQuestionsClick}
                                  >
                                    Answered Questions
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={handleAuthLogoutClick}
                                  disabled={isSubmitting}
                                >
                                  Logout
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={handleAuthLoginClick}
                                  disabled={!isAuthSessionLoaded || isSubmitting}
                                >
                                  Login
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=purchased-items"
                                    )
                                  }
                                >
                                  Purchased Items
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=purchase-for-others"
                                    )
                                  }
                                >
                                  Purchase for others
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=my-tickets"
                                    )
                                  }
                                >
                                  My Tickets
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() =>
                                    handleAccountMenuLink(
                                      "/questionnaire/auth-account?slide=receipts"
                                    )
                                  }
                                >
                                  Receipts
                                </button>

                              </>
                            )}
                          </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {currentSlide.showReturnHome ? (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={handleReturnHome}
                      >
                        Return Home
                      </button>
                    ) : null}

                    {currentSlide.showCancel ? (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                ) : null}
              
                {showStepText ? (
                  <div className={styles.stepText}>
                    Slide {currentStepNumber} of {totalStepCount}
                  </div>
                ) : null}

              {shouldShowOverlayTitle &&
                (resolvedOverlayTitle || resolvedOverlaySubtitle) ? (
                  <div className={styles.overlayTitleStack}>
                    {resolvedOverlayTitle ? (
                      <div className={styles.overlayTitleMain}>
                        {resolvedOverlayTitle}
                      </div>
                    ) : null}

                    {resolvedOverlaySubtitle ? (
                      <div className={styles.overlayTitleSupport}>
                        {resolvedOverlaySubtitle}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isFooterEdgeProgress ? progressControl : null}
            
              </div>
            </div>

            <div
            ref={slideBodyRef}
            className={`${styles.slideBody} ${
              isMediaSlide ? styles.slideBodyMedia : ""
            } ${currentSlide.type === "authform" ? styles.slideBodyAuthForm : ""}`}
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
                      slide={{
                        ...currentSlide,
                        videoStartAtSeconds: getVideoStartSecondsForSlide({
                          currentSlide,
                          dbVideoProgressBySlideId,
                          videoResumeOverrides,
                          videoResumeDecisionBySlideId,
                        }),
                      }}
                        onVerticalVideoPlayingChange={
                          setIsCurrentVerticalVideoPlaying
                        }
                        onVideoProgressChange={(payload) => {
                          handleVideoProgressChange(payload);

                          if (currentSlide.mediaType === "video") {
                            if (payload.currentTime >= 3) {
                              writeLocalVideoProgress({
                                questionnaireSlug: config.slug,
                                slideId: currentSlide.id,
                                currentTime: payload.currentTime,
                                duration: payload.duration,
                              });
                            }

                            if (authSessionUser?.id && Math.floor(payload.currentTime) % 15 === 0) {
                              const snapshot = readLocalEngagementSnapshot(config.slug);

                              fetch("/api/questionnaires/engagement/sync", {
                                method: "POST",
                                credentials: "same-origin",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  questionnaireSlug: config.slug,
                                  source: "video-progress",
                                  snapshot,
                                }),
                              }).catch(() => null);
                            }
                          }
                        }}
                        videoSeekRequest={videoSeekRequest}
                        mediaControlRequest={mediaControlRequest}
                        onMediaStateChange={setMediaState}
                      />
                        {shouldShowVideoResumePrompt({
                          currentSlide,
                          dbVideoProgressBySlideId,
                          videoResumeOverrides,
                          videoResumeDecisionBySlideId,
                        }) ? (
                        <div className={styles.videoResumePrompt}>
                          <div className={styles.videoResumePromptCard}>
                            <p className={styles.videoResumePromptTitle}>
                              Continue watching?
                            </p>
                            <p className={styles.videoResumePromptText}>
                          You were watching this video before. Continue where you stopped last time,
                          or start from the beginning of this video?
                            </p>
                            <div className={styles.videoResumePromptActions}>
                              <button
                                type="button"
                                className={styles.primaryButton}
                                  onClick={() => {
                                    const resumeMode = currentSlide.videoResumeMode ?? "none";
                                    const savedSeconds = getSavedVideoResumeSeconds(
                                      dbVideoProgressBySlideId,
                                      currentSlide.id
                                    );

                                    if (resumeMode === "prompt-once") {
                                      setVideoResumeDecisionBySlideId((prev) => ({
                                        ...prev,
                                        [currentSlide.id]: "continue",
                                      }));
                                    }

                                    if (savedSeconds > 0) {
                                      setVideoResumeOverrides((prev) => ({
                                        ...prev,
                                        [currentSlide.id]: savedSeconds,
                                      }));

                                      setVideoSeekRequest({
                                        id: `${currentSlide.id}-resume-${Date.now()}`,
                                        seconds: savedSeconds,
                                      });
                                    }
                                  }}
                              >
                              Continue from where I stopped
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                  const resumeMode = currentSlide.videoResumeMode ?? "none";

                                  if (resumeMode === "prompt-once") {
                                    setVideoResumeDecisionBySlideId((prev) => ({
                                      ...prev,
                                      [currentSlide.id]: "beginning",
                                    }));
                                  }

                                  setVideoResumeOverrides((prev) => {
                                    const next = { ...prev };
                                    delete next[currentSlide.id];
                                    return next;
                                  });
                                }}
                              >
                                Start video from beginning
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {hasRenderableSections(currentSlide.sections) ? (
                        <div className={styles.mediaTextOverlay}>
                          {renderSections(
                            currentSlide.sections,
                            theme,
                            answers,
                            mergedVariables,
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
                        mergedVariables,
                        currentSlide.storeAs,
                        setAnswer
                      )}

                      {inlineChoices?.length ? (
                        <div className={styles.inlineChoiceStack}>
                          {inlineChoices.map((choice) => {
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
                                className={`${styles.secondaryButton} ${styles.inlineChoiceButton}`}
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
                                        : theme.colors.text,
                                  opacity: selected ? 1 : 0.96,
                                }}
                              >
                                {choice.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {currentSlide.type === "accountsummary" ? (
                        <AccountSummaryRenderer
                          theme={theme}
                          onGoto={goToTarget}
                        />
                      ) : null}

                      {currentSlide.type === "purchaserecipients" ? (
                        <PurchaseRecipientsRenderer theme={theme} />
                      ) : null}

                      {currentSlide.type === "shop" ? (
                        <ShopSlideRenderer
                          slideId={currentSlide.id}
                          reviewSection="primary"
                          slideMode={currentSlide.shopMode ?? "browse"}
                          title={currentSlide.title}
                          catalog={currentShopDisplayCatalog}
                          cart={currentShopCart}
                          selectedLines={
                            currentSlide.shopMode === "review"
                              ? sharedOrderLines
                              : currentShopSelectedLines
                          }
                          reservationSecondsRemaining={
                            checkoutReservationSecondsRemaining
                          }
                          inventoryNotices={cartInventoryNotices}
                          mealMenu={sharedMealMenu}
                          ticketAssignments={currentTicketAssignments}
                          onAdjustMeals={(ticketCode) => {
                            setAnswer("selectedMealTicketCode", ticketCode);
                            setAnswer("mealReturnTarget", "review-order");
                            setAnswer("cartReturnTarget", "review-order");
                            goToTarget("meal-selection");
                          }}
                          activeCurrencyCode={activeShopCurrencyCode}
                          canChangeCurrency={!authSessionUser}
                          onChangeCurrency={setGuestShopCurrencyCode}
                          theme={theme}
                          answers={answers}
                          onSetQuantity={(productId, sizeOptionId, quantity) =>
                            updateCurrentShopCart((cart) =>
                              setShopLineQuantity(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                quantity
                              )
                            )
                          }
                          onSetLineSelected={(productId, sizeOptionId, selected) =>
                            updateCurrentShopCart((cart) =>
                              toggleShopLineSelected(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                selected
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
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                purchaseModeId
                              )
                            )
                          }
                          onSetPurchaseRecipients={(
                            productId,
                            sizeOptionId,
                            recipients
                          ) =>
                            updateCurrentShopCart((cart) =>
                              setShopLinePurchaseRecipients(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                recipients
                              )
                            )
                          }
                          onRemoveLine={(productId, sizeOptionId) => {
                            updateCurrentShopCart((cart) =>
                              removeShopLine(cart, productId, sizeOptionId)
                            );
                          }}
                          onAdjustLine={(productId, sizeOptionId) => {
                            if (currentSlide.shopMode === "review") {
                              const targetKey = `${productId}::${sizeOptionId}`;
                              const targetLine = sharedOrderLines.find(
                                (line) =>
                                  line.productId === productId &&
                                  line.sizeOptionId === sizeOptionId
                              );
                              const targetShop =
                                targetLine?.fulfillmentType === "ticket"
                                  ? "invitation-shop"
                                  : "music-merch-shop";

                              setAnswers((prev) => ({
                                ...prev,
                                shopFocusLineKey: targetKey,
                                cartReturnTarget: "review-order",
                              }));

                              goToTarget(targetShop);
                            }
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "delivery" ? (
                        <DeliverySlideRenderer
                          config={currentDeliveryConfig}
                          selection={currentDeliverySelection}
                          deliveryFee={currentDeliveryFeeDisplay}
                          currencyCode={activeShopCurrencyCode}
                          theme={theme}
                          onChange={(patch) =>
                            updateCurrentDeliverySelection((prev) => ({
                              ...prev,
                              ...patch,
                            }))
                          }
                        />
                      ) : null}

                      {currentSlide.type === "tickets" ? (
                        <TicketDetailsRenderer
                          assignments={currentTicketAssignments}
                          menu={currentMealMenu}
                          currencyCode={
                            sharedShopDisplayCatalog?.currencyCode ?? "USD"
                          }
                          ticketLines={sharedTicketOrderLines}
                          addOnLines={sharedOrderLines}
                          catalog={sharedShopDisplayCatalog}
                          theme={theme}
                          purchaserName={String(answers.fullName ?? "").trim()}
                          purchaserEmail={String(answers.email ?? "").trim()}
                          onChange={(nextAssignments) => {
                            setAnswer("ticketAssignments", nextAssignments);
                            void saveTicketOwnerMealSelection(nextAssignments);
                          }}
                          onSelectMeal={(ticketCode) => {
                            setAnswer("selectedMealTicketCode", ticketCode);
                            setAnswer("mealReturnTarget", "");
                            setAnswer("cartReturnTarget", "");
                            goToTarget("meal-selection");
                          }}
                          onChooseAddOns={() => {
                            setAnswer("shopEntrySource", "ticket-details-add-ons");
                            goToTarget("music-merch-shop");
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "meal" ? (
                        <MealSelectionRenderer
                          menu={currentMealMenu}
                          assignments={currentTicketAssignments}
                          currencyCode={
                            sharedShopDisplayCatalog?.currencyCode ??
                            activeShopCurrencyCode
                          }
                          selectedTicketCode={
                            typeof answers.selectedMealTicketCode === "string"
                              ? answers.selectedMealTicketCode
                              : ""
                          }
                          theme={theme}
                          onChange={(nextAssignments) => {
                            latestTicketAssignmentsRef.current = nextAssignments;
                            setAnswer("ticketAssignments", nextAssignments);
                            void saveTicketOwnerMealSelection(nextAssignments);
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" &&
                      sharedOrderCartLines.length === 0 ? (
                        <EmptyCartStoreChoices
                          theme={theme}
                          onTicketStore={() => goToTarget("invitation-shop")}
                          onMerchStore={() => goToTarget("music-merch-shop")}
                        />
                      ) : null}

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" &&
                      sharedOrderLines.length > 0 ? (
                        <ReviewSummaryRenderer
                          answers={answers}
                          deliverySelection={sharedDeliverySelection}
                          deliveryFee={sharedDeliveryFeeDisplay}
                          currencyCode={
                            sharedShopDisplayCatalog?.currencyCode ?? "USD"
                          }
                          deliveryConfig={getDeliveryConfig(
                            mergedVariables,
                            "deliveryConfig"
                          )}
                          showDeliverySummary={sharedOrderNeedsFulfillment}
                          onAdjustDelivery={() => {
                            setAnswer("cartReturnTarget", "review-order");
                            goToTarget("delivery-options");
                          }}
                          onAdjustContact={() => {
                            setAnswer("cartReturnTarget", "review-order");
                            goToTarget("contact-details");
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" &&
                      sharedOrderLines.length > 0 ? (
                        <ReviewTotalsRenderer
                          catalog={currentShopDisplayCatalog}
                          totalWeight={sharedOrderLines.reduce(
                            (sum, line) => sum + (line.lineWeight ?? 0),
                            0
                          )}
                          deliveryFee={sharedOrderSummary.deliveryFee}
                          discountTotal={sharedOrderSummary.discountTotal}
                          grandTotal={sharedOrderGrandTotalWithMeals}
                          ticketOwnerAddonBudgetTotal={
                            sharedTicketOwnerAddonBudgetTotal
                          }
                          ticketUpgradeTotal={sharedTicketUpgradeTotal}
                          activeDiscountLabel={activeDiscountDefinition?.label}
                          showDeliveryFee={
                            sharedOrderNeedsFulfillment && sharedOrderHasDeliveryFee
                          }
                          showDiscountTotal={sharedOrderHasDiscount}
                          showTotalWeight={sharedOrderHasWeight}
                        />
                      ) : null}

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" &&
                      sharedOrderCartLines.length > 0 ? (
                        <ShopSlideRenderer
                          slideId={currentSlide.id}
                          reviewSection="secondary"
                          slideMode={currentSlide.shopMode ?? "browse"}
                          title={currentSlide.title}
                          catalog={currentShopDisplayCatalog}
                          cart={currentShopCart}
                          selectedLines={sharedOrderLines}
                          reservationSecondsRemaining={
                            checkoutReservationSecondsRemaining
                          }
                          inventoryNotices={cartInventoryNotices}
                          mealMenu={sharedMealMenu}
                          ticketAssignments={currentTicketAssignments}
                          onAdjustMeals={(ticketCode) => {
                            setAnswer("selectedMealTicketCode", ticketCode);
                            setAnswer("mealReturnTarget", "review-order");
                            setAnswer("cartReturnTarget", "review-order");
                            goToTarget("meal-selection");
                          }}
                          activeCurrencyCode={activeShopCurrencyCode}
                          canChangeCurrency={!authSessionUser}
                          onChangeCurrency={setGuestShopCurrencyCode}
                          theme={theme}
                          answers={answers}
                          onSetQuantity={(productId, sizeOptionId, quantity) =>
                            updateCurrentShopCart((cart) =>
                              setShopLineQuantity(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                quantity
                              )
                            )
                          }
                          onSetLineSelected={(productId, sizeOptionId, selected) =>
                            updateCurrentShopCart((cart) =>
                              toggleShopLineSelected(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                selected
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
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                purchaseModeId
                              )
                            )
                          }
                          onSetPurchaseRecipients={(
                            productId,
                            sizeOptionId,
                            recipients
                          ) =>
                            updateCurrentShopCart((cart) =>
                              setShopLinePurchaseRecipients(
                                cart,
                                currentShopDisplayCatalog,
                                productId,
                                sizeOptionId,
                                recipients
                              )
                            )
                          }
                          onRemoveLine={(productId, sizeOptionId) => {
                            updateCurrentShopCart((cart) =>
                              removeShopLine(cart, productId, sizeOptionId)
                            );
                          }}
                          onAdjustLine={(productId, sizeOptionId) => {
                            const targetKey = `${productId}::${sizeOptionId}`;
                            const targetLine = sharedOrderLines.find(
                              (line) =>
                                line.productId === productId &&
                                line.sizeOptionId === sizeOptionId
                            );
                            const targetShop =
                              targetLine?.fulfillmentType === "ticket"
                                ? "invitation-shop"
                                : "music-merch-shop";

                            setAnswers((prev) => ({
                              ...prev,
                              shopFocusLineKey: targetKey,
                              cartReturnTarget: "review-order",
                            }));

                            goToTarget(targetShop);
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "recordlist" ? (
                        <RecordListRenderer
                          items={currentRecordListItems}
                          emptyText={
                            currentSlide.recordEmptyText ??
                            "No records available yet."
                          }
                          selectedValue={
                            currentSlide.storeAs
                              ? String(answers[currentSlide.storeAs] ?? "")
                              : ""
                          }
                          onSelect={(value) => {
                            if (currentSlide.storeAs) {
                              setAnswer(currentSlide.storeAs, value);
                            }
                          }}
                          onOpenItem={(value) => {
                            if (currentSlide.storeAs) {
                              setAnswer(currentSlide.storeAs, value);
                            }

                            if (currentSlide.goto) {
                              goToTarget(currentSlide.goto);
                            }
                          }}
                          theme={theme}
                        />
                      ) : null}

                      {currentSlide.type === "annotatedtext" ? (
                        <AnnotatedTextSlideRenderer
                          slide={currentSlide}
                          theme={theme}
                        />
                      ) : null}

                      {currentBlock ? (
                        <DataBlockRenderer
                          block={currentBlock}
                          theme={theme}
                          context={{
                            ...evaluationContext,
                            ...(selectedRecord ?? {}),
                          }}
                          onAction={(action) => {
                            if (action.kind === "goto" && action.target) {
                              goToTarget(action.target);
                              return;
                            }

                            if (action.kind === "delete_record") {
                              setDeleteBatchError(null);
                            }
                          }}
                          onSectionAction={(action) => {
                            if (action.kind === "goto") {
                              goToTarget(action.target);
                            }
                          }}
                        />
                      ) : null}

                      {currentDeleteAction && selectedRecord ? (
                        <div className={styles.reviewSummaryCard}>
                          <div className={styles.reviewSummaryHeader}>
                            <div className={styles.reviewSummaryTitle}>
                              {currentDeleteAction.label}
                            </div>
                          </div>

                          <div className={styles.reviewSummaryBody}>
                            <div>
                              Type{" "}
                              <strong>
                                {currentDeleteAction.confirmationPhrase ?? "delete record"}
                              </strong>{" "}
                              to allow deletion.
                            </div>
                            <input
                              className={styles.input}
                              value={deleteBatchConfirmation}
                              onChange={(event) =>
                                setDeleteBatchConfirmation(event.target.value)
                              }
                              placeholder={
                                currentDeleteAction.confirmationPhrase ?? "delete record"
                              }
                              style={{ borderColor: theme.colors.border }}
                            />
                            <button
                              type="button"
                              onClick={handleDeleteRecord}
                              disabled={
                                isDeletingBatch ||
                                deleteBatchConfirmation.trim() !==
                                  (currentDeleteAction.confirmationPhrase ?? "delete record")
                              }
                              className={styles.secondaryButton}
                              style={{
                                borderColor: theme.colors.border,
                                background: "#FFFFFF",
                                color: theme.colors.text,
                              }}
                            >
                              {isDeletingBatch ? "Deleting..." : currentDeleteAction.label}
                            </button>
                          </div>

                          {deleteBatchError ? (
                            <p className={styles.formError}>{deleteBatchError}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {currentSlide.type === "authform" ? (
                        authSessionUser?.id &&
                        currentSlide.id === gatedAccessConfig?.gateSlideId ? (
                          <div className={styles.contactNote}>
                            You are already logged in. Continuing to your private
                            video...
                          </div>
                        ) : (
                          <AuthFormSlideRenderer
                            formKey={currentSlide.authFormKey}
                            title={currentSlide.title}
                            subtitle={currentSlide.subtitle}
                            questionnaireSlug={config.slug}
                            answers={answers}
                            loginHref={getAuthLoginHref()}
                            onSuccess={() => {
                              if (currentSlide.goto) {
                                goToTarget(currentSlide.goto);
                              }
                            }}
                          />
                        )
                      ) : null}

                      {currentSlide.type === "authverify" ? (
                        <VerificationCodePanel
                          pendingContext={authVerificationContext}
                          routes={{}}
                          classNames={{
                            form: styles.authVerificationPanel,
                            helpText: styles.authSlideHelpText,
                            codeGroup: styles.slideVerificationCodeGroup,
                            codeBox: styles.slideVerificationCodeBox,
                            primaryButton: `${styles.primaryButton} ${styles.actionButton}`,
                            secondaryButton: `${styles.secondaryButton} ${styles.actionButton}`,
                          }}
                          onMessage={({
                            message,
                            type,
                          }: {
                            message: string;
                            type: "error" | "info" | "success";
                          }) => {
                            setSubmitError(message);
                          }}
                          onVerified={() => {
                            goToTarget(currentSlide.goto || "signup-verified");
                          }}
                          autoSend={false}
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
                              isPasswordVisible={
                                visiblePasswordFields[field.name] === true
                              }
                              onTogglePasswordVisibility={() =>
                                togglePasswordFieldVisibility(field.name)
                              }
                            />
                          ))}
                        </div>
                      ) : null}

                      {submitError &&
                      currentSlide.id !== "delete-account-confirmed" ? (
                        <p className={styles.formError}>{submitError}</p>
                      ) : null}

                      {shouldShowAuthFooter(config.slug) ? (
                        <AuthFooter
                          variant={config.slug}
                          classNames={{
                            footer: styles.authFooter,
                            primaryLinks: styles.authFooterPrimaryLinks,
                            link: styles.authFooterLink,
                            businessName: styles.authFooterBusinessName,
                            policyLinks: styles.authFooterPolicyLinks,
                            policyLink: styles.authFooterPolicyLink,
                            policyDivider: styles.authFooterPolicyDivider,
                          }}
                        />
                      ) : null}

                      <div className={styles.scrollBottomSpacer} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {hasFooterActions ? (
              <div
                className={`${styles.slideFooterTextActionsOverlay} ${
                  activeFooterPanelSlide
                    ? styles.slideFooterTextActionsOverlayPanelOpen
                    : ""
                }`}
              >
                <div className={styles.overlayFrame}>
                <SlideFooterActions
                  actions={footerActions}
                  contentLabel={currentSlide.footerContentLabel}
                  isLoggedIn={Boolean(authSessionUser)}
                  isAuthSessionLoaded={isAuthSessionLoaded}
                  isSubmitting={isSubmitting}
                  mediaState={mediaState}
                  progressControl={
                    isFooterEdgeProgress ? progressControl : undefined
                  }
                  textPanelMode={textPanelMode}
                  panelContent={
                    activeFooterPanelSlide ? (
                      <AnnotatedTextSlideRenderer
                        slide={activeFooterPanelSlide}
                        theme={theme}
                        presentation="panel"
                        enableTimingRecorder={
                          searchParams.get("syncText") === "1"
                        }
                        textPanelMode={textPanelMode}
                        mediaCurrentTimeSeconds={videoCurrentTimeSeconds}
                        onTimedLineClick={handleTimedTextLineClick}
                        onCustomTextMerchRequest={(selectedText) =>
                          handleCustomTextMerchRequest(selectedText)
                        }
                      />
                    ) : undefined
                  }
                  onAction={handleFooterAction}
                  onTextPanelModeChange={setTextPanelMode}
                />
                </div>
              </div>
            ) : null}

            <TimedTextAudioPlayer request={timedTextAudioRequest} />

            {hasPinnedChoices ||
              hasDownloadButtons ||
              currentSlide.downloadFormatOptions?.length ||
              hasVisibleNav ? (
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
                      {pinnedChoices?.map((choice) => {
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

                  {hasDownloadButtons ? (
                    <div className={styles.choiceStack}>
                      {currentSlide.downloadButtons?.map((downloadButton) => {
                        const buttonStyle = resolveButtonStyle(
                          theme,
                          downloadButton.styleKey ?? currentSlide.buttonStyleKey,
                          "primary"
                        );

                        return (
                          <button
                            key={`${currentSlide.id}-${downloadButton.key}`}
                            type="button"
                            onClick={() =>
                              handleDownloadButtonClick(downloadButton)
                            }
                            className={`${styles.primaryButton} ${styles.actionButton}`}
                            style={{
                              background: buttonStyle.background,
                              color: buttonStyle.color,
                              borderColor: buttonStyle.borderColor,
                              borderRadius: theme.radius?.button ?? "14px",
                            }}
                          >
                            {downloadButton.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {currentSlide.downloadFormatOptions?.length ? (
                    <div className={styles.choiceStack}>
                      {currentSlide.downloadFormatOptions.map((downloadFormat) => {
                        const buttonStyle = resolveButtonStyle(
                          theme,
                          downloadFormat.styleKey ?? currentSlide.buttonStyleKey,
                          "primary"
                        );

                        return (
                          <button
                            key={`${currentSlide.id}-${downloadFormat.format}`}
                            type="button"
                            onClick={() =>
                              triggerDownloadRequest(
                                downloadFormat.format,
                                downloadFormat.label
                              )
                            }
                            className={`${styles.primaryButton} ${styles.actionButton}`}
                            style={{
                              background: buttonStyle.background,
                              color: buttonStyle.color,
                              borderColor: buttonStyle.borderColor,
                              borderRadius: theme.radius?.button ?? "14px",
                            }}
                          >
                            {downloadFormat.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {downloadNotice ? (
                    <div className={styles.downloadNotice}>
                      {downloadNotice}
                    </div>
                  ) : null}

                  {currentSlide.type === "shop" &&
                  currentSlide.shopMode === "review" &&
                  sharedOrderHasWeight ? (
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
                        sharedOrderSubtotalWithMeals,
                        sharedShopDisplayCatalog?.currencyCode ?? "JMD"
                      )}
                      {currentDeliveryFeeDisplay > 0 ? (
                        <>
                          {" "}
                          · Delivery: {formatCurrency(
                            currentDeliveryFeeDisplay,
                            sharedShopDisplayCatalog?.currencyCode ?? "JMD"
                          )}
                        </>
                      ) : null}{" "}
                      · Total:{" "}
                      {formatCurrency(
                        sharedOrderSubtotalWithMeals + currentDeliveryFeeDisplay,
                        sharedShopDisplayCatalog?.currencyCode ?? "JMD"
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

                      {currentSlide.showAuthControls ? (
                        authSessionUser ? (
                          <button
                            type="button"
                            onClick={handleAuthLogoutClick}
                            disabled={isSubmitting}
                            className={`${styles.secondaryButton} ${styles.actionButton}`}
                            style={{
                              borderColor: backButtonStyle.borderColor,
                              background: "#FFFFFF",
                              color: theme.colors.text,
                            }}
                          >
                            Logout
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAuthLoginClick}
                            disabled={!isAuthSessionLoaded || isSubmitting}
                            className={`${styles.secondaryButton} ${styles.actionButton}`}
                            style={{
                              borderColor: backButtonStyle.borderColor,
                              background: "#FFFFFF",
                              color: theme.colors.text,
                            }}
                          >
                            Login
                          </button>
                        )
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

function isValidTicketOwnerEmail(value: string | undefined) {
  const email = String(value ?? "").trim();

  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function TicketDetailsRenderer({
  assignments,
  menu,
  currencyCode,
  ticketLines,
  addOnLines,
  catalog,
  theme,
  purchaserName,
  purchaserEmail,
  onChange,
  onSelectMeal,
  onChooseAddOns,
}: {
  assignments: TicketAssignments;
  menu: MealMenu | null;
  currencyCode: string;
  ticketLines: ShopResolvedCartLine[];
  addOnLines: ShopResolvedCartLine[];
  catalog: ShopCatalog | null;
  theme: ThemeConfig;
  purchaserName: string;
  purchaserEmail: string;
  onChange: (nextAssignments: TicketAssignments) => void;
  onSelectMeal: (ticketCode: string) => void;
  onChooseAddOns: () => void;
}) {
  const [expandedTicketCode, setExpandedTicketCode] = useState<string | null>(
    null
  );

  if (!assignments.length) {
    return <p className={styles.body}>No ticket details needed yet.</p>;
  }

  return (
    <div className={styles.mealStack}>
      {false ? (
      <div className={styles.contactNote}>
        The first ticket is prefilled from the purchaser contact details. Mark
        “This is my ticket” for the purchaser’s own ticket. Guest ticket details
        can be added under each ticket.
      </div>

      ) : null}

      {assignments.map((assignment) => {
        const ticketLine = ticketLines.find(
          (line) =>
            line.lineKey === assignment.lineKey ||
            (line.productId === assignment.productId &&
              line.sizeOptionId === assignment.sizeOptionId)
        );

        const ticketBasePrice = ticketLine?.unitPrice ?? 0;
        const mealExtraTotal = calculateSingleTicketMealExtraTotal({
          menu,
          assignment,
        });
        const addonBudget =
          typeof assignment.ticketOwnerAddonBudget === "number" &&
          Number.isFinite(assignment.ticketOwnerAddonBudget)
            ? Math.max(0, assignment.ticketOwnerAddonBudget)
            : 0;
        const ticketUpgradeTotal = getTicketAssignmentUpgradePrice(
          catalog,
          assignment
        );

        const mealSummary = getTicketMealSelectionSummary({ menu, assignment });
        const hasSelectedMealItems = mealSummary.length > 0;

        const ticketOwnerName =
          assignment.ownerName?.trim() || "this ticket owner";
        const ticketOwnerDisplayName =
          assignment.ownerName?.trim() ||
          (assignment.isPurchaserTicket === true && purchaserName
            ? purchaserName
            : "Ticket owner");
        const ticketTypeLabel = assignment.ticketLabel.replace(/\s+#\d+$/i, "");
        const selectedPaymentMode =
          assignment.ticketOwnerPaymentMode ??
          "purchaser_pays_ticket_and_addons";

        const visibleAddonBudget =
          selectedPaymentMode === "owner_selects_sender_pays_addons"
            ? addonBudget
            : 0;

        const ticketTotal =
          ticketBasePrice +
          mealExtraTotal +
          visibleAddonBudget +
          ticketUpgradeTotal;

        const ownerEmailIsValid = isValidTicketOwnerEmail(
          assignment.ownerEmail
        );
        const shouldShowOwnerInputs =
          assignment.ownerLockedFromRecipient !== true &&
          assignment.isPurchaserTicket !== true &&
          assignment.emailTicketToOwner === true;
        const shouldShowOwnerAccess =
          shouldShowOwnerInputs && ownerEmailIsValid;
        const detailsAreExpanded =
          expandedTicketCode === assignment.ticketCode;
        const canSelectMealForThisTicket =
          assignment.isPurchaserTicket === true ||
          selectedPaymentMode === "purchaser_pays_ticket_and_addons";

        const addonBudgetValue = addonBudget > 0 ? String(addonBudget) : "";
        const sourceTicketAssignments = assignments
          .filter((item) => item.lineKey === assignment.lineKey)
          .sort((first, second) => first.ticketIndex - second.ticketIndex);
        const assignmentLinePosition = Math.max(
          0,
          sourceTicketAssignments.findIndex(
            (item) => item.ticketCode === assignment.ticketCode
          )
        );
        const selectedAddOns = getTicketDetailsAddOns({
          assignment,
          lines: addOnLines,
          sourceLineKey: assignment.lineKey,
          assignmentLinePosition,
          assignmentLineCount: sourceTicketAssignments.length,
        });
        const hasPhysicalAddOns = selectedAddOns.some(
          (line) => line.requiresPhysicalFulfillment === true
        );

        return (
          <div key={assignment.ticketCode} className={styles.mealTicketPanel}>
            <div className={styles.mealTicketHeader}>
              <div className={styles.mealTicketTitle}>
                {ticketOwnerDisplayName}
              </div>
              <div className={styles.mealTicketTitle}>
                {assignment.productTitle || "Event"}
              </div>
              <div className={styles.mealTicketMeta}>
                {ticketTypeLabel}
              </div>
              <div className={styles.mealTicketMeta}>
                Code: {assignment.ticketCode}
              </div>
              {assignment.mealMode === "required" && !hasSelectedMealItems ? (
                <div className={styles.ticketMealRequiredWarning}>
                  Meal selection required for this ticket.
                </div>
              ) : null}
              {assignment.ownerLockedFromRecipient !== true ? (
                <div className={styles.ticketOwnershipPanel}>
                  <label className={styles.ticketOwnershipChoice}>
                    <input
                      type="checkbox"
                      checked={assignment.isPurchaserTicket === true}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        onChange(
                          assignments.map((item) => {
                            if (item.ticketCode !== assignment.ticketCode) {
                              return item;
                            }

                            if (checked) {
                              return {
                                ...item,
                                isPurchaserTicket: true,
                                emailTicketToOwner: false,
                                ownerName: purchaserName,
                                ownerEmail: purchaserEmail,
                              };
                            }

                            return {
                              ...item,
                              isPurchaserTicket: false,
                              emailTicketToOwner: true,
                              ownerName:
                                item.ownerName === purchaserName
                                  ? ""
                                  : item.ownerName,
                              ownerEmail:
                                item.ownerEmail === purchaserEmail
                                  ? ""
                                  : item.ownerEmail,
                            };
                          })
                        );
                      }}
                    />
                    <span>
                      <span className={styles.ticketOwnershipLabel}>
                        This is my ticket.
                      </span>
                      <span className={styles.ticketOwnershipHelp}>
                        (Leave unchecked if purchasing for someone else)
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}
            </div>

            {assignment.ownerName?.trim() || assignment.ownerEmail?.trim() ? (
              <div className={styles.ticketOwnerSummary}>
                {assignment.ownerEmail?.trim() ? (
                  <div>{assignment.ownerEmail.trim()}</div>
                ) : null}
                {ownerEmailIsValid && assignment.isPurchaserTicket !== true ? (
                  <div className={styles.ticketOwnerEmailNotice}>
                    {ticketOwnerName} will be emailed the details of their ticket.
                  </div>
                ) : null}
              </div>
            ) : null}

            {!detailsAreExpanded ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setExpandedTicketCode(assignment.ticketCode)}
                style={{
                  borderColor: theme.colors.border,
                  background: "#FFFFFF",
                  color: theme.colors.text,
                }}
              >
                {assignment.ownerName?.trim() || assignment.ownerEmail?.trim()
                  ? "See details"
                  : "Add ticket owner details"}
              </button>
            ) : null}

            {detailsAreExpanded ? (
              <div className={styles.ticketDetailsReveal}>
                {shouldShowOwnerInputs ? (
                  <>
                    <input
                      className={styles.input}
                      value={assignment.ownerName ?? ""}
                      onChange={(event) =>
                        onChange(
                          updateTicketAssignmentField({
                            assignments,
                            ticketCode: assignment.ticketCode,
                            field: "ownerName",
                            value: event.target.value,
                          })
                        )
                      }
                      placeholder="Ticket owner name (optional)"
                      style={{ borderColor: theme.colors.border }}
                    />

                    <input
                      className={styles.input}
                      value={assignment.ownerEmail ?? ""}
                      onChange={(event) =>
                        onChange(
                          updateTicketAssignmentField({
                            assignments,
                            ticketCode: assignment.ticketCode,
                            field: "ownerEmail",
                            value: event.target.value,
                          })
                        )
                      }
                      placeholder="Ticket owner email (required)"
                      style={{ borderColor: theme.colors.border }}
                    />

                    {!ownerEmailIsValid ? (
                      <p className={styles.formError}>
                        A valid ticket owner email is required before ticket
                        owner access options can be selected.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {assignment.ownerLockedFromRecipient === true ? (
                  <div className={styles.ticketOwnerLockedNotice}>
                    This ticket owner was selected from verified recipients.
                    Their email address is locked for this order.
                  </div>
                ) : null}

                {shouldShowOwnerAccess ? (
                  <div
                    className={styles.ticketOwnerAccessPanel}
                    style={{
                      background: withOpacity(theme.colors.primary, 0.08),
                      borderColor: withOpacity(theme.colors.primary, 0.28),
                    }}
                  >
                    <div className={styles.reviewSummaryHeader}>
                      <div className={styles.reviewSummaryTitle}>
                        Ticket owner access
                      </div>
                    </div>

                    <div className={styles.ticketOwnerAccessOptions}>
                      <label
                        className={styles.ticketOwnerAccessOption}
                        style={{
                          borderColor:
                            selectedPaymentMode ===
                            "purchaser_pays_ticket_and_addons"
                              ? theme.colors.primary
                              : theme.colors.border,
                          background:
                            selectedPaymentMode ===
                            "purchaser_pays_ticket_and_addons"
                              ? withOpacity(theme.colors.primary, 0.12)
                              : "#FFFFFF",
                        }}
                      >
                        <input
                          type="radio"
                          name={`ticket-owner-payment-${assignment.ticketCode}`}
                          checked={
                            selectedPaymentMode ===
                            "purchaser_pays_ticket_and_addons"
                          }
                          onChange={() =>
                            onChange(
                              updateTicketOwnerPaymentMode({
                                assignments,
                                ticketCode: assignment.ticketCode,
                                value: "purchaser_pays_ticket_and_addons",
                              })
                            )
                          }
                        />
                          <span>
                            I&apos;ll select add-ons and pay for {ticketOwnerName}'s ticket.
                          </span>
                      </label>

                      <label
                        className={styles.ticketOwnerAccessOption}
                        style={{
                          borderColor:
                            selectedPaymentMode ===
                            "owner_selects_sender_pays_addons"
                              ? theme.colors.primary
                              : theme.colors.border,
                          background:
                            selectedPaymentMode ===
                            "owner_selects_sender_pays_addons"
                              ? withOpacity(theme.colors.primary, 0.12)
                              : "#FFFFFF",
                        }}
                      >
                        <input
                          type="radio"
                          name={`ticket-owner-payment-${assignment.ticketCode}`}
                          checked={
                            selectedPaymentMode ===
                            "owner_selects_sender_pays_addons"
                          }
                          onChange={() =>
                            onChange(
                              updateTicketOwnerPaymentMode({
                                assignments,
                                ticketCode: assignment.ticketCode,
                                value: "owner_selects_sender_pays_addons",
                              })
                            )
                          }
                        />
                        <span>
                          {ticketOwnerName}&nbsp;will select add-ons, and I&apos;ll pay.
                        </span>
                      </label>

                    </div>
                      {selectedPaymentMode === "owner_selects_sender_pays_addons" ? (
                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                        padding: "16px",
                        borderRadius: "18px",
                        border: `1px solid ${theme.colors.border}`,
                        background: "#FFFFFF",
                      }}
                    >
                      <label style={{ fontWeight: 600 }}>
                        The budget I&apos;ll put for {ticketOwnerName}&apos;s add-ons is:
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto minmax(0, 1fr)",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                        }}
                      >
                        <span
                          id="currencySymbol"
                          style={{
                            fontWeight: 800,
                            fontSize: "1.15rem",
                            lineHeight: 1,
                          }}
                        >
                          $
                        </span>

                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={addonBudgetValue}
                          onChange={(event) =>
                            onChange(
                              updateTicketAssignmentField({
                                assignments,
                                ticketCode: assignment.ticketCode,
                                field: "ticketOwnerAddonBudget",
                                value: Number(event.target.value || 0),
                              })
                            )
                          }
                          placeholder="0.00"
                          style={{
                            borderColor: theme.colors.border,
                            width: "100%",
                            minWidth: 0,
                          }}
                        />
                      </div>

                      <p className={styles.contactNote} style={{ margin: 0 }}>
                        P.S. leave blank or 0 if {ticketOwnerName} should pay for their own
                        add-ons in full.
                      </p>
                    </div>
                  ) : null}
                  </div>
                ) : null}

                {assignment.mealMode === "optional" ? (
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={assignment.mealEnabled === true}
                      onChange={(event) =>
                        onChange(
                          updateTicketAssignmentBoolean({
                            assignments,
                            ticketCode: assignment.ticketCode,
                            field: "mealEnabled",
                            value: event.target.checked,
                          })
                        )
                      }
                    />
                    <span>Add meal for this ticket</span>
                  </label>
                ) : null}

                {hasSelectedMealItems ? (
                  <div className={styles.ticketMealSummary}>
                    {mealSummary.map((item) => (
                      <div
                        key={`${assignment.ticketCode}-${item.groupLabel}-${item.optionLabel}`}
                      >
                        {item.groupLabel}: {item.optionLabel} × {item.quantity}
                        {item.extraTotal > 0
                          ? ` · +${formatCurrency(item.extraTotal, currencyCode)}`
                          : ""}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className={styles.ticketAddOnSummary}>
                  <div className={styles.ticketAddOnHeader}>
                    <span>Other Add-ons</span>
                    <button
                      type="button"
                      className={styles.adjustLinkButton}
                      onClick={onChooseAddOns}
                    >
                      Choose add ons
                    </button>
                  </div>
                  {selectedAddOns.length > 0 ? (
                    <div className={styles.ticketAddOnList}>
                      {selectedAddOns.map((line) => (
                        <div
                          key={line.lineKey}
                          className={styles.ticketAddOnRow}
                        >
                          <span>
                            {line.label}
                            {line.quantity > 1 ? ` x ${line.quantity}` : ""}
                          </span>
                          {line.kind === "ticket-upgrade" ? (
                            <button
                              type="button"
                              className={styles.cartRemoveLink}
                              onClick={() =>
                                onChange(
                                  assignments.map((item) =>
                                    item.ticketCode === assignment.ticketCode
                                      ? {
                                          ...item,
                                          purchaseModeId: undefined,
                                          purchaseModeLabel: undefined,
                                        }
                                      : item
                                  )
                                )
                              }
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.ticketAddOnEmpty}>
                      No add-ons selected.
                    </div>
                  )}
                  {hasPhysicalAddOns ? (
                    <div className={styles.ticketAddOnNote}>
                      Physical add-ons are collected at the event. Contact
                      support if any issues arise.
                    </div>
                  ) : null}
                </div>

                <div className={styles.ticketTotalRow}>
                  <span>
                    {visibleAddonBudget > 0
                      ? `Ticket total with ${ticketOwnerName}'s add-on budget`
                      : "Ticket total"}
                  </span>
                  <strong>
                    {formatCurrency(ticketTotal, currencyCode)}
                  </strong>
                </div>

                {canSelectMealForThisTicket &&
                (assignment.mealMode === "required" ||
                  assignment.mealEnabled === true) ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onSelectMeal(assignment.ticketCode)}
                    style={{
                      borderColor: theme.colors.border,
                      background: "#FFFFFF",
                      color: theme.colors.text,
                    }}
                  >
                    {hasSelectedMealItems
                      ? "Adjust meal"
                      : "Select meal for this ticket"}
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setExpandedTicketCode(null)}
                  style={{
                    borderColor: theme.colors.border,
                    background: "#FFFFFF",
                    color: theme.colors.text,
                  }}
                >
                  Hide details
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MealSelectionRenderer({
    menu,
    assignments,
    currencyCode,
    selectedTicketCode,
    theme,
    onChange,
  }: {
    menu: MealMenu | null;
    assignments: TicketAssignments;
    currencyCode: string;
    selectedTicketCode: string;
    theme: ThemeConfig;
    onChange: (nextAssignments: TicketAssignments) => void;
  }) {
    const mealAssignments = getTicketsNeedingMeal(assignments).filter(
      (assignment) => assignment.ticketCode === selectedTicketCode
    );
  if (!menu || !mealAssignments.length) {
    return (
      <p className={styles.body}>
       Choose a ticket from the Ticket Details page to edit its meal.
      </p>
    );
  }

    return (
    <div className={styles.mealStack}>
      {mealAssignments.map((assignment) => {
        const mealExtraTotal = calculateSingleTicketMealExtraTotal({
          menu,
          assignment,
        });

        return (
        <div key={assignment.ticketCode} className={styles.mealTicketPanel}>
          <div className={styles.mealTicketHeader}>
            <div className={styles.mealTicketTitle}>
              {assignment.ownerName?.trim() || assignment.ticketLabel}
            </div>
            <div className={styles.mealTicketMeta}>
              Code: {assignment.ticketCode}
            </div>
            <div className={styles.mealTicketMeta}>
              {assignment.mealLabel ?? "Meal selection"}
            </div>
          </div>

          <div className={styles.ticketTotalRow}>
            <span>Meal extras for this ticket</span>
            <strong>{formatCurrency(mealExtraTotal, currencyCode)}</strong>
          </div>

          {menu.groups.map((group) => {
            const groupTotal = getTicketMealGroupTotal(assignment, group.id);
            const includedServings =
              typeof group.includedServings === "number"
                ? group.includedServings
                : group.billingMode === "pay"
                  ? 0
                : group.required === false
                  ? 0
                  : 1;
            const groupBillingLabel =
              group.billingMode === "pay"
                ? "Paid add-on"
                : includedServings > 0
                  ? `${includedServings} included`
                  : "";

            return (
              <div
                key={`${assignment.ticketCode}-${group.id}`}
                className={`${styles.mealGroup} ${
                  group.billingMode === "pay" ? styles.mealGroupPaid : ""
                } ${
                  group.id === "alcoholic-beverage"
                    ? styles.mealGroupAlcohol
                    : ""
                }`}
              >
                <div className={styles.mealGroupHeader}>
                  <div className={styles.mealGroupTitle}>{group.label}</div>
                  <div className={styles.mealGroupCount}>
                    {groupTotal} selected
                    {groupBillingLabel ? ` · ${groupBillingLabel}` : ""}
                  </div>
                </div>

                {group.id === "alcoholic-beverage" ? (
                  <div className={styles.mealGroupLegalNote}>
                    <span>Must meet the legal requirements.</span>
                    <span>Identification must be uploaded.</span>
                  </div>
                ) : null}

                <div className={styles.mealOptionStack}>
                  {group.options.map((option) => {
                    const currentQuantity =
                      assignment.mealSelection?.[group.id]?.[option.id] ?? 0;

                    return (
                      <div
                        key={`${assignment.ticketCode}-${group.id}-${option.id}`}
                        className={styles.mealOptionRow}
                      >
                        <div className={styles.mealOptionLabel}>
                          <span>{option.label}</span>

                          {option.price ? (
                            <span className={styles.mealOptionPrice}>
                              {formatCurrency(option.price, currencyCode)} per extra serving
                            </span>
                          ) : null}

                          {getTicketMealOptionExtraTotal({
                            menu,
                            assignment,
                            groupId: group.id,
                            optionId: option.id,
                          }) > 0 ? (
                            <span className={styles.mealOptionLineTotal}>
                              Extra:{" "}
                              {formatCurrency(
                                getTicketMealOptionExtraTotal({
                                  menu,
                                  assignment,
                                  groupId: group.id,
                                  optionId: option.id,
                                }),
                                currencyCode
                              )}
                            </span>
                          ) : null}
                        </div>

                        <div className={styles.quantityControl}>
                          <button
                            type="button"
                            className={styles.quantityButton}
                            onClick={() =>
                              onChange(
                                setTicketMealOptionQuantity({
                                  assignments,
                                  ticketCode: assignment.ticketCode,
                                  groupId: group.id,
                                  optionId: option.id,
                                  quantity: currentQuantity - 1,
                                })
                              )
                            }
                            disabled={currentQuantity <= 0}
                            style={{ borderColor: theme.colors.border }}
                          >
                            -
                          </button>

                          <span className={styles.quantityValue}>
                            {currentQuantity}
                          </span>

                          <button
                            type="button"
                            className={styles.quantityButton}
                            onClick={() =>
                              onChange(
                                setTicketMealOptionQuantity({
                                  assignments,
                                  ticketCode: assignment.ticketCode,
                                  groupId: group.id,
                                  optionId: option.id,
                                  quantity: currentQuantity + 1,
                                })
                              )
                            }
                            style={{ borderColor: theme.colors.border }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={assignment.wantsExtraFood === true}
              onChange={(event) =>
                onChange(
                  updateTicketAssignmentBoolean({
                    assignments,
                    ticketCode: assignment.ticketCode,
                    field: "wantsExtraFood",
                    value: event.target.checked,
                  })
                )
              }
            />
            <span>I may want to order extra food at the event.</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={assignment.hasMealNotes === true}
              onChange={(event) =>
                onChange(
                  updateTicketAssignmentBoolean({
                    assignments,
                    ticketCode: assignment.ticketCode,
                    field: "hasMealNotes",
                    value: event.target.checked,
                  })
                )
              }
            />
            <span>I want to add notes for this person's meal.</span>
          </label>

          {assignment.hasMealNotes === true ? (
            <textarea
              className={styles.input}
              value={assignment.mealNotes ?? ""}
              onChange={(event) =>
                onChange(
                  updateTicketAssignmentField({
                    assignments,
                    ticketCode: assignment.ticketCode,
                    field: "mealNotes",
                    value: event.target.value,
                  })
                )
              }
              placeholder="Example: no bananas, all dumplings, extra gravy, half rice and peas if possible..."
              rows={4}
              style={{ borderColor: theme.colors.border }}
            />
          ) : null}
                </div>
        );
      })}
    </div>
  );
}

function MealSelectionSummaryRenderer({
  menu,
  assignments,
  mealExtraTotal,
  currencyCode,
  onAdjustMeals,
}: {
  menu: MealMenu | null;
  assignments: TicketAssignments;
  mealExtraTotal: number;
  currencyCode: string;
  onAdjustMeals: (ticketCode: string) => void;
}) {
  const mealAssignments = getTicketsNeedingMeal(assignments);

  if (!menu || !mealAssignments.length) {
    return null;
  }

  return (
    <div className={styles.reviewSummaryStack}>
      <div className={styles.reviewSummaryCard}>
        <div className={styles.reviewSummaryHeader}>
          <div className={styles.reviewSummaryTitle}>Ticket meals</div>
        </div>

        <div className={styles.reviewSummaryBody}>
          {mealAssignments.map((assignment) => (
            <div key={assignment.ticketCode} className={styles.reviewMealTicketBlock}>
              <div className={styles.reviewMealTicketTopLine}>
                <div className={styles.reviewMealTicketHeader}>
                  {assignment.ownerName?.trim() || assignment.ticketLabel}
                </div>
                <button
                  type="button"
                  className={styles.adjustLinkButton}
                  onClick={() => onAdjustMeals(assignment.ticketCode)}
                >
                  Adjust
                </button>
              </div>
              <div className={styles.reviewMealTicketCode}>
                Code: {assignment.ticketCode}
              </div>

              {menu.groups.map((group) => {
                const selectedOptions = group.options
                  .map((option) => {
                    const quantity =
                      assignment.mealSelection?.[group.id]?.[option.id] ?? 0;

                    return quantity > 0
                      ? `${cleanCartMealLabel(option.label)} × ${quantity}`
                      : null;
                  })
                  .filter(Boolean);

                if (!selectedOptions.length) {
                  return null;
                }

                return (
                  <div
                    key={`${assignment.ticketCode}-${group.id}`}
                    className={styles.reviewMealSelectionLine}
                  >
                    <span>{cleanCartMealLabel(group.label)}</span>
                    <span>{selectedOptions.join(", ")}</span>
                  </div>
                );
              })}

              {assignment.wantsExtraFood === true ? (
                <div>May order extra food at event.</div>
              ) : null}

              {assignment.hasMealNotes === true &&
              String(assignment.mealNotes ?? "").trim().length > 0 ? (
                <div>
                  Notes: {String(assignment.mealNotes ?? "").trim()}
                </div>
              ) : null}
            </div>
          ))}

          {mealExtraTotal > 0 ? (
            <div className={styles.reviewMealExtraTotal}>
              <span>Meal add-ons / extra servings total</span>
              <strong>{formatCurrency(mealExtraTotal, currencyCode)}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function cleanCartMealLabel(label: string) {
  return label
    .replace(/^choose\s+your\s+/i, "")
    .replace(/^choose\s+/i, "")
    .trim();
}

function CartTicketMealSummary({
  assignment,
  menu,
  currencyCode,
  onAdjustMeals,
}: {
  assignment: TicketAssignment;
  menu: MealMenu;
  currencyCode: string;
  onAdjustMeals?: (ticketCode: string) => void;
}) {
  const mealSummary = getTicketMealSelectionSummary({ menu, assignment });
  const hasSelectedMealItems = mealSummary.length > 0;

  return (
    <div className={styles.cartTicketMealBlock}>
      <div className={styles.cartTicketMealTopLine}>
        <strong>{assignment.ownerName?.trim() || assignment.ticketLabel}</strong>
        {onAdjustMeals ? (
          <button
            type="button"
            className={styles.adjustLinkButton}
            onClick={() => onAdjustMeals(assignment.ticketCode)}
          >
            Adjust meal
          </button>
        ) : null}
      </div>
      <div className={styles.cartTicketMealMeta}>Code: {assignment.ticketCode}</div>
      {assignment.mealMode === "required" && !hasSelectedMealItems ? (
        <div className={styles.ticketMealRequiredWarning}>
          Meal selection required for this ticket.
        </div>
      ) : null}
      {mealSummary.map((item) => (
        <div
          key={`${assignment.ticketCode}-${item.groupLabel}-${item.optionLabel}`}
          className={styles.cartTicketMealLine}
        >
          <span>{cleanCartMealLabel(item.groupLabel)}</span>
          <span>
            {cleanCartMealLabel(item.optionLabel)} x {item.quantity}
            {item.extraTotal > 0
              ? ` +${formatCurrency(item.extraTotal, currencyCode)}`
              : ""}
          </span>
        </div>
      ))}
      {assignment.wantsExtraFood === true ? (
        <div className={styles.cartTicketMealMeta}>
          May order extra food at event.
        </div>
      ) : null}
      {assignment.hasMealNotes === true &&
      String(assignment.mealNotes ?? "").trim().length > 0 ? (
        <div className={styles.cartTicketMealMeta}>
          Notes: {String(assignment.mealNotes ?? "").trim()}
        </div>
      ) : null}
    </div>
  );
}

function CartBundledAddOnsSummary({
  lines,
  currencyCode,
  purchasedForLabels,
}: {
  lines: ShopResolvedCartLine[];
  currencyCode?: string;
  purchasedForLabels?: string[];
}) {
  if (!lines.length) {
    return null;
  }

  return (
    <div className={styles.cartTicketMealStack}>
      <div className={styles.cartBundledAddOnsHeader}>Add-ons</div>
      {lines.map((line) => (
        <Fragment key={line.lineKey}>
          <div className={styles.cartTicketMealLine}>
            <span>
              {line.productTitle}
              {line.sizeLabel ? ` - ${line.sizeLabel}` : ""}
            </span>
            <span>{formatCurrency(line.lineTotal, currencyCode ?? "USD")}</span>
          </div>
          {purchasedForLabels?.length ? (
            <div className={styles.cartTicketMealMeta}>
              {purchasedForLabels.map((label, index) => (
                <div key={`${line.lineKey}-purchased-for-${index}`}>
                  Purchased for {label}
                </div>
              ))}
            </div>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

function EmptyCartStoreChoices({
  theme,
  onTicketStore,
  onMerchStore,
}: {
  theme: ThemeConfig;
  onTicketStore: () => void;
  onMerchStore: () => void;
}) {
  return (
    <div
      className={styles.emptyCartPanel}
      style={{ borderColor: theme.colors.border }}
    >
      <div>
        <h2 className={styles.emptyCartTitle}>Cart</h2>
        <p className={styles.emptyCartText}>Your cart is empty.</p>
      </div>
      <div className={styles.emptyCartActions}>
        <button
          type="button"
          className={styles.emptyCartButton}
          onClick={onTicketStore}
          style={{
            background: theme.colors.primary,
            color: getContrastTextColor(theme.colors.primary),
          }}
        >
          Ticket store
        </button>
        <button
          type="button"
          className={styles.emptyCartButton}
          onClick={onMerchStore}
          style={{
            borderColor: theme.colors.border,
            background: "#FFFFFF",
            color: theme.colors.text,
          }}
        >
          Music and merch store
        </button>
      </div>
    </div>
  );
}

function CartReviewSectionHeading({
  sectionRank,
  unselectedCount,
  unavailableCount,
  onRemoveUnavailable,
}: {
  sectionRank: number;
  unselectedCount: number;
  unavailableCount: number;
  onRemoveUnavailable: () => void;
}) {
  if (sectionRank === 0) {
    return null;
  }

  if (sectionRank === 2) {
    return (
      <div className={styles.cartReviewSectionHeading}>
        <span>Unavailable items ({unavailableCount})</span>
        {unavailableCount > 0 ? (
          <button type="button" onClick={onRemoveUnavailable}>
            Remove all
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.cartReviewSectionHeading}>
      <span>Below are other items in your cart ({unselectedCount})</span>
    </div>
  );
}

function CartItemCountdown({
  secondsRemaining,
}: {
  secondsRemaining: number;
}) {
  if (secondsRemaining <= 0) {
    return (
      <div className={styles.cartItemCountdown}>
        <strong>00:00</strong>
        <span>Returned to stock</span>
      </div>
    );
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className={styles.cartItemCountdown}>
      <strong>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </strong>
      <span>Until cart hold ends</span>
    </div>
  );
}

function getCartFulfillmentLabel(line: ShopResolvedCartLine) {
  const text = [
    line.productTitle,
    line.sizeLabel,
    line.purchaseModeLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hasDigitalSignal =
    line.fulfillmentType === "digital" ||
    text.includes("digital") ||
    text.includes("download") ||
    text.includes("mp3") ||
    text.includes("wav");
  const hasPhysicalSignal =
    line.requiresPhysicalFulfillment === true ||
    line.fulfillmentType === "physical" ||
    line.fulfillmentType === "ticket";

  if (hasPhysicalSignal && hasDigitalSignal) {
    return "Physical and digital delivery";
  }

  if (hasPhysicalSignal) {
    return "Physical delivery";
  }

  return "Digital delivery";
}

function updatePurchaseRecipient(
  recipients: ShopPurchaseRecipient[],
  index: number,
  field: keyof ShopPurchaseRecipient,
  value: string | number
) {
  return recipients.map((recipient, currentIndex) =>
    currentIndex === index
      ? {
          ...recipient,
          [field]: value,
        }
      : recipient
  );
}

function updatePurchaseRecipientFields(
  recipients: ShopPurchaseRecipient[],
  index: number,
  patch: Partial<ShopPurchaseRecipient>
) {
  return recipients.map((recipient, currentIndex) =>
    currentIndex === index
      ? {
          ...recipient,
          ...patch,
        }
      : recipient
  );
}

function removePurchaseRecipient(
  recipients: ShopPurchaseRecipient[],
  index: number
) {
  return recipients.filter((_, currentIndex) => currentIndex !== index);
}

function countValidPurchaseRecipients(recipients: ShopPurchaseRecipient[]) {
  return recipients.filter(
    (recipient) => isPurchaseRecipientComplete(recipient)
  ).reduce(
    (sum, recipient) => sum + getPurchaseRecipientQuantity(recipient),
    0
  );
}

function isPurchaseRecipientComplete(recipient: ShopPurchaseRecipient) {
  return (
    recipient.name.trim().length > 0 &&
    isValidTicketOwnerEmail(recipient.email)
  );
}

function getCompletedPurchaseRecipients(recipients: ShopPurchaseRecipient[]) {
  return recipients.filter((recipient) => isPurchaseRecipientComplete(recipient));
}

function getPurchaseRecipientQuantity(recipient: ShopPurchaseRecipient) {
  return typeof recipient.quantity === "number" &&
    Number.isFinite(recipient.quantity)
    ? Math.max(1, Math.floor(recipient.quantity))
    : 1;
}

function getTicketDetailsAddOns({
  assignment,
  lines,
  sourceLineKey,
  assignmentLinePosition,
  assignmentLineCount,
}: {
  assignment: TicketAssignment;
  lines: ShopResolvedCartLine[];
  sourceLineKey: string;
  assignmentLinePosition: number;
  assignmentLineCount: number;
}) {
  const ticketUpgrade =
    assignment.purchaseModeId &&
    assignment.purchaseModeLabel &&
    !isInternalTicketUpgradeMode(assignment.purchaseModeId)
      ? [
          {
            lineKey: `${assignment.ticketCode}-${assignment.purchaseModeId}`,
            label: assignment.purchaseModeLabel,
            quantity: 1,
            requiresPhysicalFulfillment: false,
            kind: "ticket-upgrade" as const,
          },
        ]
      : [];

  const bundledAddOns = lines
    .map((line) => {
      if (line.bundledFromLineKey !== sourceLineKey) {
        return null;
      }

      const quantity = getDistributedTicketAddOnQuantity({
        totalQuantity: line.quantity,
        assignmentLinePosition,
        assignmentLineCount,
      });

      if (quantity < 1) {
        return null;
      }

      if (line.fulfillmentType !== "ticket") {
        return {
          lineKey: line.lineKey,
          label:
            line.productTitle === line.sizeLabel
              ? line.productTitle
              : `${line.productTitle} - ${line.sizeLabel}`,
          quantity,
          requiresPhysicalFulfillment:
            line.requiresPhysicalFulfillment === true,
          kind: "cart-line" as const,
        };
      }

      if (
        line.purchaseModeId &&
        line.purchaseModeId !== "standard" &&
        line.purchaseModeLabel
      ) {
        return {
          lineKey: `${line.lineKey}-${line.purchaseModeId}`,
          label: line.purchaseModeLabel,
          quantity,
          requiresPhysicalFulfillment:
            line.requiresPhysicalFulfillment === true,
          kind: "ticket-upgrade" as const,
        };
      }

      return null;
    })
    .filter((line): line is {
      lineKey: string;
      label: string;
      quantity: number;
      requiresPhysicalFulfillment: boolean;
      kind: "cart-line" | "ticket-upgrade";
    } => Boolean(line));

  return [...ticketUpgrade, ...bundledAddOns];
}

function getTicketAssignmentUpgradePrice(
  catalog: ShopCatalog | null,
  assignment: TicketAssignment
) {
  if (
    !catalog ||
    !assignment.purchaseModeId ||
    isInternalTicketUpgradeMode(assignment.purchaseModeId)
  ) {
    return 0;
  }

  const product = catalog.products.find(
    (item) => item.id === assignment.productId
  );
  const sizeOption = product?.sizeOptions.find(
    (item) => item.id === assignment.sizeOptionId
  );
  const purchaseMode = sizeOption?.purchaseModes?.find(
    (mode) => mode.id === assignment.purchaseModeId
  );

  return Math.max(0, purchaseMode?.priceAdjustment ?? 0);
}

function isInternalTicketUpgradeMode(modeId: string) {
  return (
    modeId === "standard" ||
    modeId === "default" ||
    modeId === "standard-invitation" ||
    isHiddenTicketDeliveryPurchaseMode(modeId)
  );
}

function getDistributedTicketAddOnQuantity({
  totalQuantity,
  assignmentLinePosition,
  assignmentLineCount,
}: {
  totalQuantity: number;
  assignmentLinePosition: number;
  assignmentLineCount: number;
}) {
  const total = Math.max(0, Math.floor(totalQuantity));
  const count = Math.max(1, Math.floor(assignmentLineCount));
  const position = Math.max(0, Math.floor(assignmentLinePosition));
  const baseQuantity = Math.floor(total / count);
  const remainder = total % count;

  return baseQuantity + (position < remainder ? 1 : 0);
}

function DeliverySlideRenderer({
  config,
  selection,
  deliveryFee,
  currencyCode,
  theme,
  onChange,
}: {
  config: DeliveryConfig | null;
  selection: DeliverySelection;
  deliveryFee: number;
  currencyCode: string;
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

            {selection.countryCode && selection.regionCode ? (
              <div className={styles.deliveryFeeLine}>
                Delivery fee: {formatCurrency(deliveryFee, currencyCode)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewSummaryRenderer({
  answers,
  deliverySelection,
  deliveryFee,
  currencyCode,
  deliveryConfig,
  showDeliverySummary,
  onAdjustDelivery,
  onAdjustContact,
}: {
  answers: QuestionnaireAnswers;
  deliverySelection: DeliverySelection;
  deliveryFee: number;
  currencyCode: string;
  deliveryConfig: DeliveryConfig | null;
  showDeliverySummary: boolean;
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

  const ticketOwnerEmailNotices = normalizeTicketAssignments(
    answers.ticketAssignments
  )
    .filter(
      (assignment) =>
        assignment.isPurchaserTicket !== true &&
        isValidTicketOwnerEmail(assignment.ownerEmail)
    )
    .map((assignment) => ({
      ticketCode: assignment.ticketCode,
      ownerName: assignment.ownerName?.trim() || "This ticket owner",
      ownerEmail: String(assignment.ownerEmail ?? "").trim(),
    }));
  const hasMultipleTicketOwnerEmailNotices =
    ticketOwnerEmailNotices.length > 1;

  return (
    <div className={styles.reviewSummaryStack}>
      {showDeliverySummary ? (
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
                  {formatCurrency(deliveryFee, currencyCode)}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

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

        <div
          className={`${styles.reviewSummaryBody} ${styles.contactSummaryBody}`}
        >
          <div className={styles.contactSummarySection}>
            <div>
              {String(answers.fullName ?? "").trim() || "No name added yet."}
            </div>
            {String(answers.phone ?? "").trim() ? (
              <div>{String(answers.phone ?? "").trim()}</div>
            ) : null}
            {String(answers.email ?? "").trim() ? (
              <div>{String(answers.email ?? "").trim()}</div>
            ) : null}
          </div>
          {hasMultipleTicketOwnerEmailNotices ? (
            <div
              className={`${styles.ticketOwnerEmailNotice} ${styles.contactSummarySection}`}
            >
              {ticketOwnerEmailNotices.map((notice) => (
                <div key={notice.ticketCode}>
                  {notice.ownerName} will be emailed the details of their ticket
                  at {notice.ownerEmail}.
                </div>
              ))}
            </div>
          ) : null}
          {ticketOwnerEmailNotices.length === 1 ? (
            <div
              className={`${styles.ticketOwnerEmailNotice} ${styles.contactSummarySection}`}
            >
              {ticketOwnerEmailNotices[0].ownerName} will be emailed the details
              of their ticket at {ticketOwnerEmailNotices[0].ownerEmail}.
            </div>
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
  slideId,
  reviewSection = "primary",
  slideMode,
  title,
  catalog,
  cart,
  selectedLines,
  reservationSecondsRemaining,
  inventoryNotices,
  mealMenu,
  ticketAssignments,
  onAdjustMeals,
  activeCurrencyCode,
  canChangeCurrency,
  onChangeCurrency,
  theme,
  answers,
  onSetQuantity,
  onSetLineSelected,
  onSetPurchaseMode,
  onSetPurchaseRecipients,
  onRemoveLine,
  onAdjustLine,
}: {
  slideId: string;
  reviewSection?: "primary" | "secondary";
  slideMode: "browse" | "review";
  title?: string;
  catalog: ShopCatalog | null;
  cart: ShopCart;
  selectedLines: ShopResolvedCartLine[];
  reservationSecondsRemaining: number;
  inventoryNotices: string[];
  mealMenu?: MealMenu | null;
  ticketAssignments?: TicketAssignments;
  onAdjustMeals?: (ticketCode: string) => void;
  activeCurrencyCode: string;
  canChangeCurrency: boolean;
  onChangeCurrency: (currencyCode: string) => void;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  onSetQuantity: (
    productId: string,
    sizeOptionId: string,
    quantity: number
  ) => void;
  onSetLineSelected: (
    productId: string,
    sizeOptionId: string,
    selected: boolean
  ) => void;
  onSetPurchaseMode: (
    productId: string,
    sizeOptionId: string,
    purchaseModeId?: string
  ) => void;
  onSetPurchaseRecipients: (
    productId: string,
    sizeOptionId: string,
    recipients: ShopPurchaseRecipient[]
  ) => void;
  onRemoveLine: (productId: string, sizeOptionId: string) => void;
  onAdjustLine?: (productId: string, sizeOptionId: string) => void;
}) {
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>(
    {}
  );
  const [verifiedPurchaseRecipients, setVerifiedPurchaseRecipients] = useState<
    VerifiedPurchaseRecipientOption[]
  >([]);
  const [recipientSelectValues, setRecipientSelectValues] = useState<
    Record<string, string>
  >({});
  const [purchaseRecipientPickerOpen, setPurchaseRecipientPickerOpen] =
    useState<Record<string, boolean>>({});
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const reviewCartLines = useMemo(
    () =>
      slideMode === "review"
        ? resolveShopCartLines(catalog, cart)
        : selectedLines,
    [cart, catalog, selectedLines, slideMode]
  );
  const selectedReviewLines = useMemo(
    () =>
      reviewCartLines.filter(
        (line) =>
          line.selected !== false && line.availabilityStatus !== "unavailable"
      ),
    [reviewCartLines]
  );
  const unselectedReviewLines = useMemo(
    () =>
      reviewCartLines.filter(
        (line) =>
          line.selected === false && line.availabilityStatus !== "unavailable"
      ),
    [reviewCartLines]
  );
  const unavailableReviewLines = useMemo(
    () =>
      reviewCartLines.filter(
        (line) => line.availabilityStatus === "unavailable"
      ),
    [reviewCartLines]
  );
  const activeReviewLines = useMemo(() => {
    if (slideMode !== "review") {
      return reviewCartLines;
    }

    return reviewSection === "secondary"
      ? [...unselectedReviewLines, ...unavailableReviewLines]
      : selectedReviewLines;
  }, [
    reviewCartLines,
    reviewSection,
    selectedReviewLines,
    slideMode,
    unavailableReviewLines,
    unselectedReviewLines,
  ]);
  const displayReviewLines = useMemo(
    () => activeReviewLines.filter((line) => !line.bundledFromLineKey),
    [activeReviewLines]
  );

  useEffect(() => {
    if (slideMode === "review") {
      const nextExpanded: Record<string, boolean> = {};
      for (const line of reviewCartLines) {
        nextExpanded[line.productId] = true;
      }
      setExpandedProducts(nextExpanded);
    }
  }, [slideMode, reviewCartLines]);

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

  const products = useMemo(
    () =>
      catalog?.products.length && slideMode === "review"
        ? catalog.products.filter((product) =>
            displayReviewLines.some((line) => line.productId === product.id)
          )
        : catalog?.products ?? [],
    [catalog, displayReviewLines, slideMode]
  );

  useEffect(() => {
    const needsVerifiedRecipients = products.some(
      (product) =>
        product.enablePurchaseForOthers || product.fulfillmentType === "ticket"
    );

    if (!needsVerifiedRecipients) {
      return;
    }

    let isMounted = true;

    async function loadVerifiedRecipients() {
      try {
        const response = await fetch("/api/account/purchase-recipients", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (isMounted) {
            setVerifiedPurchaseRecipients([]);
          }
          return;
        }

        const data = await response.json().catch(() => null);
        const recipients = Array.isArray(data?.recipients)
          ? data.recipients
              .filter(
                (recipient: VerifiedPurchaseRecipientOption) =>
                  recipient?.status === "VERIFIED"
              )
              .map((recipient: VerifiedPurchaseRecipientOption) => ({
                id: recipient.id,
                recipientName: recipient.recipientName,
                recipientEmail: recipient.recipientEmail,
                confirmedName: recipient.confirmedName,
                status: recipient.status,
              }))
          : [];

        if (isMounted) {
          setVerifiedPurchaseRecipients(recipients);
        }
      } catch {
        if (isMounted) {
          setVerifiedPurchaseRecipients([]);
        }
      }
    }

    void loadVerifiedRecipients();

    return () => {
      isMounted = false;
    };
  }, [products]);

  if (!catalog?.products.length) {
    return <p className={styles.body}>No shop items available yet.</p>;
  }

  if (slideMode === "review" && activeReviewLines.length === 0) {
    return null;
  }

  const productSectionRank = (productId: string) => {
    const productLines = displayReviewLines.filter(
      (line) => line.productId === productId
    );

    if (!productLines.length) return 0;
    if (
      productLines.some(
        (line) =>
          line.selected !== false && line.availabilityStatus !== "unavailable"
      )
    ) {
      return 0;
    }
    if (
      productLines.some((line) => line.availabilityStatus !== "unavailable")
    ) {
      return 1;
    }

    return 2;
  };

  const sortedProducts =
    slideMode === "review"
      ? [...products].sort(
          (first, second) =>
            productSectionRank(first.id) - productSectionRank(second.id)
        )
      : products;
  const renderedReviewSections = new Set<number>();

  return (
    <div className={styles.shopStack}>
      {slideMode === "review" && reviewSection === "primary" && title ? (
        <h2 className={styles.cartTitle}>{title}</h2>
      ) : null}

      {reviewSection === "primary" ? (
      <div className={styles.shopCurrencyRow}>
        <span>Currency</span>
        {canChangeCurrency ? (
          <select
            className={styles.shopCurrencySelect}
            value={activeCurrencyCode}
            onChange={(event) => onChangeCurrency(event.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((currencyCode) => (
              <option key={currencyCode} value={currencyCode}>
                {currencyCode}
              </option>
            ))}
          </select>
        ) : (
          <strong>{activeCurrencyCode}</strong>
        )}
      </div>
      ) : null}

      {slideMode === "review" &&
      reviewSection === "primary" &&
      inventoryNotices.length > 0 ? (
        <div className={styles.cartInventoryNotice}>
          {inventoryNotices.map((notice, index) => (
            <div key={`${notice}-${index}`}>{notice}</div>
          ))}
        </div>
      ) : null}

      {slideMode === "review" && reviewSection === "primary" ? (
        <div className={styles.cartSectionHeader}>
          <span>All ({reviewCartLines.length})</span>
          <span>Selected ({selectedReviewLines.length})</span>
        </div>
      ) : null}

      {sortedProducts.map((product) => {
        const reviewLinesForProduct = displayReviewLines.filter(
          (line) => line.productId === product.id
        );

        if (slideMode === "review" && reviewLinesForProduct.length === 0) {
          return null;
        }

        const isExpanded =
          slideMode === "review" || expandedProducts[product.id] === true;

        const isEventProduct = product.fulfillmentType === "ticket";
        const sectionRank =
          slideMode === "review" ? productSectionRank(product.id) : 0;
        const shouldRenderSectionHeading =
          slideMode === "review" && !renderedReviewSections.has(sectionRank);

        if (shouldRenderSectionHeading) {
          renderedReviewSections.add(sectionRank);
        }
        const eventDescription =
          product.detailsDescription ?? product.description ?? "";
        const eventInfoRows = [
          product.eventVenueLabel
            ? ["Venue:", product.eventVenueLabel]
            : null,
          product.eventAddress ? ["Address:", product.eventAddress] : null,
          product.eventDateLabel ? ["Date:", product.eventDateLabel] : null,
          product.eventTimeLabel
            ? ["Show starts at:", product.eventTimeLabel]
            : null,
        ].filter(Boolean) as string[][];

        return (
          <Fragment key={product.id}>
            {shouldRenderSectionHeading ? (
              <CartReviewSectionHeading
                sectionRank={sectionRank}
                unselectedCount={unselectedReviewLines.length}
                unavailableCount={unavailableReviewLines.length}
                onRemoveUnavailable={() => {
                  for (const line of unavailableReviewLines) {
                    onRemoveLine(line.productId, line.sizeOptionId);
                  }
                }}
              />
            ) : null}
          <div
            ref={(node) => {
              productRefs.current[product.id] = node;
            }}
            className={
              slideMode === "review"
                ? `${styles.productPanel} ${styles.cartProductPanel}`
                : styles.productPanel
            }
            style={{ borderColor: theme.colors.border }}
          >
            {slideMode === "review" ? null : isEventProduct ? (
              <div className={styles.eventProductHeader}>
                <div className={styles.eventProductHeroWrap}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className={styles.eventProductHeroImage}
                    />
                  ) : (
                    <div
                      className={styles.eventProductHeroFallback}
                      style={{ borderColor: theme.colors.border }}
                    />
                  )}
                </div>

                <div className={styles.eventProductBody}>
                  <h3 className={styles.eventProductTitle}>{product.title}</h3>

                  {eventInfoRows.length ? (
                    <div className={styles.eventProductInfoRows}>
                      {eventInfoRows.map(([label, value]) => (
                        <div key={label} className={styles.eventProductInfoRow}>
                          <strong>{label}</strong>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!isExpanded ? (
                    <button
                      type="button"
                      className={styles.seeCostButton}
                      onClick={() =>
                        setExpandedProducts((prev) => ({
                          ...prev,
                          [product.id]: true,
                        }))
                      }
                      style={{
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    >
                      See details
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
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

                      </div>

                    </div>
                  </div>
                </div>

                {product.description ? (
                  <p className={styles.productDescriptionFull}>
                    {product.description}
                  </p>
                ) : null}

              {!isExpanded ? (
                <button
                  type="button"
                  className={styles.seeCostButton}
                  onClick={() =>
                    setExpandedProducts((prev) => ({
                      ...prev,
                      [product.id]: true,
                    }))
                  }
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  See details
                </button>
              ) : null}
              </div>
            )}

            {isExpanded ? (
              <div className={styles.sizeRows}>
                {isEventProduct && slideMode === "browse" && eventDescription ? (
                  <div className={styles.eventProductDetailsBox}>
                    {eventDescription}
                  </div>
            ) : null}

            {product.sizeOptions
              .filter((sizeOption) => {
                if (slideMode === "browse") return true;

                return displayReviewLines.some(
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
                    ? displayReviewLines.find(
                        (line) =>
                          line.productId === product.id &&
                          line.sizeOptionId === sizeOption.id
                      )
                    : undefined;

                const isDraftActive = Boolean(cartLine);
                const selected =
                  slideMode === "review" ? true : cartLine?.selected === true;
                const isConfigurable =
                  slideMode === "review" ? true : isDraftActive;
                const quantity = Math.max(1, cartLine?.quantity ?? 1);
                const purchaseRecipients =
                  cartLine?.purchaseRecipients ??
                  resolvedLine?.purchaseRecipients ??
                  [];
                const productAllowsPurchaseForOthers =
                  product.enablePurchaseForOthers ||
                  product.fulfillmentType === "ticket";
                const purchaseSubject = getShopPurchaseSubjectLabel(
                  product,
                  sizeOption
                );
                const recipientLimit = Math.max(
                  0,
                  product.maxPurchaseForOthers ?? quantity
                );
                const latestRecipient =
                  purchaseRecipients.length > 0 ? purchaseRecipients[0] : null;
                const canAddPurchaseRecipient =
                  purchaseRecipients.length < recipientLimit &&
                  (!latestRecipient ||
                    isPurchaseRecipientComplete(latestRecipient));
                const productMinQuantity = product.minOrderQuantity ?? 1;
                const productMaxQuantity = product.maxOrderQuantity;
                const productMaxAccountHolderQuantity =
                  product.maxAccountHolderQuantity;
                const recipientMinQuantity = product.minRecipientQuantity ?? 1;
                const recipientMaxQuantity = product.maxRecipientQuantity;
                const recipientReservedQuantity =
                  countValidPurchaseRecipients(purchaseRecipients);
                const minimumQuantity =
                  Math.max(
                    productMinQuantity,
                    recipientReservedQuantity > 0
                      ? recipientReservedQuantity
                      : 1
                  );
                const accountHolderQuantity = Math.max(
                  0,
                  quantity - recipientReservedQuantity
                );
                const completedPurchaseRecipients =
                  getCompletedPurchaseRecipients(purchaseRecipients);
                const selectedRecipientEmails = new Set(
                  purchaseRecipients.map((recipient) =>
                    recipient.email.trim().toLowerCase()
                  )
                );
                const availableVerifiedRecipients =
                  verifiedPurchaseRecipients.filter(
                    (recipient) =>
                      !selectedRecipientEmails.has(
                        recipient.recipientEmail.trim().toLowerCase()
                      )
                  );
                const hidePurchaseForOthersSection =
                  (slideId === "music-merch-shop" &&
                    String(answers.shopEntrySource ?? "") ===
                      "ticket-details-add-ons") ||
                  verifiedPurchaseRecipients.length === 0;
                const selectedVerifiedRecipientId =
                  recipientSelectValues[lineKey] ||
                  availableVerifiedRecipients[0]?.id ||
                  "";
                const accountHolderName =
                  String(answers.fullName ?? "").trim() || "you";
                const spotsRemaining =
                  productMaxQuantity !== undefined
                    ? Math.max(0, productMaxQuantity - quantity)
                    : undefined;
                const mainQuantityMax =
                  productMaxAccountHolderQuantity !== undefined
                    ? Math.min(
                        productMaxQuantity ?? Number.POSITIVE_INFINITY,
                        recipientReservedQuantity +
                          productMaxAccountHolderQuantity
                      )
                    : productMaxQuantity;
                const activePurchaseMode =
                  sizeOption.purchaseModes?.find(
                    (mode) => mode.id === cartLine?.purchaseModeId
                  ) ?? sizeOption.purchaseModes?.[0];
                const visiblePurchaseModes = getVisiblePurchaseModes(
                  product,
                  sizeOption
                );
                const linePurchaseModes = visiblePurchaseModes;
                const recipientPurchaseModes =
                  product.fulfillmentType === "ticket"
                    ? visiblePurchaseModes
                    : [];

                const unitPrice =
                  slideMode === "review"
                    ? resolvedLine?.unitPrice ??
                      sizeOption.price + (activePurchaseMode?.priceAdjustment ?? 0)
                    : sizeOption.price + (activePurchaseMode?.priceAdjustment ?? 0);
                const isEventTicketLine = product.fulfillmentType === "ticket";
                const isUnavailable =
                  slideMode === "review" &&
                  resolvedLine?.availabilityStatus === "unavailable";
                const fulfillmentLabel =
                  slideMode === "review" && resolvedLine
                    ? getCartFulfillmentLabel(resolvedLine)
                    : "";
                const shouldShowPurchaseModeLabel =
                  product.fulfillmentType !== "ticket" &&
                  !activePurchaseMode?.bundledCartItems?.length &&
                  Boolean(resolvedLine?.purchaseModeLabel);

                if (isUnavailable && slideMode === "review") {
                  return (
                    <div
                      key={sizeOption.id}
                      className={`${styles.sizeRowBlock} ${styles.cartUnavailablePanel}`}
                      style={{ borderTopColor: theme.colors.border }}
                    >
                      <div className={styles.cartUnavailableThumbnail}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" />
                        ) : (
                          <span>{product.title.slice(0, 1)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.cartIconButton}
                        aria-label={`Remove unavailable ${product.title} ${sizeOption.label}`}
                        onClick={() => onRemoveLine(product.id, sizeOption.id)}
                      >
                        <span aria-hidden="true" className={styles.cartTrashIcon} />
                      </button>
                    </div>
                  );
                }

                if (isEventTicketLine && slideMode === "review") {
                  const lineMealAssignments =
                    ticketAssignments?.filter(
                      (assignment) =>
                        assignment.lineKey === resolvedLine?.lineKey ||
                        (assignment.productId === product.id &&
                          assignment.sizeOptionId === sizeOption.id)
                    ) ?? [];
                  const bundledAddOnLines = activeReviewLines.filter(
                    (line) => line.bundledFromLineKey === resolvedLine?.lineKey
                  );
                  const bundledAddOnPurchasedForLabels = lineMealAssignments
                    .filter((assignment) => assignment.isPurchaserTicket === false)
                    .map((assignment) =>
                      String(
                        assignment.ownerName ||
                          assignment.ownerEmail ||
                          assignment.ticketLabel
                      ).trim()
                    )
                    .filter(Boolean);

                  return (
                    <div
                      key={sizeOption.id}
                      className={`${styles.sizeRowBlock} ${styles.cartItemPanel}`}
                      style={{ borderTopColor: theme.colors.border }}
                    >
                      <div className={styles.cartItemTopBar}>
                        <input
                          type="checkbox"
                          checked={resolvedLine?.selected !== false}
                          aria-label={`Selected ${product.title} ${sizeOption.label}`}
                          onChange={(event) =>
                            onSetLineSelected(
                              product.id,
                              sizeOption.id,
                              event.target.checked
                            )
                          }
                        />
                        <CartItemCountdown
                          secondsRemaining={reservationSecondsRemaining}
                        />
                        <button
                          type="button"
                          className={styles.cartIconButton}
                          aria-label={`Remove ${sizeOption.label}`}
                          onClick={() => onRemoveLine(product.id, sizeOption.id)}
                        >
                          <span aria-hidden="true" className={styles.cartTrashIcon} />
                        </button>
                      </div>
                      <div className={styles.cartItemMain}>
                        <div className={styles.cartItemThumbnail}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" />
                          ) : (
                            <span>Ticket</span>
                          )}
                        </div>
                        <div className={styles.eventTicketCartHeaderLine}>
                        <div className={styles.cartItemNameLine}>
                          <span>{product.title}</span>
                        </div>
                        <div className={styles.eventTicketCartType}>
                          {sizeOption.label}
                          {shouldShowPurchaseModeLabel
                            ? ` - ${resolvedLine?.purchaseModeLabel}`
                            : ""}
                        </div>
                        </div>
                      </div>
                      <div className={styles.reviewMetaRow}>
                        {product.eventVenueLabel ? (
                          <span>{product.eventVenueLabel}</span>
                        ) : null}
                        {product.eventAddress ? (
                          <span>{product.eventAddress}</span>
                        ) : null}
                        {product.eventDateLabel || product.eventTimeLabel ? (
                          <span>
                            {[product.eventDateLabel, product.eventTimeLabel]
                              .filter(Boolean)
                              .join(" - ")}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.cartItemPriceRow}>
                        <strong>{formatCurrency(unitPrice, catalog.currencyCode)}</strong>
                      </div>
                      {lineMealAssignments.length > 0 && mealMenu ? (
                        <div className={styles.cartTicketMealStack}>
                          {lineMealAssignments.map((assignment) => (
                            <CartTicketMealSummary
                              key={assignment.ticketCode}
                              assignment={assignment}
                              menu={mealMenu}
                              currencyCode={catalog.currencyCode ?? activeCurrencyCode}
                              onAdjustMeals={onAdjustMeals}
                            />
                          ))}
                        </div>
                      ) : null}
                      {bundledAddOnLines.length > 0 ? (
                        <CartBundledAddOnsSummary
                          lines={bundledAddOnLines}
                          currencyCode={catalog.currencyCode}
                          purchasedForLabels={bundledAddOnPurchasedForLabels}
                        />
                      ) : null}
                      {fulfillmentLabel ? (
                        <div className={styles.cartItemFootnote}>
                          {fulfillmentLabel}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={sizeOption.id}
                    className={
                      slideMode === "review"
                        ? `${styles.sizeRowBlock} ${styles.cartItemPanel}`
                        : styles.sizeRowBlock
                    }
                    style={{ borderTopColor: theme.colors.border }}
                  >
                    {slideMode === "review" ? (
                      <div className={styles.cartItemTopBar}>
                        <input
                          type="checkbox"
                          checked={resolvedLine?.selected !== false}
                          aria-label={`Selected ${product.title} ${sizeOption.label}`}
                          onChange={(event) =>
                            onSetLineSelected(
                              product.id,
                              sizeOption.id,
                              event.target.checked
                            )
                          }
                        />
                        <CartItemCountdown
                          secondsRemaining={reservationSecondsRemaining}
                        />
                        <button
                          type="button"
                          className={styles.cartIconButton}
                          aria-label={`Remove ${product.title} ${sizeOption.label}`}
                          onClick={() => onRemoveLine(product.id, sizeOption.id)}
                        >
                          <span aria-hidden="true" className={styles.cartTrashIcon} />
                        </button>
                      </div>
                    ) : null}
                    {slideMode === "review" ? (
                      <div className={styles.cartItemMain}>
                        <div className={styles.cartItemThumbnail}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" />
                          ) : (
                            <span>{product.title.slice(0, 1)}</span>
                          )}
                        </div>
                    <div className={styles.sizeRow}>
                      <div className={styles.sizeText}>
                        <div className={styles.sizeLabel}>
                          {slideMode === "review" ? product.title : sizeOption.label}
                        </div>

                        {slideMode === "review" ? (
                          <div className={styles.sizeDescription}>
                            {[
                              sizeOption.label,
                              resolvedLine?.purchaseModeLabel,
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                        ) : sizeOption.description ? (
                          <ShopSizeDescription text={sizeOption.description} />
                        ) : null}
                      </div>
                    </div>
                      </div>
                    ) : (
                    <div className={styles.sizeRow}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          const nextActive = event.target.checked;

                          if (
                            nextActive &&
                            (visiblePurchaseModes.length ||
                              sizeOption.purchaseModes?.length) &&
                            !cartLine?.purchaseModeId
                          ) {
                            onSetPurchaseMode(
                              product.id,
                              sizeOption.id,
                              visiblePurchaseModes[0]?.id ??
                                getDefaultPurchaseModeId(sizeOption)
                            );
                          }

                          if (nextActive) {
                            onSetLineSelected(product.id, sizeOption.id, true);
                          } else {
                            onRemoveLine(product.id, sizeOption.id);
                          }
                        }}
                      />
                      <div className={styles.sizeText}>
                        <div className={styles.sizeLabel}>{sizeOption.label}</div>

                        {sizeOption.description ? (
                          <ShopSizeDescription text={sizeOption.description} />
                        ) : null}
                      </div>
                    </div>
                    )}

                    {slideMode === "browse" ? (
                      <div className={styles.sizePurchaseBand}>
                        <div className={styles.sizePrice}>
                          {formatCurrency(unitPrice, catalog.currencyCode)}
                        </div>
                        <QuantityControl
                          quantity={quantity}
                          minQuantity={minimumQuantity}
                          maxQuantity={mainQuantityMax}
                          disabled={!isConfigurable}
                          onDecrease={() =>
                            onSetQuantity(product.id, sizeOption.id, quantity - 1)
                          }
                          onIncrease={() =>
                            onSetQuantity(product.id, sizeOption.id, quantity + 1)
                          }
                          theme={theme}
                        />
                      </div>
                    ) : null}

                    {slideMode === "browse" &&
                    isConfigurable &&
                    productAllowsPurchaseForOthers &&
                    completedPurchaseRecipients.length > 0 ? (
                      <div className={styles.accountHolderQuantityHint}>
                        <div className={styles.purchaseAllocationList}>
                          <div>
                            {formatQuantitySubject(
                              accountHolderQuantity,
                              purchaseSubject
                            )}{" "}
                            will be sent to you
                            {accountHolderName ? ` (${accountHolderName})` : ""}.
                          </div>
                          {completedPurchaseRecipients.map((recipient, index) => {
                            const recipientQuantity =
                              getPurchaseRecipientQuantity(recipient);

                            return (
                              <div
                                key={`${product.id}-${sizeOption.id}-allocation-${index}`}
                              >
                                {formatQuantitySubject(
                                  recipientQuantity,
                                  purchaseSubject
                                )}{" "}
                                will be sent to{" "}
                                <strong>{recipient.name.trim()}</strong>.
                              </div>
                            );
                          })}
                          {productMaxQuantity ? (
                            <div className={styles.spotsRemainingLine}>
                              {spotsRemaining} spot
                              {spotsRemaining === 1 ? "" : "s"} remaining.
                              Maximum{" "}
                              {formatQuantitySubject(
                                productMaxQuantity,
                                purchaseSubject
                              )}{" "}
                              per order.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {slideMode === "browse" &&
                    linePurchaseModes.length > 0 &&
                    !isInternalOnlyPurchaseMode(linePurchaseModes) ? (
                    <div className={styles.purchaseModes}>
                      {linePurchaseModes.map((mode) => {
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
                              disabled={slideMode === "browse" ? !isConfigurable : true}
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

                  {slideMode === "browse" &&
                  productAllowsPurchaseForOthers &&
                  isConfigurable &&
                  !hidePurchaseForOthersSection ? (
                    <div className={styles.purchaseForOthersPanel}>
                      <div className={styles.purchaseForSomeoneSelector}>
                        <button
                          type="button"
                          className={styles.purchaseForSomeoneButton}
                          onClick={() =>
                            setPurchaseRecipientPickerOpen((prev) => ({
                              ...prev,
                              [lineKey]: !prev[lineKey],
                            }))
                          }
                          disabled={!canAddPurchaseRecipient}
                        >
                          + Purchase for someone
                        </button>
                        <div className={styles.purchaseForOthersHint}>
                          You can add up to {recipientLimit} people for this{" "}
                          {purchaseSubject}.
                        </div>
                        {purchaseRecipientPickerOpen[lineKey] ? (
                          <div className={styles.verifiedRecipientPicker}>
                            <select
                              className={styles.input}
                              value={selectedVerifiedRecipientId}
                              onChange={(event) =>
                                setRecipientSelectValues((prev) => ({
                                  ...prev,
                                  [lineKey]: event.target.value,
                                }))
                              }
                              disabled={availableVerifiedRecipients.length === 0}
                              style={{ borderColor: theme.colors.border }}
                            >
                              {availableVerifiedRecipients.length ? (
                                availableVerifiedRecipients.map((recipient) => (
                                  <option key={recipient.id} value={recipient.id}>
                                    {recipient.confirmedName ||
                                      recipient.recipientName}{" "}
                                    ({recipient.recipientEmail})
                                  </option>
                                ))
                              ) : (
                                <option value="">No verified recipients yet</option>
                              )}
                            </select>
                            <button
                              type="button"
                              className={styles.purchaseForSomeoneButton}
                              onClick={() => {
                                const selectedRecipient =
                                  availableVerifiedRecipients.find(
                                    (recipient) =>
                                      recipient.id === selectedVerifiedRecipientId
                                  );

                                if (!selectedRecipient) {
                                  return;
                                }

                                onSetPurchaseRecipients(product.id, sizeOption.id, [
                                  {
                                    name:
                                      selectedRecipient.confirmedName ||
                                      selectedRecipient.recipientName,
                                    email: selectedRecipient.recipientEmail,
                                    quantity: recipientMinQuantity,
                                    note: "",
                                    purchaseModeId:
                                      recipientPurchaseModes[0]?.id ??
                                      getDefaultPurchaseModeId(sizeOption),
                                    purchaseModeLabel:
                                      recipientPurchaseModes[0]?.label,
                                  },
                                  ...purchaseRecipients,
                                ]);
                                setPurchaseRecipientPickerOpen((prev) => ({
                                  ...prev,
                                  [lineKey]: false,
                                }));
                              }}
                              disabled={
                                !selectedVerifiedRecipientId ||
                                availableVerifiedRecipients.length === 0
                              }
                            >
                              Add selected recipient
                            </button>
                          </div>
                        ) : null}

                        {purchaseRecipients.length >= recipientLimit ? (
                          <div className={styles.purchaseForOthersLimit}>
                            Recipient limit reached for {purchaseSubject}.
                          </div>
                        ) : null}
                        {latestRecipient &&
                        !isPurchaseRecipientComplete(latestRecipient) ? (
                          <div className={styles.purchaseForOthersLimit}>
                            Add the newest recipient&apos;s name and valid email before
                            adding another recipient.
                          </div>
                        ) : null}
                      </div>

                      {purchaseRecipients.length ? (
                        <div className={styles.purchaseRecipientListPanel}>
                          {purchaseRecipients.map((recipient, index) => (
                            <div
                              key={`${product.id}-${sizeOption.id}-recipient-${index}`}
                              className={styles.purchaseRecipientFields}
                            >
                              {(() => {
                                const recipientIsComplete =
                                  isPurchaseRecipientComplete(recipient);
                                const recipientQuantity =
                                  getPurchaseRecipientQuantity(recipient);
                                const recipientQuantityLocked =
                                  recipientMaxQuantity === 1 ||
                                  recipientMinQuantity === recipientMaxQuantity;
                                const selectedRecipientPurchaseMode =
                                  recipientPurchaseModes.find(
                                    (mode) =>
                                      mode.id === recipient.purchaseModeId
                                  ) ?? recipientPurchaseModes[0];

                                return (
                                  <>
                                    <div className={styles.purchaseForOthersHint}>
                                      <strong className={styles.purchaseRecipientName}>
                                        {recipient.name}
                                      </strong>{" "}
                                      ({recipient.email})
                                    </div>
                                    <div className={styles.recipientQuantityBlock}>
                                      {!recipientQuantityLocked ? (
                                        <div className={styles.recipientQuantityRow}>
                                          <QuantityControl
                                            quantity={recipientQuantity}
                                            minQuantity={recipientMinQuantity}
                                            maxQuantity={recipientMaxQuantity}
                                            disabled={!recipientIsComplete}
                                            onDecrease={() =>
                                              onSetPurchaseRecipients(
                                                product.id,
                                                sizeOption.id,
                                                updatePurchaseRecipient(
                                                  purchaseRecipients,
                                                  index,
                                                  "quantity",
                                                  recipientQuantity - 1
                                                )
                                              )
                                            }
                                            onIncrease={() =>
                                              onSetPurchaseRecipients(
                                                product.id,
                                                sizeOption.id,
                                                updatePurchaseRecipient(
                                                  purchaseRecipients,
                                                  index,
                                                  "quantity",
                                                  recipientQuantity + 1
                                                )
                                              )
                                            }
                                            theme={theme}
                                          />
                                        </div>
                                      ) : null}
                                      {recipientIsComplete ? (
                                        <div className={styles.purchaseForOthersHint}>
                                          {formatQuantitySubject(
                                            recipientQuantity,
                                            purchaseSubject
                                          )}{" "}
                                          reserved for {recipient.name.trim()}.
                                        </div>
                                      ) : (
                                        <div className={styles.purchaseForOthersHint}>
                                          Add a name and valid email to reserve items for
                                          this recipient.
                                        </div>
                                      )}
                                    </div>
                                    {recipientPurchaseModes.length > 1 ? (
                                      <div className={styles.recipientUpgradeBlock}>
                                        <div className={styles.purchaseForOthersHint}>
                                          Ticket upgrade
                                        </div>
                                        <div className={styles.purchaseModes}>
                                          {recipientPurchaseModes.map((mode) => (
                                            <label
                                              key={mode.id}
                                              className={styles.purchaseModeOption}
                                            >
                                              <input
                                                type="radio"
                                                name={`${lineKey}-recipient-upgrade-${index}`}
                                                checked={
                                                  selectedRecipientPurchaseMode?.id ===
                                                  mode.id
                                                }
                                                disabled={!recipientIsComplete}
                                                onChange={() =>
                                                  onSetPurchaseRecipients(
                                                    product.id,
                                                    sizeOption.id,
                                                    updatePurchaseRecipientFields(
                                                      purchaseRecipients,
                                                      index,
                                                      {
                                                        purchaseModeId: mode.id,
                                                        purchaseModeLabel: mode.label,
                                                      }
                                                    )
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
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    <button
                                      type="button"
                                      className={styles.cartRemoveLink}
                                      onClick={() =>
                                        onSetPurchaseRecipients(
                                          product.id,
                                          sizeOption.id,
                                          removePurchaseRecipient(
                                            purchaseRecipients,
                                            index
                                          )
                                        )
                                      }
                                    >
                                      Remove recipient
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {slideMode === "review" ? (
                    <div className={styles.reviewMetaRow}>
                      {sizeOption.description ? (
                        <span>{sizeOption.description}</span>
                      ) : null}

                      {typeof sizeOption.weight === "number" &&
                      sizeOption.weight > 0 ? (
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
                          {resolvedLine.discountLabel}: -
                          {formatCurrency(
                            resolvedLine.lineDiscount,
                            catalog.currencyCode
                          )}
                        </span>
                      ) : null}

                    </div>
                  ) : null}

                  {slideMode === "review" &&
                  purchaseRecipients.length > 0 ? (
                    <div className={styles.purchaseForOthersReview}>
                      <strong>Purchased for</strong>
                      {purchaseRecipients.map((recipient, index) => (
                        <div key={`${product.id}-${sizeOption.id}-review-${index}`}>
                          {getPurchaseRecipientQuantity(recipient)} for{" "}
                          {recipient.name || "Recipient"}{" "}
                          {recipient.email ? `(${recipient.email})` : ""}
                          {recipient.note ? ` - ${recipient.note}` : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {slideMode === "review" ? (
                    <div className={styles.cartItemPriceRow}>
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
                        minQuantity={minimumQuantity}
                        maxQuantity={mainQuantityMax}
                        disabled={false}
                        onDecrease={() =>
                          onSetQuantity(product.id, sizeOption.id, quantity - 1)
                        }
                        onIncrease={() =>
                          onSetQuantity(product.id, sizeOption.id, quantity + 1)
                        }
                        theme={theme}
                      />
                    </div>
                  ) : null}

                  {slideMode === "review" && fulfillmentLabel ? (
                    <div className={styles.cartItemFootnote}>
                      {fulfillmentLabel}
                    </div>
                  ) : null}
                </div>
              );
              })}

                {slideMode === "browse" ? (
                  <div className={styles.eventProductBottomActions}>
                    <button
                      type="button"
                      className={styles.seeCostButton}
                      onClick={() =>
                        setExpandedProducts((prev) => ({
                          ...prev,
                          [product.id]: false,
                        }))
                      }
                      style={{
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    >
                      Hide details
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
        </div>
          </Fragment>
      );
    })}

    </div>
  );
}

function ReviewTotalsRenderer({
  catalog,
  totalWeight,
  deliveryFee,
  discountTotal,
  grandTotal,
  ticketOwnerAddonBudgetTotal,
  ticketUpgradeTotal,
  activeDiscountLabel,
  showDeliveryFee,
  showDiscountTotal,
  showTotalWeight,
}: {
  catalog: ShopCatalog | null;
  totalWeight: number;
  deliveryFee: number;
  discountTotal: number;
  grandTotal: number;
  ticketOwnerAddonBudgetTotal?: number;
  ticketUpgradeTotal?: number;
  activeDiscountLabel?: string;
  showDeliveryFee?: boolean;
  showDiscountTotal?: boolean;
  showTotalWeight?: boolean;
}) {
  if (!catalog) {
    return null;
  }

  return (
    <div className={styles.reviewTotals}>
      {activeDiscountLabel && showDiscountTotal ? (
        <div>
          Discount: {activeDiscountLabel}
          {String(activeDiscountLabel).toLowerCase().includes("questionnaire")
            ? hasPhoneNote()
            : null}
        </div>
      ) : null}

      {showDeliveryFee ? (
        <div>
          Delivery fee: {formatCurrency(deliveryFee, catalog.currencyCode)}
        </div>
      ) : null}

      {showDiscountTotal ? (
        <div>
          Discount total: -{formatCurrency(discountTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {ticketOwnerAddonBudgetTotal && ticketOwnerAddonBudgetTotal > 0 ? (
        <div>
          Ticket owner add-on budgets:{" "}
          {formatCurrency(ticketOwnerAddonBudgetTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {ticketUpgradeTotal && ticketUpgradeTotal > 0 ? (
        <div>
          Ticket upgrades: {formatCurrency(ticketUpgradeTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {showTotalWeight ? (
        <div>
          Total order weight: {formatWeight(totalWeight, catalog.weightUnit)}
        </div>
      ) : null}

      <div style={{ fontWeight: 700 }}>
        Total due: {formatCurrency(grandTotal, catalog.currencyCode)}
      </div>
    </div>
  );
}

function QuantityControl({
  quantity,
  minQuantity = 1,
  maxQuantity,
  disabled,
  onDecrease,
  onIncrease,
  theme,
}: {
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  theme: ThemeConfig;
}) {
  return (
    <div className={styles.quantityControl}>
      <button
        type="button"
        disabled={disabled || quantity <= minQuantity}
        onClick={onDecrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        -
      </button>
      <span className={styles.quantityValue}>{quantity}</span>
      <button
        type="button"
        disabled={disabled || (maxQuantity !== undefined && quantity >= maxQuantity)}
        onClick={onIncrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        +
      </button>
    </div>
  );
}

function convertMealMenuCurrency(menu: MealMenu | null, rate: number) {
  if (!menu) {
    return null;
  }

  if (!Number.isFinite(rate) || rate <= 0 || rate === 1) {
    return menu;
  }

  return {
    ...menu,
    groups: menu.groups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        price:
          typeof option.price === "number"
            ? convertMoney(option.price, rate)
            : option.price,
      })),
    })),
  };
}

function getShopPurchaseSubjectLabel(
  product: ShopCatalogProduct,
  sizeOption: ShopCatalogSizeOption
) {
  const optionLabel = String(sizeOption.label ?? "").trim();
  const productTitle = String(product.title ?? "").trim();
  const genericOptionLabels = new Set(["default", "default option", "standard"]);

  if (optionLabel && product.fulfillmentType === "ticket") {
    return optionLabel;
  }

  if (optionLabel && !genericOptionLabels.has(optionLabel.toLowerCase())) {
    return optionLabel;
  }

  return productTitle || "item";
}

function formatQuantitySubject(quantity: number, subject: string) {
  const normalizedQuantity = Number.isFinite(quantity)
    ? Math.max(0, Math.floor(quantity))
    : 0;
  const normalizedSubject = subject.trim() || "item";

  return `${normalizedQuantity} ${pluralizeSubject(
    normalizedSubject,
    normalizedQuantity
  )}`;
}

function pluralizeSubject(subject: string, quantity: number) {
  if (quantity === 1) {
    return subject;
  }

  if (/\b(invitation|download|ticket|card|shirt|bag|hat|band)$/i.test(subject)) {
    return `${subject}s`;
  }

  return subject;
}

function ShopSizeDescription({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems = lines
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (listItems.length > 1 || lines.some((line) => /^[-*]\s*/.test(line))) {
    return (
      <ul className={styles.sizeDescriptionList}>
        {listItems.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    );
  }

  return <div className={styles.sizeDescription}>{text}</div>;
}

function RecordListRenderer({
  items,
  emptyText,
  selectedValue,
  onSelect,
  onOpenItem,
  theme,
}: {
  items: RecordListItem[];
  emptyText: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  onOpenItem?: (value: string) => void;
  theme: ThemeConfig;
}) {
  if (!items.length) {
    return <p className={styles.body}>{emptyText}</p>;
  }

  return (
    <div className={styles.recordListStack}>
                  {items.map((item) => {
        const selected = selectedValue === item.value;

        return (
          <div
            key={item.value}
            className={styles.recordCard}
            style={{
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              background: selected
                ? theme.colors.cardAlt ?? withOpacity(theme.colors.primary, 0.12)
                : theme.colors.card,
              color: theme.colors.text,
            }}
          >
            <div className={styles.recordCardHeader}>
              <button
                type="button"
                onClick={() => onOpenItem?.(item.value)}
                className={styles.recordCardTitleButton}
              >
                <div className={styles.recordCardTitle}>{item.title}</div>
              </button>

              {item.childCount !== undefined ? (
                <div className={styles.recordCardCount}>
                  {item.childCount}
                </div>
              ) : null}
            </div>

            {item.subtitle ? (
              <div className={styles.recordCardSubtitle}>{item.subtitle}</div>
            ) : null}

            {item.meta?.length ? (
              <div className={styles.recordCardMeta}>
                {item.meta.map((metaLine, index) => (
                  <div key={`${item.value}-meta-${index}`}>{metaLine}</div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DataBlockRenderer({
  block,
  theme,
  context,
  onAction,
  onSectionAction,
}: {
  block: DataBlockDefinition;
  theme: ThemeConfig;
  context: QuestionnaireAnswers;
  onAction: (action: DataBlockAction) => void;
  onSectionAction: (action: DataBlockSectionAction) => void;
}) {
  const visibleSections = block.sections.filter((section) =>
    shouldShowBlockItem(section, context)
  );

  return (
    <div className={styles.reviewSummaryStack}>
      {visibleSections.map((section) => {
        const visibleRows = section.rows.filter((row) =>
          shouldShowBlockItem(row, context)
        );

        if (!visibleRows.length) {
          return null;
        }

        return (
          <div key={section.key} className={styles.reviewSummaryCard}>
            {section.title || section.action ? (
              <div className={styles.reviewSummaryHeader}>
                {section.title ? (
                  <div className={styles.reviewSummaryTitle}>{section.title}</div>
                ) : (
                  <div />
                )}

                {section.action ? (
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => onSectionAction(section.action!)}
                  >
                    {section.action.label}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className={styles.reviewSummaryBody}>
              {visibleRows.map((row) => {
                const value =
                  typeof row.value === "string" ||
                  typeof row.value === "number" ||
                  typeof row.value === "boolean"
                    ? row.value
                    : undefined;

                return (
                  <div key={row.key}>
                    <strong>{row.label}:</strong>{" "}
                    {formatBlockRowValue(row, value)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {block.actions?.some((action) => action.kind === "goto") ? (
        <div className={styles.inlineChoiceStack}>
          {block.actions
            .filter((action) => action.kind === "goto")
            .map((action) => {
            const actionStyle = resolveButtonStyle(
              theme,
              action.styleKey,
              "secondary"
            );

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => onAction(action)}
                className={`${styles.secondaryButton} ${styles.inlineChoiceButton}`}
                style={{
                  borderColor: actionStyle.borderColor,
                  background: action.styleKey ? actionStyle.background : "#FFFFFF",
                  color: action.styleKey ? actionStyle.color : theme.colors.text,
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FormFieldRenderer({
  field,
  theme,
  answers,
  variables,
  setAnswer,
  isPasswordVisible,
  onTogglePasswordVisibility,
}: {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  variables?: QuestionnaireVariableMap;
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
}) {
  const resolvedLabel =
    replaceDynamicText(field.label, answers, variables) ?? field.label;

  const resolvedPlaceholder = replaceDynamicText(
    field.placeholder ?? field.label,
    answers,
    variables
  );

  const fieldFrameStyle = {
    display: "grid",
    gap: "8px",
  } as const;

  const fieldLabelStyle = {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.35,
    color: theme.colors.text,
  } as const;

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
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
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
      </div>
    );
  }

  if (field.type === "date") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayValue = `${yyyy}-${mm}-${dd}`;

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
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
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <select
          className={styles.input}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => setAnswer(field.name, e.target.value)}
          style={{ borderColor: theme.colors.border }}
        >
          <option value="">
            {resolvedPlaceholder || `Select ${resolvedLabel}`}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={`${field.name}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          step="0.0001"
          placeholder={resolvedPlaceholder}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === "") {
              setAnswer(field.name, "");
              return;
            }

            const parsed = Number(raw);

            if (Number.isNaN(parsed)) {
              return;
            }

            setAnswer(field.name, Math.max(0, parsed));
          }}
          style={{ borderColor: theme.colors.border }}
        />
      </div>
    );
  }

  if (field.type === "password") {
    const fieldValue = String(answers[field.name] ?? "");
    const passwordValue = String(answers.password ?? "");
    const confirmPasswordValue = String(answers.confirmPassword ?? "");
    const isConfirmPassword = field.name === "confirmPassword";

    const hasConfirmPasswordValue =
      isConfirmPassword && confirmPasswordValue.length > 0;

    const confirmPasswordMatches =
      hasConfirmPasswordValue && confirmPasswordValue === passwordValue;

    const passwordStrength =
      field.name === "password" ? getPasswordStrength(fieldValue) : null;

    const passwordRequirementResults =
      field.name === "password"
        ? getPasswordRequirementResults(fieldValue)
        : [];

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>

        <div className={styles.passwordInputWrap}>
          <input
            className={styles.input}
            type={isPasswordVisible ? "text" : "password"}
            placeholder={resolvedPlaceholder}
            value={fieldValue}
            onChange={(e) => setAnswer(field.name, e.target.value)}
            onPaste={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            onDrop={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            autoComplete="new-password"
            style={{ borderColor: theme.colors.border }}
          />

          <button
            type="button"
            className={styles.passwordToggleButton}
            onClick={onTogglePasswordVisibility}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>

        {field.name === "password" && passwordStrength ? (
          <div className={styles.passwordFeedbackStack}>
            <div
              className={`${styles.passwordStrength} ${
                passwordStrength.label === "Strong password"
                  ? styles.passwordStrengthStrong
                  : passwordStrength.label === "Medium password"
                    ? styles.passwordStrengthMedium
                    : styles.passwordStrengthWeak
              }`}
            >
              {passwordStrength.label}
            </div>

            {passwordRequirementResults.length ? (
              <ul className={styles.passwordRequirementList}>
                {passwordRequirementResults.map(
                  (item: { label: string; met: boolean }) => (
                    <li
                      key={item.label}
                      className={
                        item.met
                          ? styles.passwordRequirementMet
                          : styles.passwordRequirementMissing
                      }
                    >
                      {item.met ? "✓" : "•"} {item.label}
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </div>
        ) : null}

        {isConfirmPassword ? (
          <div className={styles.passwordFeedbackStack}>
            <div className={styles.authSlideHelpText}>
              Please type the password again instead of pasting.
            </div>

            {hasConfirmPasswordValue ? (
              <div
                className={
                  confirmPasswordMatches
                    ? styles.passwordMatchSuccess
                    : styles.passwordMatchError
                }
              >
                {confirmPasswordMatches
                  ? "✓ Passwords match."
                  : "Passwords do not match yet."}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={fieldFrameStyle}>
      <label style={fieldLabelStyle}>{resolvedLabel}</label>
      <input
        className={styles.input}
        type={field.type}
        placeholder={resolvedPlaceholder}
        value={String(answers[field.name] ?? "")}
        onChange={(e) => setAnswer(field.name, e.target.value)}
        style={{ borderColor: theme.colors.border }}
      />
    </div>
  );
}

function MediaRenderer({
  slide,
  onVerticalVideoPlayingChange,
  onVideoProgressChange,
  videoSeekRequest,
  mediaControlRequest,
  onMediaStateChange,
}: {
  slide: {
    title: string;
    mediaUrl?: string;
    embedUrl?: string;
    mediaType?: "image" | "video";
    mediaAspect?: "horizontal" | "vertical" | "square";
    autoplay?: boolean;
    videoStartAtSeconds?: number;
  };
  onVerticalVideoPlayingChange?: (isPlaying: boolean) => void;
  onVideoProgressChange?: (payload: {
    currentTime: number;
    duration: number;
  }) => void;
  videoSeekRequest?: VideoSeekRequest | null;
  mediaControlRequest?: MediaControlRequest | null;
  onMediaStateChange?: (state: MediaState) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasAppliedStartTimeRef = useRef(false);
  const pauseAtSecondsRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(slide.autoplay === true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsMuted(slide.autoplay === true);
    setIsPlaying(false);
    hasAppliedStartTimeRef.current = false;
  }, [slide.mediaUrl, slide.embedUrl, slide.autoplay, slide.videoStartAtSeconds]);

  useEffect(() => {
    if (!videoSeekRequest) {
      return;
    }

    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    if (
      typeof videoSeekRequest.seconds === "number" &&
      Number.isFinite(videoSeekRequest.seconds)
    ) {
      video.currentTime = Math.min(
        Math.max(0, videoSeekRequest.seconds),
        video.duration
      );

      pauseAtSecondsRef.current =
        typeof videoSeekRequest.pauseAtSeconds === "number" &&
        Number.isFinite(videoSeekRequest.pauseAtSeconds)
          ? Math.min(Math.max(0, videoSeekRequest.pauseAtSeconds), video.duration)
          : null;

      if (slide.autoplay === true || videoSeekRequest.play === true) {
        void video.play().catch(() => null);
      }

      return;
    }

    if (
      typeof videoSeekRequest.percent === "number" &&
      Number.isFinite(videoSeekRequest.percent)
    ) {
      pauseAtSecondsRef.current = null;
      video.currentTime = (video.duration * videoSeekRequest.percent) / 100;
    }
  }, [videoSeekRequest, slide.autoplay]);

  useEffect(() => {
  if (!mediaControlRequest) {
    return;
  }

    if (mediaControlRequest.action === "toggle-mute") {
      toggleMute();
      return;
    }

    if (mediaControlRequest.action === "toggle-play") {
      togglePlayPause();
    }
  }, [mediaControlRequest]);

  useEffect(() => {
    onMediaStateChange?.({
      isMuted,
      isPlaying,
    });
  }, [isMuted, isPlaying, onMediaStateChange]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    applyVideoStartTime(video);

    onVideoProgressChange?.({
      currentTime: video.currentTime,
      duration: video.duration,
    });

    if (slide.autoplay === true) {
      void video.play().catch(() => null);
    }
  }, [slide.videoStartAtSeconds, slide.autoplay]);

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

  function applyVideoStartTime(video: HTMLVideoElement) {
    if (hasAppliedStartTimeRef.current) {
      return;
    }

    const startAtSeconds = slide.videoStartAtSeconds;

    if (
      typeof startAtSeconds !== "number" ||
      !Number.isFinite(startAtSeconds) ||
      startAtSeconds <= 0
    ) {
      hasAppliedStartTimeRef.current = true;
      return;
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    video.currentTime = Math.min(startAtSeconds, video.duration);
    hasAppliedStartTimeRef.current = true;
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
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
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
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
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
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
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
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              applyVideoStartTime(video);

              onVideoProgressChange?.({
                currentTime: video.currentTime,
                duration: video.duration,
              });
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              const pauseAtSeconds = pauseAtSecondsRef.current;

              if (
                typeof pauseAtSeconds === "number" &&
                video.currentTime >= pauseAtSeconds
              ) {
                pauseAtSecondsRef.current = null;
                video.pause();
              }

              onVideoProgressChange?.({
                currentTime: video.currentTime,
                duration: video.duration,
              });
            }}
          />

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

function TimedTextAudioPlayer({
  request,
}: {
  request: TimedTextAudioRequest | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pauseAtSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!request) {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    pauseAtSecondsRef.current =
      typeof request.pauseAtSeconds === "number" &&
      Number.isFinite(request.pauseAtSeconds)
        ? Math.max(0, request.pauseAtSeconds)
        : null;

    audio.src = request.src;
    audio.currentTime = Math.max(0, request.seconds);
    void audio.play().catch(() => null);
  }, [request]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onTimeUpdate={(event) => {
        const audio = event.currentTarget;
        const pauseAtSeconds = pauseAtSecondsRef.current;

        if (
          typeof pauseAtSeconds === "number" &&
          audio.currentTime >= pauseAtSeconds
        ) {
          pauseAtSecondsRef.current = null;
          audio.pause();
        }
      }}
      style={{ display: "none" }}
    />
  );
}

function renderSections(
  sections: SlideSection[] | undefined,
  theme: ThemeConfig,
  answers: QuestionnaireAnswers,
  variables: QuestionnaireVariableMap | undefined,
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
              {replaceDynamicText(section.text, answers, variables)}
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
              {replaceDynamicText(section.text, answers, variables)}
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
            {replaceDynamicText(section.text, answers, variables)}
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

type AccountProfileUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  maskedEmail?: string | null;
  maskedPhone?: string | null;
    activeEmailAddress?: {
    id: string;
    email: string;
    maskedEmail?: string | null;
    isActive: boolean;
    isVerified: boolean;
    verifiedAt?: string | null;
    createdAt?: string | null;
  } | null;
  country?: string | null;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  parishOrRegion?: string | null;
  postalCode?: string | null;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  passwordUpdatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletionRequestedAt?: string | null;
  deletionScheduledAt?: string | null;
  deletedAt?: string | null;
  deletionStatus?: string | null;
};

type NameUpdateStatus = {
  enabled: boolean;
  canUpdate: boolean;
  used: number;
  remaining: number | null;
  maxUpdates: number | null;
  ruleLabel: string;
  window?: string;
  windowStart?: string | null;
};

function formatAccountDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayAccountValue(value?: string | null, fallback = "Not added yet") {
  const text = String(value ?? "").trim();
  return text.length ? text : fallback;
}

function buildAddressLines(user: AccountProfileUser) {
  return [
    user.addressLine1,
    user.addressLine2,
    user.parishOrRegion,
    user.postalCode,
  ]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

type PurchaseRecipientRecord = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  confirmedName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  parishOrRegion?: string | null;
  postalCode?: string | null;
  status: string;
  invitedAt?: string | null;
  inviteExpiresAt?: string | null;
  acceptedAt?: string | null;
  reminderCount?: number;
};

type VerifiedPurchaseRecipientOption = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  confirmedName?: string | null;
  status: string;
};

function formatPurchaseRecipientStatus(status: string) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "VERIFIED") return "Verified";
  if (normalized === "EXPIRED") return "Invite expired";
  if (normalized === "REMOVED") return "Removed";

  return "Pending acceptance";
}

function PurchaseRecipientsRenderer({ theme }: { theme: ThemeConfig }) {
  const [recipients, setRecipients] = useState<PurchaseRecipientRecord[]>([]);
  const [maxRecipients, setMaxRecipients] = useState(12);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadRecipients() {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/purchase-recipients", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/questionnaire/auth-login";
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Could not load recipients.");
      }

      setRecipients(Array.isArray(data?.recipients) ? data.recipients : []);
      setMaxRecipients(Number(data?.maxRecipients) || 12);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load recipients.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipients();
  }, []);

  async function submitRecipient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/purchase-recipients", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not send invite.");
      }

      setStatusMessage({
        type: "success",
        text:
          data?.message ||
          "Invite sent. The recipient must accept before store purchase.",
      });
      setName("");
      setEmail("");
      await loadRecipients();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Could not send invite.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRecipientCount = recipients.filter(
    (recipient) => recipient.status !== "REMOVED"
  ).length;
  const verifiedRecipients = recipients.filter(
    (recipient) => recipient.status === "VERIFIED"
  );

  return (
    <div className={styles.accountSummaryStack}>
      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Add recipient</div>
        <div className={styles.accountCardMeta}>
          Enter the person&apos;s name and email. They must accept the email
          invite before their name can be selected in the store.
        </div>

        <form className={styles.purchaseRecipientForm} onSubmit={submitRecipient}>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Recipient name"
            required
            style={{ borderColor: theme.colors.border }}
          />
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Recipient email"
            required
            style={{ borderColor: theme.colors.border }}
          />
          <button
            type="submit"
            className={styles.primaryActionButton}
            disabled={isSubmitting || activeRecipientCount >= maxRecipients}
            style={{
              background: theme.colors.primary,
              color: getContrastTextColor(theme.colors.primary),
            }}
          >
            {isSubmitting ? "Sending..." : "Send invite"}
          </button>
        </form>

        <div className={styles.accountCardMeta}>
          {activeRecipientCount} of {maxRecipients} recipient spots used.
        </div>
      </div>

      {statusMessage ? (
        <div
          className={
            statusMessage.type === "success"
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {statusMessage.text}
        </div>
      ) : null}

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Verified recipients</div>
        <div className={styles.accountCardMeta}>
          Only verified recipients should appear as selectable names while
          purchasing for someone in the store.
        </div>
        {isLoading ? (
          <div className={styles.accountCardValue}>Loading recipients...</div>
        ) : verifiedRecipients.length ? (
          <div className={styles.purchaseRecipientList}>
            {verifiedRecipients.map((recipient) => (
              <div key={recipient.id} className={styles.purchaseRecipientCard}>
                <strong>
                  {recipient.confirmedName || recipient.recipientName}
                </strong>
                <span>{recipient.recipientEmail}</span>
                <span>{formatPurchaseRecipientStatus(recipient.status)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.accountCardValue}>
            No verified recipients yet.
          </div>
        )}
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardTitle}>Pending invites</div>
        {isLoading ? (
          <div className={styles.accountCardValue}>Loading invites...</div>
        ) : recipients.filter((recipient) => recipient.status !== "VERIFIED")
            .length ? (
          <div className={styles.purchaseRecipientList}>
            {recipients
              .filter((recipient) => recipient.status !== "VERIFIED")
              .map((recipient) => (
                <div key={recipient.id} className={styles.purchaseRecipientCard}>
                  <strong>{recipient.recipientName}</strong>
                  <span>{recipient.recipientEmail}</span>
                  <span>{formatPurchaseRecipientStatus(recipient.status)}</span>
                  {recipient.inviteExpiresAt ? (
                    <span>
                      Invite expires:{" "}
                      {formatAccountDate(recipient.inviteExpiresAt)}
                    </span>
                  ) : null}
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.accountCardValue}>No pending invites.</div>
        )}
      </div>
    </div>
  );
}

function AccountSummaryRenderer({
  theme,
  onGoto,
}: {
  theme: ThemeConfig;
  onGoto: (target: string) => void;
}) {
  const [user, setUser] = useState<AccountProfileUser | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [nameUpdateStatus, setNameUpdateStatus] =
    useState<NameUpdateStatus | null>(null);
  useEffect(() => {
    let isMounted = true;

    async function loadAccountProfile() {
      setIsLoadingAccount(true);
      setAccountError(null);

      try {
        const response = await fetch("/api/account/profile", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => null);

        if (response.status === 401) {
          window.location.href = "/questionnaire/auth-login";
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.error || data?.message || "Could not load account information."
          );
        }

        if (isMounted) {
          setUser(data?.user ?? null);
        }

        const nameStatusResponse = await fetch(
          "/api/account/name-update-status",
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const nameStatusData = await nameStatusResponse
          .json()
          .catch(() => null);

        if (isMounted && nameStatusResponse.ok && nameStatusData) {
          setNameUpdateStatus(nameStatusData);
        }
      } catch (error) {
        if (isMounted) {
          setAccountError(
            error instanceof Error
              ? error.message
              : "Could not load account information."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingAccount(false);
        }
      }
    }

    void loadAccountProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const addressLines = user ? buildAddressLines(user) : [];
  const maskedEmail = user?.maskedEmail || "No email added";
  const maskedPhone = user?.maskedPhone || "No phone added";
  const deletionStatus = String(user?.deletionStatus ?? "").trim();

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/questionnaire/auth-login";
    }
  }

  if (isLoadingAccount) {
    return (
      <div className={styles.accountSummaryStack}>
        <div className={styles.accountInfoCard}>
          <div className={styles.accountCardTitle}>Loading account...</div>
          <div className={styles.accountCardMeta}>
            Checking your saved account information.
          </div>
        </div>
      </div>
    );
  }

  if (accountError) {
    return (
      <div className={styles.accountSummaryStack}>
        <div className={styles.accountInfoCard}>
          <div className={styles.accountCardTitle}>Account unavailable</div>
          <div className={styles.accountCardMeta}>{accountError}</div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onGoto("/questionnaire/auth-login")}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.accountSummaryStack}>
      <div className={styles.accountSummaryIntro}>
        Manage your account information.
      </div>

      <button
        type="button"
        className={styles.secondaryButton}
        onClick={handleLogout}
        style={{
          borderColor: theme.colors.border,
          color: theme.colors.text,
        }}
      >
        Log Out
      </button>

            <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Name</div>
            <div className={styles.accountCardValue}>
              {displayAccountValue(user?.name, "Name not added")}
            </div>
          </div>
        </div>

        {nameUpdateStatus?.enabled ? (
          <div className={styles.accountCardMeta}>
            {nameUpdateStatus.remaining === 0 ? (
              <>
                You have no name updates remaining. Limit:{" "}
                {nameUpdateStatus.ruleLabel}.
              </>
            ) : (
              <>
                You have {nameUpdateStatus.remaining}{" "}
                {nameUpdateStatus.remaining === 1
                  ? "name update"
                  : "name updates"}{" "}
                remaining. Limit: {nameUpdateStatus.ruleLabel}.
              </>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("account-update-name")}
          disabled={nameUpdateStatus?.enabled && !nameUpdateStatus.canUpdate}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
            opacity:
              nameUpdateStatus?.enabled && !nameUpdateStatus.canUpdate
                ? 0.55
                : 1,
            cursor:
              nameUpdateStatus?.enabled && !nameUpdateStatus.canUpdate
                ? "not-allowed"
                : "pointer",
          }}
        >
          Update Name
        </button>
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Email</div>
            <div className={styles.accountCardValue}>{maskedEmail}</div>
          </div>
        </div>
        <div className={styles.accountCardMeta}>
          Verified: {user?.activeEmailAddress?.isVerified ? "Yes" : "No"}
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("account-update-email")}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Update Email
        </button>
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Phone</div>
            <div className={styles.accountCardValue}>{maskedPhone}</div>
          </div>
        </div>
        <div className={styles.accountCardMeta}>
          Verified: {user?.phoneVerifiedAt ? "Yes" : "No"}
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("account-update-phone")}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Update Phone
        </button>
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Country and City / Town</div>
            <div className={styles.accountCardValue}>
              {[
                displayAccountValue(user?.country, ""),
                displayAccountValue(user?.city, ""),
              ]
                .filter(Boolean)
                .join(", ") || "Country and city/town not added"}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("account-update-location")}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Update Country / City
        </button>
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Mailing Address</div>
            {addressLines.length ? (
              <div className={styles.accountCardValue}>
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : (
              <div className={styles.accountCardValue}>Address not added</div>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("account-update-address")}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Update Address
        </button>
      </div>

      <div className={styles.accountInfoCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <div className={styles.accountCardTitle}>Password</div>
            <div className={styles.accountCardMeta}>
              Last updated: {formatAccountDate(user?.passwordUpdatedAt)}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("/questionnaire/auth-forgot-password")}
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          Update Password
        </button>
      </div>

      {deletionStatus ? (
        <div className={styles.accountDangerCard}>
          <div className={styles.accountCardTitle}>Deletion Status</div>
          <div className={styles.accountCardValue}>{deletionStatus}</div>
          <div className={styles.accountCardMeta}>
            Scheduled for: {formatAccountDate(user?.deletionScheduledAt)}
          </div>
        </div>
      ) : null}

      <div className={styles.accountDangerCard}>
        <div className={styles.accountCardTitle}>Delete Account</div>
        <div className={styles.accountCardMeta}>
          Deleting your account can remove or schedule removal of your saved
          account data based on this business setup.
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onGoto("/questionnaire/auth-delete-account")}
          style={{
            borderColor: "#b42318",
            color: "#b42318",
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

function formatWeight(weight: number, weightUnit = "lb") {
  return `${weight.toLocaleString()} ${weightUnit}`;
}
