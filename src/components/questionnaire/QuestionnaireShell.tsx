"use client";

import {
  type CSSProperties,
  type FormEvent,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import VerificationCodePanel from "@/customerAccess/components/verificationCodePanel.jsx";
import AuthFormSlideRenderer from "./renderers/AuthFormSlideRenderer";
import AnnotatedTextSlideRenderer from "./renderers/AnnotatedTextSlideRenderer";
import DripCountdownPanel from "./renderers/DripCountdownPanel";
import FooterSupportText from "./renderers/FooterSupportText";
import FormFieldRenderer from "./renderers/FormFieldRenderer";
import MediaRenderer, {
  type MediaControlRequest,
  type MediaState,
  type VideoSeekRequest,
} from "./renderers/MediaRenderer";
import {
  CartBundledAddOnsSummary,
  CartItemCountdown,
  CartReviewSectionHeading,
  CartTicketMealSummary,
  ReviewTotalsRenderer,
  cleanCartMealLabel,
  getCartFulfillmentLabel,
} from "./renderers/CartReviewRenderers";
import {
  EmptyCartStoreChoices,
} from "./renderers/CommerceFlowPanels";
import { QuantityControl, ShopSizeDescription } from "./renderers/ShopControls";
import RecordListRenderer from "./renderers/RecordListRenderer";
import SlideFooterActions from "./renderers/SlideFooterActions";
import TimedTextAudioPlayer, {
  type TimedTextAudioRequest,
} from "./renderers/TimedTextAudioPlayer";
import PurchaseRecipientsRenderer from "./renderers/PurchaseRecipientsRenderer";
import { buildPlantShopOrderPayload } from "./actions/plantShopOrderPayload";
import {
  getLittleOrchardDeliveryAddressLines,
  getLittleOrchardFulfillmentKey,
  getLittleOrchardFulfillmentOption,
} from "@/lib/questionnaire/littleOrchardFulfillment";
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
  makeShopLineKey,
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
import { replaceDynamicText } from "@/lib/questionnaire/dynamicText";

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
  isContactInfoComplete,
  normalizePromotionEligibleItems,
  resolvePromotionItem,
} from "@/lib/questionnaire/contactAndPromotion";

import { formatCurrency, formatWeight } from "@/lib/questionnaire/formatters";

import {
  getQuestionnaireDownloadUrl,
  openQuestionnaireDownload,
} from "@/lib/questionnaire/downloads";

import {
  buildQuestionnaireLoginHref,
  readLoginReturnToFromSearch,
} from "@/lib/questionnaire/authNavigation";

import {
  readLocalEngagementSnapshot,
  writeLocalQuestionAnswer,
  writeLocalVideoProgress,
} from "@/lib/questionnaire/engagementTracking";

type Props = {
  config: QuestionnaireConfig;
  theme: ThemeConfig;
};

const CHECKOUT_DRAFT_SLUGS = new Set([
  "invitation",
  "ticket-purchase-assistant",
]);

function isCheckoutDraftSlug(slug: string) {
  return CHECKOUT_DRAFT_SLUGS.has(slug);
}

function mergeShopCatalogs(
  primary: ShopCatalog | null,
  extras: Array<ShopCatalog | null>
): ShopCatalog | null {
  const catalogs = [primary, ...extras].filter(Boolean) as ShopCatalog[];

  if (!catalogs.length) {
    return null;
  }

  const [baseCatalog] = catalogs;
  const products = new Map<string, ShopCatalogProduct>();

  for (const catalog of catalogs) {
    for (const product of catalog.products) {
      products.set(product.id, product);
    }
  }

  return {
    ...baseCatalog,
    products: Array.from(products.values()),
  };
}

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
  "ticketAssistantEventProductId",
  "ticketAssistantQuantity",
  "guidedTicketPurchaseType",
  "ticketAssistantSlots",
  "ticketAssistantActiveOwnerIndex",
  "ticketAssistantActiveMealIndex",
  "ticketAssistantLastSlide",
  "ticketAssistantDraftSavedAt",
] as const;
const CHECKOUT_RESERVATION_SECONDS = 25;
const SHARED_COMMERCE_DRAFT_KEY = "questionnaire:commerce:answers";
const TICKET_ASSISTANT_EVENT_DRAFTS_KEY =
  "questionnaire:ticket-purchase-assistant:event-drafts";
const TICKET_ASSISTANT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getCheckoutDraftStorageKey(questionnaireSlug: string) {
  if (isCheckoutDraftSlug(questionnaireSlug)) {
    return SHARED_COMMERCE_DRAFT_KEY;
  }

  return `questionnaire:${questionnaireSlug}:answers`;
}

function readCheckoutDraft(questionnaireSlug: string): QuestionnaireAnswers {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(
    getCheckoutDraftStorageKey(questionnaireSlug)
  ) ?? window.localStorage.getItem(`questionnaire:${questionnaireSlug}:answers`);

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

  if (questionnaireSlug === "ticket-purchase-assistant") {
    draft.ticketAssistantDraftSavedAt = new Date().toISOString();
    writeTicketAssistantEventDraft(draft);
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function clearCheckoutDraft(questionnaireSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getCheckoutDraftStorageKey(questionnaireSlug));
  window.localStorage.removeItem(`questionnaire:${questionnaireSlug}:answers`);

  if (questionnaireSlug === "ticket-purchase-assistant") {
    window.localStorage.removeItem(TICKET_ASSISTANT_EVENT_DRAFTS_KEY);
  }
}

function readTicketAssistantEventDrafts(): Record<string, QuestionnaireAnswers> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(TICKET_ASSISTANT_EVENT_DRAFTS_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, QuestionnaireAnswers>)
      : {};
  } catch {
    return {};
  }
}

function writeTicketAssistantEventDraft(draft: QuestionnaireAnswers) {
  if (typeof window === "undefined") {
    return;
  }

  const eventId = String(draft.ticketAssistantEventProductId ?? "").trim();

  if (!eventId) {
    return;
  }

  const drafts = readTicketAssistantEventDrafts();
  drafts[eventId] = draft;
  window.localStorage.setItem(
    TICKET_ASSISTANT_EVENT_DRAFTS_KEY,
    JSON.stringify(drafts)
  );
}

function SidebarToggleIcon({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className={styles.sidebarToggleIcon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4h16v16H4V4Zm2 2v12h12V6H6Z" />
      {side === "left" ? (
        <path d="M9 7h2v10H9V7Zm4 2 4 3-4 3V9Z" />
      ) : (
        <path d="M13 7h2v10h-2V7ZM7 12l4-3v6l-4-3Z" />
      )}
    </svg>
  );
}

function clearTicketAssistantEventDraft(eventId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEventId = String(eventId ?? "").trim();

  if (!normalizedEventId) {
    return;
  }

  const drafts = readTicketAssistantEventDrafts();
  delete drafts[normalizedEventId];

  if (Object.keys(drafts).length) {
    window.localStorage.setItem(
      TICKET_ASSISTANT_EVENT_DRAFTS_KEY,
      JSON.stringify(drafts)
    );
  } else {
    window.localStorage.removeItem(TICKET_ASSISTANT_EVENT_DRAFTS_KEY);
  }

  const activeDraft = readCheckoutDraft("ticket-purchase-assistant");

  if (
    String(activeDraft.ticketAssistantEventProductId ?? "").trim() ===
    normalizedEventId
  ) {
    window.localStorage.removeItem(
      getCheckoutDraftStorageKey("ticket-purchase-assistant")
    );
  }
}

function clearAllTicketAssistantEventDrafts() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TICKET_ASSISTANT_EVENT_DRAFTS_KEY);
  window.localStorage.removeItem(
    getCheckoutDraftStorageKey("ticket-purchase-assistant")
  );
}

function clearTicketAssistantEventDraftOrAll(eventId: string) {
  const normalizedEventId = String(eventId ?? "").trim();

  if (normalizedEventId) {
    clearTicketAssistantEventDraft(normalizedEventId);
    return;
  }

  clearAllTicketAssistantEventDrafts();
}

function isMeaningfulTicketAssistantDraft(draft: QuestionnaireAnswers) {
  const eventId = String(draft.ticketAssistantEventProductId ?? "").trim();
  const lastSlide = String(draft.ticketAssistantLastSlide ?? "").trim();
  const slots = Array.isArray(draft.ticketAssistantSlots)
    ? draft.ticketAssistantSlots
    : [];
  const hasTicketData =
    Object.keys(normalizeShopCart(draft.orderCart)).length > 0 ||
    normalizeTicketAssignments(draft.ticketAssignments).length > 0 ||
    slots.some((slot) => {
      if (!slot || typeof slot !== "object" || Array.isArray(slot)) {
        return false;
      }

      const record = slot as Record<string, unknown>;
      return Boolean(
        String(record.name ?? "").trim() ||
          String(record.email ?? "").trim() ||
          String(record.sizeOptionId ?? "").trim()
      );
    });
  const savedAt = String(draft.ticketAssistantDraftSavedAt ?? "").trim();
  const savedAtTime = savedAt ? new Date(savedAt).getTime() : Date.now();
  const isFresh =
    Number.isFinite(savedAtTime) &&
    Date.now() - savedAtTime <= TICKET_ASSISTANT_DRAFT_MAX_AGE_MS;

  return Boolean(eventId && lastSlide && hasTicketData && isFresh);
}

function removeTicketAssistantProgressFields(answers: QuestionnaireAnswers) {
  const next = { ...answers };

  delete next.ticketAssignments;
  delete next.selectedMealTicketCode;
  delete next.mealReturnTarget;
  delete next.cartReturnTarget;
  delete next.shopEntrySource;
  delete next.ticketAssistantEventProductId;
  delete next.ticketAssistantQuantity;
  delete next.guidedTicketPurchaseType;
  delete next.ticketAssistantSlots;
  delete next.ticketAssistantActiveOwnerIndex;
  delete next.ticketAssistantActiveMealIndex;
  delete next.ticketAssistantLastSlide;
  delete next.ticketAssistantDraftSavedAt;

  return next;
}


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

const COMMERCE_WORKSPACE_SLIDE_IDS = new Set([
  "invitation-shop",
  "music-merch-shop",
  "ticket-details",
  "ticket-details-help",
  "meal-selection",
  "delivery-options",
  "contact-details",
  "review-order",
  "payment",
  "payment-details",
  "checkout",
  "purchase-for-others",
]);

type TicketAssistantOwnerMode =
  | "purchaser_pays_ticket_and_addons"
  | "owner_pays_addons"
  | "owner_selects_sender_pays_addons";

type TicketAssistantSlot = {
  assistantIndex: number;
  name: string;
  printedName: string;
  email: string;
  phone: string;
  isPlusOne: boolean;
  isPurchaser: boolean;
  sizeOptionId: string;
  purchaseModeId?: string;
  deliveryModeId?: string;
  mailingAddressLine1: string;
  mailingAddressLine2: string;
  mailingCity: string;
  mailingRegion: string;
  mailingPostalCode: string;
  mailingCountry: string;
  ownerMode: TicketAssistantOwnerMode;
  mealResponsibilitySelected: boolean;
  budgetChoiceId?: string;
  budget: number;
  skipMealForNow: boolean;
  skipCollectiblesForNow: boolean;
};

function getTicketAssistantEventProducts(catalog: ShopCatalog | null) {
  return (catalog?.products ?? []).filter(
    (product) => product.fulfillmentType === "ticket"
  );
}

function getTicketAssistantProduct(
  catalog: ShopCatalog | null,
  productId: unknown
) {
  const id = String(productId ?? "").trim();
  return getTicketAssistantEventProducts(catalog).find(
    (product) => product.id === id
  );
}

function getTicketAssistantMaxQuantity(product: ShopCatalogProduct | undefined) {
  if (!product) {
    return 1;
  }

  const configuredCaps = [
    product.maxOrderQuantity,
    product.maxAccountHolderQuantity !== undefined ||
    product.maxPurchaseForOthers !== undefined ||
    product.maxRecipientQuantity !== undefined
      ? (product.maxAccountHolderQuantity ?? 1) +
        (product.enablePurchaseForOthers === false
          ? 0
          : (product.maxPurchaseForOthers ?? 0) *
            (product.maxRecipientQuantity ?? 1))
      : undefined,
  ]
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    )
    .map((value) => Math.floor(value));

  if (!configuredCaps.length) {
    return 1;
  }

  return Math.max(1, Math.min(...configuredCaps));
}

function getTicketAssistantQuantity(answers: QuestionnaireAnswers) {
  const requestedQuantity = Number(answers.ticketAssistantQuantity ?? 1);
  const slotCount = Array.isArray(answers.ticketAssistantSlots)
    ? answers.ticketAssistantSlots.length
    : 0;
  const assignmentCount = normalizeTicketAssignments(
    answers.ticketAssignments
  ).length;
  const quantities = [requestedQuantity, slotCount, assignmentCount]
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value));

  return Math.max(1, ...quantities);
}

function getTicketAssistantActiveOwnerIndex(
  answers: QuestionnaireAnswers,
  quantity = getTicketAssistantQuantity(answers)
) {
  const rawIndex = Number(answers.ticketAssistantActiveOwnerIndex ?? 1);
  const index = Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 1;
  return Math.min(Math.max(1, index), Math.max(1, quantity - 1));
}

function getTicketAssistantActiveMealIndex(
  answers: QuestionnaireAnswers,
  quantity = getTicketAssistantQuantity(answers)
) {
  const rawIndex = Number(answers.ticketAssistantActiveMealIndex ?? 0);
  const index = Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 0;
  return Math.min(Math.max(0, index), Math.max(0, quantity - 1));
}

function getTicketAssistantSlotValidationError(params: {
  product: ShopCatalogProduct | undefined;
  slots: TicketAssistantSlot[];
  index: number;
}) {
  const { product, slots, index } = params;
  const slot = slots[index];

  if (!slot?.name.trim()) {
    return `Enter the legal name for attendee ${index + 1}.`;
  }

  if (
    isTicketAssistantEmailRequired({
      product,
      slots,
      slot,
      index,
    }) &&
    !slot.email.trim()
  ) {
    return `Enter the email address for attendee ${index + 1}.`;
  }

  return "";
}

function getTicketAssistantAccountHolderAllowance(
  product: ShopCatalogProduct | undefined
) {
  return Math.max(1, Math.floor(product?.maxAccountHolderQuantity ?? 1));
}

function canTicketAssistantSlotBePlusOne(params: {
  product: ShopCatalogProduct | undefined;
  slots?: TicketAssistantSlot[];
  index: number;
}) {
  const { product, slots, index } = params;

  if (index <= 0) {
    return false;
  }

  if (index < getTicketAssistantAccountHolderAllowance(product)) {
    return true;
  }

  const previousSlot = slots?.[index - 1];

  if (!previousSlot || previousSlot.isPlusOne) {
    return false;
  }

  return isTicketAssistantEmailRequired({
    product,
    slot: previousSlot,
    index: index - 1,
  });
}

function isTicketAssistantEmailRequired(params: {
  product: ShopCatalogProduct | undefined;
  slots?: TicketAssistantSlot[];
  slot: TicketAssistantSlot;
  index: number;
}) {
  const { product, slots, slot, index } = params;

  if (
    slot.isPlusOne &&
    canTicketAssistantSlotBePlusOne({ product, slots, index })
  ) {
    return false;
  }

  return index !== 0;
}

function getTicketAssistantPlusOneHostIndex(params: {
  product: ShopCatalogProduct | undefined;
  slots: TicketAssistantSlot[];
  index: number;
}) {
  const { product, slots, index } = params;

  if (
    index <= 0 ||
    !slots[index]?.isPlusOne ||
    !canTicketAssistantSlotBePlusOne({ product, slots, index })
  ) {
    return null;
  }

  return index < getTicketAssistantAccountHolderAllowance(product)
    ? 0
    : index - 1;
}

function getTicketAssistantMealSlideForIndex(params: {
  product: ShopCatalogProduct | undefined;
  slots: TicketAssistantSlot[];
  index: number;
}) {
  const { product, slots, index } = params;
  const slot = slots[index];
  const hostIndex = getTicketAssistantPlusOneHostIndex({
    product,
    slots,
    index,
  });
  const hostSlot = hostIndex === null ? undefined : slots[hostIndex];

  if (index === 0 || hostIndex === 0) {
    return "meal-intro";
  }

  if (hostIndex !== null) {
    return hostSlot?.mealResponsibilitySelected === true &&
      hostSlot.ownerMode === "purchaser_pays_ticket_and_addons"
      ? "meal-intro"
      : null;
  }

  if (!slot?.mealResponsibilitySelected) {
    return "meal-responsibility";
  }

  return slot.ownerMode === "purchaser_pays_ticket_and_addons"
    ? "meal-intro"
    : null;
}

function getTicketAssistantDisplayName(
  slot: TicketAssistantSlot | undefined,
  fallback: string
) {
  if (!slot) {
    return fallback;
  }

  return [slot.name || fallback, slot.printedName ? `(${slot.printedName})` : ""]
    .filter(Boolean)
    .join(" ");
}

function getTicketAssistantSlots(
  answers: QuestionnaireAnswers,
  quantity = getTicketAssistantQuantity(answers)
): TicketAssistantSlot[] {
  const rawSlots = Array.isArray(answers.ticketAssistantSlots)
    ? answers.ticketAssistantSlots
    : [];
  const slots: TicketAssistantSlot[] = [];

  for (let index = 0; index < quantity; index += 1) {
    const raw = rawSlots[index];
    const record =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    slots.push({
      assistantIndex: index,
      name: String(record.name ?? ""),
      printedName: String(record.printedName ?? ""),
      email: String(record.email ?? ""),
      phone: String(record.phone ?? ""),
      isPlusOne: record.isPlusOne === true,
      isPurchaser: index === 0 ? record.isPurchaser !== false : record.isPurchaser === true,
      sizeOptionId: String(record.sizeOptionId ?? "").trim(),
      purchaseModeId: String(record.purchaseModeId ?? "").trim() || undefined,
      deliveryModeId: String(record.deliveryModeId ?? "").trim() || undefined,
      mailingAddressLine1: String(record.mailingAddressLine1 ?? ""),
      mailingAddressLine2: String(record.mailingAddressLine2 ?? ""),
      mailingCity: String(record.mailingCity ?? ""),
      mailingRegion: String(record.mailingRegion ?? ""),
      mailingPostalCode: String(record.mailingPostalCode ?? ""),
      mailingCountry: String(record.mailingCountry ?? ""),
      ownerMode:
        record.ownerMode === "owner_pays_addons" ||
        record.ownerMode === "owner_selects_sender_pays_addons"
          ? record.ownerMode
          : "purchaser_pays_ticket_and_addons",
      mealResponsibilitySelected: record.mealResponsibilitySelected === true,
      budgetChoiceId: String(record.budgetChoiceId ?? "").trim() || undefined,
      budget:
        typeof record.budget === "number" && Number.isFinite(record.budget)
          ? Math.max(0, record.budget)
          : 0,
      skipMealForNow: record.skipMealForNow === true,
      skipCollectiblesForNow: record.skipCollectiblesForNow === true,
    });
  }

  return slots;
}

function updateTicketAssistantSlot(
  answers: QuestionnaireAnswers,
  index: number,
  patch: Partial<TicketAssistantSlot>
) {
  const quantity = getTicketAssistantQuantity(answers);
  const slots = getTicketAssistantSlots(answers, quantity);
  slots[index] = {
    ...slots[index],
    ...patch,
  };

  return slots;
}

function getTicketAssistantAssignmentOwnerFields(params: {
  slot: TicketAssistantSlot;
  hostSlot?: TicketAssistantSlot;
}) {
  const { slot, hostSlot } = params;
  const slotName = slot.name.trim();
  const slotPrintedName = slot.printedName.trim();
  const hostName = hostSlot?.name.trim() ?? "";
  const isRepeatedPlusOneName =
    slot.isPlusOne &&
    Boolean(hostName) &&
    slotName.toLowerCase() === hostName.toLowerCase();
  const ownerName =
    isRepeatedPlusOneName
      ? slotPrintedName || `Plus one for ${hostName}`
      : slotName || slotPrintedName;
  const printedTicketName =
    isRepeatedPlusOneName
      ? slotPrintedName || ownerName
      : slotPrintedName || slotName;

  return {
    ownerName,
    printedTicketName,
  };
}

function syncTicketAssistantAssignmentOwnerFields(params: {
  catalog: ShopCatalog | null;
  answers: QuestionnaireAnswers;
  assignments: TicketAssignments;
}) {
  const { catalog, answers, assignments } = params;
  const product = getTicketAssistantProduct(
    catalog,
    answers.ticketAssistantEventProductId
  );

  if (!product || !assignments.length) {
    return assignments;
  }

  const quantity = getTicketAssistantQuantity(answers);
  const rawSlots = getTicketAssistantSlots(answers, quantity);
  const slots = rawSlots.map((slot) => {
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product,
      slots: rawSlots,
      index: slot.assistantIndex,
    });
    const hostSlot = hostIndex === null ? undefined : rawSlots[hostIndex];
    const sizeOption = getTicketAssistantSizeOption(
      product,
      hostSlot?.sizeOptionId ?? slot.sizeOptionId
    );

    return {
      ...slot,
      sizeOptionId: sizeOption?.id ?? slot.sizeOptionId,
    };
  });
  const groupedSlots = new Map<string, TicketAssistantSlot[]>();

  for (const slot of slots) {
    if (!slot.sizeOptionId) continue;
    const key = makeShopLineKey(product.id, slot.sizeOptionId);
    groupedSlots.set(key, [...(groupedSlots.get(key) ?? []), slot]);
  }

  return assignments.map((assignment) => {
    const slot = groupedSlots.get(assignment.lineKey)?.[assignment.ticketIndex];

    if (!slot) {
      return assignment;
    }

    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product,
      slots,
      index: slot.assistantIndex,
    });
    const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
    const ownerFields = getTicketAssistantAssignmentOwnerFields({
      slot,
      hostSlot,
    });
    const ownerMode =
      slot.assistantIndex === 0
        ? "purchaser_pays_ticket_and_addons"
        : hostSlot?.ownerMode ?? slot.ownerMode;
    const ownerBudget =
      hostIndex === null && ownerMode === "owner_selects_sender_pays_addons"
        ? Math.max(0, Number(slot.budget ?? 0) || 0)
        : 0;

    return {
      ...assignment,
      ownerName: ownerFields.ownerName,
      printedTicketName: ownerFields.printedTicketName,
      ownerEmail: slot.email,
      ownerPhone: slot.phone,
      isPurchaserTicket: slot.isPurchaser,
      ownerLockedFromRecipient:
        !slot.isPurchaser && Boolean(slot.email.trim()),
      emailTicketToOwner: !slot.isPurchaser && Boolean(slot.email.trim()),
      ticketOwnerPaymentMode: ownerMode,
      ticketOwnerAddonBudget: ownerBudget,
    };
  });
}

function getTicketAssignmentSyncSignature(assignments: TicketAssignments) {
  return JSON.stringify(
    normalizeTicketAssignments(assignments).map((assignment) => ({
      ticketCode: assignment.ticketCode,
      lineKey: assignment.lineKey,
      productId: assignment.productId,
      sizeOptionId: assignment.sizeOptionId,
      ticketIndex: assignment.ticketIndex,
      ownerName: assignment.ownerName ?? "",
      printedTicketName: assignment.printedTicketName ?? "",
      ownerEmail: assignment.ownerEmail ?? "",
      ownerPhone: assignment.ownerPhone ?? "",
      isPurchaserTicket: assignment.isPurchaserTicket === true,
      ownerLockedFromRecipient: assignment.ownerLockedFromRecipient === true,
      emailTicketToOwner: assignment.emailTicketToOwner === true,
      purchaseModeId: assignment.purchaseModeId ?? "",
      purchaseModeLabel: assignment.purchaseModeLabel ?? "",
      invitationDeliveryMode: assignment.invitationDeliveryMode ?? "",
      isPlusOneTicket: assignment.isPlusOneTicket === true,
      plusOneHostTicketIndex: assignment.plusOneHostTicketIndex ?? null,
      plusOneHostName: assignment.plusOneHostName ?? "",
      physicalInvitationFulfillmentDetails:
        assignment.physicalInvitationFulfillmentDetails ?? "",
      ticketOwnerPaymentMode: assignment.ticketOwnerPaymentMode ?? "",
      ticketOwnerAddonBudget: assignment.ticketOwnerAddonBudget ?? 0,
    }))
  );
}

