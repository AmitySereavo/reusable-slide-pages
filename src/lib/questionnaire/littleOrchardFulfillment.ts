import type { QuestionnaireAnswers } from "@/types/questionnaire";

export const LITTLE_ORCHARD_FULFILLMENT_OPTIONS = {
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
    label: "Delivery to an address",
    detail: "You will receive updates about your delivery progress.",
    shippingMethod: "delivery",
  },
  package_delivery: {
    label: "Delivery to an address",
    detail:
      "Package delivery details will be confirmed by a Little Orchard representative.",
    shippingMethod: "package_delivery",
  },
  bush_tea_jamaica_post: {
    label: "Jamaica postal service shipping",
    detail:
      "Bush tea orders are harvested, washed, dried, packaged, sent through plant quarantine when required, then shipped through the Jamaica postal service. Estimated arrival is 2 to 4 weeks after shipping.",
    shippingMethod: "jamaica_post",
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
    : "earth_sovereign";
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
