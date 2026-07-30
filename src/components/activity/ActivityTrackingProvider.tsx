"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import {
  APP_ACTIVITY_EVENT,
  trackActivity as dispatchActivity,
} from "@/lib/activity/trackActivity";
import type { ActivityEvent, ActivityIdentity } from "@/lib/activity/types";

type StoredActivityState = ActivityIdentity & {
  sessionCount: number;
  meaningfulPageViewCount: number;
  totalEngagedSeconds: number;
  persisted: boolean;
  recentEvents: Array<ActivityEvent & { occurredAt: string }>;
  dedupeKeys: string[];
};

type ActivityContextValue = {
  trackActivity: (event: ActivityEvent) => void;
};

const STORAGE_KEY = "app-activity:visitor-state";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ENGAGED_PAGE_SECONDS = 20;
const MAX_RECENT_EVENTS = 80;
const MAX_DEDUPE_KEYS = 240;
const INTEREST_EVENT_TYPES = new Set([
  "questionnaire_started",
  "questionnaire_answered",
  "questionnaire_completed",
  "bookmark_created",
  "bookmark_resumed",
  "video_progress_50",
  "video_progress_90",
  "video_completed",
  "product_viewed",
  "cart_item_added",
  "checkout_started",
  "purchase_completed",
  "download_requested",
]);

const ActivityTrackingContext = createContext<ActivityContextValue>({
  trackActivity: dispatchActivity,
});

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getExistingVisitorId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("questionnaire:visitor-device-key") || "";
}

function createInitialState(): StoredActivityState {
  const createdAt = nowIso();
  const existingVisitorId = getExistingVisitorId();
  const visitorId = existingVisitorId || makeId("visitor");

  if (typeof window !== "undefined" && !existingVisitorId) {
    window.localStorage.setItem("questionnaire:visitor-device-key", visitorId);
  }

  return {
    visitorId,
    sessionId: makeId("session"),
    firstSeenAt: createdAt,
    lastSeenAt: createdAt,
    sessionStartedAt: createdAt,
    anonymousInterestScore: 0,
    sessionCount: 1,
    meaningfulPageViewCount: 0,
    totalEngagedSeconds: 0,
    persisted: false,
    recentEvents: [],
    dedupeKeys: [],
  };
}

function readStoredState(): StoredActivityState {
  if (typeof window === "undefined") return createInitialState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();

  try {
    const parsed = JSON.parse(raw) as Partial<StoredActivityState>;
    const fallback = createInitialState();
    return {
      ...fallback,
      ...parsed,
      visitorId:
        typeof parsed.visitorId === "string" && parsed.visitorId
          ? parsed.visitorId
          : fallback.visitorId,
      sessionId:
        typeof parsed.sessionId === "string" && parsed.sessionId
          ? parsed.sessionId
          : fallback.sessionId,
      recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
      dedupeKeys: Array.isArray(parsed.dedupeKeys) ? parsed.dedupeKeys : [],
    };
  } catch {
    return createInitialState();
  }
}

function writeStoredState(state: StoredActivityState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function shouldNoopForPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api")
  );
}

function stringifyDedupeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function getEventDedupeKey(event: ActivityEvent, path: string) {
  const properties = event.properties ?? {};
  if (event.type === "page_view" || event.type === "engaged_page_view") {
    return `${event.type}:${path}`;
  }
  if (event.type.startsWith("video_")) {
    return `${event.type}:${stringifyDedupeValue(
      properties.videoId ?? properties.slideId
    )}`;
  }
  if (event.type === "product_viewed") {
    return `${event.type}:${stringifyDedupeValue(
      properties.productId ?? properties.product
    )}`;
  }
  if (event.type === "download_requested") {
    return `${event.type}:${stringifyDedupeValue(
      properties.downloadKey ?? properties.download
    )}`;
  }
  if (event.type === "questionnaire_step_viewed") {
    return `${event.type}:${stringifyDedupeValue(
      properties.questionnaireSlug
    )}:${stringifyDedupeValue(properties.slideId)}`;
  }

  return `${event.type}:${path}:${stringifyDedupeValue(properties.eventKey)}`;
}

function scoreForEvent(event: ActivityEvent) {
  if (event.type === "engaged_page_view") return 1;
  if (event.type === "page_view") return 0;
  return INTEREST_EVENT_TYPES.has(event.type) ? 2 : 1;
}

function hasCrossedInterestThreshold(state: StoredActivityState) {
  return (
    state.sessionCount >= 2 ||
    state.meaningfulPageViewCount >= 3 ||
    state.totalEngagedSeconds >= 60 ||
    state.anonymousInterestScore >= 3
  );
}

async function persistActivity(state: StoredActivityState, event: ActivityEvent) {
  const properties = event.properties ?? {};

  await fetch("/api/visitors/activity", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceKey: state.visitorId,
      eventType: event.type,
      questionnaireSlug: properties.questionnaireSlug,
      slideId: properties.slideId,
      slideLabel: properties.slideLabel,
      path: properties.path,
      metadata: {
        source: event.source,
        sessionId: state.sessionId,
        occurredAt: event.occurredAt,
        visitorFirstSeenAt: state.firstSeenAt,
        visitorSessionStartedAt: state.sessionStartedAt,
        anonymousInterestScore: state.anonymousInterestScore,
        ...properties,
      },
    }),
  }).catch(() => null);
}

