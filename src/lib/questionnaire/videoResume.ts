import type { Slide } from "@/types/questionnaire";

export type VideoResumeDecision = "continue" | "beginning";

export function getSavedVideoResumeSeconds(
  dbVideoProgressBySlideId: Record<string, number>,
  slideId: string
) {
  const savedSeconds = dbVideoProgressBySlideId[slideId];

  return typeof savedSeconds === "number" && savedSeconds > 0
    ? savedSeconds
    : 0;
}

export function getVideoStartSecondsForSlide(params: {
  currentSlide?: Slide;
  dbVideoProgressBySlideId: Record<string, number>;
  videoResumeOverrides: Record<string, number>;
  videoResumeDecisionBySlideId: Record<string, VideoResumeDecision>;
}) {
  const {
    currentSlide,
    dbVideoProgressBySlideId,
    videoResumeOverrides,
    videoResumeDecisionBySlideId,
  } = params;

  if (!currentSlide || currentSlide.mediaType !== "video") {
    return currentSlide?.videoStartAtSeconds;
  }

  const savedSeconds = getSavedVideoResumeSeconds(
    dbVideoProgressBySlideId,
    currentSlide.id
  );

  const resumeMode = currentSlide.videoResumeMode ?? "none";
  const slideDecision = videoResumeDecisionBySlideId[currentSlide.id];

  if (videoResumeOverrides[currentSlide.id] !== undefined) {
    return videoResumeOverrides[currentSlide.id];
  }

  if (resumeMode === "auto" && savedSeconds > 0) {
    return savedSeconds;
  }

  if (resumeMode === "prompt-once" && slideDecision === "continue") {
    return savedSeconds || currentSlide.videoStartAtSeconds;
  }

  if (resumeMode === "prompt-once" && slideDecision === "beginning") {
    return currentSlide.videoStartAtSeconds;
  }

  return currentSlide.videoStartAtSeconds;
}

export function shouldShowVideoResumePrompt(params: {
  currentSlide?: Slide;
  dbVideoProgressBySlideId: Record<string, number>;
  videoResumeOverrides: Record<string, number>;
  videoResumeDecisionBySlideId: Record<string, VideoResumeDecision>;
}) {
  const {
    currentSlide,
    dbVideoProgressBySlideId,
    videoResumeOverrides,
    videoResumeDecisionBySlideId,
  } = params;

  if (!currentSlide || currentSlide.mediaType !== "video") {
    return false;
  }

  const savedSeconds = getSavedVideoResumeSeconds(
    dbVideoProgressBySlideId,
    currentSlide.id
  );

  if (savedSeconds <= 0) {
    return false;
  }

  const resumeMode = currentSlide.videoResumeMode ?? "none";

  if (resumeMode === "prompt-every-time") {
    return videoResumeOverrides[currentSlide.id] === undefined;
  }

  if (resumeMode === "prompt-once") {
    return videoResumeDecisionBySlideId[currentSlide.id] === undefined;
  }

  return false;
}