import type {
  PrimitiveValue,
  QuestionnaireAnswers,
} from "@/types/questionnaire";

export type LocalVideoProgressRecord = {
  questionnaireSlug: string;
  slideId: string;
  lastPositionSeconds: number;
  durationSeconds?: number | null;
  totalWatchSeconds?: number;
  maxPositionSeconds?: number;
  playEventCount?: number;
  seekForwardCount?: number;
  seekBackwardCount?: number;
  lastEventType?: "play" | "progress" | "seek_forward" | "seek_backward";
  watchedAt: string;
};

export type LocalQuestionAnswerRecord = {
  questionnaireSlug: string;
  slideId: string;
  questionKey: string;
  answer: PrimitiveValue;
  answeredAt: string;
};

export type LocalBookmarkEventRecord = {
  id: string;
  questionnaireSlug: string;
  slideId: string;
  slideLabel?: string | null;
  bookmarkKind: "chapter" | "video";
  action: "saved" | "started";
  triggerType: "manual" | "automatic";
  bookmarkedAt: string;
  videoTimestampSeconds?: number | null;
  videoDurationSeconds?: number | null;
};

export type LocalEngagementSnapshot = {
  questionnaireSlug: string;
  videoProgress: LocalVideoProgressRecord[];
  questionAnswers: LocalQuestionAnswerRecord[];
  bookmarkEvents: LocalBookmarkEventRecord[];
};

function getStorageKey(questionnaireSlug: string) {
  return `questionnaire-engagement:${questionnaireSlug}`;
}

export function getLocalVisitorDeviceKey() {
  if (typeof window === "undefined") {
    return "";
  }

  const storageKey = "questionnaire:visitor-device-key";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextKey =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `visitor-${crypto.randomUUID()}`
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(storageKey, nextKey);
  return nextKey;
}

function readRaw(questionnaireSlug: string): LocalEngagementSnapshot {
  if (typeof window === "undefined") {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
      bookmarkEvents: [],
    };
  }

  const raw = window.localStorage.getItem(getStorageKey(questionnaireSlug));

  if (!raw) {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
      bookmarkEvents: [],
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
      bookmarkEvents: Array.isArray(parsed?.bookmarkEvents)
        ? parsed.bookmarkEvents
        : [],
    };
  } catch {
    return {
      questionnaireSlug,
      videoProgress: [],
      questionAnswers: [],
      bookmarkEvents: [],
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
  const currentTimeSeconds = Math.max(0, params.currentTime);
  const lastPositionSeconds = Math.floor(currentTimeSeconds);

  if (!Number.isFinite(lastPositionSeconds) || lastPositionSeconds < 3) {
    return;
  }

  const snapshot = readRaw(params.questionnaireSlug);
  const existingRecord = snapshot.videoProgress.find(
    (item) => item.slideId === params.slideId
  );
  const previousPosition =
    typeof existingRecord?.lastPositionSeconds === "number"
      ? Math.max(0, existingRecord.lastPositionSeconds)
      : null;
  const positionDelta =
    previousPosition === null ? 0 : currentTimeSeconds - previousPosition;
  const isNormalPlayback = positionDelta > 0 && positionDelta <= 3;
  const isForwardSeek = positionDelta > 5;
  const isBackwardSeek = positionDelta < -3;
  const watchedDelta = isNormalPlayback ? Math.round(positionDelta) : 0;
  const totalWatchSeconds = Math.max(
    0,
    Math.floor(existingRecord?.totalWatchSeconds ?? 0) + watchedDelta
  );
  const maxPositionSeconds = Math.max(
    Math.floor(existingRecord?.maxPositionSeconds ?? 0),
    lastPositionSeconds
  );
  const playEventCount =
    (existingRecord?.playEventCount ?? 0) + (previousPosition === null ? 1 : 0);
  const seekForwardCount =
    (existingRecord?.seekForwardCount ?? 0) + (isForwardSeek ? 1 : 0);
  const seekBackwardCount =
    (existingRecord?.seekBackwardCount ?? 0) + (isBackwardSeek ? 1 : 0);
  const lastEventType = isForwardSeek
    ? "seek_forward"
    : isBackwardSeek
      ? "seek_backward"
      : previousPosition === null
        ? "play"
        : "progress";

  const nextRecord: LocalVideoProgressRecord = {
    questionnaireSlug: params.questionnaireSlug,
    slideId: params.slideId,
    lastPositionSeconds,
    durationSeconds:
      typeof params.duration === "number" && Number.isFinite(params.duration)
        ? Math.floor(params.duration)
        : null,
    totalWatchSeconds,
    maxPositionSeconds,
    playEventCount,
    seekForwardCount,
    seekBackwardCount,
    lastEventType,
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

export function writeLocalBookmarkEvent(params: {
  questionnaireSlug: string;
  slideId: string;
  slideLabel?: string | null;
  bookmarkKind: "chapter" | "video";
  action?: "saved" | "started";
  triggerType?: "manual" | "automatic";
  videoTimestampSeconds?: number | null;
  videoDurationSeconds?: number | null;
}) {
  const snapshot = readRaw(params.questionnaireSlug);
  const bookmarkedAt = new Date().toISOString();
  const safeTimestamp =
    typeof params.videoTimestampSeconds === "number" &&
    Number.isFinite(params.videoTimestampSeconds)
      ? Math.max(0, Math.floor(params.videoTimestampSeconds))
      : null;
  const safeDuration =
    typeof params.videoDurationSeconds === "number" &&
    Number.isFinite(params.videoDurationSeconds)
      ? Math.max(0, Math.floor(params.videoDurationSeconds))
      : null;

  const nextRecord: LocalBookmarkEventRecord = {
    id: `bookmark-${bookmarkedAt}-${params.slideId}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    questionnaireSlug: params.questionnaireSlug,
    slideId: params.slideId,
    slideLabel: params.slideLabel || null,
    bookmarkKind: params.bookmarkKind,
    action: params.action || "saved",
    triggerType: params.triggerType || "manual",
    bookmarkedAt,
    videoTimestampSeconds: safeTimestamp,
    videoDurationSeconds: safeDuration,
  };

  snapshot.bookmarkEvents = [...snapshot.bookmarkEvents, nextRecord].slice(-80);

  writeRaw(params.questionnaireSlug, snapshot);

  return nextRecord;
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
