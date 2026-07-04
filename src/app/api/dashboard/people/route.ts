import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber()) || 0;
  }
  return Number(value) || 0;
}

function toIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function compactContact(record: any) {
  return {
    name: record.name || record.fullName || null,
    email: record.email || null,
    phone: record.phone || null,
    country: record.country || null,
    city: record.city || null,
    addressLine1: record.addressLine1 || null,
    addressLine2: record.addressLine2 || null,
    parishOrRegion: record.parishOrRegion || null,
    postalCode: record.postalCode || null,
  };
}

function serializeUser(user: any) {
  const orders = user.purchasedInvitationOrders || [];
  const payments = user.invitationTicketPayments || [];
  const purchasedItems = user.purchasedItems || [];
  const videoProgressRecords = user.videoProgressRecords || [];
  const questionAnswers = user.marketingQuestionAnswers || [];
  const emailEvents = user.emailSequenceEvents || [];
  const storeCreditEntries = user.storeCreditLedgerEntries || [];
  const giftClaims = [
    ...(user.purchasedGiftClaims || []).map((claim: any) => ({
      ...claim,
      role: "purchaser",
    })),
    ...(user.recipientGiftClaims || []).map((claim: any) => ({
      ...claim,
      role: "recipient",
    })),
  ];

  const spentByCurrency = new Map<string, number>();
  for (const order of orders) {
    const currency = order.currencyCode || "USD";
    spentByCurrency.set(
      currency,
      (spentByCurrency.get(currency) || 0) + toNumber(order.grandTotal)
    );
  }
  for (const payment of payments) {
    if (String(payment.status || "").toUpperCase() !== "PAID") continue;
    const currency = payment.currencyCode || "USD";
    spentByCurrency.set(
      currency,
      (spentByCurrency.get(currency) || 0) + toNumber(payment.amount)
    );
  }

  const totalWatchedSeconds = videoProgressRecords.reduce(
    (sum: number, record: any) => sum + toNumber(record.lastPositionSeconds),
    0
  );

  return {
    kind: "account",
    id: user.id,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
    verifiedAt: toIso(user.emailVerifiedAt || user.phoneVerifiedAt),
    adminLevel: user.adminLevel,
    createdBy: user.createdBy,
    preferredCurrencyCode: user.preferredCurrencyCode,
    contact: compactContact(user),
    tags: (user.tags || []).map((tag: any) => ({
      tagKey: tag.tagKey,
      label: tag.label,
      source: tag.source,
      createdAt: toIso(tag.createdAt),
    })),
    emailAddresses: (user.emailAddresses || []).map((email: any) => ({
      email: email.email,
      isActive: email.isActive,
      isVerified: email.isVerified,
      verifiedAt: toIso(email.verifiedAt),
      createdAt: toIso(email.createdAt),
    })),
    summary: {
      amountSpent: Array.from(spentByCurrency.entries()).map(
        ([currencyCode, amount]) => ({ currencyCode, amount })
      ),
      purchasedItemCount: purchasedItems.length,
      orderCount: orders.length,
      ticketCount: (user.ownedInvitationTickets || []).length,
      videoCount: videoProgressRecords.length,
      totalWatchedSeconds,
      questionAnswerCount: questionAnswers.length,
      giftClaimCount: giftClaims.length,
      emailEventCount: emailEvents.length,
    },
    purchasedItems: purchasedItems.map((item: any) => ({
      itemKey: item.itemKey,
      status: item.status,
      source: item.source,
      purchasedAt: toIso(item.purchasedAt),
      expiresAt: toIso(item.expiresAt),
      metadata: item.metadata || null,
    })),
    orders: orders.map((order: any) => ({
      id: order.id,
      orderCode: order.orderCode,
      questionnaireSlug: order.questionnaireSlug,
      status: order.status,
      currencyCode: order.currencyCode,
      grandTotal: toNumber(order.grandTotal),
      createdAt: toIso(order.createdAt),
      tickets: (order.tickets || []).map((ticket: any) => ({
        ticketCode: ticket.ticketCode,
        productTitle: ticket.productTitle,
        ownerName: ticket.ownerName,
        ownerEmail: ticket.ownerEmail,
        status: ticket.status,
        mealEnabled: ticket.mealEnabled,
        mealSelection: ticket.mealSelection || null,
      })),
    })),
    ownedTickets: (user.ownedInvitationTickets || []).map((ticket: any) => ({
      ticketCode: ticket.ticketCode,
      productTitle: ticket.productTitle,
      ownerName: ticket.ownerName,
      ownerEmail: ticket.ownerEmail,
      status: ticket.status,
      createdAt: toIso(ticket.createdAt),
    })),
    videosWatched: videoProgressRecords.map((record: any) => ({
      questionnaireSlug: record.questionnaireSlug,
      slideId: record.slideId,
      lastPositionSeconds: record.lastPositionSeconds,
      durationSeconds: record.durationSeconds,
      watchedAt: toIso(record.watchedAt),
      updatedAt: toIso(record.updatedAt),
    })),
    questionsAnswered: questionAnswers.map((answer: any) => ({
      questionnaireSlug: answer.questionnaireSlug,
      slideId: answer.slideId,
      questionKey: answer.questionKey,
      answer: answer.answer,
      source: answer.source,
      answeredAt: toIso(answer.answeredAt),
    })),
    storeCredit: storeCreditEntries.map((entry: any) => ({
      amount: toNumber(entry.amount),
      currencyCode: entry.currencyCode,
      creditType: entry.creditType,
      reason: entry.reason,
      source: entry.source,
      createdAt: toIso(entry.createdAt),
    })),
    giftClaims: giftClaims.map((claim: any) => ({
      role: claim.role,
      recipientName: claim.recipientName,
      recipientEmail: claim.recipientEmail,
      productId: claim.productId,
      quantity: claim.quantity,
      amount: toNumber(claim.amount),
      currencyCode: claim.currencyCode,
      status: claim.status,
      claimBy: toIso(claim.claimBy),
      claimedAt: toIso(claim.claimedAt),
      expiredAt: toIso(claim.expiredAt),
    })),
    purchaseRecipients: (user.purchaseRecipients || []).map((recipient: any) => ({
      recipientName: recipient.recipientName,
      recipientEmail: recipient.recipientEmail,
      status: recipient.status,
      acceptedAt: toIso(recipient.acceptedAt),
      createdAt: toIso(recipient.createdAt),
    })),
    emailActivity: emailEvents.map((event: any) => ({
      eventType: event.eventType,
      eventKey: event.eventKey,
      recipientEmail: event.recipientEmail,
      createdAt: toIso(event.createdAt),
      metadata: event.metadata || null,
    })),
  };
}

