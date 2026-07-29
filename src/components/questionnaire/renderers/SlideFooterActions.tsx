"use client";

import type { ReactNode } from "react";
import { SlideFooterAction, TextPanelMode } from "@/types/questionnaire";
import styles from "../QuestionnaireShell.module.css";

type MediaState = {
  isMuted: boolean;
  isPlaying: boolean;
  hasEnded?: boolean;
  hasRecentlyStarted?: boolean;
  shouldPulseFooterLabel?: boolean;
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
  canTogglePanel?: boolean;
  shouldShowChapterHint?: boolean;
  textPanelMode: TextPanelMode;
  textPanelSongModeLabel?: string;
  onAction: (action: SlideFooterAction) => void;
  onContentLabelClick?: () => void;
  onTextPanelModeChange: (mode: TextPanelMode) => void;
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
  canTogglePanel,
  shouldShowChapterHint,
  textPanelMode,
  textPanelSongModeLabel,
  onAction,
  onContentLabelClick,
  onTextPanelModeChange,
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

  const panelAction = visibleActions.find(
    (action) => action.kind === "textpanel"
  );
  const resolvedSongModeLabel =
    textPanelSongModeLabel?.trim() ||
    (panelAction && !isLyricsAction(panelAction) ? "Article" : undefined);

  const lyricsActions = visibleActions.filter((action) =>
    isLyricsAction(action) && action.kind !== "textpanel"
  );

  const formatActions = [...downloadActions, ...lyricsActions];

  const transportActions = visibleActions.filter(
    (action) =>
      action.kind !== "download" &&
      action.kind !== "textpanel" &&
      !isLyricsAction(action)
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
        panelAction || canTogglePanel ? (
          <button
            type="button"
            className={`${styles.slideFooterContentLabel} ${styles.slideFooterContentLabelButton} ${
              mediaState.shouldPulseFooterLabel && !panelContent
                ? styles.slideFooterContentLabelStartPulse
                : ""
            }`}
            onClick={() =>
              panelAction ? onAction(panelAction) : onContentLabelClick?.()
            }
            aria-expanded={Boolean(panelContent)}
          >
            {panelContent ? "tap to view video" : getContentLabel(contentLabel)}
          </button>
        ) : (
          <div
            className={`${styles.slideFooterContentLabel} ${
              mediaState.shouldPulseFooterLabel
                ? styles.slideFooterContentLabelStartPulse
                : ""
            }`}
          >
            {getContentLabel(contentLabel)}
          </div>
        )
      ) : null}

      {transportActions.length ? (
        <FooterActionRow
          actions={transportActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          mediaState={mediaState}
          variant="transport"
          shouldShowChapterHint={shouldShowChapterHint}
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
          afterContent={
            panelAction ? (
              <button
                type="button"
                className={styles.slideFooterTextLink}
                onClick={() =>
                  onTextPanelModeChange(getNextTextPanelMode(textPanelMode))
                }
                aria-label={`Text panel mode: ${getTextPanelModeLabel(
                  textPanelMode,
                  resolvedSongModeLabel
                )}`}
              >
                {getTextPanelModeLabel(textPanelMode, resolvedSongModeLabel)}
              </button>
            ) : undefined
          }
          onAction={onAction}
        />
      ) : panelAction ? (
        <div
          className={`${styles.slideFooterTextActionRow} ${styles.slideFooterFormatRow}`}
        >
          <button
            type="button"
            className={styles.slideFooterTextLink}
            onClick={() =>
              onTextPanelModeChange(getNextTextPanelMode(textPanelMode))
            }
            aria-label={`Text panel mode: ${getTextPanelModeLabel(
              textPanelMode,
              resolvedSongModeLabel
            )}`}
          >
            {getTextPanelModeLabel(textPanelMode, resolvedSongModeLabel)}
          </button>
        </div>
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
  afterContent,
  shouldShowChapterHint,
  onAction,
}: {
  actions: SlideFooterAction[];
  isSubmitting: boolean;
  isAuthSessionLoaded: boolean;
  mediaState: MediaState;
  variant: "format" | "transport";
  afterContent?: ReactNode;
  shouldShowChapterHint?: boolean;
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
          action.disabled ||
          isSubmitting ||
          (isAuthAction && !isAuthSessionLoaded);
        const mediaAction = action.target ?? action.key;
        const isMuteAction =
          action.kind === "media" && mediaAction === "toggle-mute";
        const label = getResolvedFooterActionLabel(action, mediaState);
        const iconName = getFooterActionIconName(action, mediaState);
        const isIconOnly = variant === "transport";
        const isNextAction =
          normalizedFooterActionKey(action) === "next" ||
          action.label.toLowerCase().includes("next");
        const shouldPulseAfterVideoEnded =
          variant === "transport" && isNextAction && mediaState.hasEnded;
        const shouldShowNextChapterHint =
          Boolean(shouldShowChapterHint) && variant === "transport" && isNextAction;

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
                  iconName={iconName}
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
                } ${disabled ? styles.slideFooterTextLinkDisabled : ""} ${
                  shouldPulseAfterVideoEnded
                    ? styles.slideFooterTextLinkNextReady
                    : ""
                } ${
                  shouldShowNextChapterHint
                    ? styles.slideFooterTextLinkChapterNextHint
                    : ""
                }`}
                disabled={disabled}
                onClick={() => onAction(action)}
                aria-label={isIconOnly ? label : undefined}
              >
                <FooterActionContent
                  iconName={iconName}
                  label={label}
                  iconOnly={isIconOnly}
                />
                {shouldShowNextChapterHint ? (
                  <img
                    src="/icons/ui/tap_to_select_chapter_arrow_desktop_small.png"
                    alt=""
                    className={styles.slideFooterNextHintImage}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            )}
          </span>
        );
      })}

      {afterContent ? (
        <span>
          {variant !== "transport" && actions.length > 0 ? (
            <span className={styles.slideFooterTextDivider}> | </span>
          ) : null}
          {afterContent}
        </span>
      ) : null}
    </div>
  );
}

function FooterActionContent({
  iconName,
  label,
  iconOnly,
}: {
  iconName?: FooterActionIconName;
  label: string;
  iconOnly: boolean;
}) {
  return (
    <span className={styles.slideFooterActionContent}>
      {iconName ? <FooterActionIcon name={iconName} /> : null}
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

function normalizedFooterActionKey(action: SlideFooterAction) {
  return action.key.trim().toLowerCase();
}

function getTextPanelModeLabel(mode: TextPanelMode, songModeLabel?: string) {
  if (mode === "lines") return "Lines";
  if (mode === "song") return songModeLabel?.trim() || "Song";
  if (mode === "learn") return "Learn";
  return "Shop";
}

function getNextTextPanelMode(mode: TextPanelMode): TextPanelMode {
  if (mode === "lines") return "song";
  if (mode === "song") return "learn";
  if (mode === "learn") return "shop";
  return "lines";
}

type FooterActionIconName =
  | "download"
  | "search"
  | "mute"
  | "volume"
  | "previous"
  | "next";

function getFooterActionIconName(
  action: SlideFooterAction,
  mediaState: MediaState
): FooterActionIconName | undefined {
  const mediaAction = action.target ?? action.key;
  const normalizedKey = action.key.toLowerCase();
  const normalizedLabel = action.label.toLowerCase();

  if (action.kind === "download") {
    return "download";
  }

  if (isLyricsAction(action)) {
    return "search";
  }

  if (action.kind === "media" && mediaAction === "toggle-mute") {
    return mediaState.isMuted ? "mute" : "volume";
  }

  if (normalizedKey === "previous" || normalizedLabel.includes("previous")) {
    return "previous";
  }

  if (normalizedKey === "next" || normalizedLabel.includes("next")) {
    return "next";
  }

  return undefined;
}

function FooterActionIcon({ name }: { name: FooterActionIconName }) {
  return (
    <svg
      className={styles.slideFooterActionIcon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {name === "download" ? (
        <>
          <path d="M11 4h2v8l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3V4Z" />
          <path d="M5 18h14v2H5v-2Z" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <path d="M10.5 5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm-7.5 5.5a7.5 7.5 0 1 1 13.3 4.8l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 0 1 3 10.5Z" />
        </>
      ) : null}
      {name === "mute" ? (
        <>
          <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
          <path d="m17.4 8.2 1.4-1.4L22 10l-3.2 3.2-1.4-1.4 1.8-1.8-1.8-1.8Z" />
          <path d="m18.8 13.2 1.4 1.4-3.8 3.8-1.4-1.4 3.8-3.8Z" />
        </>
      ) : null}
      {name === "volume" ? (
        <>
          <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
          <path d="M16 8.2c1 .9 1.6 2.2 1.6 3.8s-.6 2.9-1.6 3.8l1.4 1.4c1.4-1.3 2.2-3.1 2.2-5.2s-.8-3.9-2.2-5.2L16 8.2Z" />
          <path d="M19 5.2c1.9 1.7 3 4.1 3 6.8s-1.1 5.1-3 6.8l1.4 1.4c2.2-2.1 3.6-5 3.6-8.2s-1.4-6.1-3.6-8.2L19 5.2Z" />
        </>
      ) : null}
      {name === "previous" ? (
        <>
          <path d="M5 5h2v14H5V5Z" />
          <path d="M8 12 19 5v14L8 12Z" />
        </>
      ) : null}
      {name === "next" ? (
        <>
          <path d="M17 5h2v14h-2V5Z" />
          <path d="m16 12-11 7V5l11 7Z" />
        </>
      ) : null}
    </svg>
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
