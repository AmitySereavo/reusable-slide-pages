import { Fragment } from "react";
import styles from "../QuestionnaireShell.module.css";
import type {
  MealMenu,
  ShopCatalog,
  ShopResolvedCartLine,
  TicketAssignment,
} from "@/types/questionnaire";
import { getTicketMealSelectionSummary } from "@/lib/questionnaire/tickets";
import { hasPhoneNote } from "@/lib/questionnaire/contactAndPromotion";
import { formatCurrency, formatWeight } from "@/lib/questionnaire/formatters";

export function cleanCartMealLabel(label: string) {
  return label
    .replace(/^choose\s+your\s+/i, "")
    .replace(/^choose\s+/i, "")
    .trim();
}

export function CartTicketMealSummary({
  assignment,
  menu,
  currencyCode,
  onAdjustMeals,
}: {
  assignment: TicketAssignment;
  menu: MealMenu;
  currencyCode: string;
  onAdjustMeals?: (ticketCode: string) => void;
}) {
  const mealSummary = getTicketMealSelectionSummary({ menu, assignment });
  const hasSelectedMealItems = mealSummary.length > 0;

  return (
    <div className={styles.cartTicketMealBlock}>
      <div className={styles.cartTicketMealTopLine}>
        <strong>{assignment.ownerName?.trim() || assignment.ticketLabel}</strong>
        {onAdjustMeals ? (
          <button
            type="button"
            className={styles.adjustLinkButton}
            onClick={() => onAdjustMeals(assignment.ticketCode)}
          >
            Adjust meal
          </button>
        ) : null}
      </div>
      <div className={styles.cartTicketMealMeta}>Code: {assignment.ticketCode}</div>
      {assignment.mealMode === "required" && !hasSelectedMealItems ? (
        <div className={styles.ticketMealRequiredWarning}>
          Attendee will select meal.
        </div>
      ) : null}
      {mealSummary.map((item) => (
        <div
          key={`${assignment.ticketCode}-${item.groupLabel}-${item.optionLabel}`}
          className={styles.cartTicketMealLine}
        >
          <span>{cleanCartMealLabel(item.groupLabel)}</span>
          <span>
            {cleanCartMealLabel(item.optionLabel)} x {item.quantity}
            {item.extraTotal > 0
              ? ` +${formatCurrency(item.extraTotal, currencyCode)}`
              : ""}
          </span>
        </div>
      ))}
      {assignment.wantsExtraFood === true ? (
        <div className={styles.cartTicketMealMeta}>
          May order extra food at event.
        </div>
      ) : null}
      {assignment.hasMealNotes === true &&
      String(assignment.mealNotes ?? "").trim().length > 0 ? (
        <div className={styles.cartTicketMealMeta}>
          Notes: {String(assignment.mealNotes ?? "").trim()}
        </div>
      ) : null}
    </div>
  );
}

