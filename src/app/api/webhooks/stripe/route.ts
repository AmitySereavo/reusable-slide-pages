import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  orderIncludesEscapeAlbumAccess,
  sendEscapeAlbumAccessEmail,
} from "@/lib/amitySereavo/deliverables";
import { ESCAPE_ALBUM_ITEM_KEY } from "@/lib/entitlements/purchasedItems";
import { createOrderFulfillmentActivity } from "@/lib/plantShop/orderActivity";

export const runtime = "nodejs";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function getStripeWebhookSecret() {
  return cleanText(process.env.STRIPE_WEBHOOK_SECRET);
}

function parseStripeSignature(signature: string) {
  return signature.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = cleanText(value);
      if (key === "v1" && value) acc.signatures.push(cleanText(value));
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );
}

function verifyStripeSignature({
  rawBody,
  signatureHeader,
  secret,
}: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
}) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const timestampSeconds = Number(timestamp);

  if (!timestamp || !signatures.length || !Number.isFinite(timestampSeconds)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    Math.abs(nowSeconds - timestampSeconds) >
    STRIPE_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");

    return (
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  });
}

function isPaidCheckoutSession(session: Record<string, unknown>) {
  return (
    cleanText(session.payment_status).toLowerCase() === "paid" ||
    cleanText(session.status).toLowerCase() === "complete"
  );
}

async function findPaymentsForCheckoutSession(session: Record<string, unknown>) {
  const sessionId = cleanText(session.id);
  const metadata = readObject(session.metadata);
  const orderId = cleanText(metadata.orderId);
  const orderCode = cleanText(metadata.orderCode);

  const payments = sessionId
    ? await prisma.invitationTicketPayment.findMany({
        where: {
          metadata: {
            path: ["checkoutSessionId"],
            equals: sessionId,
          },
        },
        include: {
          order: {
            include: {
              fulfillmentItems: {
                include: {
                  activities: true,
                },
              },
            },
          },
        },
      })
    : [];

  if (payments.length) {
    return payments;
  }

  if (!orderId && !orderCode) {
    return [];
  }

  return prisma.invitationTicketPayment.findMany({
    where: {
      order: {
        ...(orderId ? { id: orderId } : {}),
        ...(orderCode ? { orderCode } : {}),
      },
    },
    include: {
      order: {
        include: {
          fulfillmentItems: {
            include: {
              activities: true,
            },
          },
        },
      },
    },
  });
}

function getNextFulfillmentStatus(item: any) {
  return cleanText(item.fulfillmentType).toLowerCase() === "digital"
    ? "FULFILLED"
    : "PROCESSING";
}

async function findFulfillmentItemsForCheckoutSession(
  session: Record<string, unknown>
) {
  const sessionId = cleanText(session.id);
  const metadata = readObject(session.metadata);
  const orderCode = cleanText(metadata.orderCode);
  const source = cleanText(metadata.source);

  const sessionItems = sessionId
    ? await prisma.orderFulfillmentItem.findMany({
        where: {
          metadata: {
            path: ["stripeCheckoutSessionId"],
            equals: sessionId,
          },
        },
        include: {
          activities: true,
        },
      })
    : [];

  if (sessionItems.length) {
    return sessionItems;
  }

  if (source !== "plant-shop" || !orderCode) {
    return [];
  }

  return prisma.orderFulfillmentItem.findMany({
    where: {
      orderCode,
    },
    include: {
      activities: true,
    },
  });
}

