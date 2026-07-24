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
}: {
  slug: string;
  answers: QuestionnaireAnswers;
  cart: ShopCart;
  lines: ShopResolvedCartLine[];
  catalog: ShopCatalog | null;
  orderSummary: DiscountedOrderSummary;
  orderRequestKey: string;
  deliverySelection: DeliverySelection;
}) {
  return {
    questionnaireSlug: slug,
    orderRequestKey,
    fullName: String(answers.fullName ?? "").trim(),
    email: String(answers.email ?? "").trim(),
    phone: String(answers.primaryPhone ?? answers.phone ?? "").trim(),
    whatsappNumber: String(answers.whatsappNumber ?? "").trim(),
    instagramHandle: String(answers.instagramHandle ?? "").trim(),
    tiktokHandle: String(answers.tiktokHandle ?? "").trim(),
    facebookMessengerHandle: String(
      answers.facebookMessengerHandle ?? ""
    ).trim(),
    deviceType: String(answers.plantShopDeviceType ?? "own_device").trim(),
    contactMethod: String(answers.plantShopContactMethod ?? "whatsapp").trim(),
    currencyCode: catalog?.currencyCode ?? "JMD",
    orderCart: cart,
    resolvedLines: lines,
    deliverySelection,
    orderSummary,
    answers,
  };
}
