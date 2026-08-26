import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { getShopDisplayName, getShopOrderLabel } from "@/config/shopIdentities";
import { makeReceiptCode } from "@/lib/plantShop/receiptCodes";
import { orderIncludesEscapeAlbumAccess } from "@/lib/amitySereavo/deliverables";
import {
  ITASL_LEAD_TAG,
  enrollTagSequencesForUser,
  upsertUserTag,
} from "@/lib/userTags";

const TICKET_OWNER_ACCESS_TARGET = "ticketOwnerAccess";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getInvitationDeliveryMode(assignment) {
  return assignment?.invitationDeliveryMode === "physical"
    ? "physical"
    : "digital";
}

function getInvitationDeliveryPurchaseModeId(assignment) {
  return getInvitationDeliveryMode(assignment) === "physical"
    ? "physical-invitation"
    : "digital-invitation";
}

function getInvitationDeliveryPurchaseModeLabel(assignment) {
  return getInvitationDeliveryMode(assignment) === "physical"
    ? "Physical Invitation (sent to a physical address)"
    : "Digital Invitation (emailed only)";
}

function asBoolean(value) {
  return value === true;
}

function asMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function normalizeInvitationMailingAddress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const address = {
    addressLine1: asString(value.addressLine1),
    addressLine2: asString(value.addressLine2),
    city: asString(value.city),
    region: asString(value.region),
    postalCode: asString(value.postalCode),
    country: asString(value.country),
  };

  return Object.values(address).some(Boolean) ? address : null;
}

function getLineRecipientAllocations(line, purchaser) {
  const recipients = Array.isArray(line.purchaseRecipients)
    ? line.purchaseRecipients
    : [];
  const recipientAllocations = recipients
    .map((recipient) => ({
      role: "recipient",
      name: asString(recipient.name),
      email: normalizeEmail(recipient.email),
      quantity:
        Number.isFinite(Number(recipient.quantity)) &&
        Number(recipient.quantity) > 0
          ? Math.floor(Number(recipient.quantity))
          : 1,
    }))
    .filter((recipient) => recipient.quantity > 0);
  const recipientQuantity = recipientAllocations.reduce(
    (sum, recipient) => sum + recipient.quantity,
    0
  );
  const purchaserQuantity = Math.max(
    0,
    Math.floor(Number(line.quantity) || 0) - recipientQuantity
  );

  return [
    ...(purchaserQuantity > 0
      ? [
          {
            role: "purchaser",
            name: purchaser.name,
            email: purchaser.email,
            quantity: purchaserQuantity,
          },
        ]
      : []),
    ...recipientAllocations,
  ];
}

function buildFulfillmentItemCreateManyData({
  order,
  resolvedLines,
  purchaser,
  currencyCode,
  orderAccessMetadata,
}) {
  return (Array.isArray(resolvedLines) ? resolvedLines : []).flatMap((line) => {
    const fulfillmentType = asString(line.fulfillmentType);

    if (
      fulfillmentType === "ticket" ||
      (fulfillmentType !== "digital" && fulfillmentType !== "physical")
    ) {
      return [];
    }

    const allocations = getLineRecipientAllocations(line, purchaser);
    const unitPrice = asMoney(line.unitPrice);

    return allocations.map((allocation) => ({
      invitationOrderId: order.id,
      sourceType: order.questionnaireSlug || "invitation-order",
      sourceId: order.id,
      orderCode: order.orderCode,
      lineKey: asString(line.lineKey) || null,
      productId: asString(line.productId) || null,
      productSku: asString(line.productSku) || null,
      productTitle: asString(line.productTitle) || "Order item",
      sizeOptionId: asString(line.sizeOptionId) || null,
      sizeSku: asString(line.sizeOptionSku) || null,
      sizeLabel: asString(line.sizeLabel) || null,
      purchaseModeId: asString(line.purchaseModeId) || null,
      purchaseModeSku: asString(line.purchaseModeSku) || null,
      purchaseModeLabel: asString(line.purchaseModeLabel) || null,
      sku: asString(line.sku) || null,
      fulfillmentType,
      quantity: allocation.quantity,
      currencyCode,
      unitPrice,
      lineTotal: asMoney(unitPrice * allocation.quantity),
      recipientName: allocation.name || null,
      recipientEmail: allocation.email || null,
      recipientRole: allocation.role,
      ticketCode: asString(line.ticketAddOnTicketCode) || null,
      ticketAttendeeName: asString(line.ticketAddOnAttendeeName) || null,
      status: "PENDING",
      fulfillmentStatus: "PENDING",
      currentStageKey: "order-request-sent-to-fulfillment",
      currentStageLabel: "Order Request Sent to Fulfillment",
      metadata: {
        ...orderAccessMetadata,
        requiresPhysicalFulfillment: line.requiresPhysicalFulfillment === true,
        bundledFromLineKey: line.bundledFromLineKey || null,
        bundledByPurchaseModeId: line.bundledByPurchaseModeId || null,
      },
    }));
  });
}