export function CartBundledAddOnsSummary({
  lines,
  currencyCode,
  purchasedForLabels,
}: {
  lines: ShopResolvedCartLine[];
  currencyCode?: string;
  purchasedForLabels?: string[];
}) {
  if (!lines.length) {
    return null;
  }

  return (
    <div className={styles.cartTicketMealStack}>
      <div className={styles.cartBundledAddOnsHeader}>Add-ons</div>
      {lines.map((line) => (
        <Fragment key={line.lineKey}>
          <div className={styles.cartTicketMealLine}>
            <span>
              {line.productTitle}
              {line.sizeLabel ? ` - ${line.sizeLabel}` : ""}
            </span>
            <span>{formatCurrency(line.lineTotal, currencyCode ?? "USD")}</span>
          </div>
          {purchasedForLabels?.length ? (
            <div className={styles.cartTicketMealMeta}>
              {purchasedForLabels.map((label, index) => (
                <div key={`${line.lineKey}-purchased-for-${index}`}>
                  Purchased for {label}
                </div>
              ))}
            </div>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

export function CartReviewSectionHeading({
  sectionRank,
  unselectedCount,
  unavailableCount,
  onRemoveUnavailable,
}: {
  sectionRank: number;
  unselectedCount: number;
  unavailableCount: number;
  onRemoveUnavailable: () => void;
}) {
  if (sectionRank === 0) {
    return null;
  }

  if (sectionRank === 2) {
    return (
      <div className={styles.cartReviewSectionHeading}>
        <span>Unavailable items ({unavailableCount})</span>
        {unavailableCount > 0 ? (
          <button type="button" onClick={onRemoveUnavailable}>
            Remove all
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.cartReviewSectionHeading}>
      <span>Below are other items in your cart ({unselectedCount})</span>
    </div>
  );
}

export function CartItemCountdown({
  secondsRemaining,
}: {
  secondsRemaining: number;
}) {
  if (secondsRemaining <= 0) {
    return (
      <div className={styles.cartItemCountdown}>
        <strong>00:00</strong>
        <span>Returned to stock</span>
      </div>
    );
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className={styles.cartItemCountdown}>
      <strong>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </strong>
      <span>Until cart hold ends</span>
    </div>
  );
}

export function getCartFulfillmentLabel(line: ShopResolvedCartLine) {
  const text = [line.productTitle, line.sizeLabel, line.purchaseModeLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hasDigitalSignal =
    line.fulfillmentType === "digital" ||
    text.includes("digital") ||
    text.includes("download") ||
    text.includes("mp3") ||
    text.includes("wav");
  const hasPhysicalSignal =
    line.requiresPhysicalFulfillment === true ||
    line.fulfillmentType === "physical" ||
    line.fulfillmentType === "ticket";

  if (hasPhysicalSignal && hasDigitalSignal) {
    return "Physical and digital delivery";
  }

  if (hasPhysicalSignal) {
    return "Physical delivery";
  }

  return "Digital delivery";
}

export function ReviewTotalsRenderer({
  catalog,
  totalWeight,
  deliveryFee,
  discountTotal,
  grandTotal,
  ticketOwnerAddonBudgetTotal,
  ticketUpgradeTotal,
  activeDiscountLabel,
  showDeliveryFee,
  showDiscountTotal,
  showTotalWeight,
}: {
  catalog: ShopCatalog | null;
  totalWeight: number;
  deliveryFee: number;
  discountTotal: number;
  grandTotal: number;
  ticketOwnerAddonBudgetTotal?: number;
  ticketUpgradeTotal?: number;
  activeDiscountLabel?: string;
  showDeliveryFee?: boolean;
  showDiscountTotal?: boolean;
  showTotalWeight?: boolean;
}) {
  if (!catalog) {
    return null;
  }

  return (
    <div className={styles.reviewTotals}>
      {activeDiscountLabel && showDiscountTotal ? (
        <div>
          Discount: {activeDiscountLabel}
          {String(activeDiscountLabel).toLowerCase().includes("questionnaire")
            ? hasPhoneNote()
            : null}
        </div>
      ) : null}

      {showDeliveryFee ? (
        <div>
          Delivery fee: {formatCurrency(deliveryFee, catalog.currencyCode)}
        </div>
      ) : null}

      {showDiscountTotal ? (
        <div>
          Discount total: -{formatCurrency(discountTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {ticketOwnerAddonBudgetTotal && ticketOwnerAddonBudgetTotal > 0 ? (
        <div>
          Ticket owner add-on budgets:{" "}
          {formatCurrency(ticketOwnerAddonBudgetTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {ticketUpgradeTotal && ticketUpgradeTotal > 0 ? (
        <div>
          Ticket upgrades: {formatCurrency(ticketUpgradeTotal, catalog.currencyCode)}
        </div>
      ) : null}

      {showTotalWeight ? (
        <div>
          Total order weight: {formatWeight(totalWeight, catalog.weightUnit)}
        </div>
      ) : null}

      <div style={{ fontWeight: 700 }}>
        Total due: {formatCurrency(grandTotal, catalog.currencyCode)}
      </div>
    </div>
  );
}
