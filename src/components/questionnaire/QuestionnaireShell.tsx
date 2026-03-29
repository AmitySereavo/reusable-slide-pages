"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./QuestionnaireShell.module.css";
import {
  FormField,
  PrimitiveValue,
  QuestionnaireAnswers,
  QuestionnaireConfig,
  SlideRouteRule,
  SlideSection,
  ThemeConfig,
} from "@/types/questionnaire";
import {
  getSlideIndexById,
  getVisibleSlides,
} from "@/lib/questionnaire/engine";

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

export default function QuestionnaireShell({ config, theme }: Props) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const visibleSlides = useMemo(
    () =>
      getVisibleSlides(
        config.slides.map((slide) => ({
          ...slide,
          title:
            replaceDynamicText(slide.title, answers, config.variables) ??
            slide.title,
          subtitle: replaceDynamicText(
            slide.subtitle,
            answers,
            config.variables
          ),
          body: replaceDynamicText(slide.body, answers, config.variables),
          helperText: replaceDynamicText(
            slide.helperText,
            answers,
            config.variables
          ),
          sections: slide.sections?.map((section) => {
            if (section.type === "break") return section;
            if (section.type === "feature") return section;

            return {
              ...section,
              text:
                replaceDynamicText(
                  section.text,
                  answers,
                  config.variables
                ) ?? section.text,
            };
          }),
        })),
        answers
      ),
    [config.slides, answers, config.variables]
  );

  const currentSlide = visibleSlides[currentIndex];

  function setAnswer(key: string, value: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
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
    const actual = answers[rule.field];

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

  async function runSlideAction(runName: string) {
    if (runName !== "submitLead") return true;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/questionnaires/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getLeadPayload()),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit lead.");
      }

      return true;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit lead."
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

  const progress = ((currentIndex + 1) / visibleSlides.length) * 100;
  const showBackButton = currentSlide.showBack !== false;
  const showNextButton = currentSlide.showNext !== false;
  const hasVisibleNav = showBackButton || showNextButton;
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

  return (
    <main
      className={styles.page}
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      <div className={styles.pageInner}>
        <div
          className={styles.card}
          style={{
            background: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius?.card ?? "24px",
            boxShadow: theme.shadow?.card,
          }}
        >
                    <div className={styles.topSection}>
            <div className={styles.contentFrame}>
              <div className={styles.progressWrap}>
                <div className={styles.stepText}>
                  Slide {currentIndex + 1} of {visibleSlides.length}
                </div>

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

              <div className={styles.slideBody}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide.id}
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -40, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderSections(
                      currentSlide.sections,
                      theme,
                      answers,
                      currentSlide.storeAs,
                      setAnswer
                    )}

                    {(currentSlide.type === "form" ||
                      currentSlide.type === "contact") &&
                    currentSlide.fields?.length ? (
                      <div className={styles.formGrid} style={{ marginTop: "20px" }}>
                        {currentSlide.fields.map((field) => (
                          <FormFieldRenderer
                            key={field.name}
                            field={field}
                            theme={theme}
                            answers={answers}
                            setAnswer={setAnswer}
                          />
                        ))}
                      </div>
                    ) : null}

                    {submitError ? (
                      <p className={styles.formError}>{submitError}</p>
                    ) : null}

                    <div className={styles.scrollBottomSpacer} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

                    {(hasPinnedChoices || hasVisibleNav) ? (
            <div className={styles.actionBar}>
              <div className={styles.actionFrame}>
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
                          className={styles.secondaryButton}
                          style={{
                            width: "100%",
                            maxWidth: "420px",
                            borderColor: choiceStyle.borderColor,
                            background: selected
                              ? choiceStyle.background
                              : "#FFFFFF",
                            color: selected
                              ? choiceStyle.color
                              : theme.colors.text,
                          }}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {hasVisibleNav ? (
                  <div className={styles.navRow}>
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
                        className={styles.secondaryButton}
                        style={{
                          borderColor: backButtonStyle.borderColor,
                          background: backButtonStyle.background,
                          color: backButtonStyle.color,
                        }}
                      >
                        {currentSlide.backLabel ?? "Back"}
                      </button>
                    ) : (
                      <div />
                    )}

                    {showNextButton ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canGoNext() || isSubmitting}
                        className={styles.primaryButton}
                        style={{
                          background: nextButtonStyle.background,
                          color: nextButtonStyle.color,
                          borderColor: nextButtonStyle.borderColor,
                          borderRadius: theme.radius?.button ?? "14px",
                        }}
                      >
                        {isSubmitting ? "Submitting..." : currentSlide.nextLabel ?? "Next"}
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function FormFieldRenderer({
  field,
  theme,
  answers,
  setAnswer,
}: {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  setAnswer: (key: string, value: string | number | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={Boolean(answers[field.name] ?? false)}
          onChange={(e) => setAnswer(field.name, e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        className={styles.input}
        placeholder={field.placeholder ?? field.label}
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

  return (
    <input
      className={styles.input}
      type={field.type}
      placeholder={field.placeholder ?? field.label}
      value={String(answers[field.name] ?? "")}
      onChange={(e) => setAnswer(field.name, e.target.value)}
      style={{ borderColor: theme.colors.border }}
    />
  );
}

function renderSections(
  sections: SlideSection[] | undefined,
  theme: ThemeConfig,
  answers: QuestionnaireAnswers,
  storeAs: string | undefined,
  setAnswer: (key: string, value: string | number | boolean) => void
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
  variables?: Record<string, string | number>
): string | undefined {
  if (value === undefined) return undefined;

  return value.replace(/\[([^\]]+)\]/g, (_, key) => {
    const answerValue = answers[key];
    if (answerValue !== undefined && answerValue !== null) {
      return String(answerValue);
    }

    const variableValue = variables?.[key];
    if (variableValue !== undefined && variableValue !== null) {
      return String(variableValue);
    }

    return `[${key}]`;
  });
}