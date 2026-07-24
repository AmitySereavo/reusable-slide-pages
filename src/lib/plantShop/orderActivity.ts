import { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient | any;

export const customerOrderStageCopy: Record<
  string,
  { title: string; description: string }
> = {
  "order-submitted": {
    title: "Order Submitted",
    description: "Your order was received through the Little Orchard Shop.",
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

export async function createLittleOrchardOrderActivity(
  prisma: PrismaLike,
  {
    fulfillmentItemId,
    orderCode,
    stageKey,
    stageLabel,
    updateType = "manual",
    source = "Little Orchard Shop",
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
