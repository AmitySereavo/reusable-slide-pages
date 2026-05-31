"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Slide } from "@/types/questionnaire";
import { getSlideIndexById } from "@/lib/questionnaire/engine";
import type { GatedAccessConfig } from "@/lib/questionnaire/accessConfig";

type UseLoggedInGateBypassParams = {
  authSessionUserId?: string | null;
  currentIndex: number;
  currentSlide?: Slide;
  gatedAccessConfig: GatedAccessConfig | null;
  isAuthSessionLoaded: boolean;
  visibleSlides: Slide[];
  setHistory: Dispatch<SetStateAction<number[]>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
};

export function useLoggedInGateBypass({
  authSessionUserId,
  currentIndex,
  currentSlide,
  gatedAccessConfig,
  isAuthSessionLoaded,
  visibleSlides,
  setHistory,
  setCurrentIndex,
}: UseLoggedInGateBypassParams) {
  useEffect(() => {
    if (!isAuthSessionLoaded || !authSessionUserId || !currentSlide) {
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
    authSessionUserId,
    currentIndex,
    currentSlide,
    gatedAccessConfig,
    isAuthSessionLoaded,
    setCurrentIndex,
    setHistory,
    visibleSlides,
  ]);
}