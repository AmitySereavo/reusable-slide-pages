import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { ensureUserVideoProgressAnalyticsColumns } from "@/lib/questionnaire/videoProgressSchema";
import {
  getProfilesForTargets,
  seedImportedConversationNotes,
} from "@/lib/dashboard/personProfiles";
import { ensureCustomerGrowGuideTables } from "@/lib/growGuides/trackedLinks";
import { ensureUnregisteredVisitorActivityTable } from "@/lib/visitors/unregisteredVisitors";

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
    passwordUpdatedAt: toIso(user.passwordUpdatedAt),
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
      sessionCount: user.sessions?.length || 0,
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
      id: item.id,
      productTitle: item.productTitle,
      productId: item.productId || null,
      productSku: item.productSku || null,
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

function attachGrowGuideLinksToCustomers(customers: any[], links: any[]) {
  const linksByIdentity = new Map<string, any[]>();

  for (const link of links) {
    const key = String(link.ownerIdentityKey || "").trim();
    if (!key) continue;

    linksByIdentity.set(key, [...(linksByIdentity.get(key) || []), link]);
  }

  return customers.map((customer) => {
    const growGuideLinks = (linksByIdentity.get(customer.id) || []).map((link) => {
      const visits = Array.isArray(link.visits) ? link.visits : [];

      return {
        id: link.id,
        token: link.token,
        orderCode: link.orderCode,
        productTitle: link.productTitle,
        sizeLabel: link.sizeLabel,
        guideSlug: link.guideSlug,
        guidePath: link.guidePath,
        openedCount: Number(link.openedCount || 0),
        slideViewCount: Number(link.slideViewCount || 0),
        deviceCount: Number(link.deviceCount || 0),
        firstOpenedAt: toIso(link.firstOpenedAt),
        lastOpenedAt: toIso(link.lastOpenedAt),
        latestVisitAt: toIso(link.latestVisitAt),
        createdAt: toIso(link.createdAt),
        visits: visits.map((visit: any) => ({
          id: visit.id,
          eventType: visit.eventType,
          questionnaireSlug: visit.questionnaireSlug,
          slideId: visit.slideId,
          slideLabel: makeSlideLabel(visit.slideId, visit.questionnaireSlug),
          deviceKey: visit.deviceKey,
          createdAt: toIso(visit.createdAt),
        })),
      };
    });

    if (!growGuideLinks.length) return customer;

    const growGuideDeviceMap = new Map<string, any>();

    for (const guideLink of growGuideLinks) {
      for (const visit of guideLink.visits || []) {
        const deviceKey = String(visit.deviceKey || "").trim();
        if (!deviceKey) continue;

        const previous = growGuideDeviceMap.get(deviceKey);
        const visitAt = visit.createdAt;
        const previousFirstMs = new Date(previous?.firstSeenAt || visitAt || 0).getTime();
        const previousLastMs = new Date(previous?.lastSeenAt || visitAt || 0).getTime();
        const visitMs = new Date(visitAt || 0).getTime();

        growGuideDeviceMap.set(deviceKey, {
          ...previous,
          role: "grow-guide",
          source: "Grow guide link",
          deviceKey,
          orderCode: guideLink.orderCode || previous?.orderCode || null,
          guideSlug: guideLink.guideSlug || previous?.guideSlug || null,
          productTitle: guideLink.productTitle || previous?.productTitle || null,
          note: `Opened ${guideLink.productTitle || guideLink.guideSlug || "grow guide"}`,
          firstSeenAt:
            previous && previousFirstMs <= visitMs ? previous.firstSeenAt : visitAt,
          lastSeenAt:
            previous && previousLastMs >= visitMs ? previous.lastSeenAt : visitAt,
        });
      }
    }

    return {
      ...customer,
      summary: {
        ...customer.summary,
        growGuideLinkCount: growGuideLinks.length,
        growGuideVisitCount: growGuideLinks.reduce(
          (sum, link) => sum + Number(link.slideViewCount || link.openedCount || 0),
          0
        ),
      },
      growGuideLinks,
      devices: [
        ...(customer.devices || []),
        ...Array.from(growGuideDeviceMap.values()),
      ].sort(
        (a: any, b: any) =>
          new Date(b.lastSeenAt || b.firstSeenAt || 0).getTime() -
          new Date(a.lastSeenAt || a.firstSeenAt || 0).getTime()
      ),
    };
  });
}

