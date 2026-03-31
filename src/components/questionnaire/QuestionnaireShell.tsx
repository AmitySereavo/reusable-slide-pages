"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function QuestionnaireShell({ config, theme }: Props) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCurrentVerticalVideoPlaying, setIsCurrentVerticalVideoPlaying] =
    useState(false);

  const slideBodyRef = useRef<HTMLDivElement | null>(null);

  const [dynamicVariables, setDynamicVariables] = useState<
    Record<string, string | number>
  >({});

  const mergedVariables = useMemo(
    () => ({
      ...(config.variables ?? {}),
      ...dynamicVariables,
    }),
    [config.variables, dynamicVariables]
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
        })),
        answers
      ),
    [config.slides, answers, mergedVariables, evaluationContext]
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

        setDynamicVariables((prev) => ({
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

  return (
   <main
      className={styles.page}
      style={{
        backgroundColor:
          currentSlide.pageBackgroundColor ?? theme.colors.background,
        backgroundImage: currentSlide.pageBackgroundImage
          ? `url(${currentSlide.pageBackgroundImage})`
          : undefined,
        backgroundSize: currentSlide.pageBackgroundSize ?? "cover",
        backgroundPosition: currentSlide.pageBackgroundPosition ?? "center",
        backgroundRepeat: currentSlide.pageBackgroundImage
          ? "no-repeat"
          : undefined,
        color: theme.colors.text,
      }}
    >
      <div className={styles.pageInner}>
                <div
          className={`${styles.card} ${isMediaSlide ? styles.cardMedia : ""}`}
          style={{
            background: isMediaSlide
              ? theme.colors.card
              : withOpacity(theme.colors.card, currentSlide.cardOpacity),
            borderColor: theme.colors.border,
            borderRadius: theme.radius?.card ?? "24px",
            boxShadow: theme.shadow?.card,
          }}
        >
          <div
            className={`${styles.topSection} ${
              isMediaSlide ? styles.topSectionMedia : ""
            }`}
          >
            <div
              className={`${styles.contentFrame} ${
                isMediaSlide ? styles.contentFrameMedia : ""
              }`}
            >
              <div
                className={`${styles.progressWrap} ${
                  isMediaSlide ? styles.progressWrapMedia : ""
                }`}
              >
                {showStepText ? (
                  <div
                    className={`${styles.stepText} ${
                      isMediaSlide ? styles.stepTextOverlay : ""
                    }`}
                  >
                    Slide {currentStepNumber} of {totalStepCount}
                  </div>
                ) : null}

                <div
                  className={`${styles.progressBar} ${
                    isMediaSlide ? styles.progressBarOverlay : ""
                  }`}
                >
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${progress}%`,
                      background: theme.colors.primary,
                    }}
                  />
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
                    className={isMediaSlide ? styles.mediaStage : undefined}
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
            </div>
          </div>

          {hasPinnedChoices || hasVisibleNav ? (
            <div
              className={`${styles.actionBar} ${
                isMediaSlide ? styles.actionBarMedia : ""
              } ${
                isCurrentVerticalVideoPlaying && isVerticalMediaSlide
                  ? styles.actionBarShifted
                  : ""
              }`}
            >
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
                          background: isMediaSlide
                            ? "#ffffff"
                            : backButtonStyle.background,
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
                          background: isMediaSlide
                            ? "#111111"
                            : nextButtonStyle.background,
                          color: nextButtonStyle.color,
                          borderColor: isMediaSlide
                            ? "#111111"
                            : nextButtonStyle.borderColor,
                          borderRadius: theme.radius?.button ?? "14px",
                        }}
                      >
                        {isSubmitting
                          ? "Submitting..."
                          : currentSlide.nextLabel ?? "Next"}
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

  const resolveValueByKey = (key: string): string | undefined => {
    const answerValue = answers[key];
    if (answerValue !== undefined && answerValue !== null) {
      return String(answerValue);
    }

    const variableValue = variables?.[key];
    if (variableValue !== undefined && variableValue !== null) {
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