function getTicketAssistantSizeOption(
  product: ShopCatalogProduct | undefined,
  sizeOptionId: string | undefined
) {
  return (
    product?.sizeOptions.find((option) => option.id === sizeOptionId) ??
    product?.sizeOptions[0]
  );
}

function getTicketAssistantPurchaseMode(
  sizeOption: ShopCatalogSizeOption | undefined,
  purchaseModeId: string | undefined
) {
  return (
    sizeOption?.purchaseModes?.find(
      (mode) =>
        mode.id === purchaseModeId && !isHiddenTicketDeliveryPurchaseMode(mode.id)
    ) ??
    sizeOption?.purchaseModes?.find(
      (mode) =>
        mode.id !== "digital-invitation" &&
        mode.id !== "physical-invitation"
    ) ??
    sizeOption?.purchaseModes?.[0]
  );
}

function getTicketAssistantUpgradeModes(
  sizeOption: ShopCatalogSizeOption | undefined
) {
  return (sizeOption?.purchaseModes ?? []).filter(
    (mode) => !isHiddenTicketDeliveryPurchaseMode(mode.id)
  );
}

function getTicketAssistantDeliveryModes(
  sizeOption: ShopCatalogSizeOption | undefined
) {
  return (sizeOption?.purchaseModes ?? []).filter((mode) =>
    isHiddenTicketDeliveryPurchaseMode(mode.id)
  );
}

function getTicketAssistantDeliveryMode(
  sizeOption: ShopCatalogSizeOption | undefined,
  deliveryModeId: string | undefined
) {
  const deliveryModes = getTicketAssistantDeliveryModes(sizeOption);

  return (
    deliveryModes.find((mode) => mode.id === deliveryModeId) ??
    deliveryModes.find((mode) => mode.id === "digital-invitation") ??
    deliveryModes[0]
  );
}

function getTicketAssistantTotal(params: {
  catalog: ShopCatalog | null;
  answers: QuestionnaireAnswers;
}) {
  const { catalog, answers } = params;
  const product = getTicketAssistantProduct(
    catalog,
    answers.ticketAssistantEventProductId
  );

  if (!product) {
    return 0;
  }

  const slots = getTicketAssistantSlots(answers);

  const ticketTotal = slots.reduce((sum, slot, index) => {
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product,
      slots,
      index,
    });
    const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
    const sizeOption = getTicketAssistantSizeOption(
      product,
      hostSlot?.sizeOptionId ?? slot.sizeOptionId
    );
    const upgradeMode = getTicketAssistantPurchaseMode(
      sizeOption,
      slot.purchaseModeId
    );
    const deliveryMode = getTicketAssistantDeliveryMode(
      sizeOption,
      hostSlot?.deliveryModeId ?? slot.deliveryModeId
    );

    return (
      sum +
      (sizeOption?.price ?? 0) +
      (upgradeMode?.priceAdjustment ?? 0) +
      (deliveryMode?.priceAdjustment ?? 0)
    );
  }, 0);

  const budgetTotal = slots.reduce((sum, slot, index) => {
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product,
      slots,
      index,
    });
    const ownerMode =
      index === 0
        ? "purchaser_pays_ticket_and_addons"
        : slot.ownerMode;

    if (
      hostIndex !== null ||
      ownerMode !== "owner_selects_sender_pays_addons"
    ) {
      return sum;
    }

    const budget = Number(slot.budget ?? 0);

    return sum + (Number.isFinite(budget) ? Math.max(0, budget) : 0);
  }, 0);

  return ticketTotal + budgetTotal;
}

function buildTicketAssistantCheckoutState(params: {
  catalog: ShopCatalog | null;
  answers: QuestionnaireAnswers;
}) {
  const { catalog, answers } = params;
  const product = getTicketAssistantProduct(
    catalog,
    answers.ticketAssistantEventProductId
  );

  if (!product) {
    return null;
  }

  const quantity = getTicketAssistantQuantity(answers);
  const rawSlots = getTicketAssistantSlots(answers, quantity);
  const slots = rawSlots.map((slot, index) => {
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product,
      slots: rawSlots,
      index,
    });
    const hostSlot = hostIndex === null ? undefined : rawSlots[hostIndex];
    const sizeOption = getTicketAssistantSizeOption(
      product,
      hostSlot?.sizeOptionId ?? slot.sizeOptionId
    );
    const purchaseMode = getTicketAssistantPurchaseMode(
      sizeOption,
      slot.purchaseModeId
    );
    const deliveryMode = getTicketAssistantDeliveryMode(
      sizeOption,
      hostSlot?.deliveryModeId ?? slot.deliveryModeId
    );

    return {
      ...slot,
      isPurchaser: index === 0 ? true : slot.isPurchaser,
      ownerMode:
        index === 0
          ? "purchaser_pays_ticket_and_addons"
          : hostIndex !== null
            ? hostSlot?.ownerMode ?? "purchaser_pays_ticket_and_addons"
            : slot.ownerMode,
      budget:
        index === 0
          ? 0
          : hostIndex !== null
            ? 0
            : slot.budget,
      sizeOptionId: sizeOption?.id ?? "",
      purchaseModeId: purchaseMode?.id,
      deliveryModeId: deliveryMode?.id,
      mailingAddressLine1:
        hostSlot?.mailingAddressLine1 ?? slot.mailingAddressLine1,
      mailingAddressLine2:
        hostSlot?.mailingAddressLine2 ?? slot.mailingAddressLine2,
      mailingCity: hostSlot?.mailingCity ?? slot.mailingCity,
      mailingRegion: hostSlot?.mailingRegion ?? slot.mailingRegion,
      mailingPostalCode:
        hostSlot?.mailingPostalCode ?? slot.mailingPostalCode,
      mailingCountry: hostSlot?.mailingCountry ?? slot.mailingCountry,
    };
  });
  const groupedSlots = new Map<string, TicketAssistantSlot[]>();

  for (const slot of slots) {
    if (!slot.sizeOptionId) continue;
    const key = makeShopLineKey(product.id, slot.sizeOptionId);
    groupedSlots.set(key, [...(groupedSlots.get(key) ?? []), slot]);
  }

  const orderCart: ShopCart = {};

  for (const [lineKey, lineSlots] of groupedSlots.entries()) {
    const firstSlot = lineSlots[0];
    const sizeOption = product.sizeOptions.find(
      (option) => option.id === firstSlot.sizeOptionId
    );
    const recipients: ShopPurchaseRecipient[] = lineSlots
      .filter((slot) => !slot.isPurchaser)
      .map((slot) => {
        const purchaseMode = getTicketAssistantPurchaseMode(
          sizeOption,
          slot.purchaseModeId
        );

        return {
          name: slot.name,
          email: slot.email,
          quantity: 1,
          purchaseModeId: purchaseMode?.id,
          purchaseModeLabel: purchaseMode?.label,
        };
      })
      .filter((recipient) => recipient.name && recipient.email);

    orderCart[lineKey] = {
      productId: product.id,
      sizeOptionId: firstSlot.sizeOptionId,
      selected: true,
      quantity: lineSlots.length,
      purchaseModeId: getDefaultPurchaseModeId(sizeOption),
      purchaseRecipients: recipients,
    };
  }

  const resolvedTicketLines = resolveShopSelectedLines(catalog, orderCart).filter(
    (line) => line.fulfillmentType === "ticket"
  );
  let assignments = buildTicketAssignmentsFromLines({
    lines: resolvedTicketLines,
    existingAssignments: normalizeTicketAssignments(answers.ticketAssignments),
  });

  for (const line of resolvedTicketLines) {
    const lineSlots = groupedSlots.get(line.lineKey) ?? [];

    assignments = assignments.map((assignment) => {
      if (assignment.lineKey !== line.lineKey) {
        return assignment;
      }

      const slot = lineSlots[assignment.ticketIndex];
      if (!slot) {
        return assignment;
      }

      const hostIndex = getTicketAssistantPlusOneHostIndex({
        product,
        slots,
        index: slot.assistantIndex,
      });
      const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
      const ownerFields = getTicketAssistantAssignmentOwnerFields({
        slot,
        hostSlot,
      });
      const sizeOption = product.sizeOptions.find(
        (option) => option.id === assignment.sizeOptionId
      );
      const purchaseMode = getTicketAssistantPurchaseMode(
        sizeOption,
        slot.purchaseModeId
      );
      const deliveryMode = getTicketAssistantDeliveryMode(
        sizeOption,
        slot.deliveryModeId
      );
      const hostTicketIndex =
        hostIndex === null
          ? undefined
          : lineSlots.findIndex(
              (candidate) => candidate.assistantIndex === hostIndex
            );
      const physicalInvitationFulfillmentDetails =
        typeof deliveryMode?.metadata?.physicalInvitationFulfillmentDetails ===
        "string"
          ? deliveryMode.metadata.physicalInvitationFulfillmentDetails
          : typeof product.metadata?.physicalInvitationFulfillmentDetails ===
              "string"
            ? product.metadata.physicalInvitationFulfillmentDetails
            : "";

      return {
        ...assignment,
        ownerName: ownerFields.ownerName,
        printedTicketName: ownerFields.printedTicketName,
        ownerEmail: slot.email,
        ownerPhone: slot.phone,
        isPurchaserTicket: slot.isPurchaser,
        ownerLockedFromRecipient:
          !slot.isPurchaser && Boolean(slot.email.trim()),
        emailTicketToOwner:
          !slot.isPurchaser && Boolean(slot.email.trim()),
        purchaseModeId: purchaseMode?.id,
        purchaseModeLabel: purchaseMode?.label,
        ticketUpgradeOverride: Boolean(purchaseMode?.id),
        invitationDeliveryMode:
          slot.deliveryModeId === "physical-invitation" ? "physical" : "digital",
        invitationMailingAddress:
          slot.deliveryModeId === "physical-invitation"
            ? {
                addressLine1: slot.mailingAddressLine1,
                addressLine2: slot.mailingAddressLine2,
                city: slot.mailingCity,
                region: slot.mailingRegion,
                postalCode: slot.mailingPostalCode,
                country: slot.mailingCountry,
              }
            : undefined,
        isPlusOneTicket: hostIndex !== null,
        plusOneHostTicketIndex:
          hostTicketIndex !== undefined && hostTicketIndex >= 0
            ? hostTicketIndex
            : undefined,
        plusOneHostName:
          hostSlot && hostIndex !== null
            ? getTicketAssistantDisplayName(hostSlot, `Attendee ${hostIndex + 1}`)
            : undefined,
        physicalInvitationFulfillmentDetails,
        ticketOwnerPaymentMode:
          hostIndex !== null
            ? hostSlot?.ownerMode ?? slot.ownerMode
            : slot.ownerMode,
        ticketOwnerAddonBudget:
          hostIndex === null &&
          slot.ownerMode === "owner_selects_sender_pays_addons"
            ? slot.budget
            : 0,
      };
    });
  }

  return {
    orderCart,
    ticketAssignments: assignments,
  };
}


