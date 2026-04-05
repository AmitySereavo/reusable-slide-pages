import {
  DeliveryConfig,
  DeliveryCountryCode,
  DeliverySelection,
  DeliveryZoneRate,
  QuestionnaireVariableMap,
} from "@/types/questionnaire";

export function getDeliveryConfig(
  variables: QuestionnaireVariableMap,
  deliveryConfigKey: string | undefined
): DeliveryConfig | null {
  if (!deliveryConfigKey) return null;

  const value = variables[deliveryConfigKey];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as DeliveryConfig;
}

export function normalizeDeliverySelection(value: unknown): DeliverySelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;

  return {
    method:
      raw.method === "pickup_stable" ||
      raw.method === "pickup_popup" ||
      raw.method === "delivery"
        ? raw.method
        : undefined,
    stablePickupLocationId:
      typeof raw.stablePickupLocationId === "string"
        ? raw.stablePickupLocationId
        : undefined,
    popupShopLocationId:
      typeof raw.popupShopLocationId === "string"
        ? raw.popupShopLocationId
        : undefined,
    countryCode: isCountryCode(raw.countryCode)
      ? raw.countryCode
      : undefined,
    regionCode: typeof raw.regionCode === "string" ? raw.regionCode : undefined,
    addressLine1:
      typeof raw.addressLine1 === "string" ? raw.addressLine1 : undefined,
    addressLine2:
      typeof raw.addressLine2 === "string" ? raw.addressLine2 : undefined,
    apartmentOrUnit:
      typeof raw.apartmentOrUnit === "string" ? raw.apartmentOrUnit : undefined,
    cityOrTown:
      typeof raw.cityOrTown === "string" ? raw.cityOrTown : undefined,
    postalCode:
      typeof raw.postalCode === "string" ? raw.postalCode : undefined,
    deliveryFeeJmd:
      typeof raw.deliveryFeeJmd === "number" && Number.isFinite(raw.deliveryFeeJmd)
        ? raw.deliveryFeeJmd
        : undefined,
  };
}

export function getDeliveryRate(
  config: DeliveryConfig | null,
  countryCode: DeliveryCountryCode | undefined,
  regionCode: string | undefined
): DeliveryZoneRate | undefined {
  if (!config || !countryCode || !regionCode) return undefined;

  return config.deliveryZoneRates.find(
    (rate) => rate.countryCode === countryCode && rate.regionCode === regionCode
  );
}

export function getDeliveryFeeJmd(
  config: DeliveryConfig | null,
  selection: DeliverySelection
): number {
  if (selection.method !== "delivery") return 0;

  return (
    getDeliveryRate(config, selection.countryCode, selection.regionCode)?.feeJmd ?? 0
  );
}

export function isDeliverySelectionComplete(
  config: DeliveryConfig | null,
  selection: DeliverySelection
) {
  if (!selection.method) return false;

  if (selection.method === "pickup_stable") {
    return Boolean(selection.stablePickupLocationId);
  }

  if (selection.method === "pickup_popup") {
    return Boolean(selection.popupShopLocationId);
  }

  if (selection.method === "delivery") {
    const fee = getDeliveryFeeJmd(config, selection);

    return Boolean(
      selection.countryCode &&
        selection.regionCode &&
        String(selection.addressLine1 ?? "").trim() &&
        String(selection.cityOrTown ?? "").trim() &&
        fee > 0
    );
  }

  return false;
}

function isCountryCode(value: unknown): value is DeliveryCountryCode {
  return value === "JM" || value === "US" || value === "CA" || value === "AE";
}