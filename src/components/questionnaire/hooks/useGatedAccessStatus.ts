"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Slide } from "@/types/questionnaire";
import { getSlideIndexById } from "@/lib/questionnaire/engine";
import type { GatedAccessConfig, GatedAccessState } from "@/lib/questionnaire/accessConfig";
import type { QuestionnaireAuthSessionUser } from "./useAuthSession";

type UseGatedAccessStatusParams = {
  questionnaireSlug: string;
  gatedAccessConfig: GatedAccessConfig | null;
  authSessionUserId?: string | null;
  isAuthSessionLoaded: boolean;
  searchParams: ReadonlyURLSearchParams;
  visibleSlides: Slide[];
  setAuthSessionUser: Dispatch<
    SetStateAction<QuestionnaireAuthSessionUser | null>
  >;
  setGatedAccessState: Dispatch<SetStateAction<GatedAccessState | null>>;
  setHistory: Dispatch<SetStateAction<number[]>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
};

async function fetchCurrentSessionUser() {
  const response = await fetch("/api/session", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.authenticated !== true || !data?.user?.id) {
    return null;
  }

  return {
    id: String(data.user.id),
    name: typeof data.user.name === "string" ? data.user.name : null,
    email: typeof data.user.email === "string" ? data.user.email : null,
    phone: typeof data.user.phone === "string" ? data.user.phone : null,
  };
}

function normalizeAuthenticatedUser(user: unknown) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const record = user as Record<string, unknown>;

  if (!record.id) {
    return null;
  }

  return {
    id: String(record.id),
    name: typeof record.name === "string" ? record.name : null,
    email: typeof record.email === "string" ? record.email : null,
    phone: typeof record.phone === "string" ? record.phone : null,
  };
}

export function useGatedAccessStatus({
  questionnaireSlug,
  gatedAccessConfig,
  authSessionUserId,
  isAuthSessionLoaded,
  searchParams,
  visibleSlides,
  setAuthSessionUser,
  setGatedAccessState,
  setHistory,
  setCurrentIndex,
}: UseGatedAccessStatusParams) {
  const gatedAccessHandledRef = useRef(false);

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
            resumePromptSlideId:
              gatedAccessConfig?.resumePromptSlideId ?? null,
          });

          setHistory([]);
          setCurrentIndex(targetIndex);
        }

        return;
      }

      if (authSessionUserId) {
        return;
      }

      const response = await fetch(
        `/api/questionnaires/gated-access/status?questionnaireSlug=${encodeURIComponent(
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

      if (!response.ok || !data?.hasAccess || !data?.access?.goto) {
        return;
      }

      const targetGoto = String(data.access.goto);

      const authenticatedUser =
        normalizeAuthenticatedUser(data?.authenticatedUser) ??
        (await fetchCurrentSessionUser());

        if (authenticatedUser) {
        setAuthSessionUser(authenticatedUser);
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
    authSessionUserId,
    gatedAccessConfig,
    isAuthSessionLoaded,
    questionnaireSlug,
    searchParams,
    setAuthSessionUser,
    setCurrentIndex,
    setGatedAccessState,
    setHistory,
    visibleSlides,
  ]);
}