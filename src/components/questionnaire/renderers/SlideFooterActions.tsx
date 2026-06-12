"use client";

import { SlideFooterAction } from "@/types/questionnaire";
import styles from "../QuestionnaireShell.module.css";

type Props = {
  actions: SlideFooterAction[];
  isLoggedIn: boolean;
  isAuthSessionLoaded: boolean;
  isSubmitting: boolean;
  onAction: (action: SlideFooterAction) => void;
};

export default function SlideFooterActions({
  actions,
  isLoggedIn,
  isAuthSessionLoaded,
  isSubmitting,
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

  const mediaActions = visibleActions.filter((action) => action.kind === "media");

  const contextActions = visibleActions.filter(
    (action) => action.kind !== "media"
  );

  if (!visibleActions.length) {
    return null;
  }

  return (
    <div className={styles.slideFooterTextActions}>
      {mediaActions.length ? (
        <FooterActionRow
          actions={mediaActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          onAction={onAction}
        />
      ) : null}

      {contextActions.length ? (
        <FooterActionRow
          actions={contextActions}
          isSubmitting={isSubmitting}
          isAuthSessionLoaded={isAuthSessionLoaded}
          onAction={onAction}
        />
      ) : null}
    </div>
  );
}

function FooterActionRow({
  actions,
  isSubmitting,
  isAuthSessionLoaded,
  onAction,
}: {
  actions: SlideFooterAction[];
  isSubmitting: boolean;
  isAuthSessionLoaded: boolean;
  onAction: (action: SlideFooterAction) => void;
}) {
  return (
    <div className={styles.slideFooterTextActionRow}>
      {actions.map((action, index) => {
        const isAuthAction = action.kind === "auth";
        const disabled =
          isSubmitting || (isAuthAction && !isAuthSessionLoaded);

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
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                className={styles.slideFooterTextLink}
                disabled={disabled}
                onClick={() => onAction(action)}
              >
                {action.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}