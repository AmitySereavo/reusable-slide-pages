import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { ensureUserVideoProgressAnalyticsColumns } from "@/lib/questionnaire/videoProgressSchema";
import {
  getProfilesForTargets,
  seedImportedConversationNotes,
} from "@/lib/dashboard/personProfiles";

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
    (sum: number, record: any) =>
      sum + toNumber(record.totalWatchSeconds ?? record.lastPositionSeconds),
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
      totalWatchSeconds: record.totalWatchSeconds ?? 0,
      maxPositionSeconds:
        record.maxPositionSeconds ?? record.lastPositionSeconds ?? 0,
      playEventCount: record.playEventCount ?? 0,
      seekForwardCount: record.seekForwardCount ?? 0,
      seekBackwardCount: record.seekBackwardCount ?? 0,
      lastEventType: record.lastEventType ?? null,
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

function contactKeyFromParts({
  name,
  email,
  phone,
}: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;

  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (normalizedPhone) return `phone:${normalizedPhone}`;

  return `name:${String(name || "unknown").trim().toLowerCase()}`;
}

function compactLittleOrchardContact(item: any) {
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const answers = metadata.answers && typeof metadata.answers === "object" ? metadata.answers : {};
  const phone =
    metadata.customerPhoneNumber ||
    metadata.customerPhone ||
    metadata.customerWhatsappNumber ||
    answers.primaryPhone ||
    answers.whatsappNumber ||
    null;

  return {
    name: item.recipientName || metadata.customerName || answers.fullName || null,
    email: metadata.customerEmail || item.recipientEmail || answers.email || null,
    phone,
    country: answers.plantDeliveryCountry || answers.deliveryCountry || null,
    city: answers.plantDeliveryCityTown || answers.deliveryCityTown || null,
    addressLine1:
      answers.plantDeliveryStreetAddress || answers.deliveryStreetAddress || null,
    addressLine2: null,
    parishOrRegion:
      answers.plantDeliveryRegion || answers.deliveryRegion || null,
    postalCode:
      answers.plantDeliveryPostalCode || answers.deliveryPostalCode || null,
  };
}

function readDeviceRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (record) =>
          record && typeof record === "object" && !Array.isArray(record)
      )
    : [];
}

function deviceRecordKey(record: any) {
  return [
    record.role || "device",
    record.deviceKey || "unknown",
    record.userId || "",
  ].join(":");
}