function serializeLead(lead: any) {
  return {
    kind: "lead",
    id: lead.id,
    createdAt: toIso(lead.createdAt),
    updatedAt: toIso(lead.updatedAt),
    verifiedAt: toIso(lead.verifiedAt),
    source: lead.source,
    target: lead.target,
    contact: compactContact(lead),
    metadata: lead.metadata || null,
  };
}

export async function GET(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();
  const take = Math.min(100, Math.max(10, Number(url.searchParams.get("limit")) || 60));
  const userWhere = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
          {
            tags: {
              some: {
                tagKey: { contains: query, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};
  const leadWhere = query
    ? {
        OR: [
          { fullName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
          { source: { contains: query, mode: "insensitive" as const } },
          { target: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, leads, userCount, leadCount] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        tags: { orderBy: { createdAt: "desc" } },
        emailAddresses: { orderBy: { createdAt: "desc" } },
        purchasedItems: { orderBy: { purchasedAt: "desc" }, take: 20 },
        purchasedInvitationOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            tickets: { orderBy: { ticketIndex: "asc" } },
          },
        },
        ownedInvitationTickets: { orderBy: { createdAt: "desc" }, take: 20 },
        invitationTicketPayments: { orderBy: { createdAt: "desc" }, take: 20 },
        marketingQuestionAnswers: { orderBy: { answeredAt: "desc" }, take: 30 },
        videoProgressRecords: { orderBy: { updatedAt: "desc" }, take: 30 },
        storeCreditLedgerEntries: { orderBy: { createdAt: "desc" }, take: 20 },
        purchasedGiftClaims: { orderBy: { createdAt: "desc" }, take: 20 },
        recipientGiftClaims: { orderBy: { createdAt: "desc" }, take: 20 },
        purchaseRecipients: { orderBy: { createdAt: "desc" }, take: 20 },
        emailSequenceEvents: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    }),
    prisma.lead.findMany({
      where: leadWhere,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.lead.count({ where: leadWhere }),
  ]);

  return NextResponse.json({
    summary: {
      accountCount: userCount,
      leadCount,
    },
    accounts: users.map(serializeUser),
    leads: leads.map(serializeLead),
  });
}