function serializeUnnamedDeviceLeads(links: any[]) {
  const byDevice = new Map<string, any>();

  for (const link of links) {
    const visits = Array.isArray(link.visits) ? link.visits : [];

    for (const visit of visits) {
      const deviceKey = String(visit.deviceKey || "").trim();
      if (!deviceKey) continue;

      const existing =
        byDevice.get(deviceKey) ??
        {
          kind: "device-lead",
          id: `device:${deviceKey}`,
          createdAt: toIso(visit.createdAt),
          updatedAt: toIso(visit.createdAt),
          verifiedAt: null,
          bucket: "Unnamed leads",
          labels: ["unnamed-lead", "device-only"],
          contact: {
            name: `Unknown device ${deviceKey.slice(0, 8)}`,
            email: null,
            phone: null,
          },
          summary: {
            activityCount: 0,
            deviceCount: 1,
            growGuideVisitCount: 0,
            amountSpent: [],
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
          devices: [
            {
              role: "unnamed-lead",
              source: "Tracked site activity",
              deviceKey,
              firstSeenAt: toIso(visit.createdAt),
              lastSeenAt: toIso(visit.createdAt),
              userAgent: visit.userAgent || null,
              referrer: visit.referrer || null,
              location: visit.location || null,
            },
          ],
          activityLog: [],
        };

      const visitAt = toIso(visit.createdAt);
      const existingCreatedMs = new Date(existing.createdAt || visitAt || 0).getTime();
      const existingUpdatedMs = new Date(existing.updatedAt || visitAt || 0).getTime();
      const visitMs = new Date(visitAt || 0).getTime();
      existing.createdAt =
        existingCreatedMs && existingCreatedMs < visitMs
          ? existing.createdAt
          : visitAt;
      existing.updatedAt =
        existingUpdatedMs > visitMs ? existing.updatedAt : visitAt;
      existing.summary.activityCount += 1;
      existing.summary.growGuideVisitCount += 1;
      existing.devices[0].firstSeenAt =
        new Date(existing.devices[0].firstSeenAt || visitAt || 0).getTime() <=
        visitMs
          ? existing.devices[0].firstSeenAt
          : visitAt;
      existing.devices[0].lastSeenAt =
        new Date(existing.devices[0].lastSeenAt || visitAt || 0).getTime() >=
        visitMs
          ? existing.devices[0].lastSeenAt
          : visitAt;
      existing.activityLog.push({
        type: "unnamed-device-activity",
        label: `Visited ${makeSlideLabel(visit.slideId, visit.questionnaireSlug)}`,
        detail: [
          link.productTitle || link.guideSlug || "Grow guide",
          link.orderCode ? `Shared from order ${link.orderCode}` : "",
        ]
          .filter(Boolean)
          .join(" - "),
        createdAt: visitAt,
        details: [
          {
            label: "Device",
            detail: deviceKey,
            createdAt: visitAt,
          },
          {
            label: "Flow",
            detail: visit.questionnaireSlug || "Not recorded",
            createdAt: visitAt,
          },
          {
            label: "Referrer",
            detail: visit.referrer || "Not recorded",
            createdAt: visitAt,
          },
        ],
      });

      byDevice.set(deviceKey, existing);
    }
  }

  return Array.from(byDevice.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

function serializeUnregisteredVisitorActivities(activities: any[]) {
  const byDevice = new Map<string, any>();

  for (const activity of activities) {
    const deviceKey = String(activity.deviceKey || "").trim();
    if (!deviceKey) continue;

    const createdAt = toIso(activity.createdAt);
    const existing =
      byDevice.get(deviceKey) ??
      {
        kind: "device-lead",
        id: `visitor:${deviceKey}`,
        createdAt,
        updatedAt: createdAt,
        verifiedAt: null,
        bucket: "Unregistered visitors",
        labels: ["unregistered-visitor", "interested-visitor", "device-only"],
        contact: {
          name: `Unregistered visitor ${deviceKey.slice(0, 8)}`,
          email: null,
          phone: null,
        },
        summary: {
          activityCount: 0,
          deviceCount: 1,
          growGuideVisitCount: 0,
          amountSpent: [],
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
        devices: [
          {
            role: "unregistered-visitor",
            source: "Interest threshold activity",
            deviceKey,
            firstSeenAt: createdAt,
            lastSeenAt: createdAt,
          },
        ],
        activityLog: [],
      };

    const existingCreatedMs = new Date(existing.createdAt || createdAt || 0).getTime();
    const existingUpdatedMs = new Date(existing.updatedAt || createdAt || 0).getTime();
    const activityMs = new Date(createdAt || 0).getTime();
    existing.createdAt =
      existingCreatedMs && existingCreatedMs < activityMs
        ? existing.createdAt
        : createdAt;
    existing.updatedAt =
      existingUpdatedMs > activityMs ? existing.updatedAt : createdAt;
    existing.summary.activityCount += 1;
    existing.devices[0].firstSeenAt =
      new Date(existing.devices[0].firstSeenAt || createdAt || 0).getTime() <=
      activityMs
        ? existing.devices[0].firstSeenAt
        : createdAt;
    existing.devices[0].lastSeenAt =
      new Date(existing.devices[0].lastSeenAt || createdAt || 0).getTime() >=
      activityMs
        ? existing.devices[0].lastSeenAt
        : createdAt;
    existing.activityLog.push({
      type: activity.eventType || "visitor-activity",
      label: String(activity.eventType || "Visitor activity").replace(/_/g, " "),
      detail: [
        activity.questionnaireSlug
          ? `Flow: ${String(activity.questionnaireSlug).replace(/-/g, " ")}`
          : "",
        activity.slideLabel || activity.slideId || "",
      ]
        .filter(Boolean)
        .join(" - "),
      createdAt,
      details: [
        {
          label: "Device",
          detail: deviceKey,
          createdAt,
        },
        {
          label: "Path",
          detail: activity.path || "Not recorded",
          createdAt,
        },
        {
          label: "Expires",
          detail: toIso(activity.expiresAt) || "Not recorded",
          createdAt,
        },
      ],
    });

    byDevice.set(deviceKey, existing);
  }

  return Array.from(byDevice.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

function makeSlideLabel(slideId: unknown, questionnaireSlug?: unknown) {
  const rawSlide = String(slideId || "").trim();
  const rawSlug = String(questionnaireSlug || "").replace(/-grow-guide$/, "");
  const labelSource = rawSlide || rawSlug || "grow guide";
  const withoutGuidePrefix = rawSlug
    ? labelSource.replace(new RegExp(`^${rawSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-`), "")
    : labelSource;

  return withoutGuidePrefix
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function formatActivitySeconds(value: unknown) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function isBookmarkActivityEvent(eventType: string) {
  return [
    "chapter_bookmark_saved",
    "chapter_bookmark_started",
    "video_bookmark_saved",
    "video_bookmark_started",
  ].includes(eventType);
}

function getBookmarkActivityRecord(event: any) {
  const metadata =
    event.metadata && typeof event.metadata === "object" ? event.metadata : {};
  const isVideo = String(metadata.bookmarkKind || event.eventType).includes("video");
  const isStarted = event.eventType.endsWith("_started");
  const triggerType = metadata.triggerType === "automatic" ? "automatic" : "manual";
  const slideLabel =
    metadata.slideLabel ||
    String(metadata.slideId || "chapter").replace(/-/g, " ");
  const timestampLine =
    isVideo && metadata.videoTimestampSeconds != null
      ? `Video timestamp ${formatActivitySeconds(metadata.videoTimestampSeconds)}`
      : "";

  return {
    type: event.eventType,
    label: isVideo
      ? isStarted
        ? `Started video from bookmark: ${slideLabel}`
        : `Bookmarked video: ${slideLabel}`
      : isStarted
        ? `Started from chapter bookmark: ${slideLabel}`
        : `Bookmarked chapter: ${slideLabel}`,
    detail: [
      metadata.questionnaireSlug
        ? `Flow: ${String(metadata.questionnaireSlug).replace(/-/g, " ")}`
        : "",
      timestampLine,
      triggerType === "automatic"
        ? "Automatic website trigger"
        : "User-created bookmark",
    ]
      .filter(Boolean)
      .join(" - "),
    createdAt: event.createdAt,
    details: [
      {
        label: "Slide",
        detail: metadata.slideId || "Not recorded",
        createdAt: event.createdAt,
      },
      {
        label: "Trigger",
        detail:
          triggerType === "automatic"
            ? "Automatically triggered by code/site"
            : "Made by the user",
        createdAt: event.createdAt,
      },
      {
        label: "Logged at",
        detail: event.createdAt || "Not recorded",
        createdAt: event.createdAt,
      },
      ...(isVideo
        ? [
            {
              label: "Video timestamp",
              detail:
                metadata.videoTimestampSeconds != null
                  ? formatActivitySeconds(metadata.videoTimestampSeconds)
                  : "Not recorded",
              createdAt: event.createdAt,
            },
          ]
        : []),
    ],
  };
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

      for (const event of record.emailActivity || []) {
        if (!isBookmarkActivityEvent(event.eventType)) continue;
        person.activityLog.push(getBookmarkActivityRecord(event));
      }
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
      for (const guideLink of record.growGuideLinks || []) {
        person.activityLog.push({
          type: "grow-guide-link",
          label: `Opened ${String(guideLink.guideSlug || "grow guide").replace(
            /-/g,
            " "
          )}`,
          detail: [
            guideLink.productTitle,
            guideLink.orderCode ? `Order ${guideLink.orderCode}` : "",
            guideLink.deviceCount
              ? `${guideLink.deviceCount} device(s)`
              : "",
            guideLink.slideViewCount
              ? `${guideLink.slideViewCount} guide page visit(s)`
              : "",
          ]
            .filter(Boolean)
            .join(" - "),
          createdAt:
            guideLink.latestVisitAt || guideLink.lastOpenedAt || guideLink.createdAt,
          details: (guideLink.visits || []).map((visit: any) => ({
            id: visit.id,
            label: visit.slideLabel || visit.slideId || "Guide page",
            detail: [
              visit.eventType ? `Event: ${visit.eventType}` : "",
              visit.questionnaireSlug ? `Guide: ${visit.questionnaireSlug}` : "",
              visit.deviceKey
                ? `Device ${String(visit.deviceKey).slice(0, 12)}`
                : "",
            ]
              .filter(Boolean)
              .join(" - "),
            createdAt: visit.createdAt,
          })),
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
  await ensureCustomerGrowGuideTables();
  await ensureUnregisteredVisitorActivityTable();

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

  const [users, leads, littleOrchardItems, growGuideLinks, unregisteredVisitorActivities, userCount, leadCount] = await Promise.all([
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
        sessions: { orderBy: { lastUsedAt: "desc" }, take: 3 },
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
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        l.*,
        COUNT(v."id")::int AS "slideViewCount",
        COUNT(DISTINCT v."deviceKey")::int AS "deviceCount",
        MAX(v."createdAt") AS "latestVisitAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', v."id",
              'eventType', v."eventType",
              'questionnaireSlug', v."questionnaireSlug",
              'slideId', v."slideId",
              'deviceKey', v."deviceKey",
              'userAgent', v."userAgent",
              'location', v."location",
              'referrer', v."referrer",
              'createdAt', v."createdAt"
            )
            ORDER BY v."createdAt" ASC
          ) FILTER (WHERE v."id" IS NOT NULL),
          '[]'::json
        ) AS "visits"
      FROM "CustomerGrowGuideLink" l
      LEFT JOIN "CustomerGrowGuideVisit" v ON v."linkId" = l."id"
      GROUP BY l."id"
      ORDER BY COALESCE(MAX(v."createdAt"), l."updatedAt") DESC
      LIMIT ${take * 8}
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT *
      FROM "UnregisteredVisitorActivity"
      WHERE "expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP
      ORDER BY "createdAt" DESC
      LIMIT ${take * 8}
    `),
    prisma.user.count({ where: userWhere }),
    prisma.lead.count({ where: leadWhere }),
  ]);
  const serializedAccounts = users.map(serializeUser);
  const serializedLeads = leads.map(serializeLead);
  const serializedCustomers = attachGrowGuideLinksToCustomers(
    serializeLittleOrchardCustomers(littleOrchardItems),
    growGuideLinks
  ).slice(0, take);
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
  const unregisteredInterestedVisitors = [
    ...serializeUnregisteredVisitorActivities(unregisteredVisitorActivities),
    ...serializeUnnamedDeviceLeads(growGuideLinks),
  ]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime()
    )
    .slice(0, take);
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
      unregisteredVisitorCount: unregisteredInterestedVisitors.length,
    },
    people,
    accounts,
    leads: leadsWithProfiles,
    customers,
    unregisteredInterestedVisitors,
    unnamedDeviceLeads: unregisteredInterestedVisitors,
  });
}
