export type CallalooDeliveryPlanBlock = {
  id?: string;
  deliveryDate?: string;
  deliveryLabel?: string;
  useLabel?: string;
  prepFormat?: string;
  parcelQuantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  customerNote?: string;
};

export function readCallalooDeliveryPlanFromMetadata(
  metadata: Record<string, unknown>
) {
  const answers =
    metadata.answers &&
    typeof metadata.answers === "object" &&
    !Array.isArray(metadata.answers)
      ? (metadata.answers as Record<string, unknown>)
      : {};
  const directPlan = Array.isArray(metadata.callalooDeliveryPlan)
    ? metadata.callalooDeliveryPlan
    : [];
  const answerPlan = Array.isArray(answers.callalooDeliveryPlan)
    ? answers.callalooDeliveryPlan
    : [];
  const plan = directPlan.length ? directPlan : answerPlan;

  return plan
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => entry as CallalooDeliveryPlanBlock);
}

export function getCallalooDeliveryAdjustmentCutoff(
  deliveryDateValue: unknown
) {
  const deliveryDate = new Date(String(deliveryDateValue || ""));

  if (Number.isNaN(deliveryDate.getTime())) {
    return null;
  }

  const deliveryDay = deliveryDate.getDay();
  const cutoff = new Date(deliveryDate);

  if (deliveryDay === 5) {
    cutoff.setDate(deliveryDate.getDate() - 2);
    cutoff.setHours(18, 0, 0, 0);
    return cutoff;
  }

  if (deliveryDay === 1) {
    cutoff.setDate(deliveryDate.getDate() - 2);
    cutoff.setHours(18, 30, 0, 0);
    return cutoff;
  }

  cutoff.setDate(deliveryDate.getDate() - 2);
  cutoff.setHours(18, 0, 0, 0);
  return cutoff;
}

export function getCallalooDeliveryAdjustmentStatus({
  block,
  now = new Date(),
}: {
  block: CallalooDeliveryPlanBlock;
  now?: Date;
}) {
  const cutoff = getCallalooDeliveryAdjustmentCutoff(block.deliveryDate);
  const deliveryDate = new Date(String(block.deliveryDate || ""));
  const canAdjust = Boolean(cutoff && now <= cutoff);

  return {
    canAdjust,
    cutoff,
    deliveryDate: Number.isNaN(deliveryDate.getTime()) ? null : deliveryDate,
    policy:
      "If your adjustment lowers the price, the balance is issued as store credit. If your adjustment increases the price, you will be asked whether to use store credit or choose a payment method.",
  };
}

export function formatCallalooPrepFormat(value: unknown) {
  const labels: Record<string, string> = {
    fresh_bundle: "Fresh bundle",
    cleaned_chopped: "Cleaned and chopped",
    cleaned_chopped_seasoned: "Cleaned, chopped and seasoned",
  };

  return labels[String(value || "")] || String(value || "Format not selected");
}
