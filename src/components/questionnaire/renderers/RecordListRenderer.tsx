import styles from "../QuestionnaireShell.module.css";
import type { RecordListItem, ThemeConfig } from "@/types/questionnaire";
import { withOpacity } from "@/lib/questionnaire/display";

export default function RecordListRenderer({
  items,
  emptyText,
  selectedValue,
  onOpenItem,
  theme,
}: {
  items: RecordListItem[];
  emptyText: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  onOpenItem?: (value: string) => void;
  theme: ThemeConfig;
}) {
  if (!items.length) {
    return <p className={styles.body}>{emptyText}</p>;
  }

  return (
    <div className={styles.recordListStack}>
      {items.map((item) => {
        const selected = selectedValue === item.value;

        return (
          <div
            key={item.value}
            className={styles.recordCard}
            style={{
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              background: selected
                ? theme.colors.cardAlt ?? withOpacity(theme.colors.primary, 0.12)
                : theme.colors.card,
              color: theme.colors.text,
            }}
          >
            <div className={styles.recordCardHeader}>
              <button
                type="button"
                onClick={() => onOpenItem?.(item.value)}
                className={styles.recordCardTitleButton}
              >
                <div className={styles.recordCardTitle}>{item.title}</div>
              </button>

              {item.childCount !== undefined ? (
                <div className={styles.recordCardCount}>{item.childCount}</div>
              ) : null}
            </div>

            {item.subtitle ? (
              <div className={styles.recordCardSubtitle}>{item.subtitle}</div>
            ) : null}

            {item.meta?.length ? (
              <div className={styles.recordCardMeta}>
                {item.meta.map((metaLine, index) => (
                  <div key={`${item.value}-meta-${index}`}>{metaLine}</div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
