import { Prisma, PrismaClient } from "@prisma/client";
import { getShopDisplayName } from "@/config/shopIdentities";

type PrismaLike = PrismaClient | Prisma.TransactionClient | any;

export const customerOrderStageCopy: Record<
  string,
  { title: string; description: string }
> = {
  "order-submitted": {
    title: "Order Submitted",
    description: `Your order was received through ${getShopDisplayName(
      "little-orchard-shop"
    )}.`,
  },
  "awaiting-payment": {
    title: "Awaiting Payment",
    description:
      "Please make payment within the payment window so your selected items can be secured.",
  },
  "payment-confirmed": {
    title: "Payment Confirmed",
    description: "Your payment was confirmed and secured.",
  },
  "bush-tea-harvesters-assigned": {
    title: "Sent To Harvesters",
    description:
      "Your paid order quantity has been sent to the harvesters for fresh picking.",
  },
  "bush-tea-washed-drying": {
    title: "Leaves Washed And Drying",
    description:
      "Your leaves have been washed and placed in drying bags. Drying usually takes about 3 to 5 days.",
  },
  "bush-tea-packaged": {
    title: "Packaged",
    description:
      "Your dried leaves have been checked, packed, and prepared for export handling.",
  },
  "bush-tea-plant-quarantine": {
    title: "Sent To Plant Quarantine",
    description:
      "Your order has been sent to plant quarantine for quality and cleanliness checks before shipping.",
  },
  "bush-tea-shipped-jamaica-post": {
    title: "Sent Through Jamaica Post",
    description:
      "Your order has passed the required checks and has been handed over for post office shipping.",
  },
  "bush-tea-shipped-fedex": {
    title: "Sent Through FedEx",
    description:
      "Your order has passed the required checks and has been handed over for FedEx shipping.",
  },
  processing: {
    title: "Preparing Your Order",
    description: "The team has started preparing your plants.",
  },
  ready: {
    title: "Ready for Pickup",
    description: "Your order is ready for collection.",
  },
  fulfilled: {
    title: "Order Collected",
    description: "This order has been marked fulfilled.",
  },
  canceled: {
    title: "Order Cancelled",
    description: "This order has been cancelled.",
  },
  refunded: {
    title: "Payment Refunded",
    description: "A refund has been recorded for this order.",
  },
};

export function getCustomerOrderStageCopy(stageKey: string, fallback: string) {
  return (
    customerOrderStageCopy[stageKey] ?? {
      title: fallback || stageKey,
      description: "Your order status was updated.",
    }
  );
}

export async function createOrderFulfillmentActivity(
  prisma: PrismaLike,
  {
    fulfillmentItemId,
    orderCode,
    stageKey,
    stageLabel,
    updateType = "manual",
    source = getShopDisplayName("little-orchard-shop"),
    staffUserId = null,
    staffUserName = null,
    notes = null,
    previousStatus = null,
    nextStatus = null,
    customerVisible = true,
    metadata = {},
    completedAt = new Date(),
  }: {
    fulfillmentItemId: string;
    orderCode: string;
    stageKey: string;
    stageLabel: string;
    updateType?: string;
    source?: string | null;
    staffUserId?: string | null;
    staffUserName?: string | null;
    notes?: string | null;
    previousStatus?: string | null;
    nextStatus?: string | null;
    customerVisible?: boolean;
    metadata?: Record<string, unknown>;
    completedAt?: Date;
  }
) {
  const copy = getCustomerOrderStageCopy(stageKey, stageLabel);

  return prisma.orderFulfillmentActivity.create({
    data: {
      fulfillmentItemId,
      stageKey,
      stageLabel,
      updateType,
      source,
      staffUserId,
      staffUserName,
      completedAt,
      notes,
      metadata: {
        ...metadata,
        orderCode,
        previousStatus,
        nextStatus,
        customerVisible,
        customerTitle: copy.title,
        customerDescription: copy.description,
      } as Prisma.InputJsonObject,
    },
  });
}

export const createLittleOrchardOrderActivity = createOrderFulfillmentActivity;
