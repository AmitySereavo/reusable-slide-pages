import type {
  PrimitiveValue,
  QuestionnaireAnswers,
} from "@/types/questionnaire";

export type LocalVideoProgressRecord = {
  questionnaireSlug: string;
  slideId: string;
  lastPositionSeconds: number;
  durationSeconds?: number | null;
  watchedAt: string;
};

export type LocalQuestionAnswerRecord = {
  questionnaireSlug: string;
  slideId: string;
  questionKey: string;
  answer: PrimitiveValue;
  answeredAt: string;
};

export type LocalEngagementSnapshot = {
  questionnaireSlug: string;
  videoProgress: LocalVideoProgressRecord[];
  questionAnswers: LocalQuestionAnswerRecord[];
};

function getStorageKey(questionnaireSlug: string) {
  return `questionnaire-engagement:${questionnaireSlug}`;
}

function readRaw(questionnaireSlug: string): LocalEngagementSnapshot {
  if (typeof window === "undefined") {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
    };
  }

  const raw = window.localStorage.getItem(getStorageKey(questionnaireSlug));

  if (!raw) {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
    };
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      questionnaireSlug,
      videoProgress: Array.isArray(parsed?.videoProgress)
        ? parsed.videoProgress
        : [],
      questionAnswers: Array.isArray(parsed?.questionAnswers)
        ? parsed.questionAnswers
        : [],
    };
  } catch {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
    };
  }
}

function writeRaw(questionnaireSlug: string, snapshot: LocalEngagementSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(questionnaireSlug),
    JSON.stringify(snapshot)
  );
}

export function readLocalEngagementSnapshot(
  questionnaireSlug: string
): LocalEngagementSnapshot {
  return readRaw(questionnaireSlug);
}

export function writeLocalVideoProgress(params: {
  questionnaireSlug: string;
  slideId: string;
  currentTime: number;
  duration?: number | null;
}) {
  const lastPositionSeconds = Math.max(0, Math.floor(params.currentTime));

  if (!Number.isFinite(lastPositionSeconds) || lastPositionSeconds < 3) {
    return;
  }

  const snapshot = readRaw(params.questionnaireSlug);

  const nextRecord: LocalVideoProgressRecord = {
    questionnaireSlug: params.questionnaireSlug,
    slideId: params.slideId,
    lastPositionSeconds,
    durationSeconds:
      typeof params.duration === "number" && Number.isFinite(params.duration)
        ? Math.floor(params.duration)
        : null,
    watchedAt: new Date().toISOString(),
  };

  snapshot.videoProgress = [
    ...snapshot.videoProgress.filter(
      (item) => item.slideId !== params.slideId
    ),
    nextRecord,
  ];

  writeRaw(params.questionnaireSlug, snapshot);
}

export function writeLocalQuestionAnswer(params: {
  questionnaireSlug: string;
  slideId: string;
  questionKey: string;
  answer: PrimitiveValue;
}) {
  const snapshot = readRaw(params.questionnaireSlug);

  const nextRecord: LocalQuestionAnswerRecord = {
    questionnaireSlug: params.questionnaireSlug,
    slideId: params.slideId,
    questionKey: params.questionKey,
    answer: params.answer,
    answeredAt: new Date().toISOString(),
  };

  snapshot.questionAnswers = [
    ...snapshot.questionAnswers.filter(
      (item) => item.questionKey !== params.questionKey
    ),
    nextRecord,
  ];

  writeRaw(params.questionnaireSlug, snapshot);
}

export function mergeAnsweredQuestionAnswers(
  answers: QuestionnaireAnswers,
  questionAnswers: LocalQuestionAnswerRecord[]
): QuestionnaireAnswers {
  const nextAnswers = { ...answers };

  for (const item of questionAnswers) {
    nextAnswers[item.questionKey] = item.answer;
  }

  return nextAnswers;
}

export function clearLocalEngagementSnapshot(questionnaireSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getStorageKey(questionnaireSlug));
}

export function clearAllReadableCookies() {
  if (typeof document === "undefined") {
    return;
  }

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();

    if (!name) {
      continue;
    }

    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

export function getResumeDecisionStorageKey(questionnaireSlug: string) {
  return `questionnaire-video-resume-decision:${questionnaireSlug}`;
}

export function readResumeDecision(questionnaireSlug: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(
    getResumeDecisionStorageKey(questionnaireSlug)
  );

  return value === "continue" || value === "beginning" ? value : null;
}

export function writeResumeDecision(
  questionnaireSlug: string,
  decision: "continue" | "beginning"
) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getResumeDecisionStorageKey(questionnaireSlug),
    decision
  );
}

export function clearResumeDecision(questionnaireSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getResumeDecisionStorageKey(questionnaireSlug));
}