"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import VerificationCodePanel from "@/customerAccess/components/VerificationCodePanel";
import LeadCaptureForm from "@/customerAccess/components/LeadCaptureForm";
import AuthFooter from "@/customerAccess/components/AuthFooter";
import styles from "./QuestionnaireShell.module.css";
import {
  DataBlockAction,
  DataBlockDefinition,
  DataBlockRow,
  DataBlockSectionAction,
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
  RecordListItem,
  ShopCart,
  ShopCatalog,
  ShopResolvedCartLine,
  TicketAssignment,
  TicketAssignments,
  MealMenu,
  MealSelections,
  SlideRouteRule,
  SlideSection,
  ThemeConfig,
} from "@/types/questionnaire";

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

import {
  getMealGroupTotal,
  getMealMenu,
  getMealRequiredLines,
  hasMealSelectionItems,
  isMealSelectionComplete,
  normalizeMealSelections,
  setMealOptionQuantity,
} from "@/lib/questionnaire/meals";
import { applyAccountProfileAutofill } from "@/lib/questionnaire/accountProfileAutofill";
import {
  areRequiredTicketMealsComplete,
  buildTicketAssignmentsFromLines,
  calculateTicketMealExtraTotal,
  getTicketMealGroupTotal,
  getTicketsNeedingMeal,
  hasTicketsNeedingMeal,
  normalizeTicketAssignments,
  setTicketMealOptionQuantity,
  updateTicketAssignmentBoolean,
  updateTicketAssignmentField,
} from "@/lib/questionnaire/tickets";

import {
  getPasswordRequirementResults,
  getPasswordStrength,
} from "@/customerAccess/utils/passwordPolicy";

import {
  clearAllReadableCookies,
  clearLocalEngagementSnapshot,
  clearResumeDecision,
  readLocalEngagementSnapshot,
  readResumeDecision,
  writeLocalQuestionAnswer,
  writeLocalVideoProgress,
  writeResumeDecision,
} from "@/lib/questionnaire/engagementTracking";

type Props = {
  config: QuestionnaireConfig;
  theme: ThemeConfig;
};

type ResolvedButtonStyle = {
  background: string;
  color: string;
  borderColor: string;
};

type VideoSeekRequest = {
  id: string;
  percent: number;
};

