"use client";

import { SlideFooterAction } from "@/types/questionnaire";
import styles from "../QuestionnaireShell.module.css";

type MediaState = {
  isMuted: boolean;
  isPlaying: boolean;
};

type Props = {
  actions: SlideFooterAction[];
  downloadLabel?: string;
  isLoggedIn: boolean;
  isAuthSessionLoaded: boolean;
  isSubmitting: boolean;
  mediaState: MediaState;
  onAction: (action: SlideFooterAction) => void;
};

export default function SlideFooterActions({
  actions,
  downloadLabel,
  isLoggedIn,
  isAuthSessionLoaded,
  isSubmitting,
  mediaState,
  onAction,
}: Props) {
  const visibleActions = actions.filter((action) => {
    if (action.visibility === "logged-in") {
      return isLoggedIn;
    }

    if (action.visibility === "logged-out") {
      return !isLoggedIn;
    }

    return true;
  });

  const downloadActions = visibleActions.filter(
    (action) => action.kind === "download"
  );

  const primaryActions = visibleActions.filter(
    (action) => action.kind !== "download"
  );

  if (!visibleActions.length) {
    return null;
  }

  return (
    <div className={styles.slideFooterTextActions}>
      {primaryActions.length ? (
        <FooterActionRow
          actions={primaryActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          mediaState={mediaState}
          onAction={onAction}
        />
      ) : null}

      {downloadActions.length ? (
        <>
          <div className={styles.slideFooterDownloadLabel}>
            {downloadLabel?.trim() || "Download"}
          </div>
          <FooterActionRow
            actions={downloadActions}
            isSubmitting={isSubmitting}
            isAuthSessionLoaded={isAuthSessionLoaded}
            mediaState={mediaState}
            onAction={onAction}
          />
        </>
      ) : null}
    </div>
  );
}

function FooterActionRow({
  actions,
  isSubmitting,
  isAuthSessionLoaded,
  mediaState,
  onAction,
}: {
  actions: SlideFooterAction[];
  isSubmitting: boolean;
  isAuthSessionLoaded: boolean;
  mediaState: MediaState;
  onAction: (action: SlideFooterAction) => void;
}) {
  return (
    <div className={styles.slideFooterTextActionRow}>
      {actions.map((action, index) => {
        const isAuthAction = action.kind === "auth";
        const disabled =
          isSubmitting || (isAuthAction && !isAuthSessionLoaded);
        const mediaAction = action.target ?? action.key;
        const isMuteAction =
          action.kind === "media" && mediaAction === "toggle-mute";
        const label = getResolvedFooterActionLabel(action, mediaState);

        return (
          <span key={`${action.kind}-${action.key}`}>
            {index > 0 ? (
              <span className={styles.slideFooterTextDivider}> | </span>
            ) : null}

            {action.kind === "link" && action.href ? (
              <a
                href={action.href}
                className={styles.slideFooterTextLink}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {label}
              </a>
            ) : (
              <button
                type="button"
                className={`${styles.slideFooterTextLink} ${
                  isMuteAction && mediaState.isMuted
                    ? styles.slideFooterTextLinkAlert
                    : ""
                }`}
                disabled={disabled}
                onClick={() => onAction(action)}
              >
                {label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

function getResolvedFooterActionLabel(
  action: SlideFooterAction,
  mediaState: MediaState
) {
  const mediaAction = action.target ?? action.key;

  if (action.kind === "media" && mediaAction === "toggle-mute") {
    return mediaState.isMuted ? "Unmute" : "Mute";
  }

  if (action.kind === "media" && mediaAction === "toggle-play") {
    return mediaState.isPlaying ? "Pause" : "Play";
  }

  return action.label;
}