function formatInvitationMailingAddress(address) {
  const normalized = normalizeInvitationMailingAddress(address);

  if (!normalized) {
    return "";
  }

  return [
    normalized.addressLine1,
    normalized.addressLine2,
    normalized.city,
    normalized.region,
    normalized.postalCode,
    normalized.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildPhysicalInvitationFulfillmentItems({
  order,
  ticketAssignments,
  createdTickets,
  currencyCode,
  orderAccessMetadata,
}) {
  const indexedAssignments = (Array.isArray(ticketAssignments)
    ? ticketAssignments
    : []
  ).map((assignment, index) => ({
    assignment,
    index,
  }));

  return indexedAssignments.flatMap(({ assignment, index }) => {
    if (
      getInvitationDeliveryMode(assignment) !== "physical" ||
      assignment.isPlusOneTicket === true
    ) {
      return [];
    }

    const hostTicketIndex =
      typeof assignment.ticketIndex === "number" ? assignment.ticketIndex : index;
    const lineKey = asString(assignment.lineKey);
    const pairedAssignments = indexedAssignments.filter(({ assignment: candidate }) => {
      if (candidate.isPlusOneTicket !== true) {
        const candidateEmail = getTicketOwnerEmail(candidate);
        const candidateTicketIndex =
          typeof candidate.ticketIndex === "number"
            ? candidate.ticketIndex
            : undefined;

        return (
          !candidateEmail &&
          getInvitationDeliveryMode(candidate) === "physical" &&
          asString(candidate.lineKey) === lineKey &&
          candidateTicketIndex === hostTicketIndex + 1
        );
      }

      return (
        getInvitationDeliveryMode(candidate) === "physical" &&
        asString(candidate.lineKey) === lineKey &&
        Number(candidate.plusOneHostTicketIndex) === Number(hostTicketIndex)
      );
    });
    const packageAssignments = [
      { assignment, index },
      ...pairedAssignments,
    ];
    const createdTicket = createdTickets[index]?.ticket;
    const mailingAddress = normalizeInvitationMailingAddress(
      assignment.invitationMailingAddress
    );
    const formattedAddress = formatInvitationMailingAddress(mailingAddress);
    const recipientName = asString(assignment.ownerName);
    const ticketCode =
      createdTicket?.ticketCode || asString(assignment.ticketCode) || null;
    const ticketLabel =
      asString(assignment.ticketLabel || assignment.sizeLabel) || "Invitation";
    const attendees = packageAssignments.map(({ assignment: ticketAssignment, index: ticketIndex }) => {
      const ticket = createdTickets[ticketIndex]?.ticket;

      return {
        name: asString(ticketAssignment.ownerName) || "Attendee",
        email: getTicketOwnerEmail(ticketAssignment) || null,
        ticketCode:
          ticket?.ticketCode || asString(ticketAssignment.ticketCode) || null,
        ticketLabel:
          asString(ticketAssignment.ticketLabel || ticketAssignment.sizeLabel) ||
          ticketLabel,
        isPlusOneTicket: ticketAssignment.isPlusOneTicket === true,
        plusOneHostName: asString(ticketAssignment.plusOneHostName) || null,
      };
    });
    const attendeeNames = attendees.map((attendee) => attendee.name).join(", ");
    const fulfillmentDetails = asString(
      assignment.physicalInvitationFulfillmentDetails
    );
    const noteParts = [
      formattedAddress
        ? `Mail physical invitation package to ${formattedAddress}.`
        : "Physical invitation selected, but no mailing address was provided.",
      attendeeNames ? `Attendees in package: ${attendeeNames}.` : "",
      fulfillmentDetails ? `Package contents: ${fulfillmentDetails}` : "",
    ].filter(Boolean);

    return [
      {
        invitationOrderId: order.id,
        sourceType: order.questionnaireSlug || "invitation-order",
        sourceId: createdTicket?.id || order.id,
        orderCode: order.orderCode,
        lineKey: lineKey || null,
        productId: asString(assignment.productId) || null,
        productSku: null,
        productTitle: "Physical Invitation Package",
        sizeOptionId: asString(assignment.sizeOptionId) || null,
        sizeSku: null,
        sizeLabel:
          attendees.length > 1
            ? `${ticketLabel} package for ${attendees.length} attendees`
            : `${ticketLabel} package`,
        purchaseModeId: "physical-invitation",
        purchaseModeSku: null,
        purchaseModeLabel: getInvitationDeliveryPurchaseModeLabel(assignment),
        sku: ticketCode,
        fulfillmentType: "physical",
        quantity: 1,
        currencyCode,
        unitPrice: 0,
        lineTotal: 0,
        recipientUserId: createdTicket?.ownerUserId ?? null,
        recipientName: recipientName || null,
        recipientEmail: getTicketOwnerEmail(assignment) || null,
        recipientRole:
          assignment.isPurchaserTicket === true
            ? "purchaser-ticket-owner"
            : "ticket-owner",
        ticketCode,
        ticketAttendeeName: attendeeNames || recipientName || null,
        status: "PENDING",
        fulfillmentStatus: "PENDING",
        currentStageKey: "order-request-sent-to-fulfillment",
        currentStageLabel: "Order Request Sent to Fulfillment",
        fulfillmentNotes: noteParts.join("\n"),
        metadata: {
          ...orderAccessMetadata,
          invitationDeliveryMode: "physical",
          invitationMailingAddress: mailingAddress,
          ticketLabel,
          attendees,
          peopleCount: attendees.length,
          physicalInvitationFulfillmentDetails: fulfillmentDetails,
        },
      },
    ];
  });
}

function normalizeTicketOwnerPaymentMode(value) {
  return value === "purchaser_pays_ticket_and_addons" ||
    value === "owner_selects_sender_pays_addons" ||
    value === "owner_pays_addons" ||
    value === "owner_pays_ticket_and_addons"
    ? value
    : "purchaser_pays_ticket_and_addons";
}

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");

  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function getRequestOrigin(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  return getBaseUrl(request);
}

function toStripeMinorUnit(value) {
  return Math.max(0, Math.round(asMoney(value) * 100));
}

function shouldUseStripeCheckout(questionnaireSlug) {
  return questionnaireSlug === "music-merch-shop";
}

function buildStripeCheckoutDescription(resolvedLines) {
  const lines = Array.isArray(resolvedLines) ? resolvedLines : [];
  const labels = lines
    .slice(0, 5)
    .map((line) => {
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
      const name = [
        asString(line.productTitle),
        asString(line.sizeLabel),
        asString(line.purchaseModeLabel),
      ]
        .filter(Boolean)
        .join(" - ");

      return name ? `${quantity} x ${name}` : "";
    })
    .filter(Boolean);

  if (lines.length > labels.length) {
    labels.push(`+${lines.length - labels.length} more item(s)`);
  }

  return labels.join("; ").slice(0, 480);
}

async function createStripeCheckoutSession({
  request,
  order,
  resolvedLines,
  purchaserEmail,
  orderSummary,
}) {
  const secretKey = asString(process.env.STRIPE_SECRET_KEY);

  if (!secretKey) {
    throw new Error("Stripe sandbox is not configured. Add STRIPE_SECRET_KEY.");
  }

  const currencyCode = asString(order.currencyCode || orderSummary.currencyCode || "USD")
    .toLowerCase();
  const amount = toStripeMinorUnit(order.grandTotal);

  if (amount <= 0) {
    throw new Error("Stripe checkout requires an order total greater than zero.");
  }

  const origin = getRequestOrigin(request);
  const successUrl = `${origin}/questionnaire/music-merch-shop?slide=confirmation-message&payment=stripe-success&order=${encodeURIComponent(
    order.orderCode
  )}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/questionnaire/music-merch-shop?slide=review-order&payment=stripe-cancelled&order=${encodeURIComponent(
    order.orderCode
  )}`;
  const paymentDescription = buildStripeCheckoutDescription(resolvedLines);

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("client_reference_id", order.id);
  params.set("customer_email", purchaserEmail);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", currencyCode);
  params.set("line_items[0][price_data][unit_amount]", String(amount));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `${getShopOrderLabel(order.questionnaireSlug, "Order")} order ${order.orderCode}`
  );
  if (paymentDescription) {
    params.set(
      "line_items[0][price_data][product_data][description]",
      paymentDescription
    );
  }
  params.set("metadata[orderId]", order.id);
  params.set("metadata[orderCode]", order.orderCode);
  params.set("metadata[questionnaireSlug]", order.questionnaireSlug);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.url) {
    throw new Error(
      payload?.error?.message || "Stripe checkout session could not be created."
    );
  }

  await prisma.invitationTicketPayment.create({
    data: {
      orderId: order.id,
      purpose: "music-merch-checkout",
      status: "PENDING",
      currencyCode: order.currencyCode || "USD",
      amount: asMoney(order.grandTotal),
      metadata: {
        provider: "stripe",
        mode: secretKey.startsWith("sk_test_") ? "sandbox" : "live",
        checkoutSessionId: payload.id || null,
        checkoutSessionUrl: payload.url,
        paymentStatus: payload.payment_status || null,
      },
    },
  });

  return {
    provider: "stripe",
    mode: secretKey.startsWith("sk_test_") ? "sandbox" : "live",
    checkoutSessionId: payload.id || null,
    checkoutUrl: payload.url,
  };
}

