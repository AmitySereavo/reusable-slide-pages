import styles from "../QuestionnaireShell.module.css";
import type { ThemeConfig } from "@/types/questionnaire";

export function QuantityControl({
  quantity,
  minQuantity = 1,
  maxQuantity,
  disabled,
  onDecrease,
  onIncrease,
  theme,
}: {
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  theme: ThemeConfig;
}) {
  return (
    <div className={styles.quantityControl}>
      <button
        type="button"
        disabled={disabled || quantity <= minQuantity}
        onClick={onDecrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        -
      </button>
      <span className={styles.quantityValue}>{quantity}</span>
      <button
        type="button"
        disabled={disabled || (maxQuantity !== undefined && quantity >= maxQuantity)}
        onClick={onIncrease}
        className={styles.quantityButton}
        style={{ borderColor: theme.colors.border }}
      >
        +
      </button>
    </div>
  );
}

export function ShopSizeDescription({ text }: { text: string }) {
  const eventQuantityMatch = text.match(
    /^(.*?)(Event quantity(?: remaining)?:\s*\d+\.)\s*$/i
  );

  if (eventQuantityMatch) {
    const [, description, eventQuantityLine] = eventQuantityMatch;

    return (
      <div className={styles.sizeDescriptionBlock}>
        {description.trim() ? (
          <div className={styles.sizeDescription}>{description.trim()}</div>
        ) : null}
        <div className={styles.eventQuantityLine}>
          {eventQuantityLine.trim()}
        </div>
      </div>
    );
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems = lines
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (listItems.length > 1 || lines.some((line) => /^[-*]\s*/.test(line))) {
    return (
      <ul className={styles.sizeDescriptionList}>
        {listItems.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    );
  }

  return <div className={styles.sizeDescription}>{text}</div>;
}
