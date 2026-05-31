"use client";

import { useEffect, useState } from "react";

export type QuestionnaireAuthSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
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