function getTokenExpiresAt() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function buildOrderCode() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function buildOrderAccessToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function buildFinalTicketCode(orderCode, index) {
  return `${orderCode}-T${String(index + 1).padStart(4, "0")}`;
}

function createTemporaryPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
}

async function createTemporaryPasswordHash(temporaryPassword) {
  return bcrypt.hash(temporaryPassword, 10);
}

async function issueTemporaryPasswordForUser(tx, userId) {
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await createTemporaryPasswordHash(temporaryPassword);

  await tx.user.update({
    where: {
      id: userId,
    },
    data: {
      password: passwordHash,
      passwordUpdatedAt: new Date(),
    },
  });

  return temporaryPassword;
}

async function findOrCreateTemporaryUserForEmail(tx, params) {
  const email = normalizeEmail(params.email);
  const name = asString(params.name);

  if (!email) {
    return null;
  }

  const existingReservedEmail = await tx.userEmailAddress.findUnique({
    where: {
      normalizedEmail: email,
    },
    include: {
      user: true,
    },
  });

  if (existingReservedEmail?.user) {
    if (existingReservedEmail.user.createdBy === "algorithm") {
      const temporaryPassword = await issueTemporaryPasswordForUser(
        tx,
        existingReservedEmail.user.id
      );

      return {
        user: existingReservedEmail.user,
        created: false,
        temporaryPassword,
        temporaryPasswordWasIssued: true,
      };
    }

    return {
      user: existingReservedEmail.user,
      created: false,
      temporaryPassword: null,
      temporaryPasswordWasIssued: false,
    };
  }

  const existingUser = await tx.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    await tx.userEmailAddress.upsert({
      where: {
        normalizedEmail: email,
      },
      create: {
        userId: existingUser.id,
        email,
        normalizedEmail: email,
        isActive: true,
        isVerified: existingUser.emailVerifiedAt !== null,
        verifiedAt: existingUser.emailVerifiedAt,
      },
      update: {
        userId: existingUser.id,
      },
    });

    if (existingUser.createdBy === "algorithm") {
      const temporaryPassword = await issueTemporaryPasswordForUser(
        tx,
        existingUser.id
      );

      return {
        user: existingUser,
        created: false,
        temporaryPassword,
        temporaryPasswordWasIssued: true,
      };
    }

    return {
      user: existingUser,
      created: false,
      temporaryPassword: null,
      temporaryPasswordWasIssued: false,
    };
  }

  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await createTemporaryPasswordHash(temporaryPassword);

  const user = await tx.user.create({
    data: {
      email,
      name: name || null,
      password: passwordHash,
      passwordUpdatedAt: new Date(),
      createdBy: "algorithm",
    },
  });

  await tx.userEmailAddress.create({
    data: {
      userId: user.id,
      email,
      normalizedEmail: email,
      isActive: true,
      isVerified: false,
    },
  });

  return {
    user,
    created: true,
    temporaryPassword,
    temporaryPasswordWasIssued: true,
  };
}

