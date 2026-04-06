import { DiscountDefinition } from "@/types/questionnaire";

export const discountDefinitions: DiscountDefinition[] = [
  {
    code: "WELCOME25",
    label: "25% off your order",
    active: true,
    type: "percentage",
    scope: "order",
    amount: 25,
  },
];