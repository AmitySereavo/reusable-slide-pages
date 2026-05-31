"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Slide } from "@/types/questionnaire";
import { getSlideIndexById } from "@/lib/questionnaire/engine";

type UseLoginReturnSlideParams = {
  authSessionUserId?: string | null;
  currentIndex: number;
  isAuthSessionLoaded: boolean;
  searchParams: ReadonlyURLSearchParams;
  visibleSlides: Slide[];
  setHistory: Dispatch<SetStateAction<number[]>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
};

export function useLoginReturnSlide({
  authSessionUserId,
  currentIndex,
  isAuthSessionLoaded,
  searchParams,
  visibleSlides,
  setHistory,
  setCurrentIndex,
}: UseLoginReturnSlideParams) {
  const loginReturnHandledRef = useRef(false);

  useEffect(() => {
    if (
      loginReturnHandledRef.current ||
      !isAuthSessionLoaded ||
      !authSessionUserId
    ) {
      return;
    }

    const returnSlideId = searchParams.get("loginReturnSlide");

    if (!returnSlideId) {
      return;
    }

    loginReturnHandledRef.current = true;

    const targetIndex = getSlideIndexById(visibleSlides, returnSlideId);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("loginReturnSlide");
    window.history.replaceState(
      null,
      "",
      `${nextUrl.pathname}${nextUrl.search}`
    );

    if (targetIndex < 0 || targetIndex === currentIndex) {
      return;
    }

    setHistory([]);
    setCurrentIndex(targetIndex);
  }, [
    authSessionUserId,
    currentIndex,
    isAuthSessionLoaded,
    searchParams,
    setCurrentIndex,
    setHistory,
    visibleSlides,
  ]);
}