export function useActivityTracking() {
  return useContext(ActivityTrackingContext);
}

export default function ActivityTrackingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "/";
  const isDisabledRef = useRef(false);
  const stateRef = useRef<StoredActivityState | null>(null);
  const previousPathRef = useRef("");

  useEffect(() => {
    if (shouldNoopForPath(pathname)) {
      isDisabledRef.current = true;
      return;
    }

    fetch("/api/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        const adminLevel = Number(data?.user?.adminLevel || 0);
        isDisabledRef.current = adminLevel >= 1;
      })
      .catch(() => {
        isDisabledRef.current = false;
      });
  }, [pathname]);

  const processActivity = useCallback(
    (inputEvent: ActivityEvent) => {
      if (typeof window === "undefined" || isDisabledRef.current) return;

      const currentPath =
        typeof inputEvent.properties?.path === "string"
          ? inputEvent.properties.path
          : `${window.location.pathname}${window.location.search}`;

      if (shouldNoopForPath(window.location.pathname)) return;

      const occurredAt = inputEvent.occurredAt || nowIso();
      let state = stateRef.current ?? readStoredState();
      const lastSeenMs = Date.parse(state.lastSeenAt);
      const isReturnSession =
        Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs > SESSION_TIMEOUT_MS;

      if (isReturnSession) {
        state = {
          ...state,
          sessionId: makeId("session"),
          sessionStartedAt: occurredAt,
          sessionCount: state.sessionCount + 1,
        };
      }

      const event: ActivityEvent & { occurredAt: string } = {
        ...inputEvent,
        occurredAt,
        properties: {
          ...(inputEvent.properties ?? {}),
          path: currentPath,
          title: document.title,
          referrer: document.referrer || "",
        },
      };
      const dedupeKey = getEventDedupeKey(event, currentPath);

      if (state.dedupeKeys.includes(dedupeKey)) {
        state.lastSeenAt = occurredAt;
        stateRef.current = state;
        writeStoredState(state);
        return;
      }

      const isMeaningfulPageView = event.type === "engaged_page_view";
      const totalEngagedSeconds =
        state.totalEngagedSeconds +
        (event.type === "engaged_page_view" ? ENGAGED_PAGE_SECONDS : 0);

      const nextState: StoredActivityState = {
        ...state,
        lastSeenAt: occurredAt,
        anonymousInterestScore:
          state.anonymousInterestScore + scoreForEvent(event),
        meaningfulPageViewCount:
          state.meaningfulPageViewCount + (isMeaningfulPageView ? 1 : 0),
        totalEngagedSeconds,
        recentEvents: [...state.recentEvents, event].slice(-MAX_RECENT_EVENTS),
        dedupeKeys: [...state.dedupeKeys, dedupeKey].slice(-MAX_DEDUPE_KEYS),
      };

      stateRef.current = nextState;
      writeStoredState(nextState);

      if (hasCrossedInterestThreshold(nextState)) {
        void persistActivity(nextState, event);
      }

      if (isReturnSession) {
        void persistActivity(nextState, {
          type: "return_session",
          source: "navigation",
          occurredAt,
          properties: { path: currentPath },
        });
      }
    },
    []
  );

  useEffect(() => {
    function handleActivityEvent(event: Event) {
      const detail = (event as CustomEvent<ActivityEvent>).detail;
      if (detail?.type && detail?.source) {
        processActivity(detail);
      }
    }

    window.addEventListener(APP_ACTIVITY_EVENT, handleActivityEvent);
    return () => {
      window.removeEventListener(APP_ACTIVITY_EVENT, handleActivityEvent);
    };
  }, [processActivity]);

  useEffect(() => {
    if (isDisabledRef.current || shouldNoopForPath(pathname)) return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (previousPathRef.current === currentPath) return;
    previousPathRef.current = currentPath;

    processActivity({
      type: "page_view",
      source: "navigation",
      properties: { path: currentPath },
    });

    let engagementSaved = false;
    const saveEngagement = () => {
      if (engagementSaved) return;
      engagementSaved = true;
      processActivity({
        type: "engaged_page_view",
        source: "navigation",
        properties: { path: currentPath },
      });
    };
    const timer = window.setTimeout(saveEngagement, ENGAGED_PAGE_SECONDS * 1000);

    function handleScroll() {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const scrollDepth = window.scrollY / scrollableHeight;
      if (scrollDepth >= 0.5) saveEngagement();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, processActivity]);

  const contextValue = useMemo(
    () => ({ trackActivity: processActivity }),
    [processActivity]
  );

  return (
    <ActivityTrackingContext.Provider value={contextValue}>
      {children}
    </ActivityTrackingContext.Provider>
  );
}