function getTicketOwnerEmail(assignment) {
  return normalizeEmail(assignment.ownerEmail);
}

function buildTicketSuccessRedirect(ticketCode) {
  return `/invitation/tickets/${encodeURIComponent(ticketCode)}`;
}

function buildTicketSummaryText(tickets) {
  return tickets
    .map((ticket) => {
      const label = ticket.ticketLabel || ticket.sizeLabel || "Ticket";
      return `- ${label}: ${ticket.ticketCode}`;
    })
    .join("\n");
}

function buildTicketSummaryHtml(tickets) {
  if (!tickets.length) {
    return "";
  }

  const items = tickets
    .map((ticket) => {
      const label = escapeHtml(ticket.ticketLabel || ticket.sizeLabel || "Ticket");
      const code = escapeHtml(ticket.ticketCode);
      return `<li><strong>${label}</strong>: ${code}</li>`;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendTicketOwnerGroupLink({
  request,
  tickets,
  ownerEmail,
  ownerName,
  ownerUserId,
  temporaryPassword,
  accountWasCreated,
  temporaryPasswordWasIssued,
  questionnaireSlug,
}) {
  const unsentTickets = tickets.filter((ticket) => !ticket.portalEmailSentAt);
  const firstTicket = unsentTickets[0];

  if (!firstTicket) {
    return {
      ok: true,
      skipped: true,
      reason: "ticket-owner-email-already-sent",
    };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getTokenExpiresAt();
  const successRedirect = buildTicketSuccessRedirect(firstTicket.ticketCode);

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: ownerEmail,
      target: TICKET_OWNER_ACCESS_TARGET,
    },
  });

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: ownerEmail,
      tokenHash,
      target: TICKET_OWNER_ACCESS_TARGET,
      expiresAt,
      successRedirect,
      userId: ownerUserId,
    },
  });

  const baseUrl = getBaseUrl(request);
  const loginUrl = `${baseUrl}/questionnaire/auth-login`;
  const forgotPasswordUrl = `${baseUrl}/questionnaire/auth-forgot-password`;
  const verifyUrl =
    firstTicket.ticketCode && firstTicket.ticketCode.trim()
      ? `${baseUrl}/invitation/tickets/${encodeURIComponent(
          firstTicket.ticketCode
        )}`
      : `${baseUrl}/verify?token=${encodeURIComponent(rawToken)}`;

  const ticketCodes = unsentTickets.map((ticket) => ticket.ticketCode);

  const deliveryResult = await sendVerificationDelivery({
    identifier: ownerEmail,
    delivery: "link",
    verifyUrl,
    target: TICKET_OWNER_ACCESS_TARGET,
    successRedirect,
    verificationTokenId: verificationToken.id,
    contextMetadata: {
      brandKey: "amitySereavo",
      questionnaireSlug,
      purpose: "ticket-owner-access",
      recipientName: ownerName,
      ticketCount: unsentTickets.length,
      ticketCodes,
      ticketSummary: buildTicketSummaryText(unsentTickets),
      ticketSummaryHtml: buildTicketSummaryHtml(unsentTickets),
      mealEditDeadlineLabel: "the event meal deadline",
      firstTicketId: firstTicket.id,
      firstTicketCode: firstTicket.ticketCode,
      orderId: firstTicket.orderId,
      ownerUserId,
      loginUrl,
      forgotPasswordUrl,
      temporaryPassword,
      accountWasCreated,
      temporaryPasswordWasIssued,
    },
  });

  if (deliveryResult.ok) {
    await prisma.invitationOrderTicket.updateMany({
      where: {
        id: {
          in: unsentTickets.map((ticket) => ticket.id),
        },
      },
      data: {
        portalEmailSentAt: new Date(),
      },
    });
  }

  return deliveryResult;
}

