"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { applyAccountProfileAutofill } from "@/lib/questionnaire/accountProfileAutofill";

type UseAccountProfileAutofillParams = {
  setAnswers: Dispatch<SetStateAction<QuestionnaireAnswers>>;
};

export function useAccountProfileAutofill({
  setAnswers,
}: UseAccountProfileAutofillParams) {
  const accountProfileAutofillHandledRef = useRef(false);

  useEffect(() => {
    if (accountProfileAutofillHandledRef.current) {
      return;
    }

    accountProfileAutofillHandledRef.current = true;

    async function prefillFormsFromAccountProfile() {
      const response = await fetch("/api/account/profile", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      const profile = data?.user ?? data?.profile ?? null;

      if (!profile || typeof profile !== "object") {
        return;
      }

      setAnswers((prev) => applyAccountProfileAutofill(prev, profile));
    }

    void prefillFormsFromAccountProfile().catch(() => null);
  }, [setAnswers]);
}