function serializeLittleOrchardCustomers(items: any[]) {
  const byCustomer = new Map<string, any>();

  for (const item of items) {
    const contact = compactLittleOrchardContact(item);
    const key = contactKeyFromParts(contact);
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    const answers = metadata.answers && typeof metadata.answers === "object" ? metadata.answers : {};
    const existing =
      byCustomer.get(key) ??
      {
        kind: "customer",
        id: key,
        bucket: "Para-life Trees",
        labels: ["customer", "little-orchard-shop"],
        createdAt: toIso(item.createdAt),
        updatedAt: toIso(item.updatedAt),
        contact,
        summary: {
          orderCount: 0,
          itemCount: 0,
          amountSpent: [{ currencyCode: item.currencyCode || "JMD", amount: 0 }],
          videoCount: 0,
          totalWatchedSeconds: 0,
          questionAnswerCount: 0,
          emailEventCount: 0,
        },
        interests: new Set<string>(),
        orderMap: new Map<string, any>(),
        deviceMap: new Map<string, any>(),
        notes: [],
      };

    existing.createdAt =
      new Date(existing.createdAt || item.createdAt).getTime() >
      new Date(item.createdAt).getTime()
        ? toIso(item.createdAt)
        : existing.createdAt;
    existing.updatedAt =
      new Date(existing.updatedAt || 0).getTime() < new Date(item.updatedAt).getTime()
        ? toIso(item.updatedAt)
        : existing.updatedAt;
    existing.contact = {
      ...existing.contact,
      ...Object.fromEntries(
        Object.entries(contact).filter(([, value]) => Boolean(value))
      ),
    };
    existing.interests.add(item.productTitle);

    for (const record of readDeviceRecords(metadata.customerDeviceRecords)) {
      const key = deviceRecordKey({ ...record, role: "customer" });
      const previous = existing.deviceMap.get(key);
      existing.deviceMap.set(key, {
        ...previous,
        ...record,
        role: "customer",
        orderCode: record.orderCode || item.orderCode || null,
      });
    }

    for (const record of readDeviceRecords(metadata.staffDeviceRecords)) {
      const key = deviceRecordKey({ ...record, role: "staff" });
      const previous = existing.deviceMap.get(key);
      existing.deviceMap.set(key, {
        ...previous,
        ...record,
        role: "staff",
        orderCode: record.orderCode || item.orderCode || null,
      });
    }

    for (const value of [
      answers.dreamPlant,
      answers.biggestGardeningChallenge,
      answers.growsOther,
    ]) {
      if (typeof value === "string" && value.trim()) {
        existing.interests.add(value.trim());
      }
    }

    const orderCode = item.orderCode || item.id;
    const order =
      existing.orderMap.get(orderCode) ??
      {
        orderCode,
        createdAt: toIso(item.createdAt),
        updatedAt: toIso(item.updatedAt),
        status: item.fulfillmentStatus || item.status,
        paymentStatus: metadata.paymentStatus || null,
        currencyCode: item.currencyCode || "JMD",
        total: 0,
        fulfillmentPreference: metadata.fulfillmentPreference || null,
        contactMethod: metadata.contactMethod || null,
        cashierLink: metadata.cashierLink || null,
        receiptLink: metadata.receiptLink || null,
        orderStatusLink: metadata.orderStatusLink || null,
        items: [],
      };

    order.total += toNumber(item.lineTotal);
    order.items.push({
      productTitle: item.productTitle,
      sku: item.sku || item.productSku || item.sizeSku || null,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
      status: item.fulfillmentStatus || item.status,
    });
    existing.orderMap.set(orderCode, order);
    existing.summary.itemCount += Number(item.quantity || 0);
    existing.summary.amountSpent[0].amount += toNumber(item.lineTotal);

    if (item.fulfillmentNotes) {
      existing.notes.push({
        orderCode,
        source: "Order fulfillment notes",
        text: item.fulfillmentNotes,
        createdAt: toIso(item.createdAt),
      });
    }

    byCustomer.set(key, existing);
  }

  return Array.from(byCustomer.values())
    .map((customer) => {
      const orders = Array.from(customer.orderMap.values()).sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      return {
        ...customer,
        summary: {
          ...customer.summary,
          orderCount: orders.length,
        },
        interests: Array.from(customer.interests).filter(Boolean),
        orders,
        devices: Array.from(customer.deviceMap.values()).sort(
          (a: any, b: any) =>
            new Date(b.lastSeenAt || b.firstSeenAt || 0).getTime() -
            new Date(a.lastSeenAt || a.firstSeenAt || 0).getTime()
        ),
        notes: customer.notes.slice(0, 20),
        orderMap: undefined,
        deviceMap: undefined,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
}

function attachPeopleProfile(record: any, profile: any) {
  const contactOverride =
    profile?.contactOverride &&
    typeof profile.contactOverride === "object" &&
    !Array.isArray(profile.contactOverride)
      ? profile.contactOverride
      : {};
  const profileLabels = Array.isArray(profile?.labels) ? profile.labels : [];
  const profileInterests = Array.isArray(profile?.interests)
    ? profile.interests
    : [];

  return {
    ...record,
    bucket: profile?.bucket || record.bucket || null,
    labels: Array.from(
      new Set([...(record.labels || []), ...profileLabels].filter(Boolean))
    ),
    interests: Array.from(
      new Set([...(record.interests || []), ...profileInterests].filter(Boolean))
    ),
    contact: {
      ...(record.contact || {}),
      ...Object.fromEntries(
        Object.entries(contactOverride).filter(([, value]) =>
          Boolean(String(value || "").trim())
        )
      ),
    },
    peopleProfile: profile
      ? {
          id: profile.id,
          bucket: profile.bucket || null,
          labels: profileLabels,
          interests: profileInterests,
          contactOverride,
          followUpFrequency: profile.followUpFrequency || "none",
          deletedAt: toIso(profile.deletedAt),
          updatedAt: toIso(profile.updatedAt),
          followUpStatus: profile.followUpStatus,
        }
      : null,
    conversationNotes: (profile?.conversationNotes || []).map((note: any) => ({
      id: note.id,
      summary: note.summary,
      currentGoals: note.currentGoals,
      currentPosition: note.currentPosition,
      immediateNextStep: note.immediateNextStep,
      relationshipImpact: note.relationshipImpact,
      nextQuestions: note.nextQuestions,
      emotionalState: note.emotionalState,
      satisfaction: note.satisfaction,
      referralOpportunities: note.referralOpportunities,
      additionalNotes: note.additionalNotes,
      createdByUserName: note.createdByUserName,
      createdAt: toIso(note.createdAt),
      updatedAt: toIso(note.updatedAt),
    })),
    latestConversationNote: profile?.latestConversationNote
      ? {
          id: profile.latestConversationNote.id,
          summary: profile.latestConversationNote.summary,
          currentGoals: profile.latestConversationNote.currentGoals,
          currentPosition: profile.latestConversationNote.currentPosition,
          immediateNextStep: profile.latestConversationNote.immediateNextStep,
          relationshipImpact: profile.latestConversationNote.relationshipImpact,
          nextQuestions: profile.latestConversationNote.nextQuestions,
          createdAt: toIso(profile.latestConversationNote.createdAt),
        }
      : null,
  };
}

function getPrimaryIdentity(record: any) {
  const email = String(record.contact?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;

  const phone = String(record.contact?.phone || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;

  return `${record.kind}:${record.id}`;
}

function preferValue(current: any, next: any) {
  return current || next || null;
}

function makePersonShell(record: any, identityKey: string) {
  return {
    kind: "person",
    id: identityKey,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    verifiedAt: record.verifiedAt || null,
    bucket: record.bucket || null,
    labels: new Set<string>([
      "person",
      ...(record.labels || []),
      record.kind === "account" ? "account" : "",
      record.kind === "lead" ? "lead" : "",
      record.kind === "customer" ? "customer" : "",
    ].filter(Boolean)),
    contact: { ...(record.contact || {}) },
    summary: {
      amountSpent: new Map<string, number>(),
      orderCount: 0,
      itemCount: 0,
      ticketCount: 0,
      purchasedItemCount: 0,
      videoCount: 0,
      totalWatchedSeconds: 0,
      questionAnswerCount: 0,
      emailEventCount: 0,
      giftClaimCount: 0,
    },
    sourceRecords: [],
    activityLog: [],
    accounts: [],
    leads: [],
    customers: [],
    interests: new Set<string>(),
    devices: [],
    conversationNotes: [],
    latestConversationNote: null,
    peopleProfile: null,
  };
}

function addMoneyToMap(map: Map<string, number>, values: any[] = []) {
  for (const item of values || []) {
    const currencyCode = item.currencyCode || "USD";
    map.set(
      currencyCode,
      (map.get(currencyCode) || 0) + toNumber(item.amount)
    );
  }
}

function mergePeopleByIdentity(records: any[]) {
  const byIdentity = new Map<string, any>();

  for (const record of records) {
    const identityKey = getPrimaryIdentity(record);
    const person = byIdentity.get(identityKey) || makePersonShell(record, identityKey);
    const createdMs = new Date(record.createdAt || 0).getTime();
    const existingCreatedMs = new Date(person.createdAt || 0).getTime();
    const updatedMs = new Date(record.updatedAt || record.createdAt || 0).getTime();
    const existingUpdatedMs = new Date(person.updatedAt || 0).getTime();

    person.createdAt =
      existingCreatedMs && existingCreatedMs < createdMs
        ? person.createdAt
        : record.createdAt;
    person.updatedAt =
      existingUpdatedMs > updatedMs ? person.updatedAt : record.updatedAt;
    person.verifiedAt = preferValue(person.verifiedAt, record.verifiedAt);
    person.bucket = preferValue(person.bucket, record.bucket);
    person.contact = {
      name: preferValue(person.contact?.name, record.contact?.name),
      email: preferValue(person.contact?.email, record.contact?.email),
      phone: preferValue(person.contact?.phone, record.contact?.phone),
      country: preferValue(person.contact?.country, record.contact?.country),
      city: preferValue(person.contact?.city, record.contact?.city),
      addressLine1: preferValue(
        person.contact?.addressLine1,
        record.contact?.addressLine1
      ),
      addressLine2: preferValue(
        person.contact?.addressLine2,
        record.contact?.addressLine2
      ),
      parishOrRegion: preferValue(
        person.contact?.parishOrRegion,
        record.contact?.parishOrRegion
      ),
      postalCode: preferValue(
        person.contact?.postalCode,
        record.contact?.postalCode
      ),
    };

    for (const label of record.labels || []) person.labels.add(label);
    person.labels.add(record.kind);
    person.sourceRecords.push({
      kind: record.kind,
      id: record.id,
      label: getSourceRecordLabel(record),
      createdAt: record.createdAt,
    });

    if (record.kind === "account") {
      person.accounts.push(record);
      person.activityLog.push({
        type: "account-signup",
        label: "Created account",
        detail: record.createdBy ? `Created by ${record.createdBy}` : "",
        createdAt: record.createdAt,
      });
    } else if (record.kind === "lead") {
      person.leads.push(record);
      person.activityLog.push({
        type: "lead-signup",
        label: `Signed up as a lead${record.target ? ` for ${record.target}` : ""}`,
        detail: record.source ? `Source: ${record.source}` : "",
        createdAt: record.createdAt,
      });
    } else if (record.kind === "customer") {
      person.customers.push(record);
      for (const order of record.orders || []) {
        person.activityLog.push({
          type: "shop-order",
          label: `Placed Little Orchard order ${order.orderCode}`,
          detail: `${order.currencyCode || "JMD"} ${Number(
            order.total || 0
          ).toLocaleString()}`,
          createdAt: order.createdAt,
        });
      }
    }

    addMoneyToMap(person.summary.amountSpent, record.summary?.amountSpent);
    person.summary.orderCount += Number(record.summary?.orderCount || 0);
    person.summary.itemCount += Number(record.summary?.itemCount || 0);
    person.summary.ticketCount += Number(record.summary?.ticketCount || 0);
    person.summary.purchasedItemCount += Number(
      record.summary?.purchasedItemCount || 0
    );
    person.summary.videoCount += Number(record.summary?.videoCount || 0);
    person.summary.totalWatchedSeconds += Number(
      record.summary?.totalWatchedSeconds || 0
    );
    person.summary.questionAnswerCount += Number(
      record.summary?.questionAnswerCount || 0
    );
    person.summary.emailEventCount += Number(
      record.summary?.emailEventCount || 0
    );
    person.summary.giftClaimCount += Number(record.summary?.giftClaimCount || 0);

    for (const interest of record.interests || []) {
      if (interest) person.interests.add(interest);
    }
    person.devices.push(...(record.devices || []));

    byIdentity.set(identityKey, person);
  }

  return Array.from(byIdentity.values())
    .map((person) => ({
      ...person,
      labels: Array.from(person.labels),
      interests: Array.from(person.interests),
      summary: {
        ...person.summary,
        amountSpent: Array.from(
          (person.summary.amountSpent as Map<string, number>).entries()
        ).map(([currencyCode, amount]) => ({ currencyCode, amount })),
      },
      activityLog: person.activityLog.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
      sourceRecords: person.sourceRecords.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
}

function getSourceRecordLabel(record: any) {
  if (record.kind === "account") return "Account";
  if (record.kind === "lead") {
    return record.target ? `Lead: ${record.target}` : "Lead";
  }
  if (record.kind === "customer") {
    return record.bucket ? `${record.bucket} customer` : "Customer";
  }

  return record.kind;
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

  await ensureUserVideoProgressAnalyticsColumns(prisma);

  const littleOrchardCustomerWhere = query
    ? Prisma.sql`
        AND (
          "recipientName" ILIKE ${`%${query}%`}
          OR "recipientEmail" ILIKE ${`%${query}%`}
          OR COALESCE("metadata"->>'customerPhoneNumber', '') ILIKE ${`%${query}%`}
          OR COALESCE("metadata"->>'customerWhatsappNumber', '') ILIKE ${`%${query}%`}
          OR "productTitle" ILIKE ${`%${query}%`}
          OR COALESCE("orderCode", '') ILIKE ${`%${query}%`}
        )
      `
    : Prisma.empty;

  const [users, leads, littleOrchardItems, userCount, leadCount] = await Promise.all([
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
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT *
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
      ${littleOrchardCustomerWhere}
      ORDER BY "updatedAt" DESC
      LIMIT ${take * 8}
    `),
    prisma.user.count({ where: userWhere }),
    prisma.lead.count({ where: leadWhere }),
  ]);
  const serializedAccounts = users.map(serializeUser);
  const serializedLeads = leads.map(serializeLead);
  const serializedCustomers = serializeLittleOrchardCustomers(littleOrchardItems).slice(
    0,
    take
  );
  const targets = [
    ...serializedAccounts.map((record) => ({
      targetKind: "account",
      targetKey: record.id,
    })),
    ...serializedLeads.map((record) => ({
      targetKind: "lead",
      targetKey: record.id,
    })),
    ...serializedCustomers.map((record) => ({
      targetKind: "customer",
      targetKey: record.id,
    })),
  ];
  const profilesByTarget = await getProfilesForTargets(prisma, targets);
  const accounts = serializedAccounts
    .map((record) =>
      attachPeopleProfile(
        record,
        profilesByTarget.get(`account:${record.id}`)
      )
    )
    .filter((record) => !record.peopleProfile?.deletedAt);
  const leadsWithProfiles = serializedLeads
    .map((record) =>
      attachPeopleProfile(record, profilesByTarget.get(`lead:${record.id}`))
    )
    .filter((record) => !record.peopleProfile?.deletedAt);
  const customers = serializedCustomers
    .map((record) =>
      attachPeopleProfile(
        record,
        profilesByTarget.get(`customer:${record.id}`)
      )
    )
    .filter((record) => !record.peopleProfile?.deletedAt);
  const rawPeople = mergePeopleByIdentity([
    ...accounts,
    ...leadsWithProfiles,
    ...customers,
  ]);
  const personTargets = rawPeople.map((record) => ({
    targetKind: "person",
    targetKey: record.id,
  }));
  await seedImportedConversationNotes(
    prisma,
    rawPeople.flatMap((person) =>
      (person.customers || []).flatMap((customer: any) =>
        (customer.notes || []).map((note: any) => ({
          targetKind: "person",
          targetKey: person.id,
          sourceKey: `little-orchard-order-note:${note.orderCode}`,
          summary: `First conversation notes from order ${note.orderCode}`,
          additionalNotes: note.text,
          createdAt: note.createdAt,
        }))
      )
    )
  );
  const personProfilesByTarget = await getProfilesForTargets(prisma, personTargets);
  const people = rawPeople
    .map((record) =>
      attachPeopleProfile(record, personProfilesByTarget.get(`person:${record.id}`))
    )
    .filter((record) => !record.peopleProfile?.deletedAt);

  return NextResponse.json({
    summary: {
      accountCount: accounts.length,
      leadCount: leadsWithProfiles.length,
      customerCount: customers.length,
      personCount: people.length,
    },
    people,
    accounts,
    leads: leadsWithProfiles,
    customers,
  });
}