export async function POST(request) {
  try {
    await cleanupExpiredAuthRecords();

    const body = await request.json();

    const questionnaireSlug = asString(body.questionnaireSlug) || "invitation";
    const orderRequestKey = asString(body.orderRequestKey);
    const fullName = asString(body.fullName);
    const purchaserEmail = normalizeEmail(body.email);
    const purchaserPhone = asString(body.phone);
    const whatsappOptIn = asBoolean(body.whatsappOptIn);

    const orderCart =
      body.orderCart && typeof body.orderCart === "object" ? body.orderCart : {};
    const resolvedLines = Array.isArray(body.resolvedLines)
      ? body.resolvedLines
      : [];
    const ticketAssignments = Array.isArray(body.ticketAssignments)
      ? body.ticketAssignments
      : [];
    const deliverySelection =
      body.deliverySelection && typeof body.deliverySelection === "object"
        ? body.deliverySelection
        : {};
    const orderSummary =
      body.orderSummary && typeof body.orderSummary === "object"
        ? body.orderSummary
        : {};
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

    if (!purchaserEmail) {
      return Response.json(
        { ok: false, error: "Purchaser email is required." },
        { status: 400 }
      );
    }

    if (!resolvedLines.length) {
      return Response.json(
        { ok: false, error: "Order has no selected items." },
        { status: 400 }
      );
    }

    const parsedPurchaser = parseIdentifier(purchaserEmail);

    if (!parsedPurchaser.valid || !parsedPurchaser.email) {
      return Response.json(
        { ok: false, error: "Enter a valid purchaser email address." },
        { status: 400 }
      );
    }

    if (
      shouldUseStripeCheckout(questionnaireSlug) &&
      !asString(process.env.STRIPE_SECRET_KEY)
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Stripe sandbox is not configured. Add STRIPE_SECRET_KEY before using Pay now.",
        },
        { status: 500 }
      );
    }

    if (orderRequestKey) {
      const existingOrder = await prisma.invitationOrder.findUnique({
        where: {
          orderRequestKey,
        },
        include: {
          tickets: true,
        },
      });

      if (existingOrder) {
        const existingOrderResolvedLines = Array.isArray(
          existingOrder.resolvedLinesSnapshot
        )
          ? existingOrder.resolvedLinesSnapshot
          : [];
        const existingFulfillmentItem = await prisma.orderFulfillmentItem.findFirst({
          where: { invitationOrderId: existingOrder.id },
          orderBy: { createdAt: "asc" },
        });
        const existingFulfillmentMetadata =
          existingFulfillmentItem?.metadata &&
          typeof existingFulfillmentItem.metadata === "object"
            ? existingFulfillmentItem.metadata
            : {};

        const checkoutSession = shouldUseStripeCheckout(questionnaireSlug)
          ? await createStripeCheckoutSession({
              request,
              order: existingOrder,
              resolvedLines: existingOrderResolvedLines,
              purchaserEmail: existingOrder.purchaserEmail || purchaserEmail,
              orderSummary: {
                subtotal: existingOrder.subtotal,
                discountTotal: existingOrder.discountTotal,
                deliveryFee: existingOrder.deliveryFee,
                grandTotal: existingOrder.grandTotal,
              },
            })
          : null;

        return Response.json({
          ok: true,
          message: "Invitation order already created.",
          reused: true,
          order: {
            id: existingOrder.id,
            orderCode: existingOrder.orderCode,
            status: existingOrder.status,
            orderStatusLink:
              typeof existingFulfillmentMetadata.orderStatusLink === "string"
                ? existingFulfillmentMetadata.orderStatusLink
                : null,
            receiptLink:
              typeof existingFulfillmentMetadata.receiptLink === "string"
                ? existingFulfillmentMetadata.receiptLink
                : null,
            receiptCode:
              typeof existingFulfillmentMetadata.receiptCode === "string"
                ? existingFulfillmentMetadata.receiptCode
                : null,
          },
          ticketCount: existingOrder.tickets.length,
          guestPortalLinksSent: 0,
          albumAccessSent: false,
          albumDeliveryResult: null,
          checkoutSession,
          redirectUrl: checkoutSession?.checkoutUrl || null,
          deliveryResults: [],
        });
      }
    }

    const orderCode = buildOrderCode();
    const orderAccessToken = buildOrderAccessToken();
    const baseUrl = getBaseUrl(request);
    const cashierLink = `${baseUrl}/admin/event-orders/order/${orderAccessToken}`;
    const orderStatusLink = `${baseUrl}/order-status/${orderAccessToken}`;
    const receiptCode = makeReceiptCode(orderCode);
    const receiptLink = `${baseUrl}/receipt/${orderAccessToken}`;
    const shopDisplayName = getShopDisplayName(
      questionnaireSlug,
      getShopOrderLabel(questionnaireSlug, "Order")
    );
    const orderAccessMetadata = {
      questionnaireSlug,
      shopDisplayName,
      orderDisplayType: shopDisplayName,
      cashierToken: orderAccessToken,
      cashierLink,
      orderStatusLink,
      receiptCode,
      receiptLink,
      paymentStatus: "AWAITING_PAYMENT",
      inventoryApplied: false,
    };
    const includesEscapeAlbumAccess =
      orderIncludesEscapeAlbumAccess(resolvedLines);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const purchaserUserResult = await findOrCreateTemporaryUserForEmail(tx, {
        email: purchaserEmail,
        name: fullName,
      });

      if (purchaserUserResult?.user?.id) {
        await upsertUserTag(tx, {
          userId: purchaserUserResult.user.id,
          tagKey: ITASL_LEAD_TAG,
          source: "invitation-order",
          metadata: {
            role: "purchaser",
            questionnaireSlug,
            orderRequestKey: orderRequestKey || null,
          },
        });
      }

      const order = await tx.invitationOrder.create({
        data: {
          questionnaireSlug,
          orderCode,
          orderRequestKey: orderRequestKey || null,
          purchaserUserId: purchaserUserResult?.user?.id ?? null,
          purchaserName: fullName || null,
          purchaserEmail,
          purchaserPhone: purchaserPhone || null,
          purchaserWhatsapp: whatsappOptIn,
          status: "PENDING",
          currencyCode: asString(body.currencyCode) || "USD",
          subtotal: asMoney(orderSummary.subtotal),
          discountTotal: asMoney(orderSummary.discountTotal),
          deliveryFee: asMoney(orderSummary.deliveryFee),
          grandTotal: asMoney(orderSummary.grandTotal),
          cartSnapshot: orderCart,
          resolvedLinesSnapshot: resolvedLines,
          ticketAssignmentsSnapshot: ticketAssignments,
          deliverySelectionSnapshot: deliverySelection,
          contactSnapshot: {
            fullName,
            email: purchaserEmail,
            phone: purchaserPhone,
            whatsappOptIn,
          },
          answersSnapshot: answers,
        },
      });

      const createdTickets = [];

      for (let index = 0; index < ticketAssignments.length; index += 1) {
        const assignment = ticketAssignments[index];
        const ownerEmail = getTicketOwnerEmail(assignment);
        const ownerName = asString(assignment.ownerName);
        const ownerPhone = asString(assignment.ownerPhone);

        const ownerUserResult = ownerEmail
          ? await findOrCreateTemporaryUserForEmail(tx, {
              email: ownerEmail,
              name: ownerName,
            })
          : null;

        if (ownerUserResult?.user?.id) {
          await upsertUserTag(tx, {
            userId: ownerUserResult.user.id,
            tagKey: ITASL_LEAD_TAG,
            source: "invitation-order-ticket-owner",
            metadata: {
              role: "ticket-owner",
              questionnaireSlug,
              orderCode: order.orderCode,
            },
          });
        }

        const ticket = await tx.invitationOrderTicket.create({
          data: {
            orderId: order.id,
            ticketCode: buildFinalTicketCode(order.orderCode, index),
            lineKey: asString(assignment.lineKey) || null,
            productId: asString(assignment.productId),
            productTitle: asString(assignment.productTitle),
            sizeOptionId: asString(assignment.sizeOptionId),
            sizeLabel: asString(assignment.ticketLabel || assignment.sizeLabel),
            purchaseModeId: getInvitationDeliveryPurchaseModeId(assignment),
            purchaseModeLabel: getInvitationDeliveryPurchaseModeLabel(assignment),
            ticketIndex:
              typeof assignment.ticketIndex === "number"
                ? assignment.ticketIndex
                : index,
            ticketLabel: asString(assignment.ticketLabel) || null,
            ownerUserId: ownerUserResult?.user?.id ?? null,
            ownerName: ownerName || null,
            ownerEmail: ownerEmail || null,
            ownerPhone: ownerPhone || null,
            ticketOwnerPaymentMode: normalizeTicketOwnerPaymentMode(
              assignment.ticketOwnerPaymentMode
            ),
            ticketOwnerAddonBudget: asMoney(assignment.ticketOwnerAddonBudget),
            invitationMailingAddress:
              normalizeInvitationMailingAddress(
                assignment.invitationMailingAddress
              ),
            status: "ACTIVE",
            mealMode: asString(assignment.mealMode) || null,
            mealMenuId: asString(assignment.mealMenuId) || null,
            mealLabel: asString(assignment.mealLabel) || null,
            mealAddOnPrice:
              assignment.mealAddOnPrice === undefined ||
              assignment.mealAddOnPrice === null
                ? null
                : asMoney(assignment.mealAddOnPrice),
            mealEnabled: assignment.mealEnabled === true,
            mealSelection:
              assignment.mealSelection && typeof assignment.mealSelection === "object"
                ? assignment.mealSelection
                : {},
            wantsExtraFood: assignment.wantsExtraFood === true,
            hasMealNotes: assignment.hasMealNotes === true,
            mealNotes: asString(assignment.mealNotes) || null,
          },
        });

        createdTickets.push({
          ticket,
          ownerEmail,
          ownerName,
          ownerUserId: ownerUserResult?.user?.id ?? null,
          temporaryPassword: ownerUserResult?.temporaryPassword ?? null,
          accountWasCreated: ownerUserResult?.created === true,
          temporaryPasswordWasIssued:
            ownerUserResult?.temporaryPasswordWasIssued === true,
          isPurchaserTicket: assignment.isPurchaserTicket === true,
          emailTicketToOwner: assignment.emailTicketToOwner !== false,
        });
      }

      const currencyCode = asString(body.currencyCode) || "USD";
      const fulfillmentItems = [
        ...buildFulfillmentItemCreateManyData({
        order,
        resolvedLines,
        purchaser: {
          name: fullName || null,
          email: purchaserEmail || null,
        },
          currencyCode,
          orderAccessMetadata,
        }),
        ...buildPhysicalInvitationFulfillmentItems({
          order,
          ticketAssignments,
          createdTickets,
          currencyCode,
          orderAccessMetadata,
        }),
      ];

      if (fulfillmentItems.length) {
        await tx.orderFulfillmentItem.createMany({
          data: fulfillmentItems,
        });

        const createdFulfillmentItems = await tx.orderFulfillmentItem.findMany({
          where: {
            invitationOrderId: order.id,
          },
          select: {
            id: true,
            currentStageKey: true,
            currentStageLabel: true,
          },
        });

        if (createdFulfillmentItems.length) {
          await tx.orderFulfillmentActivity.createMany({
            data: createdFulfillmentItems.map((item) => ({
              fulfillmentItemId: item.id,
              stageKey:
                item.currentStageKey || "order-request-sent-to-fulfillment",
              stageLabel:
                item.currentStageLabel || "Order Request Sent to Fulfillment",
              updateType: "automatic",
              source: shopDisplayName,
              notes:
                "Order received and sent to the fulfillment team after checkout submission.",
              metadata: {
                customerVisible: true,
                orderActivityKey: `${order.orderCode}:${item.id}:order-submitted`,
                questionnaireSlug,
                shopDisplayName,
              },
            })),
          });
        }
      }

      return {
        order,
        orderAccess: orderAccessMetadata,
        tickets: createdTickets,
        fulfillmentItemCount: fulfillmentItems.length,
        purchaserUserId: purchaserUserResult?.user?.id ?? null,
        purchaserUser: purchaserUserResult?.user ?? null,
        purchaserTemporaryPassword: purchaserUserResult?.temporaryPassword ?? null,
        purchaserAccountWasCreated: purchaserUserResult?.created === true,
        purchaserTemporaryPasswordWasIssued:
          purchaserUserResult?.temporaryPasswordWasIssued === true,
        includesEscapeAlbumAccess,
      };
    });

    const deliveryResults = [];
    const ticketsByOwnerEmail = new Map();

    if (transactionResult.purchaserUser?.id && purchaserEmail) {
      await enrollTagSequencesForUser({
        user: transactionResult.purchaserUser,
        email: purchaserEmail,
        name: fullName || transactionResult.purchaserUser.name,
        tagKey: ITASL_LEAD_TAG,
        source: "invitation-order",
        context: {
          questionnaireSlug,
          orderId: transactionResult.order.id,
          orderCode: transactionResult.order.orderCode,
          role: "purchaser",
        },
      });
    }

    for (const item of transactionResult.tickets) {
      if (
        !item.ownerEmail ||
        !item.ownerUserId ||
        item.isPurchaserTicket === true ||
        item.emailTicketToOwner === false
      ) {
        continue;
      }

      const existingGroup = ticketsByOwnerEmail.get(item.ownerEmail) || {
        ownerEmail: item.ownerEmail,
        ownerName: item.ownerName,
        ownerUserId: item.ownerUserId,
        temporaryPassword: item.temporaryPassword,
        accountWasCreated: item.accountWasCreated,
        temporaryPasswordWasIssued: item.temporaryPasswordWasIssued,
        tickets: [],
      };

      existingGroup.tickets.push(item.ticket);

      if (!existingGroup.ownerName && item.ownerName) {
        existingGroup.ownerName = item.ownerName;
      }

      if (!existingGroup.temporaryPassword && item.temporaryPassword) {
        existingGroup.temporaryPassword = item.temporaryPassword;
        existingGroup.temporaryPasswordWasIssued = true;
        existingGroup.accountWasCreated =
          existingGroup.accountWasCreated || item.accountWasCreated === true;
      }

      ticketsByOwnerEmail.set(item.ownerEmail, existingGroup);

      await enrollTagSequencesForUser({
        user: {
          id: item.ownerUserId,
          email: item.ownerEmail,
          name: item.ownerName,
        },
        email: item.ownerEmail,
        name: item.ownerName,
        tagKey: ITASL_LEAD_TAG,
        source: "invitation-order-ticket-owner",
        context: {
          questionnaireSlug,
          orderId: transactionResult.order.id,
          orderCode: transactionResult.order.orderCode,
          role: "ticket-owner",
        },
      });
    }

    for (const group of ticketsByOwnerEmail.values()) {
      const deliveryResult = await sendTicketOwnerGroupLink({
        request,
        tickets: group.tickets,
        ownerEmail: group.ownerEmail,
        ownerName: group.ownerName,
        ownerUserId: group.ownerUserId,
        temporaryPassword: group.temporaryPassword,
        accountWasCreated: group.accountWasCreated === true,
        temporaryPasswordWasIssued:
          group.temporaryPasswordWasIssued === true,
        questionnaireSlug,
      });

      deliveryResults.push({
        ticketCodes: group.tickets.map((ticket) => ticket.ticketCode),
        ownerEmail: group.ownerEmail,
        ownerName: group.ownerName,
        ok: deliveryResult.ok,
        deliveryResult,
      });
    }

    const checkoutSession = shouldUseStripeCheckout(questionnaireSlug)
      ? await createStripeCheckoutSession({
          request,
          order: transactionResult.order,
          resolvedLines,
          purchaserEmail,
          orderSummary,
        })
      : null;

    return Response.json({
      ok: true,
      message: "Invitation order created.",
      order: {
        id: transactionResult.order.id,
        orderCode: transactionResult.order.orderCode,
        status: transactionResult.order.status,
        orderStatusLink: transactionResult.orderAccess.orderStatusLink,
        receiptLink: transactionResult.orderAccess.receiptLink,
        receiptCode: transactionResult.orderAccess.receiptCode,
      },
      ticketCount: transactionResult.tickets.length,
      guestPortalLinksSent: deliveryResults.filter((item) => item.ok).length,
      albumAccessSent: false,
      albumDeliveryResult: null,
      checkoutSession,
      redirectUrl: checkoutSession?.checkoutUrl || null,
      deliveryResults,
    });
  } catch (error) {
    console.error("INVITATION ORDER CREATE ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to create invitation order.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
