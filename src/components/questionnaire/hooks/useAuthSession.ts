"use client";

import { useEffect, useState } from "react";

export type QuestionnaireAuthSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  adminLevel?: number;
  preferredCurrencyCode?: string;
  storeCreditBalance?: number;
  storeCreditPurchasedBalance?: number;
  storeCreditReturnedBalance?: number;
  storeCreditCurrencyCode?: string;
};

export function useAuthSession() {
  const [authSessionUser, setAuthSessionUser] =
    useState<QuestionnaireAuthSessionUser | null>(null);
  const [isAuthSessionLoaded, setIsAuthSessionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthSession() {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (cancelled) {
        return;
      }

      if (response.ok && data?.authenticated === true && data?.user) {
        setAuthSessionUser({
          id: String(data.user.id ?? ""),
          name: typeof data.user.name === "string" ? data.user.name : null,
          email: typeof data.user.email === "string" ? data.user.email : null,
          phone: typeof data.user.phone === "string" ? data.user.phone : null,
          adminLevel:
            typeof data.user.adminLevel === "number" ? data.user.adminLevel : 0,
          preferredCurrencyCode:
            typeof data.user.preferredCurrencyCode === "string"
              ? data.user.preferredCurrencyCode
              : "USD",
          storeCreditBalance:
            typeof data.user.storeCreditBalance === "number"
              ? data.user.storeCreditBalance
              : 0,
          storeCreditPurchasedBalance:
            typeof data.user.storeCreditPurchasedBalance === "number"
              ? data.user.storeCreditPurchasedBalance
              : 0,
          storeCreditReturnedBalance:
            typeof data.user.storeCreditReturnedBalance === "number"
              ? data.user.storeCreditReturnedBalance
              : 0,
          storeCreditCurrencyCode:
            typeof data.user.storeCreditCurrencyCode === "string"
              ? data.user.storeCreditCurrencyCode
              : "USD",
        });
      } else {
        setAuthSessionUser(null);
      }

      setIsAuthSessionLoaded(true);
    }

    void loadAuthSession().catch(() => {
      if (!cancelled) {
        setAuthSessionUser(null);
        setIsAuthSessionLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    authSessionUser,
    setAuthSessionUser,
    isAuthSessionLoaded,
    setIsAuthSessionLoaded,
  };
}
