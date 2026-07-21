"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "@/types/questionnaire";
import styles from "../QuestionnaireShell.module.css";

type DripCountdownPanelProps = {
  questionnaireSlug: string;
  sequenceKey: string;
  availableAt?: string;
  theme: ThemeConfig;
};

export default function DripCountdownPanel({
  questionnaireSlug,
  sequenceKey,
  availableAt,
  theme,
}: DripCountdownPanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const [fallbackAvailableAt, setFallbackAvailableAt] = useState<
    string | undefined
  >(availableAt);
  const resolvedAvailableAt = availableAt || fallbackAvailableAt;
  const targetTime = resolvedAvailableAt
    ? new Date(resolvedAvailableAt).getTime()
    : Number.NaN;
  const remainingMs = Number.isFinite(targetTime)
    ? Math.max(0, targetTime - now)
    : null;

  useEffect(() => {
    setFallbackAvailableAt(availableAt);
  }, [availableAt]);

  useEffect(() => {
    if (availableAt || !questionnaireSlug || !sequenceKey) {
      return;
    }

    const controller = new AbortController();

    async function loadCountdownStatus() {
      const response = await fetch(
        `/api/questionnaires/engagement/status?questionnaireSlug=${encodeURIComponent(
          questionnaireSlug
        )}&dripSequenceKey=${encodeURIComponent(sequenceKey)}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      ).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;
      const scheduledFor = data?.dripNextJob?.scheduledFor;

      if (typeof scheduledFor === "string") {
        setFallbackAvailableAt(scheduledFor);
      }
    }

    void loadCountdownStatus();

    return () => {
      controller.abort();
    };
  }, [availableAt, questionnaireSlug, sequenceKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div
      className={styles.dripCountdownPanel}
      style={{
        borderColor: theme.colors.border,
        background: theme.colors.card,
        color: theme.colors.text,
      }}
    >
      <div className={styles.dripCountdownLabel}>Next content opens in</div>
      <div className={styles.dripCountdownTime}>
        {remainingMs === null ? (
          <span className={styles.dripCountdownPending}>Scheduling...</span>
        ) : (
          formatDuration(remainingMs)
        )}
      </div>
      <div className={styles.dripCountdownMeta}>
        {remainingMs === 0
          ? "Refresh this page or open the next email link when it arrives."
          : resolvedAvailableAt
            ? `Available ${new Date(resolvedAvailableAt).toLocaleString()}`
            : "Your next chapter will appear here after the next email is scheduled."}
      </div>
    </div>
  );
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
