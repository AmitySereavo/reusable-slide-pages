"use client";

import { useEffect, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Slide } from "@/types/questionnaire";
import { getSlideIndexById } from "@/lib/questionnaire/engine";

type UseUrlSyncedSlideParams = {
  currentIndex: number;
  currentSlide?: Slide;
  visibleSlides: Slide[];
  searchParams: ReadonlyURLSearchParams;
  setHistory: React.Dispatch<React.SetStateAction<number[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
};

export function useUrlSyncedSlide({
  currentIndex,
  currentSlide,
  visibleSlides,
  searchParams,
  setHistory,
  setCurrentIndex,
}: UseUrlSyncedSlideParams) {
  const urlSlideHandledRef = useRef(false);

  useEffect(() => {
    if (urlSlideHandledRef.current) {
      return;
    }

    const slideId = searchParams.get("slide");

    if (!slideId) {
      return;
    }

    const targetIndex = getSlideIndexById(visibleSlides, slideId);

    if (targetIndex < 0) {
      return;
    }

    urlSlideHandledRef.current = true;

    if (targetIndex !== currentIndex) {
      setHistory([]);
      setCurrentIndex(targetIndex);
    }
  }, [currentIndex, searchParams, setCurrentIndex, setHistory, visibleSlides]);

  useEffect(() => {
    if (!currentSlide?.syncUrl) {
      return;
    }

    const currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.get("slide") === currentSlide.id) {
      return;
    }

    currentUrl.searchParams.set("slide", currentSlide.id);

    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}`
    );
  }, [currentSlide]);
}