export default function QuestionnaireShell({ config, theme }: Props) {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [cartInventoryNotices, setCartInventoryNotices] = useState<string[]>([]);
  const [dynamicVariablesRefreshKey, setDynamicVariablesRefreshKey] = useState(0);
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
  const [accountIdentityVerified, setAccountIdentityVerified] = useState(false);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isTrackSidebarOpen, setIsTrackSidebarOpen] = useState(false);
  const [guestShopCurrencyCode, setGuestShopCurrencyCode] = useState("JMD");
  const [dripUnlockKeys, setDripUnlockKeys] = useState<string[]>([]);
  const [dripOpenedKeys, setDripOpenedKeys] = useState<string[]>([]);
  const [dripNextAvailableAtBySequence, setDripNextAvailableAtBySequence] =
    useState<Record<string, string>>({});
  const [sequenceAccessBlock, setSequenceAccessBlock] = useState<{
    message: string;
    signupHref?: string;
    canVerifyDevice?: boolean;
    verifySent?: boolean;
    sequenceJobId?: string;
    unlockKey?: string;
    dripSequenceKey?: string;
  } | null>(null);
  const [activeFooterTextPanel, setActiveFooterTextPanel] = useState<{
    id: string;
    label: string;
    sourceUrl: string;
    mode?: AnnotatedTextMode;
  } | null>(null);
  const [activeFooterFormSlideId, setActiveFooterFormSlideId] = useState<
    string | null
  >(null);
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
  const [renderedMediaWidth, setRenderedMediaWidth] = useState(0);
  const [videoSeekRequest, setVideoSeekRequest] =
    useState<VideoSeekRequest | null>(null);
  const [timedTextAudioRequest, setTimedTextAudioRequest] =
    useState<TimedTextAudioRequest | null>(null);
  const [mediaControlRequest, setMediaControlRequest] =
    useState<MediaControlRequest | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({
    isMuted: false,
    isPlaying: false,
    hasEnded: false,
    hasRecentlyStarted: false,
    shouldPulseFooterLabel: true,
  });

  const previousVideoTimeRef = useRef(0);
  const slideBodyRef = useRef<HTMLDivElement | null>(null);
  const actionInFlightRef = useRef(false);
  const invitationOrderRequestKeyRef = useRef<string | null>(null);
  const plantShopOrderRequestKeyRef = useRef<string | null>(null);
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
    if (!isCheckoutDraftSlug(config.slug)) {
      checkoutDraftHydratedRef.current = true;
      shouldSkipNextCheckoutDraftWriteRef.current = false;
      return;
    }

    if (
      config.slug === "ticket-purchase-assistant" &&
      searchParams.get("resumePurchase") !== "1"
    ) {
      checkoutDraftHydratedRef.current = true;
      shouldSkipNextCheckoutDraftWriteRef.current = true;
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

    setAnswers((prev) => {
      const next = {
        ...prev,
        ...draft,
      };

      if (config.slug === "ticket-purchase-assistant") {
        next.ticketAssistantQuantity = getTicketAssistantQuantity(next);
      }

      return next;
    });
  }, [config.slug, searchParams]);

  useEffect(() => {
    if (
      !isCheckoutDraftSlug(config.slug) ||
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
  const isAdminUser = Number(authSessionUser?.adminLevel || 0) >= 1;
  const dripSequenceKeys = useMemo(
    () =>
      Array.from(
        new Set(
          visibleSlides
            .flatMap((slide) => [
              slide.dripSequenceKey,
              slide.dripCountdownSequenceKey,
            ])
            .filter((key): key is string => Boolean(key))
        )
      ),
    [visibleSlides]
  );
  const isCurrentDripSlideLocked = Boolean(
    currentSlide?.requiresDripUnlock &&
      currentSlide.dripUnlockKey &&
      !isAdminUser &&
      !dripUnlockKeys.includes(currentSlide.dripUnlockKey)
  );
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
    setActiveFooterFormSlideId(null);
  }, [currentSlide?.id]);

  useEffect(() => {
    if (
      config.slug !== "little-orchard-shop" ||
      currentSlide?.id !== "pickup-information" ||
      mergedVariables.littleOrchardEventDateHasPassed === true ||
      String(answers.plantShopFulfillmentMethod ?? "").trim()
    ) {
      return;
    }

    setAnswer("plantShopFulfillmentMethod", "event_pickup");
  }, [
    answers.plantShopFulfillmentMethod,
    config.slug,
    currentSlide?.id,
    mergedVariables.littleOrchardEventDateHasPassed,
  ]);

  useEffect(() => {
    if (
      config.slug !== "little-orchard-shop" ||
      mergedVariables.littleOrchardEventDateHasPassed !== true ||
      String(answers.plantShopFulfillmentMethod ?? "") !== "event_pickup"
    ) {
      return;
    }

    setAnswer("plantShopFulfillmentMethod", "");
  }, [
    answers.plantShopFulfillmentMethod,
    config.slug,
    mergedVariables.littleOrchardEventDateHasPassed,
  ]);

  useEffect(() => {
    if (!config.dynamicVariablesEndpoint) {
      return;
    }

    function refreshDynamicVariablesOnFocus() {
      setDynamicVariablesRefreshKey((key) => key + 1);
    }

    window.addEventListener("focus", refreshDynamicVariablesOnFocus);

    return () => {
      window.removeEventListener("focus", refreshDynamicVariablesOnFocus);
    };
  }, [config.dynamicVariablesEndpoint]);

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUser?.id) {
      setAccountIdentityVerified(false);
      return;
    }

    let canceled = false;

    async function loadIdentityStatus() {
      const response = await fetch("/api/account/profile", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;
      const status = String(
        data?.user?.identityVerification?.status ?? ""
      ).toUpperCase();

      if (!canceled) {
        setAccountIdentityVerified(status === "APPROVED");
      }
    }

    void loadIdentityStatus();

    return () => {
      canceled = true;
    };
  }, [authSessionUser?.id, isAuthSessionLoaded]);

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUser?.id || !dripSequenceKeys.length) {
      setDripUnlockKeys((current) => (current.length ? [] : current));
      setDripOpenedKeys((current) => (current.length ? [] : current));
      return;
    }

    let canceled = false;

    async function loadDripAccess() {
      const unlockKeys = new Set<string>();
      const openedKeys = new Set<string>();

      for (const dripSequenceKey of dripSequenceKeys) {
        const response = await fetch(
          `/api/questionnaires/engagement/status?questionnaireSlug=${encodeURIComponent(
            config.slug
          )}&dripSequenceKey=${encodeURIComponent(dripSequenceKey)}`,
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          }
        ).catch(() => null);

        const data = response ? await response.json().catch(() => null) : null;

        if (!response?.ok || !data?.hasUser) {
          continue;
        }

        if (Array.isArray(data.dripUnlockKeys)) {
          for (const key of data.dripUnlockKeys) {
            if (typeof key === "string") unlockKeys.add(key);
          }
        }

        if (Array.isArray(data.dripOpenedKeys)) {
          for (const key of data.dripOpenedKeys) {
            if (typeof key === "string") openedKeys.add(key);
          }
        }

        if (typeof data.dripNextJob?.scheduledFor === "string") {
          setDripNextAvailableAtBySequence((prev) => ({
            ...prev,
            [dripSequenceKey]: data.dripNextJob.scheduledFor,
          }));
        } else {
          setDripNextAvailableAtBySequence((prev) => {
            if (!(dripSequenceKey in prev)) {
              return prev;
            }

            const next = { ...prev };
            delete next[dripSequenceKey];
            return next;
          });
        }
      }

      if (!canceled) {
        setDripUnlockKeys([...unlockKeys]);
        setDripOpenedKeys([...openedKeys]);
      }
    }

    void loadDripAccess();
    const intervalId = window.setInterval(() => {
      void loadDripAccess();
    }, 10000);

    return () => {
      canceled = true;
      window.clearInterval(intervalId);
    };
  }, [
    authSessionUser?.id,
    config.slug,
    dripSequenceKeys,
    isAuthSessionLoaded,
  ]);

  useEffect(() => {
    if (!isAuthSessionLoaded || authSessionUser?.id || !currentSlide) {
      return;
    }

    const sequenceJobId = searchParams.get("sequenceJobId");
    const unlockKey = searchParams.get("unlockKey");
    const dripSequenceKey =
      searchParams.get("dripSequenceKey") || currentSlide.dripSequenceKey;

    if (
      !sequenceJobId ||
      !unlockKey ||
      !dripSequenceKey ||
      unlockKey !== currentSlide.dripUnlockKey
    ) {
      return;
    }

    const sequenceJobIdValue = sequenceJobId;
    const unlockKeyValue = unlockKey;
    const dripSequenceKeyValue = dripSequenceKey;
    let canceled = false;

    async function openSequenceEmailAccess() {
      const response = await fetch(
        "/api/questionnaires/engagement/sequence-access",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sequenceJobId: sequenceJobIdValue,
            unlockKey: unlockKeyValue,
            dripSequenceKey: dripSequenceKeyValue,
          }),
        }
      ).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;

      if (canceled) {
        return;
      }

      if (!response?.ok || !data?.authenticated || !data?.user?.id) {
        if (data?.blocked) {
          setSequenceAccessBlock({
            message:
              typeof data.error === "string"
                ? data.error
                : "This private link is already assigned to another device.",
            signupHref:
              typeof data.signupHref === "string" ? data.signupHref : undefined,
            canVerifyDevice: data.canVerifyDevice === true,
            sequenceJobId: sequenceJobIdValue,
            unlockKey: unlockKeyValue,
            dripSequenceKey: dripSequenceKeyValue,
          });
        }
        return;
      }

      setSequenceAccessBlock(null);
      setAuthSessionUser({
        id: String(data.user.id),
        name: typeof data.user.name === "string" ? data.user.name : null,
        email: typeof data.user.email === "string" ? data.user.email : null,
        phone: typeof data.user.phone === "string" ? data.user.phone : null,
        adminLevel:
          typeof data.user.adminLevel === "number" ? data.user.adminLevel : 0,
        preferredCurrencyCode:
          typeof data.user.preferredCurrencyCode === "string"
            ? data.user.preferredCurrencyCode
            : "USD",
      });
      setIsAuthSessionLoaded(true);
      setDripUnlockKeys((prev) =>
        prev.includes(unlockKeyValue) ? prev : [...prev, unlockKeyValue]
      );
    }

    void openSequenceEmailAccess();

    return () => {
      canceled = true;
    };
  }, [
    authSessionUser?.id,
    currentSlide,
    isAuthSessionLoaded,
    searchParams,
    setAuthSessionUser,
    setIsAuthSessionLoaded,
  ]);

  useEffect(() => {
    if (config.slug !== "ticket-purchase-assistant" || !currentSlide?.id) {
      return;
    }

    setAnswers((prev) => {
      if (prev.ticketAssistantLastSlide === currentSlide.id) {
        return prev;
      }

      return {
        ...prev,
        ticketAssistantLastSlide: currentSlide.id,
      };
    });
  }, [config.slug, currentSlide?.id]);

  async function requestSequenceDeviceVerification() {
    if (
      !sequenceAccessBlock?.sequenceJobId ||
      !sequenceAccessBlock.unlockKey ||
      !sequenceAccessBlock.dripSequenceKey
    ) {
      return;
    }

    const response = await fetch(
      "/api/questionnaires/engagement/sequence-access",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "requestDeviceVerification",
          sequenceJobId: sequenceAccessBlock.sequenceJobId,
          unlockKey: sequenceAccessBlock.unlockKey,
          dripSequenceKey: sequenceAccessBlock.dripSequenceKey,
        }),
      }
    ).catch(() => null);

    const data = response ? await response.json().catch(() => null) : null;

    if (response?.ok && data?.code === "DEVICE_VERIFICATION_SENT") {
      setSequenceAccessBlock((current) =>
        current
          ? {
              ...current,
              verifySent: true,
              message:
                data.message ||
                "We sent a device verification link to the original email address.",
            }
          : current
      );
      return;
    }

    setSequenceAccessBlock((current) =>
      current
        ? {
            ...current,
            message:
              data?.error ||
              "We could not send the device verification email. Please try again.",
          }
        : current
    );
  }

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUser?.id || !currentSlide) {
      return;
    }

    if (!currentSlide.dripSequenceKey || !currentSlide.dripUnlockKey) {
      return;
    }

    const unlockKeyFromUrl = searchParams.get("unlockKey");
    const jobIdFromUrl = searchParams.get("sequenceJobId");
    const alreadyUnlocked = dripUnlockKeys.includes(currentSlide.dripUnlockKey);
    const shouldRecordOpen =
      (isAdminUser && currentSlide.requiresDripUnlock) ||
      alreadyUnlocked ||
      (unlockKeyFromUrl === currentSlide.dripUnlockKey && Boolean(jobIdFromUrl));

    if (!shouldRecordOpen || dripOpenedKeys.includes(currentSlide.dripUnlockKey)) {
      return;
    }

    const unlockKey = currentSlide.dripUnlockKey;

    setDripUnlockKeys((prev) =>
      prev.includes(unlockKey) ? prev : [...prev, unlockKey]
    );
    setDripOpenedKeys((prev) =>
      prev.includes(unlockKey) ? prev : [...prev, unlockKey]
    );

    fetch("/api/questionnaires/engagement/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionnaireSlug: config.slug,
        source: "drip-slide-open",
        snapshot: {
          dripUnlock: {
            sequenceKey: currentSlide.dripSequenceKey,
            unlockKey,
            slideId: currentSlide.id,
            jobId: jobIdFromUrl || undefined,
          },
        },
      }),
    }).catch(() => null);
  }, [
    authSessionUser?.id,
    config.slug,
    currentSlide,
    dripOpenedKeys,
    dripUnlockKeys,
    isAdminUser,
    isAuthSessionLoaded,
    searchParams,
  ]);

  const sidebarSlideLinks = useMemo(
    () =>
      visibleSlides
        .filter(
          (slide) =>
            (slide.type === "media" || slide.type === "video") &&
            (slide.mediaType === "video" || Boolean(slide.mediaUrl)) &&
            (!slide.requiresDripUnlock ||
              !slide.dripUnlockKey ||
              isAdminUser ||
              dripUnlockKeys.includes(slide.dripUnlockKey))
        )
        .map((slide) => ({
          id: slide.id,
          label: slide.title || slide.id,
          locked: Boolean(getPlantGiveawayBlockedSlideBeforeTarget(slide.id)),
        })),
    [answers, config.slug, dripUnlockKeys, isAdminUser, visibleSlides]
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

  const dashboardSidebarLinks = useMemo(() => {
    if (Number(authSessionUser?.adminLevel || 0) < 1) {
      return [];
    }

    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/projects", label: "Projects" },
      { href: "/dashboard/people", label: "People" },
      { href: "/dashboard/tickets", label: "Tickets" },
      { href: "/dashboard/inventory", label: "Inventory" },
      { href: "/dashboard/currencies", label: "Currencies" },
      { href: "/dashboard/identity-verifications", label: "ID Verifications" },
      { href: "/dashboard/email-sequences", label: "Email Sequences" },
      { href: "/questionnaire/ticket-purchase-assistant", label: "Ticket Assistant" },
      { href: "/questionnaire/escape-album", label: "Escape Album" },
      { href: "/questionnaire/itasl", label: "ITASL Sequence" },
    ];
  }, [authSessionUser?.adminLevel]);

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

    const hasPurchasedItem =
      isAdminUser || purchasedItemKeys.includes(purchaseAccessConfig.itemKey);

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
    isAdminUser,
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

  const getCatalogToActiveCurrencyRate = useCallback(
    (baseCurrencyCode?: string) => {
      const normalizedBaseCurrencyCode =
        normalizeCurrencyCode(baseCurrencyCode ?? "USD");

      if (normalizedBaseCurrencyCode === activeShopCurrencyCode) {
        return 1;
      }

      if (normalizedBaseCurrencyCode === "JMD") {
        return jmdToActiveCurrencyRate;
      }

      if (normalizedBaseCurrencyCode === "USD") {
        return usdToActiveCurrencyRate;
      }

      const baseRate = Number(currencyRates[normalizedBaseCurrencyCode] ?? 1);
      const targetRate = Number(currencyRates[activeShopCurrencyCode] ?? 1);

      if (!Number.isFinite(baseRate) || baseRate <= 0) {
        return 1;
      }

      return Number.isFinite(targetRate) && targetRate > 0
        ? targetRate / baseRate
        : 1;
    },
    [
      activeShopCurrencyCode,
      currencyRates,
      jmdToActiveCurrencyRate,
      usdToActiveCurrencyRate,
    ]
  );

  const currentShopDisplayCatalog = useMemo(() => {
    const baseCurrencyCode = currentShopCatalog?.currencyCode ?? "USD";
    const rate = getCatalogToActiveCurrencyRate(baseCurrencyCode);

    return convertShopCatalogCurrency(
      currentShopCatalog,
      activeShopCurrencyCode,
      rate
    );
  }, [
    currentShopCatalog,
    activeShopCurrencyCode,
    getCatalogToActiveCurrencyRate,
  ]);

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
      mergeShopCatalogs(
        getShopCatalog(mergedVariables, "orderCatalog") ??
          getShopCatalog(mergedVariables, "shopCatalog"),
        [
          getShopCatalog(mergedVariables, "ticketAddOnCatalog"),
        ]
      ),
    [mergedVariables]
  );

  const sharedShopDisplayCatalog = useMemo(() => {
    const baseCurrencyCode = sharedShopCatalog?.currencyCode ?? "USD";
    const rate = getCatalogToActiveCurrencyRate(baseCurrencyCode);

    return convertShopCatalogCurrency(
      sharedShopCatalog,
      activeShopCurrencyCode,
      rate
    );
  }, [
    sharedShopCatalog,
    activeShopCurrencyCode,
    getCatalogToActiveCurrencyRate,
  ]);

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
    if (!isCheckoutDraftSlug(config.slug) || sharedOrderLines.length === 0) {
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
      !isCheckoutDraftSlug(config.slug) ||
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

      const generatedAssignments = buildTicketAssignmentsFromLines({
          lines: sharedTicketOrderLines,
          existingAssignments,
        });
      const syncedAssignments = syncTicketAssistantAssignmentOwnerFields({
        catalog: sharedShopDisplayCatalog,
        answers,
        assignments: generatedAssignments,
      });

      return prefillFirstTicketFromContact(
        syncedAssignments,
        answers
      );
    },
    [
      isTicketOwnerPortalFlow,
      requestedTicketCode,
      sharedTicketOrderLines,
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId,
      answers.ticketAssistantQuantity,
      answers.ticketAssistantSlots,
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
    if (!isCheckoutDraftSlug(config.slug) || isTicketOwnerPortalFlow) {
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
    const savedSyncSignature =
      getTicketAssignmentSyncSignature(savedAssignments);
    const currentSyncSignature =
      getTicketAssignmentSyncSignature(currentTicketAssignments);
    const hasAssignmentContentChanges =
      savedSyncSignature !== currentSyncSignature;

    if (
      !hasStaleAssignments &&
      !hasAssignmentContentChanges &&
      savedAssignments.length === activeTicketCodes.size
    ) {
      return;
    }

    setAnswers((prev) => {
      const latestAssignments = normalizeTicketAssignments(
        prev.ticketAssignments
      );

      if (
        getTicketAssignmentSyncSignature(latestAssignments) ===
        currentSyncSignature
      ) {
        return prev;
      }

      return {
        ...prev,
        ticketAssignments: currentTicketAssignments,
      };
    });
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

  const sharedTicketOwnerAddonBudgetLines = useMemo(
    () => {
      const product = getTicketAssistantProduct(
        sharedShopDisplayCatalog,
        answers.ticketAssistantEventProductId
      );
      const quantity = getTicketAssistantQuantity(answers);
      const assistantSlots =
        product && config.slug === "ticket-purchase-assistant"
          ? getTicketAssistantSlots(answers, quantity)
          : [];
      const assignmentNameGroups = new Map<string, string[]>();

      if (product && assistantSlots.length) {
        const groupedSlots = new Map<string, TicketAssistantSlot[]>();

        for (const slot of assistantSlots) {
          const hostIndex = getTicketAssistantPlusOneHostIndex({
            product,
            slots: assistantSlots,
            index: slot.assistantIndex,
          });
          const hostSlot =
            hostIndex === null ? undefined : assistantSlots[hostIndex];
          const sizeOption = getTicketAssistantSizeOption(
            product,
            hostSlot?.sizeOptionId ?? slot.sizeOptionId
          );

          if (!sizeOption) continue;

          const lineKey = makeShopLineKey(product.id, sizeOption.id);
          groupedSlots.set(lineKey, [...(groupedSlots.get(lineKey) ?? []), slot]);
        }

        for (const assignment of currentTicketAssignments) {
          const slot = groupedSlots.get(assignment.lineKey)?.[
            assignment.ticketIndex
          ];

          if (!slot) continue;

          const hostIndex = getTicketAssistantPlusOneHostIndex({
            product,
            slots: assistantSlots,
            index: slot.assistantIndex,
          });

          if (hostIndex !== null) {
            const hostSlot = assistantSlots[hostIndex];
            const hostAssignment = currentTicketAssignments.find(
              (item) =>
                item.lineKey === assignment.lineKey &&
                item.ticketIndex ===
                  (groupedSlots
                    .get(assignment.lineKey)
                    ?.findIndex(
                      (candidate) =>
                        candidate.assistantIndex === hostSlot.assistantIndex
                    ) ?? -1)
            );
            const groupKey = hostAssignment?.ticketCode;

            if (groupKey) {
              const plusOneName =
                String(assignment.ownerName ?? "").trim() ||
                String(assignment.printedTicketName ?? "").trim() ||
                assignment.ticketLabel;
              assignmentNameGroups.set(groupKey, [
                ...(assignmentNameGroups.get(groupKey) ?? []),
                plusOneName,
              ]);
            }
          }
        }
      }

      return currentTicketAssignments
        .map((assignment) => {
          if (
            assignment.ticketOwnerPaymentMode !==
            "owner_selects_sender_pays_addons"
          ) {
            return null;
          }

          const budget = Number(assignment.ticketOwnerAddonBudget ?? 0);
          const amount = Number.isFinite(budget) ? Math.max(0, budget) : 0;

          if (amount <= 0) {
            return null;
          }

          return {
            id: assignment.ticketCode,
            attendeeName:
              [
                String(assignment.ownerName ?? "").trim() ||
                  String(assignment.printedTicketName ?? "").trim() ||
                  assignment.ticketLabel ||
                  "attendee",
                ...(assignmentNameGroups.get(assignment.ticketCode) ?? []),
              ]
                .filter(Boolean)
                .join(" and "),
            ticketCode: assignment.ticketCode,
            amount,
          };
        })
        .filter(
          (
            line
          ): line is {
            id: string;
            attendeeName: string;
            ticketCode: string;
            amount: number;
          } => Boolean(line)
        );
    },
    [
      answers,
      config.slug,
      currentTicketAssignments,
      sharedShopDisplayCatalog,
    ]
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
  const getRuntimeFormField = useCallback(
    (field: FormField): FormField => {
      const overrides = mergedVariables.formFieldOptionOverrides;

      if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
        return field;
      }

      const fieldOverride = (overrides as Record<string, unknown>)[field.name];

      if (
        !fieldOverride ||
        typeof fieldOverride !== "object" ||
        Array.isArray(fieldOverride)
      ) {
        return field;
      }

      const optionOverrides = fieldOverride as Record<string, unknown>;
      const nextOptions = field.options?.map((option) => {
        const optionOverride = optionOverrides[option.value];

        if (
          !optionOverride ||
          typeof optionOverride !== "object" ||
          Array.isArray(optionOverride)
        ) {
          return option;
        }

        const optionPatch = optionOverride as Record<string, unknown>;

        return {
          ...option,
          label:
            typeof optionPatch.label === "string"
              ? optionPatch.label
              : option.label,
          disabled:
            typeof optionPatch.disabled === "boolean"
              ? optionPatch.disabled
              : option.disabled,
        };
      });

      return nextOptions ? { ...field, options: nextOptions } : field;
    },
    [mergedVariables]
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
    dynamicVariablesRefreshKey,
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
    setRenderedMediaWidth(0);
    setVideoSeekRequest(null);
    setMediaControlRequest(null);
    setMediaState({
      isMuted: false,
      isPlaying: false,
      hasEnded: false,
      hasRecentlyStarted: false,
      shouldPulseFooterLabel: isMediaSlide,
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

  useEffect(() => {
    if (
      config.slug !== "home-gardener-plant-giveaway" ||
      currentSlide?.id !== "thank-you"
    ) {
      return;
    }

    setAnswers((prev) => {
      const hasPlantCartState =
        Object.keys(normalizeShopCart(prev.orderCart)).length > 0 ||
        Boolean(prev.shopFocusLineKey) ||
        Boolean(prev.cartReturnTarget);

      if (!hasPlantCartState) {
        return prev;
      }

      return {
        ...prev,
        orderCart: {},
        shopFocusLineKey: "",
        cartReturnTarget: "",
      };
    });
  }, [config.slug, currentSlide?.id]);

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
    if (!isCheckoutDraftSlug(config.slug)) {
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
    if (!isCheckoutDraftSlug(config.slug)) {
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

          if (Object.keys(nextCart).length === 0 || nextTicketLines.length === 0) {
            clearTicketAssistantEventDraftOrAll(
              String(prev.ticketAssistantEventProductId ?? "")
            );
            return {
              ...removeTicketAssistantProgressFields(nextAnswers),
              orderCart: nextCart,
              shopReservationKey: reservationKey,
            };
          }

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

  function attachTicketAssistantAddOnMetadata(cart: ShopCart) {
    if (
      currentSlide?.id !== "music-merch-shop" ||
      String(answers.shopEntrySource ?? "") !== "ticket-assistant-collectibles"
    ) {
      return cart;
    }

    const selectedTicketCode = String(answers.selectedMealTicketCode ?? "");
    const activeIndex = getTicketAssistantActiveMealIndex(
      answers,
      getTicketAssistantQuantity(answers)
    );
    const selectedAssignment =
      currentTicketAssignments.find(
        (assignment) => assignment.ticketCode === selectedTicketCode
      ) ?? currentTicketAssignments[activeIndex];

    if (!selectedAssignment) {
      return cart;
    }

    const attendeeName = String(
      selectedAssignment.ownerName ||
        selectedAssignment.ownerEmail ||
        selectedAssignment.ticketLabel ||
        "Attendee"
    ).trim();

    return Object.fromEntries(
      Object.entries(cart).map(([lineKey, line]) => [
        lineKey,
        {
          ...line,
          ticketAddOnAttendeeName:
            line.ticketAddOnAttendeeName ?? attendeeName,
          ticketAddOnTicketCode:
            line.ticketAddOnTicketCode ?? selectedAssignment.ticketCode,
        },
      ])
    ) as ShopCart;
  }

  function updateCurrentShopCart(
    updater: (cart: ShopCart) => ShopCart,
    options: { reserveInventory?: boolean } = {}
  ) {
    if (currentSlide?.type !== "shop" || !currentSlide.storeAs) return;

    const storeKey = currentSlide.storeAs;
    const nextCart = attachTicketAssistantAddOnMetadata(updater(currentShopCart));
    resetCheckoutReservation();

    if (storeKey === "orderCart") {
      const nextTicketLines = resolveShopSelectedLines(
        sharedShopDisplayCatalog,
        nextCart
      ).filter((line) => line.fulfillmentType === "ticket");

      if (Object.keys(nextCart).length === 0 || nextTicketLines.length === 0) {
        clearTicketAssistantEventDraftOrAll(
          String(answers.ticketAssistantEventProductId ?? "")
        );
        setAnswers((prev) => ({
          ...removeTicketAssistantProgressFields(prev),
          [storeKey]: nextCart,
        }));
        return;
      }

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

  function isCommerceWorkspaceSlideId(slideId: string | undefined | null) {
    return Boolean(slideId && COMMERCE_WORKSPACE_SLIDE_IDS.has(slideId));
  }

  function getSlideIdFromQuestionnaireHref(target: string) {
    try {
      const url = new URL(target, window.location.origin);

      if (!url.pathname.startsWith("/questionnaire/")) {
        return null;
      }

      return url.searchParams.get("slide");
    } catch {
      return null;
    }
  }

  function commitTicketAssistantCheckout(options: {
    target?: string;
    attendeeIndex?: number;
  } = {}) {
    const checkoutState = buildTicketAssistantCheckoutState({
      catalog: sharedShopDisplayCatalog,
      answers,
    });

    if (!checkoutState || Object.keys(checkoutState.orderCart).length === 0) {
      setSubmitError("Choose an event and at least one ticket before continuing.");
      return false;
    }

    const nextTicketAssignments = prefillFirstTicketFromContact(
      checkoutState.ticketAssignments,
      answers
    );
    const selectedAssignment =
      typeof options.attendeeIndex === "number"
        ? nextTicketAssignments[options.attendeeIndex]
        : undefined;
    const nextAnswers = {
      ...answers,
      orderCart: checkoutState.orderCart,
      ticketAssignments: nextTicketAssignments,
      ...(selectedAssignment
        ? {
            selectedMealTicketCode: selectedAssignment.ticketCode,
            mealReturnTarget:
              options.target === "meal-selection"
                ? "meal-confirmation"
                : "ticket-details",
            cartReturnTarget: options.target === "review-order" ? "review-order" : undefined,
            shopEntrySource:
              options.target === "music-merch-shop"
                ? "ticket-assistant-collectibles"
                : answers.shopEntrySource,
            ticketAssistantActiveMealIndex: options.attendeeIndex,
          }
        : {}),
    };

    setAnswers(nextAnswers);
    resetCheckoutReservation();
    return true;
  }

  function advanceTicketAssistantMealLoop() {
    const quantity = getTicketAssistantQuantity(answers);
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const slots = getTicketAssistantSlots(answers, quantity);

    for (let nextIndex = activeIndex + 1; nextIndex < quantity; nextIndex += 1) {
      const nextMealSlide = getTicketAssistantMealSlideForIndex({
        product: selectedProduct,
        slots,
        index: nextIndex,
      });

      if (!nextMealSlide) {
        continue;
      }

      setAnswers((prev) => ({
        ...prev,
        ticketAssistantActiveMealIndex: nextIndex,
        selectedMealTicketCode: undefined,
        mealReturnTarget: undefined,
        shopEntrySource: undefined,
      }));

      goToTarget(nextMealSlide);
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      selectedMealTicketCode: undefined,
      mealReturnTarget: undefined,
      shopEntrySource: undefined,
    }));
    goToTarget("review-order");
  }

  function beginTicketAssistantMealLoop() {
    setAnswers((prev) => ({
      ...prev,
      ticketAssistantActiveMealIndex: 0,
      selectedMealTicketCode: undefined,
      mealReturnTarget: undefined,
      shopEntrySource: undefined,
    }));
    goToTarget("meal-intro");
  }

  function requestCommerceAwareNavigation(
    target: string,
    mode: "href" | "slide"
  ) {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);

    if (mode === "slide") {
      goToTarget(target);
      return;
    }

    window.location.href = target;
  }

  function getPermanentHomeTarget() {
    const homeSlide =
      visibleSlides.find((slide) => slide.id === "home") ?? visibleSlides[0];

    return homeSlide ? getSlideHref(homeSlide.id) : `/questionnaire/${config.slug}`;
  }

  function handleAuthLoginClick() {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);
    window.location.href = getAuthLoginHref();
  }

  function handleAccountMenuLink(target: string) {
    requestCommerceAwareNavigation(target, "href");
  }

  function getMyTicketsTarget() {
    return "/questionnaire/auth-account?slide=my-tickets";
  }

  function getSlideHref(slideId: string) {
    return `/questionnaire/${encodeURIComponent(config.slug)}?slide=${encodeURIComponent(
      slideId
    )}`;
  }

  function handleTrackSidebarSlideClick(
    event: MouseEvent<HTMLAnchorElement>,
    slideId: string
  ) {
    if (blockPlantGiveawayNavigationUntilRequiredInfo(slideId)) {
      event.preventDefault();
      return;
    }

    setIsTrackSidebarOpen(false);
    setIsAccountMenuOpen(false);
  }

  function handleSidebarHrefClick(
    event: MouseEvent<HTMLAnchorElement>,
    target: string
  ) {
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);
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
      window.location.href = withQuestionnaireReturnTarget(target);
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

  function withQuestionnaireReturnTarget(target: string) {
    if (!currentSlide || !target.startsWith("/questionnaire/")) {
      return target;
    }

    const targetUrl = new URL(target, window.location.origin);

    if (targetUrl.pathname === window.location.pathname) {
      return target;
    }

    if (!targetUrl.searchParams.has("returnTo")) {
      const returnUrl = new URL(window.location.href);

      if (currentSlide.syncUrl) {
        returnUrl.searchParams.set("slide", currentSlide.id);
      }

      targetUrl.searchParams.set(
        "returnTo",
        `${returnUrl.pathname}${returnUrl.search}`
      );
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
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
      if (route.goto === "footer") {
        openCurrentSlideFooterPanel();
        return;
      }

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

  function openCurrentSlideFooterPanel() {
    if (!currentSlide) {
      return;
    }

    if (currentSlide.footerFormEnabled && currentSlide.fields?.length) {
      setActiveFooterTextPanel(null);
      setActiveFooterFormSlideId(currentSlide.id);
      return;
    }

    const textPanelAction = currentSlide.footerActions?.find(
      (action) => action.kind === "textpanel"
    );
    const sourceUrl = textPanelAction?.target ?? textPanelAction?.href;

    if (textPanelAction && sourceUrl) {
      setActiveFooterFormSlideId(null);
      setActiveFooterTextPanel({
        id: textPanelAction.key,
        label: textPanelAction.label,
        sourceUrl,
        mode: getFooterTextPanelMode(textPanelAction),
      });
      return;
    }

    if (currentSlide.annotatedTextSourceUrl) {
      setActiveFooterFormSlideId(null);
      setActiveFooterTextPanel({
        id: "read",
        label: currentSlide.footerContentLabel || currentSlide.title,
        sourceUrl: currentSlide.annotatedTextSourceUrl,
        mode: currentSlide.annotatedTextMode,
      });
    }
  }


  async function resetQuestionnaireSession() {
    clearCheckoutDraft(config.slug);
    checkoutDraftCompletedRef.current = false;
    resetCheckoutReservation();
    setCartInventoryNotices([]);
    setAnswers({});
    setHistory([]);
    setSubmitError(null);
    setDeleteBatchError(null);
    setDeleteBatchConfirmation("");
    setAuthSessionUser(null);
    setIsAuthSessionLoaded(true);
    setGatedAccessState(null);
    setActiveFooterTextPanel(null);
    setIsAccountMenuOpen(false);
    setIsTrackSidebarOpen(false);

    try {
      await clearQuestionnaireVisitorState({
        questionnaireSlug: config.slug,
      });
    } catch (error) {
      console.warn("Visitor state reset failed.", error);
    }

    const resetUrl = new URL(window.location.href);
    resetUrl.search = "";
    resetUrl.hash = "";
    window.location.replace(resetUrl.pathname);
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

    const cartReturnTarget = String(answers.cartReturnTarget ?? "").trim();
    const shouldReturnToCart =
      cartReturnTarget === "review-order" ||
      cartReturnTarget === "review-selected-items";

    if (shouldReturnToCart && currentSlide.id !== cartReturnTarget) {
      setAnswer("cartReturnTarget", "");
      setAnswer("mealReturnTarget", "");
      goToTarget(cartReturnTarget);
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

      if (
        currentSlide.id === "music-merch-shop" &&
        String(answers.shopEntrySource ?? "") === "ticket-assistant-collectibles"
      ) {
        advanceTicketAssistantMealLoop();
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

      const requestedMealReturnTarget = String(
        answers.mealReturnTarget ?? ""
      ).trim();
      const mealReturnTarget =
        requestedMealReturnTarget === "review-order" ||
        requestedMealReturnTarget === "meal-confirmation"
          ? requestedMealReturnTarget
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

    if (currentSlide.blockKey === "ticket-assistant-meal-intro") {
      const quantity = getTicketAssistantQuantity(answers);
      const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
      const slots = getTicketAssistantSlots(answers, quantity);
      const selectedProduct = getTicketAssistantProduct(
        sharedShopDisplayCatalog,
        answers.ticketAssistantEventProductId
      );
      const hostIndex = getTicketAssistantPlusOneHostIndex({
        product: selectedProduct,
        slots,
        index: activeIndex,
      });
      const responsibilityIndex =
        hostIndex !== null && hostIndex > 0 ? hostIndex : activeIndex;
      const responsibilitySlot = slots[responsibilityIndex];

      if (
        responsibilityIndex > 0 &&
        responsibilitySlot?.mealResponsibilitySelected === true
      ) {
        setAnswers((prev) => ({
          ...prev,
          ticketAssistantActiveMealIndex: responsibilityIndex,
        }));
        goToTarget("meal-responsibility");
        return;
      }
    }

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

    const returnTo = searchParams.get("returnTo");

    if (returnTo) {
      window.location.href = returnTo;
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function canGoNext() {
    if (!currentSlide) return false;

    if (isCurrentDripSlideLocked) {
      return false;
    }

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

    if (currentSlide.id === "gardening-journey-video") {
      return String(answers.gardenerLevel ?? "").trim().length > 0;
    }

    if (currentSlide.id === "what-do-you-grow-video") {
      return (
        answers.growsHerbs === true ||
        answers.growsVegetables === true ||
        answers.growsFruitTrees === true ||
        answers.growsFlowers === true ||
        answers.growsHouseplants === true ||
        answers.growsSucculentsCacti === true ||
        String(answers.growsOther ?? "").trim().length > 0
      );
    }

    if (currentSlide.id === "gardening-encouragement-video") {
      return (
        answers.challengeTime === true ||
        answers.challengeSpace === true ||
        answers.challengeKnowledge === true ||
        answers.challengeSoil === true ||
        answers.challengeWater === true ||
        answers.challengeClimate === true ||
        answers.challengePests === true ||
        answers.challengePlantAccess === true ||
        answers.challengeOther === true ||
        String(answers.biggestGardeningChallenge ?? "").trim().length > 0
      );
    }

    if (currentSlide.id === "give-contact-info-video") {
      const phoneDigits = String(answers.primaryPhone ?? answers.phone ?? "")
        .replace(/\D/g, "");

      return (
        String(answers.fullName ?? "").trim().length > 0 &&
        isValidTicketOwnerEmail(String(answers.email ?? "").trim()) &&
        phoneDigits.length >= 10
      );
    }

    if (currentSlide.blockKey === "ticket-assistant-quantity") {
      const purchaseType = String(answers.guidedTicketPurchaseType ?? "");
      return purchaseType === "single" || purchaseType === "multiple";
    }

    if (currentSlide.blockKey === "ticket-assistant-owner-loop") {
      return true;
    }

    if (currentSlide.blockKey === "ticket-assistant-ticket-types") {
      const selectedProduct = getTicketAssistantProduct(
        sharedShopDisplayCatalog,
        answers.ticketAssistantEventProductId
      );
      const quantity = getTicketAssistantQuantity(answers);
      const slots = getTicketAssistantSlots(answers, quantity);

      return slots.every((slot, index) => {
        const hostIndex = getTicketAssistantPlusOneHostIndex({
          product: selectedProduct,
          slots,
          index,
        });
        const hostSlot = hostIndex === null ? undefined : slots[hostIndex];

        return Boolean(
          getTicketAssistantSizeOption(
            selectedProduct,
            hostSlot?.sizeOptionId ?? slot.sizeOptionId
          )
        );
      });
    }

    if (currentSlide.blockKey === "ticket-assistant-meal-responsibility") {
      const quantity = getTicketAssistantQuantity(answers);
      const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
      const slot = getTicketAssistantSlots(answers, quantity)[activeIndex];

      return (
        slot?.mealResponsibilitySelected === true ||
        slot?.ownerMode === "owner_pays_addons"
      );
    }

    if (currentSlide.type === "score" && currentSlide.storeAs) {
      return answers[currentSlide.storeAs] !== undefined;
    }

    if (currentSlide.type === "choice" && currentSlide.storeAs) {
      return answers[currentSlide.storeAs] !== undefined;
    }

    if (currentSlide.fields?.length) {
      const visibleFields = getVisibleFormFields(currentSlide.fields, answers);
        const requiredFieldsFilled = visibleFields.every((field) => {
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

  function getCurrentSlideValidationError() {
    if (!currentSlide) {
      return "This slide is not available.";
    }

    if (currentSlide.id === "what-do-you-grow-video") {
      const hasGrowAnswer =
        answers.growsHerbs === true ||
        answers.growsVegetables === true ||
        answers.growsFruitTrees === true ||
        answers.growsFlowers === true ||
        answers.growsHouseplants === true ||
        answers.growsSucculentsCacti === true ||
        String(answers.growsOther ?? "").trim().length > 0;

      return hasGrowAnswer ? "" : "Choose at least one thing you grow.";
    }

    if (currentSlide.id === "gardening-journey-video") {
      return String(answers.gardenerLevel ?? "").trim()
        ? ""
        : "Choose your gardening experience level.";
    }

    if (currentSlide.id === "gardening-encouragement-video") {
      const hasChallengeAnswer =
        answers.challengeTime === true ||
        answers.challengeSpace === true ||
        answers.challengeKnowledge === true ||
        answers.challengeSoil === true ||
        answers.challengeWater === true ||
        answers.challengeClimate === true ||
        answers.challengePests === true ||
        answers.challengePlantAccess === true ||
        answers.challengeOther === true ||
        String(answers.biggestGardeningChallenge ?? "").trim().length > 0;

      return hasChallengeAnswer
        ? ""
        : "Choose at least one gardening challenge or tell us more.";
    }

    if (currentSlide.id === "give-contact-info-video") {
      if (!String(answers.fullName ?? "").trim()) {
        return "Enter your full name.";
      }

      if (!String(answers.email ?? "").trim()) {
        return "Enter your email address.";
      }

      if (!isValidTicketOwnerEmail(String(answers.email ?? "").trim())) {
        return "Enter a valid email address.";
      }

      const phoneDigits = String(answers.primaryPhone ?? answers.phone ?? "")
        .replace(/\D/g, "");

      if (phoneDigits.length < 10) {
        return "Enter a phone number with at least 10 digits.";
      }
    }

    if (currentSlide.fields?.length) {
      const visibleFields = getVisibleFormFields(currentSlide.fields, answers);
      const missingRequiredField = visibleFields.find((field) => {
        if (!field.required) return false;

        const value = answers[field.name];
        if (field.type === "checkbox") return value !== true;

        return String(value ?? "").trim().length === 0;
      });

      if (missingRequiredField) {
        return `${missingRequiredField.label} is required.`;
      }
    }

    return "";
  }

  function getPlantGiveawayRequiredSlideError(slideId: string) {
    if (slideId === "gardening-journey-video") {
      return String(answers.gardenerLevel ?? "").trim()
        ? ""
        : "Choose your gardening experience level.";
    }

    if (slideId === "what-do-you-grow-video") {
      const hasGrowAnswer =
        answers.growsHerbs === true ||
        answers.growsVegetables === true ||
        answers.growsFruitTrees === true ||
        answers.growsFlowers === true ||
        answers.growsHouseplants === true ||
        answers.growsSucculentsCacti === true ||
        String(answers.growsOther ?? "").trim().length > 0;

      return hasGrowAnswer ? "" : "Choose at least one thing you grow.";
    }

    if (slideId === "gardening-encouragement-video") {
      const hasChallengeAnswer =
        answers.challengeTime === true ||
        answers.challengeSpace === true ||
        answers.challengeKnowledge === true ||
        answers.challengeSoil === true ||
        answers.challengeWater === true ||
        answers.challengeClimate === true ||
        answers.challengePests === true ||
        answers.challengePlantAccess === true ||
        answers.challengeOther === true ||
        String(answers.biggestGardeningChallenge ?? "").trim().length > 0;

      return hasChallengeAnswer
        ? ""
        : "Choose at least one gardening challenge or tell us more.";
    }

    if (slideId === "give-contact-info-video") {
      if (!String(answers.fullName ?? "").trim()) {
        return "Enter your full name.";
      }

      if (!String(answers.email ?? "").trim()) {
        return "Enter your email address.";
      }

      if (!isValidTicketOwnerEmail(String(answers.email ?? "").trim())) {
        return "Enter a valid email address.";
      }

      const phoneDigits = String(answers.primaryPhone ?? answers.phone ?? "")
        .replace(/\D/g, "");

      if (phoneDigits.length < 10) {
        return "Enter a phone number with at least 10 digits.";
      }
    }

    return "";
  }

  function getPlantGiveawayBlockedSlideBeforeTarget(targetSlideId: string) {
    if (config.slug !== "home-gardener-plant-giveaway") {
      return null;
    }

    const targetIndex = getSlideIndexById(visibleSlides, targetSlideId);

    if (targetIndex < 0) {
      return null;
    }

    return (
      visibleSlides
        .slice(0, targetIndex)
        .find((slide) => getPlantGiveawayRequiredSlideError(slide.id)) ?? null
    );
  }

  function blockPlantGiveawayNavigationUntilRequiredInfo(
    targetSlideId: string
  ) {
    const blockedSlide = getPlantGiveawayBlockedSlideBeforeTarget(targetSlideId);

    if (!blockedSlide) {
      return false;
    }

    setSubmitError(
      "You cannot access that page until you enter required information on pages that are before that page."
    );
    setIsTrackSidebarOpen(false);
    setIsAccountMenuOpen(false);
    goToTarget(blockedSlide.id);
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
      signupTags: Array.isArray(currentSlide.signupTags)
        ? currentSlide.signupTags
        : [],
      signupSource: currentSlide.signupSource || config.slug,
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
    const phone = String(answers.primaryPhone ?? answers.phone ?? "").trim();

    return {
      questionnaireSlug: config.slug,
      fullName: String(answers.fullName ?? "").trim(),
      email: String(answers.email ?? "").trim(),
      phone,
      whatsappOptIn:
        answers.whatsappOptIn === true ||
        answers.sendByWhatsapp === true ||
        answers.updatesByWhatsapp === true,
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

  function getPlantShopOrderPayload() {
    const existingOrderRequestKey = String(
      answers.plantShopOrderRequestKey ?? ""
    ).trim();

    if (existingOrderRequestKey) {
      plantShopOrderRequestKeyRef.current = existingOrderRequestKey;
    }

    if (!plantShopOrderRequestKeyRef.current) {
      plantShopOrderRequestKeyRef.current = `plant-shop-${config.slug}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
    }

    const orderRequestKey = plantShopOrderRequestKeyRef.current;

    if (!existingOrderRequestKey) {
      setAnswers((prev) => ({
        ...prev,
        plantShopOrderRequestKey: orderRequestKey,
      }));
    }

    return buildPlantShopOrderPayload({
      slug: config.slug,
      answers: {
        ...answers,
        plantShopOrderRequestKey: orderRequestKey,
      },
      cart: sharedOrderCart,
      lines: sharedOrderLines,
      catalog: sharedShopDisplayCatalog,
      orderSummary: sharedOrderSummary,
      orderRequestKey,
      deliverySelection: sharedDeliverySelection,
    });
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

    submitPlantShopOrder: {
      url: "/api/plant-shop/orders",
      payload: getPlantShopOrderPayload,
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

    if (runName === "submitPlantShopOrder") {
      clearCheckoutDraft(config.slug);
      checkoutDraftCompletedRef.current = true;
      setAnswers((prev) => {
        const shouldClearCustomerInfo =
          String(prev.plantShopDeviceType ?? "") === "shared_event_device";

        return {
          ...prev,
          plantShopOrderCode:
            typeof data?.orderCode === "string" ? data.orderCode : "",
          plantShopOrderMessage:
            typeof data?.message === "string" ? data.message : "",
          ...(shouldClearCustomerInfo
            ? {
                orderCart: {},
                fullName: "",
                email: "",
                phone: "",
                primaryPhone: "",
                whatsappNumber: "",
                plantShopConsent: false,
              }
            : {}),
        };
      });

      if (typeof data?.whatsappUrl === "string" && data.whatsappUrl) {
        window.location.href = data.whatsappUrl;
      }
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
  if (action.disabled) {
    return;
  }

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

      if (!blockPlantGiveawayNavigationUntilRequiredInfo(target)) {
        goToTarget(target);
      }
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
  if (!currentSlide || isSubmitting) return;

  const validationError = getCurrentSlideValidationError();

  if (validationError) {
    setSubmitError(validationError);
    return;
  }

  if (!canGoNext()) return;

  if (
    currentSlide.blockKey === "ticket-assistant-event" &&
    !String(answers.ticketAssistantEventProductId ?? "").trim()
  ) {
    setSubmitError("Choose an event before continuing.");
    return;
  }

  if (currentSlide.blockKey === "ticket-assistant-quantity") {
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const purchaseType = String(answers.guidedTicketPurchaseType ?? "");
    const maxQuantity = getTicketAssistantMaxQuantity(selectedProduct);
    const requestedQuantity = getTicketAssistantQuantity(answers);

    if (purchaseType !== "single" && purchaseType !== "multiple") {
      setSubmitError("Choose Single Ticket or Multiple Tickets before continuing.");
      return;
    }

    if (purchaseType === "multiple" && requestedQuantity > maxQuantity) {
      setSubmitError(`This event allows up to ${maxQuantity} tickets for this flow.`);
      return;
    }
  }

  if (currentSlide.blockKey === "ticket-assistant-account-holder") {
    const slot = getTicketAssistantSlots(answers, getTicketAssistantQuantity(answers))[0];

    if (!String(slot?.name || answers.fullName || "").trim()) {
      setSubmitError("Enter your legal name before continuing.");
      return;
    }

    if (!String(slot?.email || answers.email || "").trim()) {
      setSubmitError("Enter your email address before continuing.");
      return;
    }
  }

  if (currentSlide.blockKey === "ticket-assistant-owner-loop") {
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const quantity = getTicketAssistantQuantity(answers);
    const slots = getTicketAssistantSlots(answers, quantity);

    for (let index = 1; index < quantity; index += 1) {
      const slot = slots[index];

      if (!slot.name.trim()) {
        setSubmitError(`Enter the legal name for attendee ${index + 1}.`);
        return;
      }

      if (
        isTicketAssistantEmailRequired({
          product: selectedProduct,
          slots,
          slot,
          index,
        }) &&
        !slot.email.trim()
      ) {
        setSubmitError(`Enter the email address for attendee ${index + 1}.`);
        return;
      }
    }
  }

  if (currentSlide.blockKey === "ticket-assistant-ticket-types") {
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const quantity = getTicketAssistantQuantity(answers);
    const slots = getTicketAssistantSlots(answers, quantity);

    for (let index = 0; index < quantity; index += 1) {
      const slot = slots[index];
      const hostIndex = getTicketAssistantPlusOneHostIndex({
        product: selectedProduct,
        slots,
        index,
      });
      const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
      const selectedSizeOption = getTicketAssistantSizeOption(
        selectedProduct,
        hostSlot?.sizeOptionId ?? slot.sizeOptionId
      );

      if (!selectedSizeOption) {
        setSubmitError(`Choose a ticket type for attendee ${index + 1}.`);
        return;
      }
    }
  }

  if (currentSlide.blockKey === "ticket-assistant-upgrades") {
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const quantity = getTicketAssistantQuantity(answers);
    const slots = getTicketAssistantSlots(answers, quantity);

    for (let index = 0; index < quantity; index += 1) {
      const slot = slots[index];
      const hostIndex = getTicketAssistantPlusOneHostIndex({
        product: selectedProduct,
        slots,
        index,
      });

      if (hostIndex !== null || slot.deliveryModeId !== "physical-invitation") {
        continue;
      }

      if (
        !slot.mailingAddressLine1.trim() ||
        !slot.mailingCity.trim() ||
        !slot.mailingRegion.trim() ||
        !slot.mailingCountry.trim()
      ) {
        setSubmitError(
          `Enter the mailing address for attendee ${index + 1}'s physical invitation.`
        );
        return;
      }
    }

    beginTicketAssistantMealLoop();
    return;
  }

  if (currentSlide.blockKey === "ticket-assistant-meal-intro") {
    const quantity = getTicketAssistantQuantity(answers);
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const slots = getTicketAssistantSlots(answers, quantity);
    const slot = slots[activeIndex];
    const selectedProduct = getTicketAssistantProduct(
      sharedShopDisplayCatalog,
      answers.ticketAssistantEventProductId
    );
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product: selectedProduct,
      slots,
      index: activeIndex,
    });
    const expectedMealSlide = getTicketAssistantMealSlideForIndex({
      product: selectedProduct,
      slots,
      index: activeIndex,
    });

    if (expectedMealSlide === "meal-responsibility") {
      goToTarget("meal-responsibility");
      return;
    }

    if (expectedMealSlide !== "meal-intro" || slot.skipMealForNow) {
      advanceTicketAssistantMealLoop();
      return;
    }

    if (commitTicketAssistantCheckout({ target: "meal-selection", attendeeIndex: activeIndex })) {
      goToTarget("meal-selection");
    }
    return;
  }

  if (currentSlide.blockKey === "ticket-assistant-meal-responsibility") {
    const quantity = getTicketAssistantQuantity(answers);
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const slot = getTicketAssistantSlots(answers, quantity)[activeIndex];

    if (
      !slot?.mealResponsibilitySelected &&
      slot?.ownerMode !== "owner_pays_addons"
    ) {
      setSubmitError("Choose how this attendee's meals and add-ons will be handled.");
      return;
    }

    if (slot.ownerMode === "purchaser_pays_ticket_and_addons") {
      goToTarget("meal-intro");
      return;
    }

    advanceTicketAssistantMealLoop();
    return;
  }

  if (currentSlide.blockKey === "ticket-assistant-meal-confirmation") {
    goToTarget("collectibles-intro");
    return;
  }

  if (currentSlide.blockKey === "ticket-assistant-collectibles-intro") {
    const quantity = getTicketAssistantQuantity(answers);
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const slot = getTicketAssistantSlots(answers, quantity)[activeIndex];

    if (slot?.skipCollectiblesForNow) {
      advanceTicketAssistantMealLoop();
      return;
    }

    if (commitTicketAssistantCheckout({ target: "music-merch-shop", attendeeIndex: activeIndex })) {
      goToTarget("music-merch-shop");
    }
    return;
  }

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
        style={
          {
          accentColor: theme.colors.primary,
          "--video-progress-percent": `${videoProgress}%`,
          color: theme.colors.primary,
          } as CSSProperties & Record<"--video-progress-percent", string>
        }
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
  const footerActions =
    currentSlide.footerActions?.map((action) => {
      if (action.kind !== "goto") {
        return action;
      }

      const target = action.target ?? action.key;
      const isForwardAction =
        action.key.trim().toLowerCase() === "next" ||
        action.label.trim().toLowerCase().includes("next");
      const targetSlide = visibleSlides.find((slide) => slide.id === target);
      const targetIsLocked =
        Boolean(targetSlide?.requiresDripUnlock) &&
        Boolean(targetSlide?.dripUnlockKey) &&
        !isAdminUser &&
        !dripUnlockKeys.includes(String(targetSlide?.dripUnlockKey));

      return {
        ...action,
        disabled:
          action.disabled ||
          !targetSlide ||
          targetIsLocked ||
          (isForwardAction && !canGoNext()),
      };
    }) ?? [];
  const hasFooterActions = footerActions.length > 0;
  const isPlantGiveawayDsl = config.slug === "home-gardener-plant-giveaway";
  const isLittleOrchardShopDsl = config.slug === "little-orchard-shop";
  const shouldShowPlainWhatsappContact =
    isPlantGiveawayDsl || isLittleOrchardShopDsl;
  const plainWhatsappMessage = isLittleOrchardShopDsl
    ? "What's rare in the nursery, that you're not telling just anyone about?"
    : "Does signing up make me automatically eligible to receive plants?";
  const shouldShowAccountMenu = !isPlantGiveawayDsl;
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

  const mealNextLabel =
    String(answers.cartReturnTarget ?? "") === "review-order" ||
    String(answers.mealReturnTarget ?? "") === "review-order"
      ? "Back to cart"
      : config.slug === "ticket-purchase-assistant"
        ? currentSlide.nextLabel ?? "Continue"
        : currentSlide.nextLabel ?? "Back to ticket details";
  const shopNextLabel =
    config.slug === "ticket-purchase-assistant" &&
    currentSlide.id === "music-merch-shop"
      ? "Continue"
      : currentSlide.nextLabel ?? "Checkout";
  const ticketAssistantNextTotal =
    currentSlide.blockKey === "ticket-assistant-ticket-types" ||
    currentSlide.blockKey === "ticket-assistant-upgrades" ||
    currentSlide.blockKey === "ticket-assistant-meal-responsibility"
      ? getTicketAssistantTotal({
          catalog: sharedShopDisplayCatalog,
          answers,
        })
      : 0;
  const ticketAssistantSharedTotalLabel =
    config.slug === "ticket-purchase-assistant" &&
    (currentSlide.blockKey === "ticket-assistant-meal-responsibility" ||
      currentSlide.blockKey === "ticket-assistant-meal-confirmation")
      ? `${currentSlide.nextLabel ?? "Continue"} · ${formatCurrency(
          sharedOrderGrandTotalWithMeals,
          sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode
        )}`
      : "";

  const cartReturnActive =
    String(answers.cartReturnTarget ?? "") === "review-order" &&
    currentSlide.id !== "review-order";

  const nextLabel =
    ticketAssistantNextTotal > 0
      ? `${currentSlide.nextLabel ?? "Continue"} - ${formatCurrency(
          ticketAssistantNextTotal,
          sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode
        )}`
      : ticketAssistantSharedTotalLabel
        ? ticketAssistantSharedTotalLabel
      : cartReturnActive && currentSlide.type === "shop"
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
        ? `${shopNextLabel} · ${formatCurrency(
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
            sharedOrderGrandTotalWithMeals,
            sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode
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
                {hasLeftSidebarContent || shouldShowAccountMenu ? (
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
                          <SidebarToggleIcon side="left" />
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
                                    onClick={(event) =>
                                      handleSidebarHrefClick(event, link.href)
                                    }
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
                                {sidebarSlideLinks.map((track) =>
                                  track.locked ? (
                                    <button
                                      key={track.id}
                                      type="button"
                                      className={`${styles.sidebarLink} ${styles.sidebarLinkLocked}`}
                                      disabled
                                      title="Enter the required information on earlier pages first."
                                    >
                                      {track.label}
                                    </button>
                                  ) : (
                                    <a
                                      key={track.id}
                                      className={styles.sidebarLink}
                                      href={getSlideHref(track.id)}
                                      onClick={(event) =>
                                        handleTrackSidebarSlideClick(
                                          event,
                                          track.id
                                        )
                                      }
                                    >
                                      {track.label}
                                    </a>
                                  )
                                )}
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
                          <SidebarToggleIcon side="right" />
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
                            {authSessionUser?.name &&
                            config.slug !== "little-orchard-shop" ? (
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
                              className={styles.accountMenuItem}
                              onClick={() =>
                                handleAccountMenuLink(
                                  config.slug === "little-orchard-shop"
                                    ? "/questionnaire/little-orchard-shop?slide=plant-show-shop"
                                    : getPermanentHomeTarget()
                                )
                              }
                            >
                              {config.slug === "little-orchard-shop"
                                ? "Shop"
                                : "Home"}
                            </button>

                            {config.slug === "home-gardener-plant-giveaway" ? null : (
                              <button
                                type="button"
                                className={`${styles.accountMenuItem} ${styles.accountMenuCartItem}`}
                                onClick={() =>
                                  handleAccountMenuLink(
                                    config.slug === "little-orchard-shop"
                                      ? "/questionnaire/little-orchard-shop?slide=review-selected-items"
                                      : "/questionnaire/invitation?slide=review-order"
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
                            )}

                            {config.slug === "little-orchard-shop" ? (
                              <>
                                <label className={styles.accountCurrencyControl}>
                                  <span>Currency</span>
                                  <select
                                    value={activeShopCurrencyCode}
                                    onChange={(event) =>
                                      setGuestShopCurrencyCode(event.target.value)
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
                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() => handleAccountMenuLink("/receipt")}
                                >
                                  Receipt lookup
                                </button>
                                <a
                                  className={styles.accountMenuItem}
                                  href="/privacy-policy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Privacy Policy
                                </a>
                                <a
                                  className={styles.accountMenuItem}
                                  href="/terms"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Terms of Service
                                </a>
                              </>
                            ) : config.slug === "home-gardener-plant-giveaway" ? null : (
                              <>
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
                                    handleAccountMenuLink(getMyTicketsTarget())
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

                                <div className={styles.sidebarDivider} />

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() => {
                                    void resetQuestionnaireSession();
                                    setIsTrackSidebarOpen(false);
                                  }}
                                >
                                  Reset dev progress
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
                                    handleAccountMenuLink(getMyTicketsTarget())
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

                                <div className={styles.sidebarDivider} />

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() => {
                                    void resetQuestionnaireSession();
                                    setIsTrackSidebarOpen(false);
                                  }}
                                >
                                  Reset dev progress
                                </button>
                              </>
                            )}
                              </>
                            )}
                          </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                  </div>
                ) : null}
              
                {showStepText ? (
                  <div className={styles.stepText}>
                    Slide {currentStepNumber} of {totalStepCount}
                  </div>
                ) : null}

              {(shouldShowOverlayTitle &&
                (resolvedOverlayTitle || resolvedOverlaySubtitle)) ||
              shouldShowPlainWhatsappContact ? (
                  <div className={styles.overlayTitleStack}>
                    {shouldShowOverlayTitle && resolvedOverlayTitle ? (
                      <div className={styles.overlayTitleMain}>
                        {resolvedOverlayTitle}
                      </div>
                    ) : null}

                    {shouldShowOverlayTitle &&
                    resolvedOverlaySubtitle &&
                    !isPlantGiveawayDsl &&
                    !isLittleOrchardShopDsl ? (
                      <div className={styles.overlayTitleSupport}>
                        {resolvedOverlaySubtitle}
                      </div>
                    ) : null}

                    {isLittleOrchardShopDsl ? (
                      <div className={styles.overlayShopBrand}>
                        <span>Little Orchard Shop</span>
                        <strong>Para-life Trees</strong>
                      </div>
                    ) : null}

                    {shouldShowPlainWhatsappContact ? (
                      <a
                        href={`https://wa.me/18763727415?text=${encodeURIComponent(
                          plainWhatsappMessage
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.overlayWhatsappContact}
                        aria-label="WhatsApp 1 (876) 372-7415"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M12 3.2a8.5 8.5 0 0 0-7.3 12.9l-1 3.6 3.7-1a8.5 8.5 0 1 0 4.6-15.5Zm0 1.6a6.9 6.9 0 0 1 5.8 10.7A6.9 6.9 0 0 1 7.7 17l-.3-.2-1.6.4.4-1.5-.2-.3A6.9 6.9 0 0 1 12 4.8Zm-2.6 3.5c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.5c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.4l-1.7-.8c-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.2-.8-.7-1.3-1.5-1.4-1.8-.2-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.4-.4-.4-.6-.4h-.5Z" />
                        </svg>
                        <span>1 (876) 372-7415</span>
                      </a>
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
                  {isCurrentDripSlideLocked ? (
                    <div className={styles.contactNote}>
                      {sequenceAccessBlock ? (
                        <>
                          <p>{sequenceAccessBlock.message}</p>
                          {sequenceAccessBlock.canVerifyDevice ? (
                            <button
                              type="button"
                              className={`${styles.primaryButton} ${styles.actionButton}`}
                              onClick={() => void requestSequenceDeviceVerification()}
                              disabled={sequenceAccessBlock.verifySent === true}
                            >
                              {sequenceAccessBlock.verifySent
                                ? "Check your email"
                                : "Verify this device"}
                            </button>
                          ) : null}
                          {sequenceAccessBlock.signupHref ? (
                            <button
                              type="button"
                              className={`${styles.secondaryButton} ${styles.actionButton}`}
                              onClick={() => {
                                window.location.href =
                                  sequenceAccessBlock.signupHref || "/";
                              }}
                            >
                              Sign up for your own access
                            </button>
                          ) : null}
                        </>
                      ) : authSessionUser?.id ? (
                        "This slide has not opened for your account yet. Use the email link when it arrives, then the slide will stay available here."
                      ) : (
                        "Opening your private email link..."
                      )}
                    </div>
                  ) : isMediaSlide ? (
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
                        onVideoEnded={() => {
                          if (currentSlide.videoEndGoto === "footer") {
                            openCurrentSlideFooterPanel();
                            return;
                          }

                          if (currentSlide.videoEndGoto) {
                            goToTarget(currentSlide.videoEndGoto);
                          }
                        }}
                        videoSeekRequest={videoSeekRequest}
                        mediaControlRequest={mediaControlRequest}
                        onMediaStateChange={setMediaState}
                        onRenderedMediaWidthChange={setRenderedMediaWidth}
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
                      {hasRenderableSections(currentSlide.sections) &&
                      !currentSlide.footerFormEnabled ? (
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

                      {currentSlide.dripCountdownSequenceKey ? (
                        <DripCountdownPanel
                          questionnaireSlug={config.slug}
                          sequenceKey={currentSlide.dripCountdownSequenceKey}
                          availableAt={
                            dripNextAvailableAtBySequence[
                              currentSlide.dripCountdownSequenceKey
                            ]
                          }
                          theme={theme}
                        />
                      ) : null}

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

                      {currentSlide.blockKey === "my-tickets-dashboard" ? (
                        <MyTicketsDashboardRenderer
                          theme={theme}
                          catalog={sharedShopDisplayCatalog}
                          onGoto={goToTarget}
                        />
                      ) : null}

                      {currentSlide.blockKey?.startsWith("ticket-assistant-") ? (
                        <TicketPurchaseAssistantRenderer
                          step={currentSlide.blockKey}
                          catalog={sharedShopDisplayCatalog}
                          mealMenu={currentMealMenu}
                          answers={answers}
                          currencyCode={sharedShopDisplayCatalog?.currencyCode ?? activeShopCurrencyCode}
                          usdToCurrencyRate={usdToActiveCurrencyRate}
                          purchaserName={String(answers.fullName ?? authSessionUser?.name ?? "").trim()}
                          purchaserEmail={String(answers.email ?? authSessionUser?.email ?? "").trim()}
                          theme={theme}
                          onPatch={(patch) => {
                            resetCheckoutReservation();
                            setSubmitError(null);
                            setAnswers((prev) => ({
                              ...prev,
                              ...patch,
                            }));
                          }}
                          onCommit={() => {
                            if (commitTicketAssistantCheckout()) {
                              goToTarget("ticket-details");
                            }
                          }}
                          onCommitTarget={(target, attendeeIndex) => {
                            if (
                              commitTicketAssistantCheckout({
                                target,
                                attendeeIndex,
                              })
                            ) {
                              goToTarget(target);
                            }
                          }}
                          onAdvanceMealLoop={advanceTicketAssistantMealLoop}
                          onGoto={goToTarget}
                        />
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
                          showReservationCountdown={
                            currentSlide.id !== "review-selected-items"
                          }
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
                          isAdminUser={isAdminUser}
                          onCatalogUpdated={() =>
                            setDynamicVariablesRefreshKey((key) => key + 1)
                          }
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
                          onRequestNurseryStock={(productId, sizeOptionId) => {
                            updateCurrentShopCart((cart) => {
                              const key = makeShopLineKey(productId, sizeOptionId);

                              return {
                                ...cart,
                                [key]: {
                                  productId,
                                  sizeOptionId,
                                  selected: true,
                                  quantity: 1,
                                  purchaseModeId: "nursery-stock-request",
                                  unitPriceOverride: 0,
                                  unavailableReason: "nursery_stock_request",
                                },
                              };
                            });
                          }}
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
                                  : currentSlide.id === "plant-order-review"
                                    ? "plant-starter-shop"
                                    : currentSlide.id === "review-selected-items"
                                      ? "plant-show-shop"
                                  : "music-merch-shop";

                              setAnswers((prev) => ({
                                ...prev,
                                shopFocusLineKey: targetKey,
                                cartReturnTarget:
                                  currentSlide.id === "review-selected-items"
                                    ? "review-selected-items"
                                    : "review-order",
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
                          usdToCurrencyRate={usdToActiveCurrencyRate}
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
                          accountIdentityVerified={accountIdentityVerified}
                          onVerifyIdentification={() => {
                            window.location.href =
                              "/questionnaire/auth-account?slide=account-home";
                          }}
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
                          choices={
                            currentSlide.id === "plant-order-review" ||
                            currentSlide.id === "review-selected-items"
                              ? [
                                  {
                                    label:
                                      currentSlide.id === "review-selected-items"
                                        ? "Return to Little Orchard Shop"
                                        : "Visit Para-life Trees Shop",
                                    onClick: () =>
                                      goToTarget(
                                        currentSlide.id === "review-selected-items"
                                          ? "plant-show-shop"
                                          : "plant-starter-shop"
                                      ),
                                    variant: "primary",
                                  },
                                ]
                              : undefined
                          }
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
                            setAnswer(
                              "cartReturnTarget",
                              currentSlide.id === "review-selected-items"
                                ? "review-selected-items"
                                : "review-order"
                            );
                            goToTarget(
                              currentSlide.id === "plant-order-review"
                                ? "receiving-plants"
                                : currentSlide.id === "review-selected-items"
                                  ? "pickup-information"
                                : "delivery-options"
                            );
                          }}
                          onAdjustContact={() => {
                            setAnswer(
                              "cartReturnTarget",
                              currentSlide.id === "review-selected-items"
                                ? "review-selected-items"
                                : "review-order"
                            );
                            goToTarget(
                              currentSlide.id === "plant-order-review"
                                ? "give-contact-info-video"
                                : currentSlide.id === "review-selected-items"
                                  ? "contact-details-adjust"
                                : "contact-details"
                            );
                          }}
                          ticketOwnerAddonBudgetLines={
                            sharedTicketOwnerAddonBudgetLines
                          }
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
                          showReservationCountdown={
                            currentSlide.id !== "review-selected-items"
                          }
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
                          isAdminUser={isAdminUser}
                          onCatalogUpdated={() =>
                            setDynamicVariablesRefreshKey((key) => key + 1)
                          }
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
                          onRequestNurseryStock={(productId, sizeOptionId) => {
                            updateCurrentShopCart((cart) => {
                              const key = makeShopLineKey(productId, sizeOptionId);

                              return {
                                ...cart,
                                [key]: {
                                  productId,
                                  sizeOptionId,
                                  selected: true,
                                  quantity: 1,
                                  purchaseModeId: "nursery-stock-request",
                                  unitPriceOverride: 0,
                                  unavailableReason: "nursery_stock_request",
                                },
                              };
                            });
                          }}
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
                                : currentSlide.id === "plant-order-review"
                                  ? "plant-starter-shop"
                                  : currentSlide.id === "review-selected-items"
                                    ? "plant-show-shop"
                                : "music-merch-shop";

                            setAnswers((prev) => ({
                              ...prev,
                              shopFocusLineKey: targetKey,
                              cartReturnTarget:
                                currentSlide.id === "review-selected-items"
                                  ? "review-selected-items"
                                  : "review-order",
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
                            signupTags={currentSlide.signupTags}
                            signupSource={currentSlide.signupSource}
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
                          {getVisibleFormFields(currentSlide.fields, answers).map((field) => (
                            <FormFieldRenderer
                              key={field.name}
                              field={getRuntimeFormField(field)}
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
                  activeFooterPanelSlide ||
                  activeFooterFormSlideId === currentSlide.id
                    ? styles.slideFooterTextActionsOverlayPanelOpen
                    : ""
                } ${
                  currentSlide.footerTransparentUntilExpanded
                    ? styles.slideFooterTextActionsOverlayTransparentCollapsed
                    : ""
                } ${
                  currentSlide.mediaAspect === "vertical"
                    ? styles.slideFooterTextActionsOverlayVerticalMedia
                    : ""
                }`}
                style={
                  renderedMediaWidth > 0
                    ? ({
                        "--footer-progress-width": `${renderedMediaWidth}px`,
                      } as CSSProperties &
                        Record<"--footer-progress-width", string>)
                    : undefined
                }
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
                  textPanelSongModeLabel={currentSlide.textPanelSongModeLabel}
                  panelContent={
                    activeFooterFormSlideId === currentSlide.id &&
                    currentSlide.footerFormEnabled &&
                    currentSlide.fields?.length ? (
                      <div className={styles.slideFooterFormPanel}>
                        {hasRenderableSections(currentSlide.sections) ? (
                          <div className={styles.slideFooterFormIntro}>
                            {(currentSlide.sections ?? [])
                              .filter(
                                (section) =>
                                  section.type === "heading" ||
                                  section.type === "subheading" ||
                                  section.type === "paragraph"
                              )
                              .map((section, index) => {
                                const resolvedColor =
                                  (section.colorKey &&
                                    theme.colors.lineColors?.[
                                      section.colorKey
                                    ]) ||
                                  (section.type === "subheading"
                                    ? theme.colors.subtitle
                                    : theme.colors.accent) ||
                                  theme.colors.primary;
                                const content = replaceDynamicText(
                                  section.text,
                                  answers,
                                  mergedVariables
                                );

                                if (section.type === "paragraph") {
                                  return (
                                    <p
                                      key={index}
                                      className={styles.slideFooterFormText}
                                      style={{ color: resolvedColor }}
                                    >
                                      {content}
                                    </p>
                                  );
                                }

                                return (
                                  <h3
                                    key={index}
                                    className={styles.slideFooterFormHeading}
                                    style={{ color: resolvedColor }}
                                  >
                                    {content}
                                  </h3>
                                );
                              })}
                          </div>
                        ) : null}

                        <p className={styles.slideFooterFormInstruction}>
                          Respond, then tap the forward icon
                          <br />
                          or Continue button.
                        </p>

                        <div className={styles.formGrid}>
                          {getVisibleFormFields(currentSlide.fields, answers).map((field) => (
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

                        <button
                          type="button"
                          className={`${styles.primaryButton} ${styles.actionButton} ${styles.slideFooterSubmitButton}`}
                          onClick={() => void handleNext()}
                          disabled={isSubmitting}
                        >
                          Continue
                        </button>

                        {currentSlide.footerFormSupportSourceUrl ? (
                          <FooterSupportText
                            sourceUrl={currentSlide.footerFormSupportSourceUrl}
                            startText={currentSlide.footerFormSupportStartText}
                          />
                        ) : null}

                        {submitError &&
                        currentSlide.id !== "delete-account-confirmed" ? (
                          <p className={styles.formError}>{submitError}</p>
                        ) : null}
                      </div>
                    ) : activeFooterPanelSlide ? (
                      <div className={styles.slideFooterArticlePanel}>
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

                        {config.slug === "home-gardener-plant-giveaway" &&
                        currentSlide.annotatedTextSourceUrl ? (
                          <button
                            type="button"
                            className={`${styles.primaryButton} ${styles.actionButton} ${styles.slideFooterSubmitButton}`}
                            onClick={() => void handleNext()}
                            disabled={isSubmitting}
                          >
                            Continue
                          </button>
                        ) : null}
                      </div>
                    ) : undefined
                  }
                  canTogglePanel={Boolean(
                    (currentSlide.footerFormEnabled &&
                      currentSlide.fields?.length) ||
                      currentSlide.annotatedTextSourceUrl
                  )}
                  onContentLabelClick={() => {
                    if (
                      currentSlide.footerFormEnabled &&
                      currentSlide.fields?.length
                    ) {
                      setActiveFooterFormSlideId((current) =>
                        current === currentSlide.id ? null : currentSlide.id
                      );
                      return;
                    }

                    const footerReadSourceUrl =
                      currentSlide.annotatedTextSourceUrl;

                    if (footerReadSourceUrl) {
                      setActiveFooterTextPanel((current) =>
                        current?.id === "read" &&
                        current.sourceUrl === footerReadSourceUrl
                          ? null
                          : {
                              id: "read",
                              label:
                                currentSlide.footerContentLabel ||
                                currentSlide.title,
                              sourceUrl: footerReadSourceUrl,
                              mode: currentSlide.annotatedTextMode,
                            }
                      );
                    }
                  }}
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
                } ${
                  currentSlide.actionBarOrder === "nav-first"
                    ? styles.actionBarNavFirst
                    : ""
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
                          disabled={
                            isSubmitting ||
                            (!currentSlide.fields?.length && !canGoNext())
                          }
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
  usdToCurrencyRate,
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
  usdToCurrencyRate: number;
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
  const [customBudgetTicketCodes, setCustomBudgetTicketCodes] = useState<
    Record<string, boolean>
  >({});

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
          assignment.isPurchaserTicket !== true && ownerEmailIsValid;
        const detailsAreExpanded =
          expandedTicketCode === assignment.ticketCode;
        const canSelectMealForThisTicket =
          assignment.isPurchaserTicket === true ||
          selectedPaymentMode === "purchaser_pays_ticket_and_addons";

        const addonBudgetValue = addonBudget > 0 ? String(addonBudget) : "";
        const budgetChoices = getTicketOwnerAddonBudgetChoices(
          usdToCurrencyRate
        );
        const customBudgetMinimum = budgetChoices[1]?.value ?? 10;
        const selectedBudgetChoice =
          customBudgetTicketCodes[assignment.ticketCode] === true
            ? "custom"
            : selectedPaymentMode === "owner_pays_addons"
            ? "owner-pays"
            : budgetChoices.find((choice) =>
                Math.abs(choice.value - addonBudget) < 0.01
              )?.id ?? (addonBudget >= customBudgetMinimum ? "custom" : "owner-pays");
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
                  Attendee will select meal.
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
                            I&apos;ll select {ticketOwnerName}&apos;s meals and extra
                            add-ons, and also pay for everything.
                          </span>
                      </label>

                      <label
                        className={styles.ticketOwnerAccessOption}
                        style={{
                          borderColor:
                            selectedPaymentMode ===
                            "owner_selects_sender_pays_addons" ||
                            selectedPaymentMode === "owner_pays_addons"
                              ? theme.colors.primary
                              : theme.colors.border,
                          background:
                            selectedPaymentMode ===
                            "owner_selects_sender_pays_addons" ||
                            selectedPaymentMode === "owner_pays_addons"
                              ? withOpacity(theme.colors.primary, 0.12)
                              : "#FFFFFF",
                        }}
                      >
                        <input
                          type="radio"
                          name={`ticket-owner-payment-${assignment.ticketCode}`}
                          checked={
                            selectedPaymentMode ===
                              "owner_selects_sender_pays_addons" ||
                            selectedPaymentMode === "owner_pays_addons"
                          }
                          onChange={() =>
                            onChange(
                              updateTicketOwnerPaymentMode({
                                assignments: assignments.map((item) =>
                                  item.ticketCode === assignment.ticketCode
                                    ? {
                                        ...item,
                                        ticketOwnerAddonBudget: 0,
                                      }
                                    : item
                                ),
                                ticketCode: assignment.ticketCode,
                                value: "owner_pays_addons",
                              })
                            )
                          }
                        />
                        <span>
                          {ticketOwnerName} will select their own meals and
                          add-ons. I&apos;ll pay for ticket and put:
                        </span>
                      </label>

                    </div>
                      {selectedPaymentMode === "owner_selects_sender_pays_addons" ||
                      selectedPaymentMode === "owner_pays_addons" ? (
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
                        Add-on budget for {ticketOwnerName}
                      </label>

                      <div className={styles.ticketBudgetChoices}>
                        <label className={styles.ticketOwnerAccessOption}>
                          <input
                            type="radio"
                            name={`ticket-owner-budget-${assignment.ticketCode}`}
                            checked={selectedBudgetChoice === "owner-pays"}
                            onChange={() => {
                              setCustomBudgetTicketCodes((prev) => ({
                                ...prev,
                                [assignment.ticketCode]: false,
                              }));

                              onChange(
                                updateTicketOwnerPaymentMode({
                                  assignments: assignments.map((item) =>
                                    item.ticketCode === assignment.ticketCode
                                      ? {
                                          ...item,
                                          ticketOwnerAddonBudget: 0,
                                        }
                                      : item
                                  ),
                                  ticketCode: assignment.ticketCode,
                                  value: "owner_pays_addons",
                                })
                              );
                            }}
                          />
                          <span>
                            {formatCurrency(0, currencyCode)}, {ticketOwnerName} will
                            pay for own add-ons in full
                          </span>
                        </label>

                        {budgetChoices.slice(1).map((choice) => (
                          <label
                            key={choice.id}
                            className={styles.ticketOwnerAccessOption}
                          >
                            <input
                              type="radio"
                              name={`ticket-owner-budget-${assignment.ticketCode}`}
                              checked={selectedBudgetChoice === choice.id}
                              onChange={() => {
                                setCustomBudgetTicketCodes((prev) => ({
                                  ...prev,
                                  [assignment.ticketCode]: false,
                                }));

                                onChange(
                                  updateTicketOwnerPaymentMode({
                                    assignments: assignments.map((item) =>
                                      item.ticketCode === assignment.ticketCode
                                        ? {
                                            ...item,
                                            ticketOwnerAddonBudget: choice.value,
                                          }
                                        : item
                                    ),
                                    ticketCode: assignment.ticketCode,
                                    value: "owner_selects_sender_pays_addons",
                                  })
                                );
                              }}
                            />
                            <span>{formatCurrency(choice.value, currencyCode)}</span>
                          </label>
                        ))}

                        <label className={styles.ticketOwnerAccessOption}>
                          <input
                            type="radio"
                            name={`ticket-owner-budget-${assignment.ticketCode}`}
                            checked={selectedBudgetChoice === "custom"}
                            onChange={() => {
                              setCustomBudgetTicketCodes((prev) => ({
                                ...prev,
                                [assignment.ticketCode]: true,
                              }));

                              onChange(
                                updateTicketOwnerPaymentMode({
                                  assignments: assignments.map((item) =>
                                    item.ticketCode === assignment.ticketCode
                                      ? {
                                          ...item,
                                          ticketOwnerAddonBudget:
                                            addonBudget > 0 ? addonBudget : 0,
                                        }
                                      : item
                                  ),
                                  ticketCode: assignment.ticketCode,
                                  value: "owner_selects_sender_pays_addons",
                                })
                              );
                            }}
                          />
                          <span className={styles.ticketBudgetCustomField}>
                            <span>Custom budget</span>
                            <input
                              className={styles.input}
                              type="number"
                              min={customBudgetMinimum}
                              step="0.01"
                              value={
                                selectedBudgetChoice === "custom"
                                  ? addonBudgetValue
                                  : ""
                              }
                              onFocus={() => {
                                setCustomBudgetTicketCodes((prev) => ({
                                  ...prev,
                                  [assignment.ticketCode]: true,
                                }));

                                onChange(
                                  updateTicketOwnerPaymentMode({
                                    assignments: assignments.map((item) =>
                                      item.ticketCode === assignment.ticketCode
                                        ? {
                                            ...item,
                                            ticketOwnerAddonBudget:
                                              addonBudget > 0 ? addonBudget : 0,
                                          }
                                        : item
                                    ),
                                    ticketCode: assignment.ticketCode,
                                    value: "owner_selects_sender_pays_addons",
                                  })
                                );
                              }}
                              onChange={(event) => {
                                setCustomBudgetTicketCodes((prev) => ({
                                  ...prev,
                                  [assignment.ticketCode]: true,
                                }));
                                const rawValue = event.target.value.trim();
                                const nextBudget =
                                  rawValue === "" ? 0 : Number(rawValue);

                                onChange(
                                  updateTicketAssignmentField({
                                    assignments,
                                    ticketCode: assignment.ticketCode,
                                    field: "ticketOwnerAddonBudget",
                                    value: Number.isFinite(nextBudget)
                                      ? Math.max(0, nextBudget)
                                      : 0,
                                  })
                                );
                              }}
                              onBlur={(event) => {
                                const nextBudget = Number(
                                  event.target.value || 0
                                );

                                if (
                                  Number.isFinite(nextBudget) &&
                                  nextBudget > 0 &&
                                  nextBudget < customBudgetMinimum
                                ) {
                                  onChange(
                                    updateTicketAssignmentField({
                                      assignments,
                                      ticketCode: assignment.ticketCode,
                                      field: "ticketOwnerAddonBudget",
                                      value: customBudgetMinimum,
                                    })
                                  );
                                }
                              }}
                              placeholder={`Minimum ${formatCurrency(
                                customBudgetMinimum,
                                currencyCode
                              )}`}
                              style={{
                                borderColor: theme.colors.border,
                                width: "100%",
                                minWidth: 0,
                              }}
                            />
                          </span>
                        </label>
                      </div>

                      <p className={styles.contactNote} style={{ margin: 0 }}>
                        Custom budgets must be at least{" "}
                        {formatCurrency(customBudgetMinimum, currencyCode)}.
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
                                          purchaseModeId: "standard-invitation",
                                          purchaseModeLabel: "Standard Invitation",
                                          ticketUpgradeOverride: true,
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
    accountIdentityVerified,
    onVerifyIdentification,
    onChange,
  }: {
    menu: MealMenu | null;
    assignments: TicketAssignments;
    currencyCode: string;
    selectedTicketCode: string;
    theme: ThemeConfig;
    accountIdentityVerified: boolean;
    onVerifyIdentification: () => void;
    onChange: (nextAssignments: TicketAssignments) => void;
  }) {
    const mealAssignments = getTicketsNeedingMeal(assignments).filter(
      (assignment) => assignment.ticketCode === selectedTicketCode
    );
  useEffect(() => {
    let changed = false;
    const nextAssignments = assignments.map((assignment) => {
      if (assignment.ticketCode !== selectedTicketCode) {
        return assignment;
      }

      const alcoholSelection =
        assignment.mealSelection?.["alcoholic-beverage"];
      const hasAlcoholSelection =
        alcoholSelection &&
        Object.values(alcoholSelection).some((quantity) => Number(quantity) > 0);
      const canKeepAlcoholSelection =
        assignment.isPurchaserTicket === true && accountIdentityVerified;

      if (!hasAlcoholSelection || canKeepAlcoholSelection) {
        return assignment;
      }

      changed = true;
      const mealSelection = {
        ...(assignment.mealSelection ?? {}),
      };
      delete mealSelection["alcoholic-beverage"];

      return {
        ...assignment,
        mealSelection,
      };
    });

    if (changed) {
      onChange(nextAssignments);
    }
  }, [
    accountIdentityVerified,
    assignments,
    onChange,
    selectedTicketCode,
  ]);

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
        const regularGroups = menu.groups.filter(
          (group) => group.id !== "alcoholic-beverage"
        );
        const alcoholGroups = menu.groups.filter(
          (group) => group.id === "alcoholic-beverage"
        );
        const isAccountHolderTicket = assignment.isPurchaserTicket === true;

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

          {regularGroups.map((group) => {
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

          {alcoholGroups.map((group) => {
            const groupTotal = getTicketMealGroupTotal(assignment, group.id);

            return (
              <div
                key={`${assignment.ticketCode}-${group.id}`}
                className={`${styles.mealGroup} ${styles.mealGroupPaid} ${styles.mealGroupAlcohol}`}
              >
                <div className={styles.mealGroupHeader}>
                  <div className={styles.mealGroupTitle}>{group.label}</div>
                  <div className={styles.mealGroupCount}>
                    {groupTotal} selected · Paid add-on
                  </div>
                </div>

                <div className={styles.mealGroupLegalNote}>
                  <span>Must meet the legal requirements.</span>
                  <span>Identification must be uploaded.</span>
                </div>

                {!isAccountHolderTicket ? (
                  <div className={styles.mealGroupRestrictionNote}>
                    Alcoholic beverages can only be selected from the
                    attendee&apos;s own account after their identification is
                    approved. The account holder cannot purchase alcoholic
                    beverages for a plus one or another attendee.
                  </div>
                ) : !accountIdentityVerified ? (
                  <div className={styles.mealGroupRestrictionNote}>
                    <span>
                      Verify your identification to purchase alcoholic
                      beverages.
                    </span>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={onVerifyIdentification}
                      style={{
                        borderColor: theme.colors.border,
                        background: "#FFFFFF",
                        color: theme.colors.text,
                      }}
                    >
                      Verify your identification
                    </button>
                  </div>
                ) : (
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
                                {formatCurrency(option.price, currencyCode)} per
                                extra serving
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
                )}
              </div>
            );
          })}
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

function getTicketOwnerAddonBudgetChoices(usdToCurrencyRate: number) {
  const rate =
    Number.isFinite(usdToCurrencyRate) && usdToCurrencyRate > 0
      ? usdToCurrencyRate
      : 1;

  return [0, 10, 25, 50, 100].map((usdAmount) => ({
    id: usdAmount === 0 ? "owner-pays" : `usd-${usdAmount}`,
    usdAmount,
    value: usdAmount === 0 ? 0 : convertMoney(usdAmount, rate),
  }));
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
  ticketOwnerAddonBudgetLines,
  onAdjustDelivery,
  onAdjustContact,
}: {
  answers: QuestionnaireAnswers;
  deliverySelection: DeliverySelection;
  deliveryFee: number;
  currencyCode: string;
  deliveryConfig: DeliveryConfig | null;
  showDeliverySummary: boolean;
  ticketOwnerAddonBudgetLines?: Array<{
    id: string;
    attendeeName: string;
    ticketCode: string;
    amount: number;
  }>;
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
  const isLittleOrchardOrder =
    String(answers.plantShopFulfillmentMethod ?? "").trim().length > 0;
  const littleOrchardFulfillment =
    isLittleOrchardOrder ? getLittleOrchardFulfillmentOption(answers) : null;
  const littleOrchardFulfillmentKey = getLittleOrchardFulfillmentKey(answers);
  const littleOrchardDeliveryAddressLines =
    littleOrchardFulfillmentKey === "paid_delivery"
      ? getLittleOrchardDeliveryAddressLines(answers)
      : [];
  const contactPhone = String(
    answers.whatsappNumber ?? answers.primaryPhone ?? answers.phone ?? ""
  ).trim();
  const contactMethodLabels: Record<string, string> = {
    whatsapp: "WhatsApp",
    email: "Email",
    phone_call: "Phone call",
    instagram: "Instagram DM",
    tiktok: "TikTok message",
    facebook: "Facebook Messenger",
  };
  const selectedContactMethod = String(
    answers.plantShopContactMethod ?? ""
  ).trim();
  const socialContactLines = [
    String(answers.instagramHandle ?? "").trim()
      ? `Instagram: ${String(answers.instagramHandle ?? "").trim()}`
      : "",
    String(answers.tiktokHandle ?? "").trim()
      ? `TikTok: ${String(answers.tiktokHandle ?? "").trim()}`
      : "",
    String(answers.facebookMessengerHandle ?? "").trim()
      ? `Facebook Messenger: ${String(
          answers.facebookMessengerHandle ?? ""
        ).trim()}`
      : "",
  ].filter(Boolean);

  const ticketOwnerEmailNotices = Array.from(
    new Map(
      normalizeTicketAssignments(answers.ticketAssignments)
        .filter(
          (assignment) =>
            assignment.isPurchaserTicket !== true &&
            assignment.emailTicketToOwner === true &&
            isValidTicketOwnerEmail(assignment.ownerEmail)
        )
        .map((assignment) => {
          const ownerName =
            assignment.ownerName?.trim() || "This ticket owner";
          const ownerEmail = String(assignment.ownerEmail ?? "").trim();
          const noticeKey = `${ownerName.toLowerCase()}::${ownerEmail.toLowerCase()}`;

          return [
            noticeKey,
            {
              noticeKey,
              ticketCode: assignment.ticketCode,
              ownerName,
              ownerEmail,
            },
          ] as const;
        })
    ).values()
  );
  const hasMultipleTicketOwnerEmailNotices =
    ticketOwnerEmailNotices.length > 1;

  return (
    <div className={styles.reviewSummaryStack}>
      {ticketOwnerAddonBudgetLines?.length ? (
        <div className={styles.reviewSummaryCard}>
          <div className={styles.reviewSummaryHeader}>
            <div className={styles.reviewSummaryTitle}>
              Add-on budgets
            </div>
          </div>

          <div className={styles.reviewSummaryBody}>
            {ticketOwnerAddonBudgetLines.map((line) => (
              <div key={line.id} className={styles.budgetCartLine}>
                <div>
                  <strong>Budget for {line.attendeeName}</strong>
                  <span>Ticket code: {line.ticketCode}</span>
                </div>
                <strong>{formatCurrency(line.amount, currencyCode)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
            {littleOrchardFulfillment ? (
              <>
                <div>{littleOrchardFulfillment.label}</div>
                <div>{littleOrchardFulfillment.detail}</div>
                {littleOrchardDeliveryAddressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </>
            ) : null}

            {!littleOrchardFulfillment &&
            deliverySelection.method === "pickup_stable" &&
            stablePickup ? (
              <>
                <div>{stablePickup.label}</div>
                <div>{stablePickup.pickupWindowLabel}</div>
              </>
            ) : null}

            {!littleOrchardFulfillment &&
            deliverySelection.method === "pickup_popup" &&
            popupPickup ? (
              <>
                <div>{popupPickup.label}</div>
                <div>{popupPickup.eventDateLabel}</div>
              </>
            ) : null}

            {!littleOrchardFulfillment && deliverySelection.method === "delivery" ? (
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
            {selectedContactMethod ? (
              <div>
                Preferred updates:{" "}
                {contactMethodLabels[selectedContactMethod] ||
                  selectedContactMethod}
              </div>
            ) : null}
            {contactPhone ? (
              <div>{contactPhone}</div>
            ) : null}
            {String(answers.email ?? "").trim() ? (
              <div>{String(answers.email ?? "").trim()}</div>
            ) : null}
            {socialContactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          {hasMultipleTicketOwnerEmailNotices ? (
            <div
              className={`${styles.ticketOwnerEmailNotice} ${styles.contactSummarySection}`}
            >
              {ticketOwnerEmailNotices.map((notice) => (
                <div
                  className={styles.contactEmailReminder}
                  key={notice.noticeKey}
                >
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
              <div className={styles.contactEmailReminder}>
                {ticketOwnerEmailNotices[0].ownerName} will be emailed the
                details of their ticket at{" "}
                {ticketOwnerEmailNotices[0].ownerEmail}.
              </div>
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
  showReservationCountdown = true,
  mealMenu,
  ticketAssignments,
  onAdjustMeals,
  activeCurrencyCode,
  canChangeCurrency,
  onChangeCurrency,
  theme,
  answers,
  isAdminUser = false,
  onCatalogUpdated,
  onSetQuantity,
  onSetLineSelected,
  onSetPurchaseMode,
  onSetPurchaseRecipients,
  onRequestNurseryStock,
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
  showReservationCountdown?: boolean;
  mealMenu?: MealMenu | null;
  ticketAssignments?: TicketAssignments;
  onAdjustMeals?: (ticketCode: string) => void;
  activeCurrencyCode: string;
  canChangeCurrency: boolean;
  onChangeCurrency: (currencyCode: string) => void;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  isAdminUser?: boolean;
  onCatalogUpdated?: () => void;
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
  onRequestNurseryStock?: (productId: string, sizeOptionId: string) => void;
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
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [adminQuantityDrafts, setAdminQuantityDrafts] = useState<
    Record<string, string>
  >({});
  const [adminQuantityReasonDrafts, setAdminQuantityReasonDrafts] = useState<
    Record<string, string>
  >({});
  const [adminQuantityNoteDrafts, setAdminQuantityNoteDrafts] = useState<
    Record<string, string>
  >({});
  const [adminQuantityMessages, setAdminQuantityMessages] = useState<
    Record<string, string>
  >({});
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shopSessionKeyRef = useRef("");
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

  const getShopSessionKey = useCallback(() => {
    if (shopSessionKeyRef.current) {
      return shopSessionKeyRef.current;
    }

    const storageKey = "little-orchard-shop-session-key";
    const existing =
      typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : "";
    const nextKey =
      existing ||
      `lo-shop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, nextKey);
    }

    shopSessionKeyRef.current = nextKey;
    return nextKey;
  }, []);

  const recordProductInterest = useCallback(
    (productId: string, sizeOptionId: string) => {
      if (slideId !== "plant-show-shop") {
        return;
      }

      void fetch("/api/plant-shop/interest", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          sizeOptionId,
          sessionKey: getShopSessionKey(),
        }),
      }).catch(() => undefined);
    },
    [getShopSessionKey, slideId]
  );

  const setAdminEventQuantity = useCallback(
    async (
      productId: string,
      sizeOptionId: string,
      lineKey: string,
      productTitle: string,
      sizeLabel: string,
      currentQuantity: number
    ) => {
      const remainingQuantity = Number(adminQuantityDrafts[lineKey]);
      const reason = adminQuantityReasonDrafts[lineKey] ?? "";
      const notes = adminQuantityNoteDrafts[lineKey] ?? "";

      if (!Number.isFinite(remainingQuantity) || remainingQuantity < 0) {
        setAdminQuantityMessages((current) => ({
          ...current,
          [lineKey]: "Enter a valid quantity.",
        }));
        return;
      }

      if (!reason) {
        setAdminQuantityMessages((current) => ({
          ...current,
          [lineKey]: "Choose a reason for this stock update.",
        }));
        return;
      }

      const change = Math.floor(remainingQuantity) - Math.floor(currentQuantity);
      const confirmed = window.confirm(
        [
          "Confirm stock update",
          "",
          `Product: ${productTitle}`,
          `Variation: ${sizeLabel}`,
          `Current quantity: ${Math.floor(currentQuantity)}`,
          `New quantity: ${Math.floor(remainingQuantity)}`,
          `Change: ${change > 0 ? "+" : ""}${change}`,
        ].join("\n")
      );

      if (!confirmed) {
        return;
      }

      setAdminQuantityMessages((current) => ({
        ...current,
        [lineKey]: "Updating quantity...",
      }));

      const response = await fetch("/api/plant-shop/event-quantity", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          sizeOptionId,
          remainingQuantity,
          reason,
          notes,
          confirmed: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      setAdminQuantityMessages((current) => ({
        ...current,
        [lineKey]: response.ok
          ? payload.message || "Quantity updated."
          : payload.error || "Quantity could not be updated.",
      }));

      if (response.ok) {
        onCatalogUpdated?.();
      }
    },
    [
      adminQuantityDrafts,
      adminQuantityNoteDrafts,
      adminQuantityReasonDrafts,
      onCatalogUpdated,
    ]
  );

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
      {previewImage ? (
        <div
          className={styles.productImagePreviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={previewImage.alt}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className={styles.productImagePreviewPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.productImagePreviewClose}
              aria-label="Close image preview"
              onClick={() => setPreviewImage(null)}
            >
              x
            </button>
            <img src={previewImage.src} alt={previewImage.alt} />
            <div className={styles.productImagePreviewCaption}>
              {previewImage.alt}
            </div>
          </div>
        </div>
      ) : null}

      {slideMode === "review" && reviewSection === "primary" && title ? (
        <div className={styles.cartHeadingBlock}>
          <h2 className={styles.cartTitle}>Cart</h2>
          <p>Review the items currently in your cart.</p>
        </div>
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
                  <div className={styles.productImageColumn}>
                    {product.imageUrl ? (
                        <button
                          type="button"
                          className={styles.productImageButton}
                          onClick={() => {
                            for (const sizeOption of product.sizeOptions) {
                              recordProductInterest(product.id, sizeOption.id);
                            }

                            setPreviewImage({
                              src:
                                product.previewImageUrl ||
                                product.imageUrl ||
                                "",
                              alt: product.title,
                            });
                          }}
                        >
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className={styles.productImage}
                        />
                      </button>
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
                        {product.imageUrl ? (
                          <div className={styles.productImageHint}>
                            <span aria-hidden="true">&lt;</span> Tap image to see
                            it bigger.
                          </div>
                        ) : null}

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
                const isNurseryStockRequest =
                  cartLine?.purchaseModeId === "nursery-stock-request";
                const resolvedLine =
                  slideMode === "review"
                    ? displayReviewLines.find(
                        (line) =>
                          line.productId === product.id &&
                          line.sizeOptionId === sizeOption.id
                      )
                    : undefined;

                const rawSizeOptionMaxQuantity = Number(
                  sizeOption.metadata?.eventQuantityAvailable
                );
                const sizeOptionMaxQuantity =
                  Number.isFinite(rawSizeOptionMaxQuantity) &&
                  rawSizeOptionMaxQuantity >= 0
                    ? Math.floor(rawSizeOptionMaxQuantity)
                    : undefined;
                const sizeOptionEventDateHasPassed =
                  sizeOption.metadata?.eventDateHasPassed === true;
                const sizeOptionSoldOut = sizeOptionMaxQuantity === 0;
                const isDraftActive = Boolean(cartLine);
                const selected =
                  slideMode === "review"
                    ? true
                    : cartLine?.selected === true &&
                      (!sizeOptionSoldOut || isNurseryStockRequest);
                const isConfigurable =
                  slideMode === "review"
                    ? true
                    : isDraftActive &&
                      (!sizeOptionSoldOut || isNurseryStockRequest);
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
                const productMaxQuantity = isNurseryStockRequest
                  ? undefined
                  : product.maxOrderQuantity;
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
                const baseMainQuantityMax =
                  productMaxAccountHolderQuantity !== undefined
                    ? Math.min(
                        productMaxQuantity ?? Number.POSITIVE_INFINITY,
                        recipientReservedQuantity +
                          productMaxAccountHolderQuantity
                      )
                    : productMaxQuantity;
                const mainQuantityMax =
                  !isNurseryStockRequest && sizeOptionMaxQuantity !== undefined
                    ? Math.min(
                        baseMainQuantityMax ?? Number.POSITIVE_INFINITY,
                        sizeOptionMaxQuantity
                      )
                    : baseMainQuantityMax;
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
                  typeof cartLine?.unitPriceOverride === "number" &&
                  Number.isFinite(cartLine.unitPriceOverride)
                    ? cartLine.unitPriceOverride
                    : slideMode === "review"
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
                const ticketAddOnFootnote =
                  slideMode === "review" && resolvedLine?.ticketAddOnAttendeeName
                    ? `${resolvedLine.ticketAddOnAttendeeName} add-on`
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
                        {showReservationCountdown ? (
                          <CartItemCountdown
                            secondsRemaining={reservationSecondsRemaining}
                          />
                        ) : (
                          <span aria-hidden="true" />
                        )}
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
                      {fulfillmentLabel || ticketAddOnFootnote ? (
                        <div className={styles.cartItemFootnote}>
                          {[fulfillmentLabel, ticketAddOnFootnote]
                            .filter(Boolean)
                            .join(" - ")}
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
                        {showReservationCountdown ? (
                          <CartItemCountdown
                            secondsRemaining={reservationSecondsRemaining}
                          />
                        ) : (
                          <span aria-hidden="true" />
                        )}
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
                        disabled={sizeOptionSoldOut}
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
                            recordProductInterest(product.id, sizeOption.id);
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

                        {sizeOptionSoldOut ? (
                          <div className={styles.nurseryStockRequest}>
                            <div className={styles.soldOutLine}>
                              {sizeOptionEventDateHasPassed
                                ? "Event date has passed."
                                : "Sold out for event pickup."}
                            </div>
                            <p>
                              You can still make your order and it can be
                              delivered to you within the week, if this item is
                              available in our nursery stock.
                            </p>
                            <p>
                              Choose the quantity you would like from nursery
                              stock. Details will be made known to you when our
                              representatives reach out.
                            </p>
                            {onRequestNurseryStock ? (
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                  recordProductInterest(product.id, sizeOption.id);
                                  onRequestNurseryStock(
                                    product.id,
                                    sizeOption.id
                                  );
                                }}
                                style={{
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                }}
                              >
                                Order from nursery stock
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {isAdminUser &&
                        slideId === "plant-show-shop" &&
                        slideMode === "browse" ? (
                          <div className={styles.adminEventQuantityPanel}>
                            <label>
                              <span>Admin: event quantity remaining</span>
                              <input
                                type="number"
                                min={0}
                                value={
                                  adminQuantityDrafts[lineKey] ??
                                  String(sizeOptionMaxQuantity ?? 0)
                                }
                                onChange={(event) =>
                                  setAdminQuantityDrafts((current) => ({
                                    ...current,
                                    [lineKey]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <span>Reason for stock update</span>
                              <select
                                value={adminQuantityReasonDrafts[lineKey] ?? ""}
                                onChange={(event) =>
                                  setAdminQuantityReasonDrafts((current) => ({
                                    ...current,
                                    [lineKey]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Choose reason</option>
                                <option value="test">Test adjustment</option>
                                <option value="technical_fumble">
                                  Correction after a technical fumble
                                </option>
                                <option value="replenishment">
                                  Actual stock replenishment
                                </option>
                              </select>
                            </label>
                            <label>
                              <span>Additional notes</span>
                              <textarea
                                rows={2}
                                value={adminQuantityNoteDrafts[lineKey] ?? ""}
                                onChange={(event) =>
                                  setAdminQuantityNoteDrafts((current) => ({
                                    ...current,
                                    [lineKey]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setAdminEventQuantity(
                                  product.id,
                                  sizeOption.id,
                                  lineKey,
                                  product.title,
                                  sizeOption.label,
                                  sizeOptionMaxQuantity ?? 0
                                )
                              }
                            >
                              Update quantity
                            </button>
                            {adminQuantityMessages[lineKey] ? (
                              <div>{adminQuantityMessages[lineKey]}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    )}

                    {slideMode === "browse" ? (
                      <div className={styles.sizePurchaseBand}>
                        <div className={styles.sizePrice}>
                          {formatCurrency(sizeOption.price, catalog.currencyCode)}
                          {isNurseryStockRequest ? (
                            <span className={styles.nurseryStockPriceNote}>
                              Final availability and details confirmed by
                              representative.
                            </span>
                          ) : null}
                        </div>
                        {!sizeOptionSoldOut || isNurseryStockRequest ? (
                          <QuantityControl
                            quantity={quantity}
                            minQuantity={minimumQuantity}
                            maxQuantity={mainQuantityMax}
                            disabled={!isConfigurable}
                            onDecrease={() => {
                              recordProductInterest(product.id, sizeOption.id);
                              onSetQuantity(
                                product.id,
                                sizeOption.id,
                                quantity - 1
                              );
                            }}
                            onIncrease={() => {
                              recordProductInterest(product.id, sizeOption.id);
                              onSetQuantity(
                                product.id,
                                sizeOption.id,
                                quantity + 1
                              );
                            }}
                            theme={theme}
                          />
                        ) : null}
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

                  {slideMode === "review" &&
                  (fulfillmentLabel || ticketAddOnFootnote) ? (
                    <div className={styles.cartItemFootnote}>
                      {[fulfillmentLabel, ticketAddOnFootnote]
                        .filter(Boolean)
                        .join(" - ")}
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

function getVisibleFormFields(
  fields: FormField[],
  answers: QuestionnaireAnswers
) {
  return fields.filter((field) => {
    if (!field.showIf?.length) {
      return true;
    }

    return field.showIf.every((rule) => evaluateConditionRule(rule, answers));
  });
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

        const imageMatch = section.text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

        if (imageMatch) {
          const [, alt, src] = imageMatch;

          return (
            <img
              key={`image-${index}`}
              src={src}
              alt={alt}
              className={styles.storyInlineImage}
            />
          );
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

function hasRenderableSections(sections: SlideSection[] | undefined) {
  if (!sections?.length) return false;

  return sections.some((section) => section.type !== "break");
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
  identityVerification?: {
    id: string;
    documentType?: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    facebookUrl?: string | null;
    status: string;
    adminNotes?: string | null;
    reviewedAt?: string | null;
    submittedAt?: string | null;
  } | null;
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

type VerifiedPurchaseRecipientOption = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  confirmedName?: string | null;
  status: string;
};

function TicketPurchaseAssistantRenderer({
  step,
  catalog,
  mealMenu,
  answers,
  currencyCode,
  usdToCurrencyRate,
  purchaserName,
  purchaserEmail,
  theme,
  onPatch,
  onCommit,
  onCommitTarget,
  onAdvanceMealLoop,
  onGoto,
}: {
  step: string;
  catalog: ShopCatalog | null;
  mealMenu: MealMenu | null;
  answers: QuestionnaireAnswers;
  currencyCode: string;
  usdToCurrencyRate: number;
  purchaserName: string;
  purchaserEmail: string;
  theme: ThemeConfig;
  onPatch: (patch: QuestionnaireAnswers) => void;
  onCommit: () => void;
  onCommitTarget: (target: string, attendeeIndex?: number) => void;
  onAdvanceMealLoop: () => void;
  onGoto: (target: string) => void;
}) {
  const products = getTicketAssistantEventProducts(catalog);
  const selectedProduct = getTicketAssistantProduct(
    catalog,
    answers.ticketAssistantEventProductId
  );
  const quantity = getTicketAssistantQuantity(answers);
  const slots = getTicketAssistantSlots(answers, quantity);
  const selectedEventProductId = String(
    answers.ticketAssistantEventProductId ?? ""
  );

  function patchSlot(index: number, patch: Partial<TicketAssistantSlot>) {
    onPatch({
      ticketAssistantSlots: updateTicketAssistantSlot(answers, index, patch),
    });
  }

  function stopAssistantInputKeyPropagation(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    event.stopPropagation();
  }

  function renderSaveProgress() {
    return null;
  }

  function getActiveMealAssignment() {
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const assignments = normalizeTicketAssignments(answers.ticketAssignments);

    return assignments[activeIndex] ?? null;
  }

  function getMealSummaryLines() {
    const assignment = getActiveMealAssignment();
    const selection = assignment?.mealSelection;

    if (!selection || !mealMenu) {
      return [];
    }

    return mealMenu.groups.flatMap((group) => {
      const groupSelection = selection[group.id] ?? {};

      return group.options
        .map((option) => {
          const quantity = Number(groupSelection[option.id] ?? 0);

          if (!Number.isFinite(quantity) || quantity <= 0) {
            return null;
          }

          return `${group.label}: ${option.label} x ${quantity}`;
        })
        .filter(Boolean) as string[];
    });
  }

  if (!products.length) {
    return (
      <div style={ticketAssistantStyles.panel}>
        <strong>No ticket events are available yet.</strong>
      </div>
    );
  }

  if (step === "ticket-assistant-event") {
    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.eventGrid}>
          {products.map((product) => {
            const isSelected = selectedEventProductId === product.id;
            const maxQuantity = getTicketAssistantMaxQuantity(product);
            const eventDescription =
              product.detailsDescription ?? product.description ?? "";

            return (
              <div
                key={product.id}
                style={{
                  ...ticketAssistantStyles.eventCard,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <div style={ticketAssistantStyles.eventHeroWrap}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      style={ticketAssistantStyles.eventHeroImage}
                    />
                  ) : (
                    <div style={ticketAssistantStyles.eventHeroFallback}>
                      {product.title.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div style={ticketAssistantStyles.eventCardBody}>
                  <strong style={ticketAssistantStyles.eventTitle}>
                    {product.title}
                  </strong>
                  {product.eventVenueLabel ? (
                    <span>{product.eventVenueLabel}</span>
                  ) : null}
                  {product.eventAddress ? <span>{product.eventAddress}</span> : null}
                  {product.eventDateLabel ? <span>{product.eventDateLabel}</span> : null}
                  {product.eventTimeLabel ? (
                    <span>Show starts at {product.eventTimeLabel}</span>
                  ) : null}
                  {eventDescription ? (
                    <p style={ticketAssistantStyles.eventDescription}>
                      {eventDescription}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      onPatch({
                        ticketAssistantEventProductId: product.id,
                        ticketAssistantQuantity: Math.min(quantity, maxQuantity),
                        guidedTicketPurchaseType:
                          quantity > 1 ? "multiple" : "single",
                        ticketAssistantSlots: getTicketAssistantSlots(
                          answers,
                          Math.min(quantity, maxQuantity)
                        ).map((slot) => ({
                          ...slot,
                          sizeOptionId: product.sizeOptions[0]?.id ?? "",
                          purchaseModeId: getTicketAssistantPurchaseMode(
                            product.sizeOptions[0],
                            undefined
                          )?.id,
                          deliveryModeId: getTicketAssistantDeliveryMode(
                            product.sizeOptions[0],
                            undefined
                          )?.id,
                        })),
                      })
                    }
                    style={{
                      ...ticketAssistantStyles.chooseButton,
                      background: isSelected ? theme.colors.primary : "#fffdfa",
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      color: isSelected ? "#fff" : theme.colors.text,
                    }}
                  >
                    {isSelected ? "Chosen Event" : "Choose This Event"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div style={ticketAssistantStyles.panel}>
        Choose an event before continuing.
      </div>
    );
  }

  if (step === "ticket-assistant-quantity") {
    const maxQuantity = getTicketAssistantMaxQuantity(selectedProduct);
    const purchaseType = String(answers.guidedTicketPurchaseType ?? "");
    const isMultiple = purchaseType === "multiple";
    const canBuyMultiple = maxQuantity > 1;

    return (
      <div style={ticketAssistantStyles.stack}>
        <button
          type="button"
          style={{
            ...ticketAssistantStyles.option,
            borderColor:
              purchaseType === "single"
                ? theme.colors.primary
                : theme.colors.border,
          }}
          onClick={() =>
            onPatch({
              guidedTicketPurchaseType: "single",
              ticketAssistantQuantity: 1,
            })
          }
        >
          <span style={ticketAssistantStyles.radioLine}>
            <input
              type="radio"
              readOnly
              checked={purchaseType === "single"}
            />
            <strong>Single Ticket</strong>
          </span>
          <span>One ticket for the account holder.</span>
        </button>

        <button
          type="button"
          disabled={!canBuyMultiple}
          style={{
            ...ticketAssistantStyles.option,
            borderColor:
              purchaseType === "multiple"
                ? theme.colors.primary
                : theme.colors.border,
            opacity: canBuyMultiple ? 1 : 0.55,
          }}
          onClick={() =>
            canBuyMultiple
              ? onPatch({
                  guidedTicketPurchaseType: "multiple",
                  ticketAssistantQuantity: Math.max(2, quantity),
                })
              : undefined
          }
        >
          <span style={ticketAssistantStyles.radioLine}>
            <input
              type="radio"
              readOnly
              checked={purchaseType === "multiple"}
              disabled={!canBuyMultiple}
            />
            <strong>Multiple Tickets</strong>
          </span>
          <span>
            You may purchase up to {maxQuantity} tickets for this event.
          </span>
        </button>

        {isMultiple ? (
          <div style={ticketAssistantStyles.panel}>
            <div style={ticketAssistantStyles.row}>
              <strong>Ticket quantity</strong>
              <div style={ticketAssistantStyles.quantityRow}>
                <button
                  type="button"
                  style={ticketAssistantStyles.smallButton}
                  onClick={() =>
                    onPatch({
                      ticketAssistantQuantity: Math.max(2, quantity - 1),
                    })
                  }
                >
                  -
                </button>
                <strong>{Math.max(2, quantity)}</strong>
                <button
                  type="button"
                  style={ticketAssistantStyles.smallButton}
                  onClick={() =>
                    onPatch({
                      ticketAssistantQuantity: Math.min(maxQuantity, quantity + 1),
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div style={ticketAssistantStyles.meta}>
              This limit is calculated from the selected event's purchase rules.
            </div>
          </div>
        ) : null}

        {purchaseType === "single" ? (
          <div style={ticketAssistantStyles.meta}>
            Continue will use the logged-in/account holder details for this
            ticket.
          </div>
        ) : null}
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-prep") {
    const maxAccountHolderQuantity = selectedProduct.maxAccountHolderQuantity ?? 1;
    const needsSeparateAttendeeDetails = quantity > maxAccountHolderQuantity;
    const hasPhoneRequirement = false;
    const hasIdentitySensitiveOptions =
      selectedProduct.sizeOptions.some((sizeOption) =>
        (sizeOption.purchaseModes ?? []).some((mode) =>
          /vip|meet|greet|alcohol|restricted|age/i.test(mode.label)
        )
      ) || /vip|meet|greet|alcohol|restricted|age/i.test(selectedProduct.title);

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>Collecting attendee information now makes checkout faster.</strong>
          <div style={ticketAssistantStyles.checkList}>
            <span>✓ The correct name for each attendee.</span>
            <span>✓ The email address for every attendee that requires one.</span>
            <span>
              ✓ A telephone number {hasPhoneRequirement ? "if required." : "if the event requires it."}
            </span>
          </div>
          <div style={ticketAssistantStyles.meta}>
            {needsSeparateAttendeeDetails
              ? "Based on this event's settings, some attendee slots may need their own name or email address."
              : "Based on this event's settings, this order may be allowed under the account holder without a separate email for every ticket."}
          </div>
        </div>

        <div style={ticketAssistantStyles.panel}>
          <strong>Identity verification</strong>
          <div style={ticketAssistantStyles.meta}>
            Some event features can require identity verification, including
            alcohol purchases, VIP access, Meet & Greet verification, and other
            age-restricted or identity-restricted features.
          </div>
          <div style={ticketAssistantStyles.checkList}>
            <span>✓ Attendee names should match government-issued ID.</span>
            <span>✓ Attendees may be asked to present ID at the event.</span>
            <span>✓ ID upload is optional during purchase unless the event requires it.</span>
          </div>
          <div style={ticketAssistantStyles.meta}>
            {hasIdentitySensitiveOptions
              ? "This event has options that may use identity verification. If ID is not provided during checkout, the attendee can complete verification later when that workflow is available."
              : "If identity verification is needed later, the attendee can complete it after checkout when the event supports that workflow."}
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-how-works") {
    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <ol style={ticketAssistantStyles.orderedList}>
            <li>Enter attendee information.</li>
            <li>Choose ticket types.</li>
            <li>Choose invitation upgrades.</li>
            <li>Decide who will select and pay for meals and add-ons.</li>
            <li>Review your cart.</li>
            <li>Complete payment.</li>
          </ol>
          <div style={ticketAssistantStyles.meta}>
            If you are not ready to finish now, save your progress and continue
            later from My Tickets.
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-account-holder") {
    const slot = slots[0];

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>This is your ticket</strong>
          <div style={ticketAssistantStyles.meta}>
            Your legal name should match your government-issued identification
            if you intend to use event features that require identity verification.
          </div>
          <label style={ticketAssistantStyles.label}>
            Legal name
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              required
              value={slot.name || purchaserName}
              onChange={(event) => {
                const value = event.target.value;
                onPatch({
                  fullName: value,
                  ticketAssistantSlots: updateTicketAssistantSlot(answers, 0, {
                    name: value,
                    isPurchaser: true,
                  }),
                });
              }}
            />
          </label>
          <label style={ticketAssistantStyles.label}>
            Email address
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              type="email"
              required
              value={slot.email || purchaserEmail}
              onChange={(event) => {
                const value = event.target.value;
                onPatch({
                  email: value,
                  ticketAssistantSlots: updateTicketAssistantSlot(answers, 0, {
                    email: value,
                    isPurchaser: true,
                  }),
                });
              }}
            />
          </label>
          <label style={ticketAssistantStyles.label}>
            Telephone number
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              type="tel"
              value={slot.phone || ""}
              onChange={(event) => {
                const value = event.target.value;
                onPatch({
                  phone: value,
                  ticketAssistantSlots: updateTicketAssistantSlot(answers, 0, {
                    phone: value,
                    isPurchaser: true,
                  }),
                });
              }}
            />
          </label>
          <label style={ticketAssistantStyles.label}>
            Name to print on ticket
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              value={slot.printedName || ""}
              placeholder={slot.name || purchaserName || "Optional"}
              onChange={(event) =>
                patchSlot(0, {
                  printedName: event.target.value,
                  isPurchaser: true,
                })
              }
            />
          </label>
          <div style={ticketAssistantStyles.meta}>
            The printed ticket name may be different from the legal name.
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-owner-loop") {
    if (quantity <= 1) {
      return (
        <div style={ticketAssistantStyles.stack}>
          <div style={ticketAssistantStyles.panel}>
            <strong>Attendee information complete.</strong>
            <div style={ticketAssistantStyles.meta}>
              Continue to choose the ticket type for this attendee.
            </div>
          </div>
          {renderSaveProgress()}
        </div>
      );
    }

    const activeIndex = getTicketAssistantActiveOwnerIndex(answers, quantity);
    const slot = slots[activeIndex];
    const canBePlusOne = canTicketAssistantSlotBePlusOne({
      product: selectedProduct,
      slots,
      index: activeIndex,
    });
    const plusOneHostSlot =
      activeIndex < getTicketAssistantAccountHolderAllowance(selectedProduct)
        ? slots[0]
        : slots[activeIndex - 1];
    const plusOneHostName = [
      plusOneHostSlot?.name ||
        (plusOneHostSlot?.isPurchaser ? purchaserName : "") ||
        "this attendee",
      plusOneHostSlot?.printedName
        ? `(${plusOneHostSlot.printedName})`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const emailRequired = isTicketAssistantEmailRequired({
      product: selectedProduct,
      slots,
      slot,
      index: activeIndex,
    });
    const currentAttendeeError = getTicketAssistantSlotValidationError({
      product: selectedProduct,
      slots,
      index: activeIndex,
    });

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>Ticket #{activeIndex + 1} Attendee</strong>
          <div style={ticketAssistantStyles.attendeeNavRow}>
            <button
              type="button"
              style={{
                ...ticketAssistantStyles.attendeeNavButton,
                opacity: activeIndex <= 1 ? 0.5 : 1,
              }}
              disabled={activeIndex <= 1}
              onClick={() =>
                onPatch({
                  ticketAssistantActiveOwnerIndex: Math.max(1, activeIndex - 1),
                })
              }
            >
              Previous Attendee
            </button>
            {activeIndex < quantity - 1 ? (
              <button
                type="button"
                style={{
                  ...ticketAssistantStyles.attendeeNavButton,
                  opacity: currentAttendeeError ? 0.65 : 1,
                }}
                disabled={Boolean(currentAttendeeError)}
                onClick={() => {
                  if (currentAttendeeError) {
                    return;
                  }

                  onPatch({
                    ticketAssistantActiveOwnerIndex: Math.min(
                      quantity - 1,
                      activeIndex + 1
                    ),
                  });
                }}
              >
                Next Attendee
              </button>
            ) : null}
          </div>
          {currentAttendeeError ? (
            <div style={ticketAssistantStyles.attendeeMissingNote}>
              {currentAttendeeError}
            </div>
          ) : null}
          {canBePlusOne ? (
            <label style={ticketAssistantStyles.checkboxLabel}>
              <input
                type="checkbox"
                checked={slot.isPlusOne}
                onChange={(event) =>
                  patchSlot(activeIndex, {
                    isPlusOne: event.target.checked,
                    isPurchaser: false,
                  })
                }
              />
              This is {plusOneHostName}'s plus one
            </label>
          ) : null}
          <label style={ticketAssistantStyles.label}>
            Legal name
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              required
              value={slot.name}
              onChange={(event) =>
                patchSlot(activeIndex, {
                  name: event.target.value,
                  isPurchaser: false,
                })
              }
            />
          </label>
          <label style={ticketAssistantStyles.label}>
            Name to print on ticket
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              value={slot.printedName}
              placeholder={slot.name || "Optional"}
              onChange={(event) =>
                patchSlot(activeIndex, {
                  printedName: event.target.value,
                  isPurchaser: false,
                })
              }
            />
          </label>
          {emailRequired ? (
            <label style={ticketAssistantStyles.label}>
              Email address
              <input
                style={ticketAssistantStyles.input}
                onKeyDown={stopAssistantInputKeyPropagation}
                type="email"
                required
                value={slot.email}
                onChange={(event) =>
                  patchSlot(activeIndex, {
                    email: event.target.value,
                    isPurchaser: false,
                  })
                }
              />
            </label>
          ) : (
            <div style={ticketAssistantStyles.meta}>
              This plus-one slot does not require an email address unless the
              event settings require one later.
            </div>
          )}
          <label style={ticketAssistantStyles.label}>
            Telephone number
            <input
              style={ticketAssistantStyles.input}
              onKeyDown={stopAssistantInputKeyPropagation}
              type="tel"
              value={slot.phone}
              onChange={(event) =>
                patchSlot(activeIndex, {
                  phone: event.target.value,
                  isPurchaser: false,
                })
              }
            />
          </label>
          <div style={ticketAssistantStyles.meta}>
            Attendee {activeIndex} of {quantity - 1} additional attendees.
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-ticket-types") {
    return (
      <div style={ticketAssistantStyles.stack}>
        {slots.map((slot, index) => {
          if (
            getTicketAssistantPlusOneHostIndex({
              product: selectedProduct,
              slots,
              index,
            }) !== null
          ) {
            return null;
          }

          const plusOneIndex = slots.findIndex(
            (_candidate, candidateIndex) =>
              getTicketAssistantPlusOneHostIndex({
                product: selectedProduct,
                slots,
                index: candidateIndex,
              }) === index
          );
          const groupIndexes =
            plusOneIndex >= 0 ? [index, plusOneIndex] : [index];

          return (
            <div key={index} style={ticketAssistantStyles.groupPanel}>
              {groupIndexes.map((groupIndex) => {
                const slot = slots[groupIndex];
          const hostIndex = getTicketAssistantPlusOneHostIndex({
            product: selectedProduct,
            slots,
            index: groupIndex,
          });
          const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
          const hostName = getTicketAssistantDisplayName(
            hostSlot,
            hostIndex === null
              ? "this attendee"
              : hostIndex === 0
                ? purchaserName || "you"
                : `Attendee ${hostIndex + 1}`
          );
          const inheritedSizeOption = getTicketAssistantSizeOption(
            selectedProduct,
            hostSlot?.sizeOptionId
          );

          return (
            <div
              key={groupIndex}
              style={
                hostIndex !== null
                  ? ticketAssistantStyles.plusOnePanel
                  : ticketAssistantStyles.groupMainPanel
              }
            >
              <strong>{getTicketAssistantDisplayName(slot, groupIndex === 0 ? purchaserName : `Attendee ${groupIndex + 1}`)}</strong>
              {hostIndex !== null ? (
                <div style={ticketAssistantStyles.inheritedPanel}>
                  <ul style={ticketAssistantStyles.inheritedList}>
                    <li>This attendee is {hostName}'s plus one.</li>
                    <li>
                      Ticket type:{" "}
                      <strong>
                        {inheritedSizeOption?.label ?? "Match host attendee"}
                      </strong>
                    </li>
                  </ul>
                </div>
              ) : (
                selectedProduct.sizeOptions.map((sizeOption) => (
                  <button
                    key={sizeOption.id}
                    type="button"
                    style={{
                      ...ticketAssistantStyles.option,
                      borderColor:
                        slot.sizeOptionId === sizeOption.id
                          ? theme.colors.primary
                          : theme.colors.border,
                    }}
                    onClick={() =>
                      patchSlot(index, {
                        sizeOptionId: sizeOption.id,
                        purchaseModeId: getTicketAssistantPurchaseMode(
                          sizeOption,
                          undefined
                        )?.id,
                        deliveryModeId: getTicketAssistantDeliveryMode(
                          sizeOption,
                          undefined
                        )?.id,
                      })
                    }
                  >
                    <span style={ticketAssistantStyles.radioLine}>
                      <input
                        type="radio"
                        readOnly
                        checked={slot.sizeOptionId === sizeOption.id}
                      />
                      <strong>{sizeOption.label}</strong>
                    </span>
                    <span>{formatCurrency(sizeOption.price, currencyCode)}</span>
                  </button>
                ))
              )}
            </div>
          );
              })}
            </div>
          );
        })}
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-upgrades") {
    return (
      <div style={ticketAssistantStyles.stack}>
        {slots.map((slot, index) => {
          if (
            getTicketAssistantPlusOneHostIndex({
              product: selectedProduct,
              slots,
              index,
            }) !== null
          ) {
            return null;
          }

          const plusOneIndex = slots.findIndex(
            (_candidate, candidateIndex) =>
              getTicketAssistantPlusOneHostIndex({
                product: selectedProduct,
                slots,
                index: candidateIndex,
              }) === index
          );
          const groupIndexes =
            plusOneIndex >= 0 ? [index, plusOneIndex] : [index];

          return (
            <div key={index} style={ticketAssistantStyles.groupPanel}>
              {groupIndexes.map((groupIndex) => {
                const slot = slots[groupIndex];
          const hostIndex = getTicketAssistantPlusOneHostIndex({
            product: selectedProduct,
            slots,
            index: groupIndex,
          });
          const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
          const sizeOption = getTicketAssistantSizeOption(
            selectedProduct,
            hostSlot?.sizeOptionId ?? slot.sizeOptionId
          );
          const upgradeModes = getTicketAssistantUpgradeModes(sizeOption);
          const deliveryModes = getTicketAssistantDeliveryModes(sizeOption);
          const selectedUpgradeId =
            slot.purchaseModeId ||
            getTicketAssistantPurchaseMode(sizeOption, slot.purchaseModeId)?.id;
          const selectedDeliveryId =
            hostSlot?.deliveryModeId ||
            slot.deliveryModeId ||
            getTicketAssistantDeliveryMode(sizeOption, slot.deliveryModeId)?.id;
          const hostName = getTicketAssistantDisplayName(
            hostSlot,
            hostIndex === null
              ? "this attendee"
              : hostIndex === 0
                ? purchaserName || "you"
                : `Attendee ${hostIndex + 1}`
          );

          return (
            <div
              key={groupIndex}
              style={
                hostIndex !== null
                  ? ticketAssistantStyles.plusOnePanel
                  : ticketAssistantStyles.groupMainPanel
              }
            >
              <strong>{getTicketAssistantDisplayName(slot, groupIndex === 0 ? purchaserName : `Attendee ${groupIndex + 1}`)}</strong>
              {hostIndex !== null ? (
                <div style={ticketAssistantStyles.inheritedPanel}>
                  <ul style={ticketAssistantStyles.inheritedList}>
                    <li>This attendee is {hostName}'s plus one.</li>
                    <li>Invitation format follows {hostName}'s selection.</li>
                    <li>Mailing address follows {hostName}'s selection.</li>
                  </ul>
                </div>
              ) : null}
              {hostIndex === null && deliveryModes.length ? (
                <div style={ticketAssistantStyles.optionGroup}>
                  <strong>Invitation format</strong>
                  {deliveryModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      style={{
                        ...ticketAssistantStyles.option,
                        borderColor:
                          selectedDeliveryId === mode.id
                            ? theme.colors.primary
                            : theme.colors.border,
                      }}
                      onClick={() => patchSlot(groupIndex, { deliveryModeId: mode.id })}
                    >
                      <span style={ticketAssistantStyles.radioLine}>
                        <input
                          type="radio"
                          readOnly
                          checked={selectedDeliveryId === mode.id}
                        />
                        <strong>{mode.label}</strong>
                      </span>
                      {mode.priceAdjustment > 0 ? (
                        <span>+{formatCurrency(mode.priceAdjustment, currencyCode)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {!upgradeModes.length ? (
                <div style={ticketAssistantStyles.meta}>No invitation upgrade choices for this ticket.</div>
              ) : (
                <div style={ticketAssistantStyles.optionGroup}>
                  <strong>Invitation upgrade</strong>
                  {upgradeModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      style={{
                        ...ticketAssistantStyles.option,
                        borderColor:
                          selectedUpgradeId === mode.id
                            ? theme.colors.primary
                            : theme.colors.border,
                      }}
                      onClick={() => patchSlot(groupIndex, { purchaseModeId: mode.id })}
                    >
                      <span style={ticketAssistantStyles.radioLine}>
                        <input
                          type="radio"
                          readOnly
                          checked={selectedUpgradeId === mode.id}
                        />
                        <strong>{mode.label}</strong>
                      </span>
                      {mode.priceAdjustment > 0 ? (
                        <span>+{formatCurrency(mode.priceAdjustment, currencyCode)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
              {hostIndex === null && selectedDeliveryId === "physical-invitation" ? (
                <div style={ticketAssistantStyles.addressGrid}>
                  <label style={ticketAssistantStyles.label}>
                    Mailing address
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingAddressLine1}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingAddressLine1: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label style={ticketAssistantStyles.label}>
                    Address line 2
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingAddressLine2}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingAddressLine2: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label style={ticketAssistantStyles.label}>
                    City / Town
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingCity}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingCity: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label style={ticketAssistantStyles.label}>
                    Parish / Region
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingRegion}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingRegion: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label style={ticketAssistantStyles.label}>
                    Postal code
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingPostalCode}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingPostalCode: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label style={ticketAssistantStyles.label}>
                    Country
                    <input
                      style={ticketAssistantStyles.input}
                      onKeyDown={stopAssistantInputKeyPropagation}
                      value={slot.mailingCountry}
                      onChange={(event) =>
                        patchSlot(groupIndex, {
                          mailingCountry: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
              })}
            </div>
          );
        })}
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-meal-confirmation") {
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const assignment = getActiveMealAssignment();
    const slot = slots[activeIndex];
    const label =
      assignment?.ownerName ||
      getTicketAssistantDisplayName(
        slot,
        activeIndex === 0
          ? purchaserName || "your ticket"
          : `Attendee ${activeIndex + 1}`
      );
    const mealSummaryLines = getMealSummaryLines();

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>{label}'s Ticket</strong>
          <div style={ticketAssistantStyles.inheritedPanel}>
            <ul style={ticketAssistantStyles.inheritedList}>
              <li>
                {mealSummaryLines.length
                  ? "Your meal selection has been saved successfully."
                  : "No meal selection has been saved yet."}
              </li>
              <li>
                You may change your meal until the event meal change deadline.
              </li>
            </ul>
          </div>
          {mealSummaryLines.length ? (
            <div style={ticketAssistantStyles.optionGroup}>
              <strong>Selected meal</strong>
              <ul style={ticketAssistantStyles.inheritedList}>
                {mealSummaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={ticketAssistantStyles.meta}>
              No meal item is selected yet.
            </div>
          )}
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-collectibles-intro") {
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const assignment = getActiveMealAssignment();
    const slot = slots[activeIndex];
    const label =
      assignment?.ownerName ||
      getTicketAssistantDisplayName(
        slot,
        activeIndex === 0
          ? purchaserName || "your ticket"
          : `Attendee ${activeIndex + 1}`
      );

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>{label}'s Collectibles & Souvenirs</strong>
          <div style={ticketAssistantStyles.inheritedPanel}>
            <ul style={ticketAssistantStyles.inheritedList}>
              <li>
                Next, you may choose optional collectibles, souvenirs,
                merchandise, music, and other event add-ons.
              </li>
              <li>
                Only inventory selected for ticket add-ons is shown in this
                step.
              </li>
              <li>
                For in-person events, items should be collected at the event.
                Mailing after the event may be available and may incur delivery
                costs if items are not picked up.
              </li>
              <li>
                For livestream events, physical items will be delivered to the
                attendee's mailing address and may incur delivery costs.
              </li>
            </ul>
          </div>
          <label style={ticketAssistantStyles.checkboxLabel}>
            <input
              type="checkbox"
              checked={slot?.skipCollectiblesForNow === true}
              onChange={(event) =>
                patchSlot(activeIndex, {
                  skipCollectiblesForNow: event.target.checked,
                })
              }
            />
            Skip collectibles and souvenirs for now
          </label>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-meal-intro") {
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const slot = slots[activeIndex];
    const label = getTicketAssistantDisplayName(
      slot,
      activeIndex === 0
        ? purchaserName || "your ticket"
        : `Attendee ${activeIndex + 1}`
    );
    const hostIndex = getTicketAssistantPlusOneHostIndex({
      product: selectedProduct,
      slots,
      index: activeIndex,
    });
    const hostSlot = hostIndex === null ? undefined : slots[hostIndex];
    const isPurchaserHandled =
      activeIndex === 0 ||
      (slot.mealResponsibilitySelected &&
        slot.ownerMode === "purchaser_pays_ticket_and_addons") ||
      (hostIndex !== null &&
        (hostIndex === 0 ||
          hostSlot?.mealResponsibilitySelected === true) &&
        (hostSlot?.ownerMode ?? "purchaser_pays_ticket_and_addons") ===
          "purchaser_pays_ticket_and_addons");
    const isDelegatedPlusOne = hostIndex !== null && !isPurchaserHandled;
    const introText =
      activeIndex === 0
        ? "On the next page you will choose your meal."
        : hostIndex === 0
          ? "On the next page you will choose a meal for your plus one."
          : hostIndex !== null
            ? `On the next page you will choose a meal for ${getTicketAssistantDisplayName(
                hostSlot,
                "this attendee"
              )}'s plus one.`
            : `On the next page you will choose a meal for ${label}.`;

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>{label}'s Ticket</strong>
          {isPurchaserHandled ? (
            <>
              <div style={ticketAssistantStyles.meta}>
                {introText}
              </div>
              <label style={ticketAssistantStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={slot?.skipMealForNow === true}
                  onChange={(event) =>
                    patchSlot(activeIndex, {
                      skipMealForNow: event.target.checked,
                    })
                  }
                />
                Skip meal selection for now
              </label>
            </>
          ) : isDelegatedPlusOne ? (
            <>
              <div style={ticketAssistantStyles.inheritedPanel}>
                <ul style={ticketAssistantStyles.inheritedList}>
                  <li>This attendee is a plus one.</li>
                  <li>Meal and add-on responsibility follows the main attendee.</li>
                  <li>They can complete selections later from their attendee portal.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div style={ticketAssistantStyles.meta}>
                First, choose who will handle meals and add-ons for this attendee.
              </div>
            </>
          )}
          <div style={ticketAssistantStyles.meta}>
            Attendee {activeIndex + 1} of {quantity}.
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  if (step === "ticket-assistant-meal-responsibility") {
    const activeIndex = getTicketAssistantActiveMealIndex(answers, quantity);
    const slot = slots[activeIndex];
    const label = getTicketAssistantDisplayName(
      slot,
      activeIndex === 0
        ? purchaserName || "your ticket"
        : `Attendee ${activeIndex + 1}`
    );
    const options: Array<[TicketAssistantOwnerMode, string]> = [
      [
        "purchaser_pays_ticket_and_addons",
        "I will choose this attendee's meals and add-ons.",
      ],
      [
        "owner_selects_sender_pays_addons",
        "I will set a budget and let this attendee choose later.",
      ],
    ];
    const budgetChoices = getTicketOwnerAddonBudgetChoices(usdToCurrencyRate);
    const customBudgetMinimum = budgetChoices[1]?.value ?? 10;
    const selectedBudgetChoice =
      slot.budgetChoiceId ||
      budgetChoices.find((choice) => Math.abs(choice.value - slot.budget) < 0.01)
        ?.id ||
      (slot.budget >= customBudgetMinimum ? "custom" : "owner-pays");
    const isBudgetMode =
      slot.ownerMode === "owner_selects_sender_pays_addons" ||
      slot.ownerMode === "owner_pays_addons";

    return (
      <div style={ticketAssistantStyles.stack}>
        <div style={ticketAssistantStyles.panel}>
          <strong>Meals & Add-ons for {label}</strong>
          <div style={ticketAssistantStyles.optionGroup}>
            {options.map(([value, text]) => (
              <button
                key={value}
                type="button"
                style={{
                  ...ticketAssistantStyles.option,
                  borderColor:
                    slot.ownerMode === value
                      ? theme.colors.primary
                        : theme.colors.border,
                }}
                onClick={() => {
                  patchSlot(activeIndex, {
                    ownerMode: value,
                    mealResponsibilitySelected:
                      value === "purchaser_pays_ticket_and_addons",
                    budget:
                      value === "owner_selects_sender_pays_addons"
                        ? slot.budget
                        : 0,
                    budgetChoiceId:
                      value === "owner_selects_sender_pays_addons"
                        ? selectedBudgetChoice
                        : undefined,
                  });
                }}
              >
                <span style={ticketAssistantStyles.radioLine}>
                  <input
                    type="radio"
                    readOnly
                    checked={
                      value === "purchaser_pays_ticket_and_addons"
                        ? slot.ownerMode === value &&
                          slot.mealResponsibilitySelected
                        : isBudgetMode
                    }
                  />
                  <span>{text}</span>
                </span>
              </button>
            ))}
          </div>

          {isBudgetMode ? (
            <div style={ticketAssistantStyles.budgetPanel}>
              <strong>Add-on budget for {label}</strong>
              <div style={ticketAssistantStyles.optionGroup}>
                <button
                  type="button"
                  style={{
                    ...ticketAssistantStyles.option,
                    borderColor:
                      selectedBudgetChoice === "owner-pays"
                        ? theme.colors.primary
                        : theme.colors.border,
                  }}
                  onClick={() =>
                    patchSlot(activeIndex, {
                      ownerMode: "owner_pays_addons",
                      mealResponsibilitySelected: true,
                      budget: 0,
                      budgetChoiceId: "owner-pays",
                    })
                  }
                >
                  <span style={ticketAssistantStyles.radioLine}>
                    <input
                      type="radio"
                      readOnly
                      checked={selectedBudgetChoice === "owner-pays"}
                    />
                    <span>
                      {formatCurrency(0, currencyCode)}, {label} will pay for
                      own add-ons in full
                    </span>
                  </span>
                </button>

                {budgetChoices.slice(1).map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    style={{
                      ...ticketAssistantStyles.option,
                      borderColor:
                        selectedBudgetChoice === choice.id
                          ? theme.colors.primary
                          : theme.colors.border,
                    }}
                    onClick={() =>
                      patchSlot(activeIndex, {
                        ownerMode: "owner_selects_sender_pays_addons",
                        mealResponsibilitySelected: true,
                        budget: choice.value,
                        budgetChoiceId: choice.id,
                      })
                    }
                  >
                    <span style={ticketAssistantStyles.radioLine}>
                      <input
                        type="radio"
                        readOnly
                        checked={selectedBudgetChoice === choice.id}
                      />
                      <span>{formatCurrency(choice.value, currencyCode)}</span>
                    </span>
                  </button>
                ))}

                <label
                  style={{
                    ...ticketAssistantStyles.option,
                    borderColor:
                      selectedBudgetChoice === "custom"
                        ? theme.colors.primary
                        : theme.colors.border,
                  }}
                >
                  <span style={ticketAssistantStyles.radioLine}>
                    <input
                      type="radio"
                      readOnly
                      checked={selectedBudgetChoice === "custom"}
                      onFocus={() =>
                        patchSlot(activeIndex, {
                          ownerMode: "owner_selects_sender_pays_addons",
                          mealResponsibilitySelected: true,
                          budget: slot.budget > 0 ? slot.budget : 0,
                          budgetChoiceId: "custom",
                        })
                      }
                      onClick={() =>
                        patchSlot(activeIndex, {
                          ownerMode: "owner_selects_sender_pays_addons",
                          mealResponsibilitySelected: true,
                          budget: slot.budget > 0 ? slot.budget : 0,
                          budgetChoiceId: "custom",
                        })
                      }
                    />
                    <span>Custom budget</span>
                  </span>
                  <input
                    style={ticketAssistantStyles.input}
                    type="number"
                    min={customBudgetMinimum}
                    step="0.01"
                    value={
                      selectedBudgetChoice === "custom" && slot.budget > 0
                        ? slot.budget
                        : ""
                    }
                    placeholder={`Minimum ${formatCurrency(
                      customBudgetMinimum,
                      currencyCode
                    )}`}
                    onFocus={() =>
                      patchSlot(activeIndex, {
                        ownerMode: "owner_selects_sender_pays_addons",
                        mealResponsibilitySelected: true,
                        budget: slot.budget > 0 ? slot.budget : 0,
                        budgetChoiceId: "custom",
                      })
                    }
                    onKeyDown={stopAssistantInputKeyPropagation}
                    onChange={(event) => {
                      const rawValue = event.target.value.trim();
                      const nextBudget =
                        rawValue === "" ? 0 : Number(rawValue);

                      patchSlot(activeIndex, {
                        ownerMode: "owner_selects_sender_pays_addons",
                        mealResponsibilitySelected: true,
                        budget: Number.isFinite(nextBudget)
                          ? Math.max(0, nextBudget)
                          : 0,
                        budgetChoiceId: "custom",
                      });
                    }}
                    onBlur={(event) => {
                      const nextBudget = Number(event.target.value || 0);

                      if (
                        Number.isFinite(nextBudget) &&
                        nextBudget > 0 &&
                        nextBudget < customBudgetMinimum
                      ) {
                        patchSlot(activeIndex, {
                          ownerMode: "owner_selects_sender_pays_addons",
                          mealResponsibilitySelected: true,
                          budget: customBudgetMinimum,
                          budgetChoiceId: "custom",
                        });
                      }
                    }}
                  />
                </label>
              </div>
              <div style={ticketAssistantStyles.meta}>
                Custom budgets must be at least{" "}
                {formatCurrency(customBudgetMinimum, currencyCode)}.
              </div>
            </div>
          ) : null}
          {!isBudgetMode ? (
            <div style={ticketAssistantStyles.meta}>
              Selecting the first option moves this attendee to meal selection.
            </div>
          ) : null}
          <div style={ticketAssistantStyles.meta}>
            Attendee {activeIndex + 1} of {quantity}.
          </div>
        </div>
        {renderSaveProgress()}
      </div>
    );
  }

  return null;
}

function MyTicketsDashboardRenderer({
  theme,
  catalog,
  onGoto,
}: {
  theme: ThemeConfig;
  catalog: ShopCatalog | null;
  onGoto: (target: string) => void;
}) {
  const [draftVersion, setDraftVersion] = useState(0);
  const drafts = useMemo(
    () =>
      Object.entries(readTicketAssistantEventDrafts())
        .map(([eventId, draft]) => ({ eventId, draft }))
        .filter(({ draft }) => isMeaningfulTicketAssistantDraft(draft))
        .sort((first, second) => {
          const firstTime = new Date(
            String(first.draft.ticketAssistantDraftSavedAt ?? "")
          ).getTime();
          const secondTime = new Date(
            String(second.draft.ticketAssistantDraftSavedAt ?? "")
          ).getTime();

          return (secondTime || 0) - (firstTime || 0);
        }),
    [draftVersion]
  );

  function resumeAssistantDraft(draft: QuestionnaireAnswers) {
    writeCheckoutDraft("ticket-purchase-assistant", draft);
    const lastSlide = String(draft.ticketAssistantLastSlide ?? "").trim();

    onGoto(
      `/questionnaire/ticket-purchase-assistant?resumePurchase=1&slide=${encodeURIComponent(
        lastSlide || "ticket-assistant-home"
      )}`
    );
  }

  function clearAssistantDraft(eventId: string) {
    clearTicketAssistantEventDraft(eventId);
    setDraftVersion((current) => current + 1);
  }

  return (
    <div style={ticketAssistantStyles.stack}>
      <div style={ticketAssistantStyles.panel}>
        <strong>Ticket purchasing progress</strong>
        {drafts.length ? (
          <>
            {drafts.map(({ eventId, draft }) => {
              const product = getTicketAssistantProduct(
                catalog,
                draft.ticketAssistantEventProductId
              );
              const savedTicketLines = resolveShopSelectedLines(
                catalog,
                normalizeShopCart(draft.orderCart)
              ).filter((line) => line.fulfillmentType === "ticket");
              const savedTicketLabels = Array.from(
                new Set(
                  savedTicketLines
                    .map((line) => line.sizeLabel || line.productTitle)
                    .filter(Boolean)
                )
              );
              const savedAt = String(draft.ticketAssistantDraftSavedAt ?? "");
              const savedAtLabel = savedAt
                ? new Date(savedAt).toLocaleString()
                : "Recently";

              return (
                <div key={eventId} style={ticketAssistantStyles.progressItem}>
                  <strong>{product?.title ?? "Selected event"}</strong>
                  {savedTicketLabels.length ? (
                    <div style={ticketAssistantStyles.meta}>
                      Ticket: {savedTicketLabels.join(", ")}
                    </div>
                  ) : null}
                  <div style={ticketAssistantStyles.meta}>
                    Saved {savedAtLabel}
                  </div>
                  <div style={ticketAssistantStyles.actionGrid}>
                    <button
                      type="button"
                      style={ticketAssistantStyles.primaryButton}
                      onClick={() => resumeAssistantDraft(draft)}
                    >
                      Continue Ticket Purchase
                    </button>
                    <button
                      type="button"
                      style={ticketAssistantStyles.secondaryAction}
                      onClick={() => {
                        clearAssistantDraft(eventId);
                        onGoto("/questionnaire/ticket-purchase-assistant");
                      }}
                    >
                      Clear and Start From Beginning
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div style={ticketAssistantStyles.meta}>
            No saved guided ticket purchase is waiting in this browser.
          </div>
        )}
      </div>

      <div style={ticketAssistantStyles.panel}>
        <strong>Purchased tickets</strong>
        <div style={ticketAssistantStyles.meta}>
          Completed ticket purchases and event access links will be listed here.
        </div>
      </div>

      <div style={ticketAssistantStyles.panel}>
        <strong>Buy tickets</strong>
        <div style={ticketAssistantStyles.actionGrid}>
          <button
            type="button"
            style={ticketAssistantStyles.secondaryAction}
            onClick={() => onGoto("/questionnaire/invitation?slide=invitation-shop")}
          >
            Ticket Shop
          </button>
          <button
            type="button"
            style={ticketAssistantStyles.secondaryAction}
            onClick={() => onGoto("/questionnaire/ticket-purchase-assistant")}
          >
            Ticket Purchase Assistant
          </button>
        </div>
      </div>
    </div>
  );
}

const ticketAssistantStyles: Record<string, CSSProperties> = {
  stack: {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
  },
  eventGrid: {
    display: "grid",
    gap: "14px",
    marginTop: "14px",
  },
  eventCard: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.9)",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "minmax(84px, 132px) minmax(0, 1fr)",
    padding: "14px",
  },
  eventHeroWrap: {
    alignSelf: "start",
    aspectRatio: "1 / 1",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#f4efe8",
  },
  eventHeroImage: {
    display: "block",
    height: "100%",
    objectFit: "cover",
    width: "100%",
  },
  eventHeroFallback: {
    alignItems: "center",
    color: "#6b625c",
    display: "flex",
    fontSize: "32px",
    fontWeight: 900,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  eventCardBody: {
    display: "grid",
    gap: "6px",
    minWidth: 0,
  },
  eventTitle: {
    fontSize: "clamp(20px, 3vw, 28px)",
    lineHeight: 1.1,
  },
  eventDescription: {
    color: "#4f4741",
    lineHeight: 1.4,
    margin: "4px 0 0",
  },
  chooseButton: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    justifySelf: "start",
    marginTop: "6px",
    minHeight: "42px",
    padding: "9px 12px",
  },
  panel: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.82)",
    display: "grid",
    gap: "14px",
    padding: "14px",
  },
  groupPanel: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.9)",
    display: "grid",
    gap: "0",
    overflow: "hidden",
  },
  groupMainPanel: {
    display: "grid",
    gap: "10px",
    padding: "14px",
  },
  plusOnePanel: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    background: "rgba(47, 125, 74, 0.045)",
    display: "grid",
    gap: "10px",
    padding: "14px",
  },
  progressItem: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "10px",
    paddingTop: "12px",
  },
  option: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    background: "#fffdfa",
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: "4px",
    padding: "12px",
    textAlign: "left",
  },
  optionGroup: {
    display: "grid",
    gap: "8px",
    marginTop: "4px",
  },
  radioLine: {
    alignItems: "center",
    display: "flex",
    gap: "9px",
  },
  addressGrid: {
    borderTop: "1px solid rgba(32, 28, 29, 0.12)",
    display: "grid",
    gap: "10px",
    marginTop: "4px",
    paddingTop: "12px",
  },
  actionGrid: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  attendeeNavRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
  },
  attendeeNavButton: {
    border: "1px solid #2f7d4a",
    borderRadius: "8px",
    background: "#2f7d4a",
    color: "#ffffff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 900,
    minHeight: "44px",
    minWidth: "150px",
    padding: "10px 12px",
  },
  attendeeMissingNote: {
    color: "#b3261e",
    fontSize: "0.95rem",
    lineHeight: 1.35,
  },
  inheritedPanel: {
    border: "1px solid rgba(47, 125, 74, 0.18)",
    borderRadius: "8px",
    background: "rgba(47, 125, 74, 0.08)",
    color: "#214c31",
    lineHeight: 1.45,
    padding: "10px 12px",
  },
  inheritedList: {
    display: "grid",
    gap: "4px",
    margin: 0,
    paddingLeft: "18px",
  },
  budgetPanel: {
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: "8px",
    background: "#fffdfa",
    display: "grid",
    gap: "10px",
    padding: "12px",
  },
  row: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  quantityRow: {
    alignItems: "center",
    display: "flex",
    gap: "12px",
  },
  smallButton: {
    border: "1px solid rgba(32, 28, 29, 0.2)",
    borderRadius: "999px",
    background: "#fffdfa",
    cursor: "pointer",
    fontWeight: 800,
    height: "36px",
    width: "36px",
  },
  label: {
    display: "grid",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: "8px",
    font: "inherit",
    minHeight: "42px",
    padding: "9px 10px",
  },
  meta: {
    color: "#6b625c",
    fontSize: "13px",
    lineHeight: 1.45,
  },
  checkList: {
    display: "grid",
    gap: "6px",
    lineHeight: 1.45,
  },
  orderedList: {
    display: "grid",
    gap: "8px",
    lineHeight: 1.45,
    margin: 0,
    paddingLeft: "22px",
  },
  checkboxLabel: {
    alignItems: "center",
    display: "flex",
    gap: "9px",
    fontWeight: 800,
    lineHeight: 1.35,
  },
  savePanel: {
    alignItems: "center",
    border: "1px solid rgba(47, 125, 74, 0.22)",
    borderRadius: "8px",
    background: "rgba(47, 125, 74, 0.08)",
    color: "#214c31",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "space-between",
    padding: "12px",
  },
  linkButton: {
    border: "1px solid rgba(47, 125, 74, 0.3)",
    borderRadius: "8px",
    background: "#fffdfa",
    color: "#214c31",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    minHeight: "38px",
    padding: "8px 12px",
  },
  secondaryAction: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: "8px",
    background: "#fffdfa",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    minHeight: "40px",
    padding: "8px 12px",
  },
  primaryButton: {
    border: 0,
    borderRadius: "8px",
    background: "#2f7d4a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: "48px",
    padding: "12px 14px",
  },
};

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
  const [identityDocumentType, setIdentityDocumentType] =
    useState("drivers_license");
  const [identityFrontFile, setIdentityFrontFile] = useState<File | null>(null);
  const [identityBackFile, setIdentityBackFile] = useState<File | null>(null);
  const [identitySocials, setIdentitySocials] = useState({
    instagramUrl: "",
    tiktokUrl: "",
    facebookUrl: "",
  });
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [isSubmittingIdentity, setIsSubmittingIdentity] = useState(false);
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
          const nextUser = data?.user ?? null;
          setUser(nextUser);
          setIdentityDocumentType(
            nextUser?.identityVerification?.documentType || "drivers_license"
          );
          setIdentitySocials({
            instagramUrl: nextUser?.identityVerification?.instagramUrl || "",
            tiktokUrl: nextUser?.identityVerification?.tiktokUrl || "",
            facebookUrl: nextUser?.identityVerification?.facebookUrl || "",
          });
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
  const identityStatus = String(
    user?.identityVerification?.status || "NOT SUBMITTED"
  ).toUpperCase();

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

  async function handleIdentitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIdentityError(null);
    setIdentityMessage(null);

    if (!identityFrontFile || !identityBackFile) {
      setIdentityError("Please upload the front and back of your identification.");
      return;
    }

    const formData = new FormData();
    formData.set("documentType", identityDocumentType);
    formData.set("frontFile", identityFrontFile);
    formData.set("backFile", identityBackFile);
    formData.set("instagramUrl", identitySocials.instagramUrl);
    formData.set("tiktokUrl", identitySocials.tiktokUrl);
    formData.set("facebookUrl", identitySocials.facebookUrl);

    setIsSubmittingIdentity(true);

    try {
      const response = await fetch("/api/account/identity-verification", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Could not submit verification."
        );
      }

      setUser((previousUser) =>
        previousUser
          ? {
              ...previousUser,
              identityVerification: data?.verification ?? null,
            }
          : previousUser
      );
      setIdentityFrontFile(null);
      setIdentityBackFile(null);
      setIdentityMessage(data?.message || "Verification submitted.");
    } catch (error) {
      setIdentityError(
        error instanceof Error
          ? error.message
          : "Could not submit verification."
      );
    } finally {
      setIsSubmittingIdentity(false);
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
            <div className={styles.accountCardTitle}>Identity Verification</div>
            <div className={styles.accountCardValue}>Status: {identityStatus}</div>
          </div>
        </div>
        <div className={styles.accountCardMeta}>
          Admin approval will allow access to age or identity restricted
          purchases, items, and events.
        </div>
        {user?.identityVerification?.submittedAt ? (
          <div className={styles.accountCardMeta}>
            Submitted: {formatAccountDate(user.identityVerification.submittedAt)}
          </div>
        ) : null}
        {user?.identityVerification?.adminNotes ? (
          <div className={styles.accountCardMeta}>
            Admin note: {user.identityVerification.adminNotes}
          </div>
        ) : null}

        <form
          className={styles.accountVerificationForm}
          onSubmit={handleIdentitySubmit}
        >
          <label className={styles.accountFieldLabel}>
            Identification type
            <select
              className={styles.accountTextInput}
              value={identityDocumentType}
              onChange={(event) => setIdentityDocumentType(event.target.value)}
            >
              <option value="drivers_license">Driver's license</option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID</option>
            </select>
          </label>

          <label className={styles.accountFieldLabel}>
            ID front
            <input
              className={styles.accountTextInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setIdentityFrontFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <label className={styles.accountFieldLabel}>
            ID back
            <input
              className={styles.accountTextInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setIdentityBackFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <label className={styles.accountFieldLabel}>
            Instagram
            <input
              className={styles.accountTextInput}
              type="url"
              placeholder="https://instagram.com/username"
              value={identitySocials.instagramUrl}
              onChange={(event) =>
                setIdentitySocials((previous) => ({
                  ...previous,
                  instagramUrl: event.target.value,
                }))
              }
            />
          </label>

          <label className={styles.accountFieldLabel}>
            TikTok
            <input
              className={styles.accountTextInput}
              type="url"
              placeholder="https://tiktok.com/@username"
              value={identitySocials.tiktokUrl}
              onChange={(event) =>
                setIdentitySocials((previous) => ({
                  ...previous,
                  tiktokUrl: event.target.value,
                }))
              }
            />
          </label>

          <label className={styles.accountFieldLabel}>
            Facebook
            <input
              className={styles.accountTextInput}
              type="url"
              placeholder="https://facebook.com/username"
              value={identitySocials.facebookUrl}
              onChange={(event) =>
                setIdentitySocials((previous) => ({
                  ...previous,
                  facebookUrl: event.target.value,
                }))
              }
            />
          </label>

          {identityError ? (
            <div className={styles.accountFormError}>{identityError}</div>
          ) : null}
          {identityMessage ? (
            <div className={styles.accountFormSuccess}>{identityMessage}</div>
          ) : null}

          <button
            type="submit"
            className={styles.secondaryButton}
            disabled={isSubmittingIdentity}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            {isSubmittingIdentity ? "Submitting..." : "Submit for Review"}
          </button>
        </form>
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


