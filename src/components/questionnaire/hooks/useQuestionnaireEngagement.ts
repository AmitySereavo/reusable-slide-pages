"use client";

import { useEffect } from "react";
import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getClientDeviceProfile } from "@/lib/device/clientDeviceProfile";
import { readLocalEngagementSnapshot } from "@/lib/questionnaire/engagementTracking";

type UseQuestionnaireEngagementParams = {
  questionnaireSlug: string;
  authSessionUserId?: string | null;
  isAuthSessionLoaded: boolean;
  setAnsweredQuestionSlideIds: Dispatch<SetStateAction<string[]>>;
  setDbVideoProgressBySlideId: Dispatch<SetStateAction<Record<string, number>>>;
  currentSlideId?: string | null;
  guideLinkToken?: string | null;
};

export function useQuestionnaireEngagement({
  questionnaireSlug,
  authSessionUserId,
  isAuthSessionLoaded,
  setAnsweredQuestionSlideIds,
  setDbVideoProgressBySlideId,
  currentSlideId,
  guideLinkToken,
}: UseQuestionnaireEngagementParams) {
  const trackedGuideSlideRef = useRef("");

  useEffect(() => {
    if (!guideLinkToken || !questionnaireSlug.endsWith("-grow-guide") || !currentSlideId) {
      return;
    }

    const trackingKey = `${guideLinkToken}:${questionnaireSlug}:${currentSlideId}`;
    if (trackedGuideSlideRef.current === trackingKey) {
      return;
    }

    trackedGuideSlideRef.current = trackingKey;

    fetch("/api/grow-guide-links/track", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: guideLinkToken,
        questionnaireSlug,
        slideId: currentSlideId,
        eventType: "slide_view",
        deviceProfile: getClientDeviceProfile(),
      }),
    }).catch(() => null);
  }, [currentSlideId, guideLinkToken, questionnaireSlug]);

  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUserId) {
      return;
    }

    async function syncAndLoadEngagement() {
      const snapshot = readLocalEngagementSnapshot(questionnaireSlug);

      await fetch("/api/questionnaires/engagement/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionnaireSlug,
          source: "client-session-sync",
          snapshot,
        }),
      }).catch(() => null);

      const response = await fetch(
        `/api/questionnaires/engagement/status?questionnaireSlug=${encodeURIComponent(
          questionnaireSlug
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
  }, [
    authSessionUserId,
    isAuthSessionLoaded,
    questionnaireSlug,
    setAnsweredQuestionSlideIds,
    setDbVideoProgressBySlideId,
  ]);
}
