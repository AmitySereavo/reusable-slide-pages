import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { sendVerificationDelivery } from "@/lib/verification/delivery";
import { cleanupExpiredAuthRecords } from "@/lib/auth/cleanup";
import { ESCAPE_ALBUM_ITEM_KEY } from "@/lib/entitlements/purchasedItems";

const TICKET_OWNER_ACCESS_TARGET = "ticketOwnerAccess";
const ESCAPE_ALBUM_ACCESS_TARGET = "escapeAlbumAccess";
const ESCAPE_ALBUM_PURCHASE_MODE_ID = "standard-with-escape-album";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value) {
  return value === true;
}

function asMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
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

function getTokenExpiresAt() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function buildOrderCode() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
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

function orderIncludesEscapeAlbumAccess(resolvedLines) {
  if (!Array.isArray(resolvedLines)) {
    return false;
  }

  return resolvedLines.some((line) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      return false;
    }

    return (
      line.purchaseModeId === ESCAPE_ALBUM_PURCHASE_MODE_ID ||
      line.productId === "escape-album-digital" ||
      line.sizeOptionId === "escape-album-full-download"
    );
  });
}

async function sendEscapeAlbumAccessEmail({
  request,
  purchaserEmail,
  purchaserName,
  temporaryPassword,
  accountWasCreated,
  temporaryPasswordWasIssued,
}) {
  const baseUrl = getBaseUrl(request);
  const albumUrl = `${baseUrl}/questionnaire/escape-album`;
  const loginUrl = `${baseUrl}/questionnaire/auth-login`;
  const forgotPasswordUrl = `${baseUrl}/questionnaire/auth-forgot-password`;

  return sendVerificationDelivery({
    identifier: purchaserEmail,
    delivery: "link",
    verifyUrl: albumUrl,
    target: ESCAPE_ALBUM_ACCESS_TARGET,
    successRedirect: "/questionnaire/escape-album",
    contextMetadata: {
      purpose: "escape-album-access",
      recipientName: purchaserName,
      albumUrl,
      loginUrl,
      forgotPasswordUrl,
      temporaryPassword,
      accountWasCreated,
      temporaryPasswordWasIssued,
    },
  });
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
        let albumDeliveryResult = null;
        const existingOrderResolvedLines = Array.isArray(
          existingOrder.resolvedLinesSnapshot
        )
          ? existingOrder.resolvedLinesSnapshot
          : [];

        if (
          orderIncludesEscapeAlbumAccess(existingOrderResolvedLines) &&
          existingOrder.purchaserEmail
        ) {
          const purchaserUserResult = await prisma.$transaction((tx) =>
            findOrCreateTemporaryUserForEmail(tx, {
              email: existingOrder.purchaserEmail,
              name: existingOrder.purchaserName,
            })
          );

          if (purchaserUserResult?.user?.id) {
            await prisma.userPurchasedItem.upsert({
              where: {
                userId_itemKey: {
                  userId: purchaserUserResult.user.id,
                  itemKey: ESCAPE_ALBUM_ITEM_KEY,
                },
              },
              create: {
                userId: purchaserUserResult.user.id,
                itemKey: ESCAPE_ALBUM_ITEM_KEY,
                status: "ACTIVE",
                source: "invitation-order",
                metadata: {
                  orderId: existingOrder.id,
                  orderCode: existingOrder.orderCode,
                  purchaseModeId: ESCAPE_ALBUM_PURCHASE_MODE_ID,
                  resentFromExistingOrder: true,
                },
              },
              update: {
                status: "ACTIVE",
                source: "invitation-order",
                metadata: {
                  orderId: existingOrder.id,
                  orderCode: existingOrder.orderCode,
                  purchaseModeId: ESCAPE_ALBUM_PURCHASE_MODE_ID,
                  resentFromExistingOrder: true,
                },
              },
            });

            albumDeliveryResult = await sendEscapeAlbumAccessEmail({
              request,
              purchaserEmail: existingOrder.purchaserEmail,
              purchaserName: existingOrder.purchaserName,
              temporaryPassword: purchaserUserResult.temporaryPassword,
              accountWasCreated: purchaserUserResult.created === true,
              temporaryPasswordWasIssued:
                purchaserUserResult.temporaryPasswordWasIssued === true,
            });
          }
        }

        return Response.json({
          ok: true,
          message: "Invitation order already created.",
          reused: true,
          order: {
            id: existingOrder.id,
            orderCode: existingOrder.orderCode,
            status: existingOrder.status,
          },
          ticketCount: existingOrder.tickets.length,
          guestPortalLinksSent: 0,
          albumAccessSent: albumDeliveryResult?.ok === true,
          albumDeliveryResult,
          deliveryResults: [],
        });
      }
    }

    const orderCode = buildOrderCode();
    const includesEscapeAlbumAccess =
      orderIncludesEscapeAlbumAccess(resolvedLines);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const purchaserUserResult = await findOrCreateTemporaryUserForEmail(tx, {
        email: purchaserEmail,
        name: fullName,
      });

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

      if (includesEscapeAlbumAccess && purchaserUserResult?.user?.id) {
        await tx.userPurchasedItem.upsert({
          where: {
            userId_itemKey: {
              userId: purchaserUserResult.user.id,
              itemKey: ESCAPE_ALBUM_ITEM_KEY,
            },
          },
          create: {
            userId: purchaserUserResult.user.id,
            itemKey: ESCAPE_ALBUM_ITEM_KEY,
            status: "ACTIVE",
            source: "invitation-order",
            metadata: {
              orderId: order.id,
              orderCode: order.orderCode,
              purchaseModeId: ESCAPE_ALBUM_PURCHASE_MODE_ID,
            },
          },
          update: {
            status: "ACTIVE",
            source: "invitation-order",
            metadata: {
              orderId: order.id,
              orderCode: order.orderCode,
              purchaseModeId: ESCAPE_ALBUM_PURCHASE_MODE_ID,
            },
          },
        });
      }

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

        const ticket = await tx.invitationOrderTicket.create({
          data: {
            orderId: order.id,
            ticketCode: buildFinalTicketCode(order.orderCode, index),
            lineKey: asString(assignment.lineKey) || null,
            productId: asString(assignment.productId),
            productTitle: asString(assignment.productTitle),
            sizeOptionId: asString(assignment.sizeOptionId),
            sizeLabel: asString(assignment.ticketLabel || assignment.sizeLabel),
            purchaseModeId: asString(assignment.purchaseModeId) || null,
            purchaseModeLabel: asString(assignment.purchaseModeLabel) || null,
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

      return {
        order,
        tickets: createdTickets,
        purchaserUserId: purchaserUserResult?.user?.id ?? null,
        purchaserTemporaryPassword: purchaserUserResult?.temporaryPassword ?? null,
        purchaserAccountWasCreated: purchaserUserResult?.created === true,
        purchaserTemporaryPasswordWasIssued:
          purchaserUserResult?.temporaryPasswordWasIssued === true,
        includesEscapeAlbumAccess,
      };
    });

    const deliveryResults = [];
    let albumDeliveryResult = null;
    const ticketsByOwnerEmail = new Map();

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
      });

      deliveryResults.push({
        ticketCodes: group.tickets.map((ticket) => ticket.ticketCode),
        ownerEmail: group.ownerEmail,
        ownerName: group.ownerName,
        ok: deliveryResult.ok,
        deliveryResult,
      });
    }

    if (
      transactionResult.includesEscapeAlbumAccess &&
      transactionResult.purchaserUserId
    ) {
      albumDeliveryResult = await sendEscapeAlbumAccessEmail({
        request,
        purchaserEmail,
        purchaserName: fullName,
        temporaryPassword: transactionResult.purchaserTemporaryPassword,
        accountWasCreated: transactionResult.purchaserAccountWasCreated,
        temporaryPasswordWasIssued:
          transactionResult.purchaserTemporaryPasswordWasIssued,
      });
    }

    return Response.json({
      ok: true,
      message: "Invitation order created.",
      order: {
        id: transactionResult.order.id,
        orderCode: transactionResult.order.orderCode,
        status: transactionResult.order.status,
      },
      ticketCount: transactionResult.tickets.length,
      guestPortalLinksSent: deliveryResults.filter((item) => item.ok).length,
      albumAccessSent: albumDeliveryResult?.ok === true,
      albumDeliveryResult,
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
