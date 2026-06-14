"use client";

import type { ReactNode } from "react";
import { SlideFooterAction } from "@/types/questionnaire";
import styles from "../QuestionnaireShell.module.css";

type MediaState = {
  isMuted: boolean;
  isPlaying: boolean;
};

type Props = {
  actions: SlideFooterAction[];
  contentLabel?: string;
  isLoggedIn: boolean;
  isAuthSessionLoaded: boolean;
  isSubmitting: boolean;
  mediaState: MediaState;
  progressControl?: ReactNode;
  panelContent?: ReactNode;
  onAction: (action: SlideFooterAction) => void;
};

export default function SlideFooterActions({
  actions,
  contentLabel,
  isLoggedIn,
  isAuthSessionLoaded,
  isSubmitting,
  mediaState,
  progressControl,
  panelContent,
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

  const lyricsActions = visibleActions.filter((action) =>
    isLyricsAction(action)
  );

  const formatActions = [...downloadActions, ...lyricsActions];

  const transportActions = visibleActions.filter(
    (action) => action.kind !== "download" && !isLyricsAction(action)
  );

  if (!visibleActions.length) {
    return null;
  }

  return (
    <div
      className={`${styles.slideFooterTextActions} ${
        panelContent ? styles.slideFooterTextActionsPanelOpen : ""
      }`}
    >
      {progressControl ? (
        <div className={styles.slideFooterEdgeProgress}>{progressControl}</div>
      ) : null}

      {contentLabel?.trim() ? (
        <div className={styles.slideFooterContentLabel}>
          {getContentLabel(contentLabel)}
        </div>
      ) : null}

      {transportActions.length ? (
        <FooterActionRow
          actions={transportActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          mediaState={mediaState}
          variant="transport"
          onAction={onAction}
        />
      ) : null}

      {formatActions.length ? (
        <FooterActionRow
          actions={formatActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          mediaState={mediaState}
          variant="format"
          onAction={onAction}
        />
      ) : null}

      {panelContent ? (
        <div className={styles.slideFooterPanelContent}>{panelContent}</div>
      ) : null}
    </div>
  );
}

function FooterActionRow({
  actions,
  isSubmitting,
  isAuthSessionLoaded,
  mediaState,
  variant,
  onAction,
}: {
  actions: SlideFooterAction[];
  isSubmitting: boolean;
  isAuthSessionLoaded: boolean;
  mediaState: MediaState;
  variant: "format" | "transport";
  onAction: (action: SlideFooterAction) => void;
}) {
  return (
    <div
      className={`${styles.slideFooterTextActionRow} ${
        variant === "transport"
          ? styles.slideFooterTransportRow
          : styles.slideFooterFormatRow
      }`}
    >
      {actions.map((action, index) => {
        const isAuthAction = action.kind === "auth";
        const disabled =
          isSubmitting || (isAuthAction && !isAuthSessionLoaded);
        const mediaAction = action.target ?? action.key;
        const isMuteAction =
          action.kind === "media" && mediaAction === "toggle-mute";
        const label = getResolvedFooterActionLabel(action, mediaState);
        const iconSrc = getFooterActionIcon(action, mediaState);
        const isIconOnly = variant === "transport";

        return (
          <span key={`${action.kind}-${action.key}`}>
            {variant !== "transport" && index > 0 ? (
              <span className={styles.slideFooterTextDivider}> | </span>
            ) : null}

            {action.kind === "link" && action.href ? (
              <a
                href={action.href}
                className={styles.slideFooterTextLink}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <FooterActionContent
                  iconSrc={iconSrc}
                  label={label}
                  iconOnly={isIconOnly}
                />
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
                aria-label={isIconOnly ? label : undefined}
              >
                <FooterActionContent
                  iconSrc={iconSrc}
                  label={label}
                  iconOnly={isIconOnly}
                />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

function FooterActionContent({
  iconSrc,
  label,
  iconOnly,
}: {
  iconSrc?: string;
  label: string;
  iconOnly: boolean;
}) {
  return (
    <span className={styles.slideFooterActionContent}>
      {iconSrc ? (
        <img
          className={styles.slideFooterActionIcon}
          src={iconSrc}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <span className={iconOnly ? styles.visuallyHidden : undefined}>
        {label}
      </span>
    </span>
  );
}

function getContentLabel(contentLabel?: string) {
  const label = contentLabel?.trim() || "";
  return label.replace(/^download\s*-\s*/i, "");
}

function isLyricsAction(action: SlideFooterAction) {
  return (
    (action.kind === "goto" || action.kind === "textpanel") &&
    (action.key.toLowerCase() === "lyrics" ||
      action.label.toLowerCase() === "lyrics")
  );
}

function getFooterActionIcon(
  action: SlideFooterAction,
  mediaState: MediaState
) {
  const mediaAction = action.target ?? action.key;
  const normalizedKey = action.key.toLowerCase();
  const normalizedLabel = action.label.toLowerCase();

  if (action.kind === "download") {
    return "/icons/footer-controls/download.svg";
  }

  if (isLyricsAction(action)) {
    return "/icons/footer-controls/search.svg";
  }

  if (action.kind === "media" && mediaAction === "toggle-mute") {
    return mediaState.isMuted
      ? "/icons/footer-controls/mute.svg"
      : "/icons/footer-controls/volume.svg";
  }

  if (normalizedKey === "previous" || normalizedLabel.includes("previous")) {
    return "/icons/footer-controls/previous.svg";
  }

  if (normalizedKey === "next" || normalizedLabel.includes("next")) {
    return "/icons/footer-controls/next.svg";
  }

  return undefined;
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