async function markPlantShopStripeCheckoutPaid(
  session: Record<string, unknown>
) {
  const sessionId = cleanText(session.id);
  const paymentIntentId = cleanText(session.payment_intent);
  const now = new Date();
  const items = await findFulfillmentItemsForCheckoutSession(session);

  if (!items.length) {
    return {
      ok: true,
      matched: false,
      paymentCount: 0,
      orderCount: 0,
      fulfillmentItemCount: 0,
    };
  }

  const orderCodes = Array.from(
    new Set(items.map((item) => cleanText(item.orderCode)).filter(Boolean))
  );

  for (const item of items) {
    const nextStatus = getNextFulfillmentStatus(item);
    const itemMetadata = readObject(item.metadata);
    const previousStatus = cleanText(item.fulfillmentStatus) || "PENDING";

    await prisma.orderFulfillmentItem.update({
      where: { id: item.id },
      data: {
        status: nextStatus,
        fulfillmentStatus: nextStatus,
        fulfilledAt: nextStatus === "FULFILLED" ? now : item.fulfilledAt,
        currentStageKey:
          nextStatus === "FULFILLED" ? "fulfilled" : "payment-confirmed",
        currentStageLabel:
          nextStatus === "FULFILLED" ? "Fulfilled" : "Payment Confirmed",
        metadata: {
          ...itemMetadata,
          paymentStatus: "PAYMENT_CONFIRMED",
          paymentMethod: "stripe_card",
          paymentMethodLabel: "Card payment (Stripe)",
          paymentConfirmedAt: now.toISOString(),
          paymentConfirmedByName: "Stripe",
          stripeCheckoutSessionId:
            sessionId || itemMetadata.stripeCheckoutSessionId || null,
          stripePaymentIntentId:
            paymentIntentId || itemMetadata.stripePaymentIntentId || null,
        } as Prisma.InputJsonObject,
      },
    });

    const alreadyRecorded = (item.activities || []).some(
      (activity: any) => cleanText(activity.stageKey) === "payment-confirmed"
    );

    if (!alreadyRecorded) {
      await createOrderFulfillmentActivity(prisma as any, {
        fulfillmentItemId: item.id,
        orderCode: cleanText(item.orderCode),
        stageKey: "payment-confirmed",
        stageLabel: "Payment confirmed",
        updateType: "automatic",
        source: "Stripe",
        previousStatus,
        nextStatus,
        notes: "Stripe Checkout confirmed this payment.",
        completedAt: now,
        metadata: {
          orderActivityKey: `${item.orderCode}:stripe-payment-confirmed`,
          paymentMethod: "stripe_card",
          paymentMethodLabel: "Card payment (Stripe)",
          stripeCheckoutSessionId: sessionId || null,
          stripePaymentIntentId: paymentIntentId || null,
        },
      });
    }
  }

  return {
    ok: true,
    matched: true,
    paymentCount: 0,
    orderCount: orderCodes.length,
    fulfillmentItemCount: items.length,
  };
}