function getRecordArray(
  variables: QuestionnaireVariableMap,
  key: string
): Array<Record<string, QuestionnaireVariableValue>> {
  const raw = variables[key];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (item): item is Record<string, QuestionnaireVariableValue> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function getSelectedRecordFromSource(
  variables: QuestionnaireVariableMap,
  sourceKey: string | undefined,
  selectedValue: string
): Record<string, QuestionnaireVariableValue> | null {
  if (!sourceKey || !selectedValue) {
    return null;
  }

  const records = getRecordArray(variables, sourceKey);

  return (
    records.find((record) => {
      const value =
        typeof record.value === "string"
          ? record.value
          : typeof record.code === "string"
            ? record.code
            : typeof record.id === "string"
              ? record.id
              : "";

      return value === selectedValue;
    }) ?? null
  );
}

function getDisplayValueFromBlockRow(row: DataBlockRow) {
  if (
    typeof row.value === "string" ||
    typeof row.value === "number" ||
    typeof row.value === "boolean"
  ) {
    return row.value;
  }

  return undefined;
}

function formatBlockRowValue(
  row: DataBlockRow,
  value: PrimitiveValue | undefined
) {
  if (value === undefined || value === null || value === "") {
    return row.emptyText ?? "—";
  }

  if (row.format === "boolean_yes_no") {
    return value === true ? "Yes" : "No";
  }

  return String(value);
}

function shouldShowBlockItem(
  rules: { showIf?: { field: string; operator: SlideRouteRule["operator"]; value: string }[] },
  context: QuestionnaireAnswers
) {
  if (!rules.showIf?.length) {
    return true;
  }

  return rules.showIf.every((rule) => evaluateConditionRule(rule, context));
}

function getPrimitiveRecordValue(
  record: Record<string, QuestionnaireVariableValue> | null,
  key: string | undefined
): PrimitiveValue | undefined {
  if (!record || !key) {
    return undefined;
  }

  const value = record[key];

  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

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

function shouldShowAuthFooter(slug: string) {
  return slug.startsWith("auth-");
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

function getRecordListItems(
  variables: QuestionnaireVariableMap,
  slide: {
    recordSourceKey?: string;
    recordTitleField?: string;
    recordSubtitleField?: string;
    recordMetaFields?: string[];
  }
): RecordListItem[] {
  if (!slide.recordSourceKey) {
    return [];
  }

  const raw = variables[slide.recordSourceKey];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, QuestionnaireVariableValue>;

      const value =
        typeof record.value === "string"
          ? record.value
          : typeof record.code === "string"
            ? record.code
            : typeof record.id === "string"
              ? record.id
              : undefined;

      if (!value) {
        return null;
      }

      const titleField = slide.recordTitleField ?? "title";
      const subtitleField = slide.recordSubtitleField ?? "subtitle";
      const metaFields = slide.recordMetaFields ?? [];

      const titleValue = record[titleField];
      const subtitleValue = record[subtitleField];

      const title =
        typeof titleValue === "string" && titleValue.trim().length > 0
          ? titleValue
          : value;

      const subtitle =
        typeof subtitleValue === "string" && subtitleValue.trim().length > 0
          ? subtitleValue
          : undefined;

      const meta = metaFields
        .map((field) => {
          const fieldValue = record[field];
          if (
            typeof fieldValue === "string" ||
            typeof fieldValue === "number" ||
            typeof fieldValue === "boolean"
          ) {
            return String(fieldValue);
          }
          return null;
        })
        .filter(Boolean) as string[];

      const childCount =
        typeof record.childCount === "number" ? record.childCount : undefined;

      return {
        value,
        title,
        subtitle,
        meta: meta.length ? meta : undefined,
        childCount,
      };
    })
    .filter(Boolean) as RecordListItem[];
}

function AuthFormSlideRenderer({
  formKey,
  title,
  subtitle,
  questionnaireSlug,
  answers,
  onSuccess,
}: {
  formKey?: string;
  title?: string;
  subtitle?: string;
  questionnaireSlug: string;
  answers: QuestionnaireAnswers;
  onSuccess: () => void;
}) {
  const isGatedLeadCapture = formKey === "gatedLeadCapture";

  if (formKey !== "leadCapture" && formKey !== "gatedLeadCapture") {
    return (
      <p className={styles.formError}>
        Unsupported auth form: {formKey || "missing"}
      </p>
    );
  }

  return (
    <div className={styles.authFormEmbedFullBleed}>
      <LeadCaptureForm
        title={title || "Stay connected"}
        subtitle={
          subtitle ||
          (isGatedLeadCapture
            ? "Sign up and check your email for the private link to continue watching."
            : undefined)
        }
        config={{
          mode: "lead-capture",
          target: isGatedLeadCapture ? "gatedLeadAccess" : "lead",
          fields: {
            fullName: { visible: true, required: true },
            identifier: {
              visible: true,
              required: true,
              allow: isGatedLeadCapture ? ["email"] : ["email", "phone"],
              helpText: isGatedLeadCapture
                ? "Use your email so we can send the private video link."
                : "Use your email or WhatsApp number. If using phone, include country code and area code.",
            },
            updatesOptIn: {
              visible: true,
              required: false,
              defaultValue: true,
            },
          },
          verification: {
            required: false,
            autoStart: false,
            method: "email",
            delivery: "link",
            redirectToVerifyPage: false,
            successRedirect: null,
            verifiedContentRedirect: null,
            expiresInMinutes: 15,
            expiresInHours: 24,
            promptForPhoneChannel: false,
            defaultPhoneChannel: "whatsapp",
            phoneChannelOptions: ["whatsapp", "sms"],
            phoneChannelLabel: "Send verification by",
          },
          submit: {
            endpoint: isGatedLeadCapture
              ? "/api/auth/temporary-lead-account"
              : "/api/questionnaires/submit",
            method: "POST",
            buttonLabel: isGatedLeadCapture
              ? "Email My Private Link"
              : "Stay Connected",
            successMessage: isGatedLeadCapture
              ? "Check your email for the private link to continue watching."
              : "Your info was submitted.",
            successRedirect: null,
            redirectDelayMs: 0,
          },
        }}
        onSubmit={async ({
          formData,
          setMessage,
          setMessageType,
        }: {
          formData: Record<string, unknown>;
          setMessage: (message: string) => void;
          setMessageType: (type: "error" | "info" | "success") => void;
        }) => {
          const identifier = String(formData.identifier ?? "").trim();
          const isEmail = identifier.includes("@");

          const endpoint = isGatedLeadCapture
            ? "/api/auth/temporary-lead-account"
            : "/api/questionnaires/submit";

          const payload = isGatedLeadCapture
            ? {
                questionnaireSlug,
                source: "invitation-lead-gate",
                goto: "second-video",
                fullName: String(formData.fullName ?? "").trim(),
                identifier,
                updatesOptIn: formData.updatesOptIn === true,
                answers: {
                  ...answers,
                  gatedLeadCapture: formData,
                },
                engagementSnapshot: readLocalEngagementSnapshot(questionnaireSlug),
              }
            : {
                questionnaireSlug,
                fullName: String(formData.fullName ?? "").trim(),
                email: isEmail ? identifier : "",
                phone: isEmail ? "" : identifier,
                whatsappOptIn: formData.updatesOptIn === true,
                answers: {
                  ...answers,
                  leadCapture: formData,
                },
              };

          const response = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            setMessage(
              data?.details ||
                data?.error ||
                "Your information could not be submitted."
            );
            setMessageType("error");
            return;
          }

          setMessage(
            data?.message ||
              (isGatedLeadCapture
                ? "Check your email for the private link to continue watching."
                : "Your info was submitted.")
          );
          setMessageType("success");

          if (!isGatedLeadCapture) {
            window.setTimeout(() => {
              onSuccess();
            }, 700);
          }
        }}
      />
    </div>
  );
}

