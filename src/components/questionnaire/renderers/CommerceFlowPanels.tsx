import styles from "../QuestionnaireShell.module.css";
import type { ThemeConfig } from "@/types/questionnaire";
import { getContrastTextColor } from "@/lib/questionnaire/display";

export function EmptyCartStoreChoices({
  theme,
  choices,
  onTicketStore,
  onMerchStore,
}: {
  theme: ThemeConfig;
  choices?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  }[];
  onTicketStore: () => void;
  onMerchStore: () => void;
}) {
  const resolvedChoices =
    choices && choices.length
      ? choices
      : [
          {
            label: "Ticket store",
            onClick: onTicketStore,
            variant: "primary" as const,
          },
          {
            label: "Music and merch store",
            onClick: onMerchStore,
            variant: "secondary" as const,
          },
        ];

  return (
    <div
      className={styles.emptyCartPanel}
      style={{ borderColor: theme.colors.border }}
    >
      <div>
        <h2 className={styles.emptyCartTitle}>Cart</h2>
        <p className={styles.emptyCartText}>Your cart is empty.</p>
      </div>
      <div className={styles.emptyCartActions}>
        {resolvedChoices.map((choice) => {
          const isPrimary = choice.variant !== "secondary";

          return (
            <button
              key={choice.label}
              type="button"
              className={styles.emptyCartButton}
              onClick={choice.onClick}
              style={
                isPrimary
                  ? {
                      background: theme.colors.primary,
                      color: getContrastTextColor(theme.colors.primary),
                    }
                  : {
                      borderColor: theme.colors.border,
                      background: "#FFFFFF",
                      color: theme.colors.text,
                    }
              }
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CommerceExitWarning({
  theme,
  onStay,
  onLeave,
}: {
  theme: ThemeConfig;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <div className={styles.checkoutExitOverlay} role="dialog" aria-modal="true">
      <div
        className={styles.checkoutExitPanel}
        style={{ borderColor: theme.colors.border }}
      >
        <div>
          <h2 className={styles.checkoutExitTitle}>Leave checkout?</h2>
          <p className={styles.checkoutExitText}>
            You&apos;ll lose the progress you&apos;ve made in this checkout flow.
            Your ticket selections and cart details will be cleared if you continue.
          </p>
        </div>

        <div className={styles.checkoutExitActions}>
          <button
            type="button"
            className={styles.emptyCartButton}
            onClick={onStay}
            style={{
              borderColor: theme.colors.border,
              background: "#FFFFFF",
              color: theme.colors.text,
            }}
          >
            Stay here
          </button>
          <button
            type="button"
            className={styles.emptyCartButton}
            onClick={onLeave}
            style={{
              background: theme.colors.primary,
              color: getContrastTextColor(theme.colors.primary),
            }}
          >
            Leave and clear progress
          </button>
        </div>
      </div>
    </div>
  );
}
