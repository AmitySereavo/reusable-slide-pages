import type {
  DeliverySelection,
  DiscountedOrderSummary,
  QuestionnaireAnswers,
  ShopCart,
  ShopCatalog,
  ShopResolvedCartLine,
} from "@/types/questionnaire";

export function buildPlantShopOrderPayload({
  slug,
  answers,
  cart,
  lines,
  catalog,
  orderSummary,
  orderRequestKey,
  deliverySelection,
  adminAssisted = false,
}: {
  slug: string;
  answers: QuestionnaireAnswers;
  cart: ShopCart;
  lines: ShopResolvedCartLine[];
  catalog: ShopCatalog | null;
  orderSummary: DiscountedOrderSummary;
  orderRequestKey: string;
  deliverySelection: DeliverySelection;
  adminAssisted?: boolean;
}) {
  const orderAnswers: QuestionnaireAnswers = {
    ...answers,
    ...(slug === "bush-tea"
      ? {
          plantShopPaymentPreference: "card_payment",
        }
      : {}),
  };
  const explicitContactMethod = String(
    orderAnswers.plantShopContactMethod ?? ""
  ).trim();
  const inferredContactMethod =
    orderAnswers.whatsappOptIn === true ||
    orderAnswers.primaryHasWhatsapp === true
      ? "whatsapp"
      : "email";

  return {
    questionnaireSlug: slug,
    orderRequestKey,
    adminAssisted,
    fullName: String(orderAnswers.fullName ?? "").trim(),
    email: String(orderAnswers.email ?? "").trim(),
    phone: String(orderAnswers.primaryPhone ?? orderAnswers.phone ?? "").trim(),
    whatsappNumber: String(orderAnswers.whatsappNumber ?? "").trim(),
    instagramHandle: String(orderAnswers.instagramHandle ?? "").trim(),
    tiktokHandle: String(orderAnswers.tiktokHandle ?? "").trim(),
    facebookMessengerHandle: String(
      orderAnswers.facebookMessengerHandle ?? ""
    ).trim(),
    deviceType: String(orderAnswers.plantShopDeviceType ?? "own_device").trim(),
    contactMethod: explicitContactMethod || inferredContactMethod,
    currencyCode: catalog?.currencyCode ?? "JMD",
    orderCart: cart,
    resolvedLines: lines,
    deliverySelection,
    orderSummary,
    answers: orderAnswers,
  };
}
