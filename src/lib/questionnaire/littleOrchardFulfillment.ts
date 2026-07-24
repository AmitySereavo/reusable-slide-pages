import type { QuestionnaireAnswers } from "@/types/questionnaire";

export const LITTLE_ORCHARD_FULFILLMENT_OPTIONS = {
  event_pickup: {
    label: "Jamaica Horticultural Society Plant Market",
    detail:
      "Little Orchard Nursery tent. Jamaica Horticultural Society Showgrounds, Cnr. Gibson Dr & Gibson Close, Hope Pastures. Sunday, July 26, 9:00 AM - 4:00 PM.",
    shippingMethod: "event_pickup",
  },
  earth_sovereign: {
    label: "Earth (Sovereign Center Liguanea)",
    detail:
      "Earth Retail Jamaica, 106 Hope Road, Shop 27A, Sovereign Center, Kingston. Pickup times: Mondays to Wednesdays, 9:30am to 4pm.",
    shippingMethod: "pickup_earth_sovereign",
  },
  barbican_132: {
    label: "One32 Guest House (Barbican)",
    detail:
      "132 Barbican Road, Kingston, Jamaica. Pickup times: Mondays to Wednesdays, 9:30am to 4pm.",
    shippingMethod: "pickup_barbican_132",
  },
  linstead: {
    label: "Redwood Taxi Stand (Linstead)",
    detail:
      "Redwood Taxi Stand, Linstead Town, Jamaica. Pickup times: Mondays to Wednesdays, 9:30am to 4pm.",
    shippingMethod: "pickup_linstead",
  },
  paid_delivery: {
    label: "Paid delivery",
    detail: "You will receive updates about your delivery progress.",
    shippingMethod: "paid_delivery",
  },
} as const;

export type LittleOrchardFulfillmentKey =
  keyof typeof LITTLE_ORCHARD_FULFILLMENT_OPTIONS;

export function getLittleOrchardFulfillmentKey(
  answers?: QuestionnaireAnswers | Record<string, unknown> | null
): LittleOrchardFulfillmentKey {
  const raw = String(answers?.plantShopFulfillmentMethod ?? "").trim();

  return raw in LITTLE_ORCHARD_FULFILLMENT_OPTIONS
    ? (raw as LittleOrchardFulfillmentKey)
    : "event_pickup";
}

export function getLittleOrchardFulfillmentOption(
  answers?: QuestionnaireAnswers | Record<string, unknown> | null
) {
  return LITTLE_ORCHARD_FULFILLMENT_OPTIONS[
    getLittleOrchardFulfillmentKey(answers)
  ];
}

export function getLittleOrchardDeliveryAddressLines(
  answers?: QuestionnaireAnswers | Record<string, unknown> | null
) {
  return [
    [
      answers?.plantDeliveryStreetAddress,
      answers?.plantDeliveryCityTown,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(", "),
    [
      answers?.plantDeliveryRegion,
      answers?.plantDeliveryCountry,
      answers?.plantDeliveryPostalCode,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(", "),
    String(answers?.plantDeliveryNotes ?? "").trim()
      ? `Notes: ${String(answers?.plantDeliveryNotes ?? "").trim()}`
      : "",
  ].filter(Boolean);
}
