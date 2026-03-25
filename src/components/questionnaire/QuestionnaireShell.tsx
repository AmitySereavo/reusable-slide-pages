"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./QuestionnaireShell.module.css";
import {
  FormField,
  QuestionnaireAnswers,
  QuestionnaireConfig,
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
          title: replaceDynamicText(slide.title, answers) ?? slide.title,
          subtitle: replaceDynamicText(slide.subtitle, answers),
          body: replaceDynamicText(slide.body, answers),
          helperText: replaceDynamicText(slide.helperText, answers),
          sections: slide.sections?.map((section) => {
            if (section.type === "break") return section;
            if (section.type === "feature") return section;

            return {
              ...section,
              text: replaceDynamicText(section.text, answers) ?? section.text,
            };
          }),
        })),
        answers
      ),
    [config.slides, answers]
  );

  const currentSlide = visibleSlides[currentIndex];

  function setAnswer(key: string, value: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (!currentSlide) return;

    if (currentSlide.goto) {
      const targetIndex = getSlideIndexById(visibleSlides, currentSlide.goto);

      if (targetIndex !== -1 && targetIndex !== currentIndex) {
        setHistory((prev) => [...prev, currentIndex]);
        setCurrentIndex(targetIndex);
        return;
      }
    }

    if (currentIndex < visibleSlides.length - 1) {
      setHistory((prev) => [...prev, currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function back() {
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
      whatsappOptIn: answers.whatsappOptIn === true,
      selfScore: answers.selfScore ?? null,
      futureScore: answers.futureScore ?? null,
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

                  {(currentSlide.type === "form" || currentSlide.type === "contact") &&
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
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className={styles.bottomSection}>
            <div className={styles.navRow}>
              <button
                type="button"
                onClick={back}
                disabled={currentIndex === 0 && history.length === 0 || isSubmitting}
                className={styles.secondaryButton}
                style={{
                  borderColor: theme.colors.border,
                }}
              >
                {currentSlide.backLabel ?? "Back"}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext() || isSubmitting}
                className={styles.primaryButton}
                style={{
                  background: theme.colors.primary,
                  borderRadius: theme.radius?.button ?? "14px",
                }}
              >
                {isSubmitting ? "Submitting..." : currentSlide.nextLabel ?? "Next"}
              </button>
            </div>
          </div>
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
        style={{ borderColor: theme.colors.border, minHeight: "120px", resize: "vertical" }}
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
                color: theme.colors.accent ?? theme.colors.primary,
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
                color: theme.colors.subtitle ?? theme.colors.primary,
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
          <p key={`paragraph-${index}`} className={styles.body}>
            {section.text}
          </p>
        );
      })}
    </div>
  );
}

function replaceDynamicText(
  value: string | undefined,
  answers: QuestionnaireAnswers
): string | undefined {
  if (value === undefined) return undefined;

  const statsCount = 124;
  const statsCount2 = 57;
  const selfScore = answers.selfScore ?? 5;
  const futureScore = answers.futureScore ?? 5;

  return value
    .replaceAll("[statsCount]", String(statsCount))
    .replaceAll("[statsCount2]", String(statsCount2))
    .replaceAll("[selfScore]", String(selfScore))
    .replaceAll("[futureScore]", String(futureScore));
}