type MarketingQuestionsConfig = {
  skipWhenLoggedIn?: boolean;
  skipSlideIds?: string[];
  skipTarget?: string;
  answeredQuestionsTarget?: string;
};

function getMarketingQuestionsConfig(
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

type GatedAccessConfig = {
  gateSlideId?: string;
  goto?: string;
  resumePromptSlideId?: string;
  startFromBeginningSlideId?: string;
};

type GatedAccessState = {
  hasAccess: boolean;
  goto?: string | null;
  resumePromptSlideId?: string | null;
  gateSlideId?: string | null;
};

function getGatedAccessConfig(
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

function getVideoResumeStorageKey(questionnaireSlug: string, slideId: string) {
  return `questionnaire-video-resume:${questionnaireSlug}:${slideId}`;
}

function readVideoResumeSeconds(questionnaireSlug: string, slideId: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(
    getVideoResumeStorageKey(questionnaireSlug, slideId)
  );

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function writeVideoResumeSeconds(
  questionnaireSlug: string,
  slideId: string,
  seconds: number
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!Number.isFinite(seconds) || seconds < 5) {
    return;
  }

  window.localStorage.setItem(
    getVideoResumeStorageKey(questionnaireSlug, slideId),
    String(Math.floor(seconds))
  );
}

function prefillFirstTicketFromContact(
  assignments: TicketAssignments,
  answers: QuestionnaireAnswers
): TicketAssignments {
  if (!assignments.length) {
    return assignments;
  }

  const purchaserName = String(answers.fullName ?? "").trim();
  const purchaserEmail = String(answers.email ?? "").trim();
  const purchaserPhone = String(answers.phone ?? "").trim();

  if (!purchaserName && !purchaserEmail && !purchaserPhone) {
    return assignments;
  }

  return assignments.map((assignment, index) => {
    if (index !== 0) {
      return assignment;
    }

    return {
      ...assignment,
      ownerName: assignment.ownerName?.trim() || purchaserName,
      ownerEmail: assignment.ownerEmail?.trim() || purchaserEmail,
      ownerPhone: assignment.ownerPhone?.trim() || purchaserPhone,
      isPurchaserTicket: assignment.isPurchaserTicket ?? true,
      emailTicketToOwner:
        assignment.isPurchaserTicket === true
          ? false
          : assignment.emailTicketToOwner ?? true,
    };
  });
}

export default function QuestionnaireShell({ config, theme }: Props) {

  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
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
  const [authSessionUser, setAuthSessionUser] = useState<{
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null>(null);
  const [isAuthSessionLoaded, setIsAuthSessionLoaded] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [answeredQuestionSlideIds, setAnsweredQuestionSlideIds] = useState<
    string[]
  >([]);
  const [dbVideoProgressBySlideId, setDbVideoProgressBySlideId] = useState<
    Record<string, number>
  >({});

  const [videoResumeDecision, setVideoResumeDecision] = useState<
    "continue" | "beginning" | null
  >(null);

  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [deleteBatchError, setDeleteBatchError] = useState<string | null>(null);
  const [deleteBatchConfirmation, setDeleteBatchConfirmation] = useState("");
  const [batchDataRefreshKey, setBatchDataRefreshKey] = useState(0);
  const [isCurrentVerticalVideoPlaying, setIsCurrentVerticalVideoPlaying] =
    useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoSeekRequest, setVideoSeekRequest] =
    useState<VideoSeekRequest | null>(null);

  const previousVideoTimeRef = useRef(0);
  const slideBodyRef = useRef<HTMLDivElement | null>(null);
  const actionInFlightRef = useRef(false);
  const searchParams = useSearchParams();
  const gatedAccessHandledRef = useRef(false);
  const loginReturnHandledRef = useRef(false);
  const urlSlideHandledRef = useRef(false);
  const accountProfileAutofillHandledRef = useRef(false);
  const [gatedAccessState, setGatedAccessState] =
    useState<GatedAccessState | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function loadAuthSession() {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (cancelled) {
        return;
      }

      if (response.ok && data?.authenticated === true && data?.user) {
        setAuthSessionUser({
          id: String(data.user.id ?? ""),
          name:
            typeof data.user.name === "string" ? data.user.name : null,
          email:
            typeof data.user.email === "string" ? data.user.email : null,
          phone:
            typeof data.user.phone === "string" ? data.user.phone : null,
        });
      } else {
        setAuthSessionUser(null);
      }

      setIsAuthSessionLoaded(true);
    }

    void loadAuthSession().catch(() => {
      if (!cancelled) {
        setAuthSessionUser(null);
        setIsAuthSessionLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);
  
  useEffect(() => {
    if (accountProfileAutofillHandledRef.current) {
      return;
    }

    accountProfileAutofillHandledRef.current = true;

    async function prefillFormsFromAccountProfile() {
      const response = await fetch("/api/account/profile", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      const profile = data?.user ?? data?.profile ?? null;

      if (!profile || typeof profile !== "object") {
        return;
      }

      setAnswers((prev) => applyAccountProfileAutofill(prev, profile));
    }

    void prefillFormsFromAccountProfile().catch(() => null);
  }, []);

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUser?.id) {
      return;
    }

    async function syncAndLoadEngagement() {
      const snapshot = readLocalEngagementSnapshot(config.slug);

      await fetch("/api/questionnaires/engagement/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionnaireSlug: config.slug,
          source: "client-session-sync",
          snapshot,
        }),
      }).catch(() => null);

      const response = await fetch(
        `/api/questionnaires/engagement/status?questionnaireSlug=${encodeURIComponent(
          config.slug
        )}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.hasUser) {
        return;
      }

      setAnsweredQuestionSlideIds(
        Array.isArray(data.answeredQuestionSlideIds)
          ? data.answeredQuestionSlideIds.filter(
              (item: unknown): item is string => typeof item === "string"
            )
          : []
      );

      const nextProgress: Record<string, number> = {};

      if (Array.isArray(data.videoProgress)) {
        for (const item of data.videoProgress) {
          if (
            typeof item?.slideId === "string" &&
            typeof item?.lastPositionSeconds === "number"
          ) {
            nextProgress[item.slideId] = item.lastPositionSeconds;
          }
        }
      }

      setDbVideoProgressBySlideId(nextProgress);
    }

    void syncAndLoadEngagement().catch(() => null);
  }, [authSessionUser?.id, config.slug, isAuthSessionLoaded]);

  useEffect(() => {
    setVideoResumeDecision(readResumeDecision(config.slug));
  }, [config.slug]);

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

  const currentSlide = visibleSlides[currentIndex];
  const shouldShowOverlayTitle = currentSlide?.titlePlacement === "progress_overlay";

  useEffect(() => {
    if (urlSlideHandledRef.current) {
      return;
    }

    const slideId = searchParams.get("slide");

    if (!slideId) {
      return;
    }

    const targetIndex = getSlideIndexById(visibleSlides, slideId);

    if (targetIndex < 0) {
      return;
    }

    urlSlideHandledRef.current = true;

    if (targetIndex !== currentIndex) {
      setHistory([]);
      setCurrentIndex(targetIndex);
    }
  }, [currentIndex, searchParams, visibleSlides]);

  useEffect(() => {
    if (!currentSlide?.syncUrl) {
      return;
    }

    const currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.get("slide") === currentSlide.id) {
      return;
    }

    currentUrl.searchParams.set("slide", currentSlide.id);

    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}`
    );
  }, [currentSlide]);

  useEffect(() => {
    if (
      loginReturnHandledRef.current ||
      !isAuthSessionLoaded ||
      !authSessionUser?.id
    ) {
      return;
    }

    const returnSlideId = searchParams.get("loginReturnSlide");

    if (!returnSlideId) {
      return;
    }

    loginReturnHandledRef.current = true;

    const targetIndex = getSlideIndexById(visibleSlides, returnSlideId);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("loginReturnSlide");
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`);

    if (targetIndex < 0 || targetIndex === currentIndex) {
      return;
    }

    setHistory([]);
    setCurrentIndex(targetIndex);
  }, [
    authSessionUser?.id,
    currentIndex,
    isAuthSessionLoaded,
    searchParams,
    visibleSlides,
  ]);

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUser?.id || !currentSlide) {
      return;
    }

    const gateSlideId = gatedAccessConfig?.gateSlideId;
    const gatedGoto = gatedAccessConfig?.goto;

    if (!gateSlideId || !gatedGoto) {
      return;
    }

    if (currentSlide.id !== gateSlideId) {
      return;
    }

    const targetIndex = getSlideIndexById(visibleSlides, gatedGoto);

    if (targetIndex >= 0 && targetIndex !== currentIndex) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex(targetIndex);
    }
  }, [
    authSessionUser?.id,
    currentIndex,
    currentSlide,
    gatedAccessConfig,
    isAuthSessionLoaded,
    visibleSlides,
  ]);

  useEffect(() => {
    if (gatedAccessHandledRef.current || !isAuthSessionLoaded) {
      return;
  }

  async function resolveGatedAccess() {
    const leadAccess = searchParams.get("leadAccess");
    const queryGoto = searchParams.get("goto");

    if (leadAccess === "verified" && queryGoto) {
      const targetIndex = getSlideIndexById(visibleSlides, queryGoto);

      if (targetIndex >= 0) {
        gatedAccessHandledRef.current = true;

        setGatedAccessState({
          hasAccess: true,
          goto: queryGoto,
          gateSlideId: gatedAccessConfig?.gateSlideId ?? null,
          resumePromptSlideId: gatedAccessConfig?.resumePromptSlideId ?? null,
        });

        setHistory([]);
        setCurrentIndex(targetIndex);
      }

      return;
    }

    if (authSessionUser?.id) {
      return;
    }

    const response = await fetch(
      `/api/questionnaires/gated-access/status?questionnaireSlug=${encodeURIComponent(
        config.slug
      )}`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.hasAccess || !data?.access?.goto) {
      return;
    }

      const targetGoto = String(data.access.goto);

      if (data?.authenticatedUser?.id) {
        setAuthSessionUser({
          id: String(data.authenticatedUser.id),
          name:
            typeof data.authenticatedUser.name === "string"
              ? data.authenticatedUser.name
              : null,
          email:
            typeof data.authenticatedUser.email === "string"
              ? data.authenticatedUser.email
              : null,
          phone:
            typeof data.authenticatedUser.phone === "string"
              ? data.authenticatedUser.phone
              : null,
        });
      }

      gatedAccessHandledRef.current = true;

      setGatedAccessState({
        hasAccess: true,
        goto: targetGoto,
        gateSlideId: gatedAccessConfig?.gateSlideId ?? null,
        resumePromptSlideId: gatedAccessConfig?.resumePromptSlideId ?? null,
      });
  }

    void resolveGatedAccess().catch(() => null);
  }, [
    authSessionUser?.id,
    config.slug,
    gatedAccessConfig,
    isAuthSessionLoaded,
    searchParams,
    visibleSlides,
  ]);

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

  const currentTicketAssignments = useMemo<TicketAssignments>(
    () =>
      prefillFirstTicketFromContact(
        buildTicketAssignmentsFromLines({
          lines: sharedOrderLines,
          existingAssignments: normalizeTicketAssignments(
            answers.ticketAssignments
          ),
        }),
        answers
      ),
    [
      sharedOrderLines,
      answers.ticketAssignments,
      answers.fullName,
      answers.email,
      answers.phone,
    ]
  );

    const currentMealMenu = useMemo<MealMenu | null>(() => {
    const firstMenuId = getTicketsNeedingMeal(
      currentTicketAssignments
    )[0]?.mealMenuId;

    return getMealMenu(
      mergedVariables,
      currentSlide?.mealMenuKey ?? "mealMenus",
      firstMenuId
    );
  }, [currentSlide, currentTicketAssignments, mergedVariables]);


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

  function getCurrentReturnToPath() {
    const returnUrl = new URL(window.location.href);

    if (currentSlide?.id) {
      returnUrl.searchParams.set("loginReturnSlide", currentSlide.id);
    }

    return `${returnUrl.pathname}${returnUrl.search}`;
  }

  function handleAuthLoginClick() {
    const returnTo = getCurrentReturnToPath();

    window.location.href = `/questionnaire/auth-login?returnTo=${encodeURIComponent(
      returnTo
    )}`;
  }

  function getLoginReturnToTarget() {
    const returnTo = searchParams.get("returnTo");

    if (!returnTo) {
      return null;
    }

    return returnTo;
  }

  function handleAnsweredQuestionsClick() {
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

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClearVisitorState() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await fetch("/api/questionnaires/visitor-state/clear", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      }).catch(() => null);

      clearLocalEngagementSnapshot(config.slug);
      clearResumeDecision(config.slug);
      clearAllReadableCookies();

      setAuthSessionUser(null);
      setGatedAccessState(null);
      setAnsweredQuestionSlideIds([]);
      setDbVideoProgressBySlideId({});
      setVideoResumeOverrides({});
      setVideoResumeDecision(null);
      setIsAccountMenuOpen(false);

      window.location.href = `/questionnaire/${encodeURIComponent(config.slug)}`;
    } finally {
      setIsSubmitting(false);
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
      const resumeSeconds = readVideoResumeSeconds(config.slug, gatedTarget);

      if (resumeSeconds > 0) {
        setVideoResumeOverrides((prev) => ({
          ...prev,
          [gatedTarget]: resumeSeconds,
        }));
      }
    }

    const targetIndex = getSlideIndexById(visibleSlides, gatedTarget);

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


  function resetQuestionnaireSession() {
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
    return;
  }
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
      if (currentSlide.contactGoto && !contactInfoComplete) {
        goToTarget(currentSlide.contactGoto);
        return;
      }

      if (currentSlide.ticketGoto) {
        setAnswer(
          "ticketAssignments",
          prefillFirstTicketFromContact(
            buildTicketAssignmentsFromLines({
              lines: currentShopSelectedLines,
              existingAssignments: normalizeTicketAssignments(
                answers.ticketAssignments
              ),
            }),
            answers
          )
        );
        goToTarget(currentSlide.ticketGoto);
        return;
      }

    if (
      currentSlide.deliveryGoto &&
      hasPhysicalFulfillmentItems(currentShopCatalog, currentShopCart)
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
          lines: sharedOrderLines,
          existingAssignments: normalizeTicketAssignments(
            answers.ticketAssignments
          ),
        }),
        answers
      );

      setAnswer("ticketAssignments", nextAssignments);

      if (
        currentSlide.deliveryGoto &&
        hasPhysicalFulfillmentItems(sharedShopCatalog, sharedOrderCart)
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
      goToTarget("ticket-details");
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
      return areRequiredTicketMealsComplete({
        menu: currentMealMenu,
        assignments: currentTicketAssignments,
      });
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
    return {
      questionnaireSlug: config.slug,
      fullName: String(answers.fullName ?? "").trim(),
      email: String(answers.email ?? "").trim(),
      phone: String(answers.phone ?? "").trim(),
      whatsappOptIn:
        answers.whatsappOptIn === true || answers.sendByWhatsapp === true,
      currencyCode: sharedShopCatalog?.currencyCode ?? "USD",
      orderCart: sharedOrderCart,
      resolvedLines: sharedOrderLines,
      ticketAssignments: currentTicketAssignments,
      deliverySelection: sharedDeliverySelection,
      orderSummary: sharedOrderSummary,
      answers,
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
    const downloadUrl = `/api/downloads/${encodeURIComponent(downloadKey)}`;

    window.open(downloadUrl, "_blank", "noopener,noreferrer");

    setDownloadNotice(
      `${label ?? "Download"} started. If the download did not appear, check your browser downloads or try again.`
    );
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
      window.location.href = `/api/downloads/${encodeURIComponent(
        currentSlide.downloadKey
      )}`;

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
  const hasPinnedChoices = Boolean(pinnedChoices?.length);
  const hasDownloadButtons = Boolean(currentSlide.downloadButtons?.length);
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

    const questionnaireOverlayMode = config.overlayMode ?? "transparent";

    const resolvedProgressOverlayBackground =
      currentSlide.progressOverlayBackgroundColor ??
      (isMediaSlide
        ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0))"
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
                {currentSlide.showReturnHome ||
                currentSlide.showCancel ||
                currentSlide.showAuthControls ? (
                  <div className={styles.topUtilityRow}>
                    {currentSlide.showAuthControls ? (
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
                          <div className={styles.accountMenuPanel}>
                            {authSessionUser?.name ? (
                              <div className={styles.accountMenuName}>
                                {authSessionUser.name}
                              </div>
                            ) : null}

                            {authSessionUser ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={() => {
                                    setIsAccountMenuOpen(false);
                                    window.location.href =
                                      "/questionnaire/auth-account";
                                  }}
                                >
                                  Account
                                </button>

                                <button
                                  type="button"
                                  className={styles.accountMenuItem}
                                  onClick={handleAnsweredQuestionsClick}
                                >
                                  Answered Questions
                                </button>

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
                                  onClick={handleClearVisitorState}
                                  disabled={isSubmitting}
                                >
                                  Clear Visitor State
                                </button>
                              </>
                            )}
                          </div>
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

                {showProgressBar ? (
                  isVideoProgressMode ? (
                    <input
                      className={styles.videoProgressInput}
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={videoProgress}
                      aria-label="Video progress"
                      onChange={(event) =>
                        handleVideoProgressInput(event.target.value)
                      }
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
                ) : null}  
            
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
                        videoStartAtSeconds:
                          videoResumeOverrides[currentSlide.id] ??
                          (videoResumeDecision === "continue"
                            ? dbVideoProgressBySlideId[currentSlide.id]
                            : undefined) ??
                          currentSlide.videoStartAtSeconds,
                      }}
                        onVerticalVideoPlayingChange={
                          setIsCurrentVerticalVideoPlaying
                        }
                        onVideoProgressChange={(payload) => {
                          handleVideoProgressChange(payload);

                          if (currentSlide.mediaType === "video") {
                            writeLocalVideoProgress({
                              questionnaireSlug: config.slug,
                              slideId: currentSlide.id,
                              currentTime: payload.currentTime,
                              duration: payload.duration,
                            });

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
                      />
                    {currentSlide.mediaType === "video" &&
                    videoResumeDecision === null &&
                    Object.values(dbVideoProgressBySlideId).some((seconds) => seconds > 0) ? (
                        <div className={styles.videoResumePrompt}>
                          <div className={styles.videoResumePromptCard}>
                            <p className={styles.videoResumePromptTitle}>
                              Continue watching?
                            </p>
                            <p className={styles.videoResumePromptText}>
                              You have watched part of this before. Continue each video from where you
                              stopped last time, or start each video from its beginning?
                            </p>
                            <div className={styles.videoResumePromptActions}>
                              <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => {
                                  writeResumeDecision(config.slug, "continue");
                                  setVideoResumeDecision("continue");

                                  const savedSeconds = dbVideoProgressBySlideId[currentSlide.id] ?? 0;

                                  if (savedSeconds > 0) {
                                    setVideoResumeOverrides((prev) => ({
                                      ...prev,
                                      [currentSlide.id]: savedSeconds,
                                    }));
                                  }
                                }}
                              >
                              Continue from where I stopped
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                writeResumeDecision(config.slug, "beginning");
                                setVideoResumeDecision("beginning");
                                setVideoResumeOverrides({});
                              }}
                              >
                                Start videos from beginning
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
                          showDeliveryFee={sharedOrderHasDeliveryFee}
                          showDiscountTotal={sharedOrderHasDiscount}
                          showTotalWeight={sharedOrderHasWeight}
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

                      {currentSlide.type === "tickets" ? (
                        <TicketDetailsRenderer
                          assignments={currentTicketAssignments}
                          theme={theme}
                          purchaserEmail={String(answers.email ?? "").trim()}
                          onChange={(nextAssignments) =>
                            setAnswer("ticketAssignments", nextAssignments)
                          }
                          onMarkAllForEmail={() =>
                            setAnswer(
                              "ticketAssignments",
                              currentTicketAssignments.map((assignment) => ({
                                ...assignment,
                                emailTicketToOwner:
                                  assignment.isPurchaserTicket === true
                                    ? false
                                    : String(assignment.ownerEmail ?? "").trim()
                                        .length > 0,
                              }))
                            )
                          }
                          onSelectMeal={(ticketCode) => {
                            setAnswer("selectedMealTicketCode", ticketCode);
                            goToTarget("meal-selection");
                          }}
                        />
                      ) : null}

                      {currentSlide.type === "meal" ? (
                        <MealSelectionRenderer
                          menu={currentMealMenu}
                          assignments={currentTicketAssignments}
                          selectedTicketCode={
                            typeof answers.selectedMealTicketCode === "string"
                              ? answers.selectedMealTicketCode
                              : ""
                          }
                          theme={theme}
                          onChange={(nextAssignments) =>
                            setAnswer("ticketAssignments", nextAssignments)
                          }
                          onBackToTickets={() => goToTarget("ticket-details")}
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

                      {currentSlide.type === "shop" &&
                      currentSlide.shopMode === "review" &&
                      hasTicketsNeedingMeal(currentTicketAssignments) ? (
                        <MealSelectionSummaryRenderer
                          menu={getMealMenu(
                            mergedVariables,
                            "mealMenus",
                            getTicketsNeedingMeal(currentTicketAssignments)[0]
                              ?.mealMenuId
                          )}
                          assignments={currentTicketAssignments}
                          mealExtraTotal={calculateTicketMealExtraTotal({
                            menu: getMealMenu(
                              mergedVariables,
                              "mealMenus",
                              getTicketsNeedingMeal(currentTicketAssignments)[0]
                                ?.mealMenuId
                            ),
                            assignments: currentTicketAssignments,
                          })}
                          onAdjustMeals={() => goToTarget("meal-selection")}
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
                            onSuccess={() => {
                              goToTarget(currentSlide.goto || "second-video");
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

            {hasPinnedChoices || hasDownloadButtons || hasVisibleNav ? (
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
                              triggerDownload(
                                downloadButton.key,
                                downloadButton.label
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
                            {downloadButton.label}
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
                        sharedOrderSummary.subtotal,
                        sharedShopCatalog?.currencyCode ?? "JMD"
                      )}
                      {currentDeliveryFee > 0 ? (
                        <>
                          {" "}
                          · Delivery: {formatCurrency(currentDeliveryFee, "JMD")}
                        </>
                      ) : null}{" "}
                      · Total:{" "}
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

function TicketDetailsRenderer({
  assignments,
  theme,
  purchaserEmail,
  onChange,
  onMarkAllForEmail,
  onSelectMeal,
}: {
  assignments: TicketAssignments;
  theme: ThemeConfig;
  purchaserEmail: string;
  onChange: (nextAssignments: TicketAssignments) => void;
  onMarkAllForEmail: () => void;
  onSelectMeal: (ticketCode: string) => void;
}) {
  if (!assignments.length) {
    return <p className={styles.body}>No ticket details needed yet.</p>;
  }

  const ticketsWithOwnerEmails = assignments.filter(
    (assignment) =>
      assignment.isPurchaserTicket !== true &&
      String(assignment.ownerEmail ?? "").trim().length > 0
  );

  return (
    <div className={styles.mealStack}>
      <div className={styles.contactNote}>
        The first ticket is prefilled from the purchaser contact details. Mark
        “This is my ticket” for the purchaser’s own ticket. Guest tickets can be
        emailed to their owners after the order is completed.
      </div>

      {ticketsWithOwnerEmails.length > 0 ? (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onMarkAllForEmail}
          style={{
            borderColor: theme.colors.border,
            background: "#FFFFFF",
            color: theme.colors.text,
          }}
        >
          Email all tickets to owners
        </button>
      ) : null}

      {assignments.map((assignment) => (
        <div key={assignment.ticketCode} className={styles.mealTicketPanel}>
          <div className={styles.mealTicketHeader}>
            <div className={styles.mealTicketTitle}>
              {assignment.ticketLabel}
            </div>
            <div className={styles.mealTicketMeta}>
              Code: {assignment.ticketCode}
            </div>
            <div className={styles.mealTicketMeta}>
              {assignment.productTitle}
            </div>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={assignment.isPurchaserTicket === true}
              onChange={(event) =>
                onChange(
                  updateTicketAssignmentBoolean({
                    assignments,
                    ticketCode: assignment.ticketCode,
                    field: "isPurchaserTicket",
                    value: event.target.checked,
                  }).map((item) =>
                    item.ticketCode === assignment.ticketCode &&
                    event.target.checked
                      ? {
                          ...item,
                          ownerEmail:
                            item.ownerEmail?.trim() || purchaserEmail,
                          emailTicketToOwner: false,
                        }
                      : item
                  )
                )
              }
            />
            <span>This is my ticket</span>
          </label>

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

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={
                assignment.isPurchaserTicket === true
                  ? false
                  : assignment.emailTicketToOwner !== false
              }
              disabled={assignment.isPurchaserTicket === true}
              onChange={(event) =>
                onChange(
                  updateTicketAssignmentBoolean({
                    assignments,
                    ticketCode: assignment.ticketCode,
                    field: "emailTicketToOwner",
                    value: event.target.checked,
                  })
                )
              }
            />
            <span>
              Email this ticket to the owner
              {assignment.ownerEmail?.trim()
                ? ` (${assignment.ownerEmail.trim()})`
                : ""}
            </span>
          </label>

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
            placeholder="Ticket owner email (optional)"
            style={{ borderColor: theme.colors.border }}
          />

          <input
            className={styles.input}
            value={assignment.ownerPhone ?? ""}
            onChange={(event) =>
              onChange(
                updateTicketAssignmentField({
                  assignments,
                  ticketCode: assignment.ticketCode,
                  field: "ownerPhone",
                  value: event.target.value,
                })
              )
            }
            placeholder="Ticket owner WhatsApp / phone (optional)"
            style={{ borderColor: theme.colors.border }}
          />

          {assignment.mealMode === "required" ? (
            <div className={styles.contactNote}>
              Meal selection required for this ticket.
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
              <span>
                Add meal for this ticket
                {assignment.mealAddOnPrice
                  ? ` +${formatCurrency(assignment.mealAddOnPrice, "USD")}`
                  : ""}
              </span>
            </label>
          ) : null}

          {(assignment.mealMode === "required" ||
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
              Select meal for this ticket
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MealSelectionRenderer({
    menu,
    assignments,
    selectedTicketCode,
    theme,
    onChange,
    onBackToTickets,
  }: {
    menu: MealMenu | null;
    assignments: TicketAssignments;
    selectedTicketCode: string;
    theme: ThemeConfig;
    onChange: (nextAssignments: TicketAssignments) => void;
    onBackToTickets: () => void;
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
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onBackToTickets}
        style={{
          borderColor: theme.colors.border,
          background: "#FFFFFF",
          color: theme.colors.text,
        }}
      >
        Back to ticket details
      </button>

      {mealAssignments.map((assignment) => (
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

          {menu.groups.map((group) => {
            const groupTotal = getTicketMealGroupTotal(assignment, group.id);
            const includedServings =
              typeof group.includedServings === "number"
                ? group.includedServings
                : group.required === false
                  ? 0
                  : 1;

            return (
              <div key={`${assignment.ticketCode}-${group.id}`} className={styles.mealGroup}>
                <div className={styles.mealGroupHeader}>
                  <div className={styles.mealGroupTitle}>{group.label}</div>
                  <div className={styles.mealGroupCount}>
                    {groupTotal} selected
                    {includedServings > 0 ? ` · ${includedServings} included` : ""}
                  </div>
                </div>

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
                          {option.label}
                          {option.price ? ` · ${formatCurrency(option.price, "USD")} extra` : ""}
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
      ))}
    </div>
  );
}

function MealSelectionSummaryRenderer({
  menu,
  assignments,
  mealExtraTotal,
  onAdjustMeals,
}: {
  menu: MealMenu | null;
  assignments: TicketAssignments;
  mealExtraTotal: number;
  onAdjustMeals: () => void;
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
          <button
            type="button"
            className={styles.adjustLinkButton}
            onClick={onAdjustMeals}
          >
            Adjust
          </button>
        </div>

        <div className={styles.reviewSummaryBody}>
          {mealAssignments.map((assignment) => (
            <div key={assignment.ticketCode}>
              <strong>
                {assignment.ownerName?.trim() || assignment.ticketLabel}
              </strong>
              <div>Code: {assignment.ticketCode}</div>

              {menu.groups.map((group) => {
                const selectedOptions = group.options
                  .map((option) => {
                    const quantity =
                      assignment.mealSelection?.[group.id]?.[option.id] ?? 0;

                    return quantity > 0
                      ? `${option.label} × ${quantity}`
                      : null;
                  })
                  .filter(Boolean);

                if (!selectedOptions.length) {
                  return null;
                }

                return (
                  <div key={`${assignment.ticketCode}-${group.id}`}>
                    {group.label}: {selectedOptions.join(", ")}
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
            <div>
              Meal add-ons / extra servings:{" "}
              {formatCurrency(mealExtraTotal, "USD")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
  showDeliveryFee,
  showDiscountTotal,
  showTotalWeight,
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
  showDeliveryFee?: boolean;
  showDiscountTotal?: boolean;
  showTotalWeight?: boolean;
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
              Discount total: -
              {formatCurrency(discountTotal, catalog.currencyCode)}
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
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasAppliedStartTimeRef = useRef(false);
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

    video.currentTime = (video.duration * videoSeekRequest.percent) / 100;
  }, [videoSeekRequest]);

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
              onVideoProgressChange?.({
                currentTime: video.currentTime,
                duration: video.duration,
              });
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