function getOriginFromUrl(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

async function markStripeCheckoutPaid(session: Record<string, unknown>) {
  const sessionId = cleanText(session.id);
  const paymentIntentId = cleanText(session.payment_intent);
  const amountTotal = normalizeMoney(Number(session.amount_total) / 100);
  const currency = cleanText(session.currency).toUpperCase();
  const now = new Date();
  const payments = await findPaymentsForCheckoutSession(session);
  const orderIds = Array.from(
    new Set(payments.map((payment) => payment.orderId).filter(Boolean))
  );

  if (!payments.length) {
    return markPlantShopStripeCheckoutPaid(session);
  }

  for (const payment of payments) {
    const paymentMetadata = readObject(payment.metadata);

    await prisma.invitationTicketPayment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        amount:
          amountTotal > 0
            ? new Prisma.Decimal(amountTotal)
            : payment.amount,
        currencyCode: currency || payment.currencyCode,
        metadata: {
          ...paymentMetadata,
          provider: "stripe",
          paymentStatus: "paid",
          checkoutSessionId: sessionId || paymentMetadata.checkoutSessionId,
          paymentIntentId:
            paymentIntentId || paymentMetadata.paymentIntentId || null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
          paidAt: now.toISOString(),
          stripeEventStatus: session.status ?? null,
        } as Prisma.InputJsonObject,
      },
    });
  }

  let fulfillmentItemCount = 0;
  let deliverableEmailCount = 0;

  for (const orderId of orderIds) {
    await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        status: "PAID",
      },
    });

    const order = payments.find((payment) => payment.orderId === orderId)?.order;
    const fulfillmentItems = order?.fulfillmentItems || [];
    const firstFulfillmentMetadata = readObject(fulfillmentItems[0]?.metadata);
    const receiptLink = cleanText(firstFulfillmentMetadata.receiptLink);
    const alreadySentDeliverables = fulfillmentItems.some((item: any) => {
      const metadata = readObject(item.metadata);

      return Boolean(cleanText(metadata.deliverablesEmailSentAt));
    });

    for (const item of fulfillmentItems) {
      const nextStatus = getNextFulfillmentStatus(item);
      const itemMetadata = readObject(item.metadata);
      const previousStatus = cleanText(item.fulfillmentStatus) || "PENDING";

      await prisma.orderFulfillmentItem.update({
        where: { id: item.id },
        data: {
          status: nextStatus,
          fulfillmentStatus: nextStatus,
          fulfilledAt: nextStatus === "FULFILLED" ? now : item.fulfilledAt,
          currentStageKey:
            nextStatus === "FULFILLED"
              ? "fulfilled"
              : "payment-confirmed",
          currentStageLabel:
            nextStatus === "FULFILLED"
              ? "Fulfilled"
              : "Payment Confirmed",
          metadata: {
            ...itemMetadata,
            paymentStatus: "PAYMENT_CONFIRMED",
            paymentMethod: "stripe_card",
            paymentMethodLabel: "Card payment (Stripe)",
            paymentConfirmedAt: now.toISOString(),
            paymentConfirmedByName: "Stripe",
            stripeCheckoutSessionId:
              sessionId || itemMetadata.stripeCheckoutSessionId || null,
            stripePaymentIntentId:
              paymentIntentId || itemMetadata.stripePaymentIntentId || null,
          } as Prisma.InputJsonObject,
        },
      });

      const alreadyRecorded = (item.activities || []).some(
        (activity: any) => cleanText(activity.stageKey) === "payment-confirmed"
      );

      if (!alreadyRecorded) {
        await createOrderFulfillmentActivity(prisma as any, {
          fulfillmentItemId: item.id,
          orderCode: cleanText(item.orderCode),
          stageKey: "payment-confirmed",
          stageLabel: "Payment confirmed",
          updateType: "automatic",
          source: "Stripe",
          previousStatus,
          nextStatus,
          notes: "Stripe Checkout confirmed this payment.",
          completedAt: now,
          metadata: {
            orderActivityKey: `${item.orderCode}:stripe-payment-confirmed`,
            paymentMethod: "stripe_card",
            paymentMethodLabel: "Card payment (Stripe)",
            stripeCheckoutSessionId: sessionId || null,
            stripePaymentIntentId: paymentIntentId || null,
          },
        });
      }

      fulfillmentItemCount += 1;
    }

    if (
      order &&
      !alreadySentDeliverables &&
      orderIncludesEscapeAlbumAccess(order.resolvedLinesSnapshot) &&
      cleanText(order.purchaserEmail)
    ) {
      const purchaserUserId = cleanText(order.purchaserUserId);

      if (purchaserUserId) {
        await prisma.userPurchasedItem.upsert({
          where: {
            userId_itemKey: {
              userId: purchaserUserId,
              itemKey: ESCAPE_ALBUM_ITEM_KEY,
            },
          },
          create: {
            userId: purchaserUserId,
            itemKey: ESCAPE_ALBUM_ITEM_KEY,
            status: "ACTIVE",
            source: "stripe-webhook",
            metadata: {
              orderId: order.id,
              orderCode: order.orderCode,
              paidAt: now.toISOString(),
            },
          },
          update: {
            status: "ACTIVE",
            source: "stripe-webhook",
            metadata: {
              orderId: order.id,
              orderCode: order.orderCode,
              paidAt: now.toISOString(),
            },
          },
        });
      }

      const deliveryResult = await sendEscapeAlbumAccessEmail({
        origin:
          getOriginFromUrl(receiptLink) ||
          cleanText(process.env.NEXT_PUBLIC_APP_URL),
        purchaserEmail: cleanText(order.purchaserEmail),
        purchaserName: cleanText(order.purchaserName),
        temporaryPassword: null,
        accountWasCreated: false,
        temporaryPasswordWasIssued: false,
        questionnaireSlug: cleanText(order.questionnaireSlug),
        receiptLink,
      });

      if (deliveryResult?.ok === true) {
        const sentAt = new Date().toISOString();

        for (const item of fulfillmentItems) {
          const itemMetadata = readObject(item.metadata);

          await prisma.orderFulfillmentItem.update({
            where: { id: item.id },
            data: {
              metadata: {
                ...itemMetadata,
                deliverablesEmailSentAt: sentAt,
                deliverablesEmailSentBy: "stripe-webhook",
                receiptLink,
              } as Prisma.InputJsonObject,
            },
          });
        }

        deliverableEmailCount += 1;
      }
    }
  }

  return {
    ok: true,
    matched: true,
    paymentCount: payments.length,
    orderCount: orderIds.length,
    fulfillmentItemCount,
    deliverableEmailCount,
  };
}

async function markStripeCheckoutFailed(session: Record<string, unknown>) {
  const payments = await findPaymentsForCheckoutSession(session);

  for (const payment of payments) {
    const paymentMetadata = readObject(payment.metadata);

    await prisma.invitationTicketPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        metadata: {
          ...paymentMetadata,
          provider: "stripe",
          paymentStatus: "failed",
          failedAt: new Date().toISOString(),
          stripeEventStatus: session.status ?? null,
        } as Prisma.InputJsonObject,
      },
    });
  }

  return {
    ok: true,
    paymentCount: payments.length,
  };
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    return Response.json(
      { ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader = cleanText(request.headers.get("stripe-signature"));

  if (
    !verifyStripeSignature({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
    })
  ) {
    return Response.json(
      { ok: false, error: "Invalid Stripe signature." },
      { status: 400 }
    );
  }

  const event = JSON.parse(rawBody);
  const eventType = cleanText(event?.type);
  const session = readObject(event?.data?.object);

  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  ) {
    if (!isPaidCheckoutSession(session)) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "checkout-session-not-paid-yet",
      });
    }

    const result = await markStripeCheckoutPaid(session);
    return Response.json(result);
  }

  if (eventType === "checkout.session.async_payment_failed") {
    const result = await markStripeCheckoutFailed(session);
    return Response.json(result);
  }

  return Response.json({
    ok: true,
    ignored: true,
    eventType,
  });
}
