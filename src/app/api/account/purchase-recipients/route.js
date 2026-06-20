import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { parseIdentifier } from "@/customerAccess/utils/identifier";
import { sendVerificationDelivery } from "@/lib/verification/delivery";

const MAX_PURCHASE_RECIPIENTS = 12;
const INVITE_EXPIRES_IN_DAYS = 14;
const PURCHASE_RECIPIENT_INVITE_TARGET = "purchaseRecipientInvite";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

function serializeRecipient(recipient) {
  return {
    id: recipient.id,
    recipientName: recipient.recipientName,
    recipientEmail: recipient.recipientEmail,
    confirmedName: recipient.confirmedName,
    phone: recipient.phone,
    addressLine1: recipient.addressLine1,
    addressLine2: recipient.addressLine2,
    parishOrRegion: recipient.parishOrRegion,
    postalCode: recipient.postalCode,
    status: recipient.status,
    invitedAt: recipient.invitedAt,
    inviteExpiresAt: recipient.inviteExpiresAt,
    acceptedAt: recipient.acceptedAt,
    reminderCount: recipient.reminderCount,
    lastReminderSentAt: recipient.lastReminderSentAt,
  };
}

async function getCurrentUser() {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const recipients = await prisma.purchaseRecipient.findMany({
      where: {
        purchaserUserId: user.id,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      ok: true,
      maxRecipients: MAX_PURCHASE_RECIPIENTS,
      recipients: recipients.map(serializeRecipient),
    });
  } catch (error) {
    console.error("PURCHASE RECIPIENT LIST ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not load purchase recipients.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const recipientName = String(body?.name || "").trim();
    const rawEmail = String(body?.email || "").trim();
    const parsed = parseIdentifier(rawEmail);

    if (!recipientName) {
      return NextResponse.json(
        { error: "Recipient name is required." },
        { status: 400 }
      );
    }

    if (!parsed.valid || !parsed.email) {
      return NextResponse.json(
        { error: "Enter a valid recipient email address." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(parsed.email);
    const activeRecipientCount = await prisma.purchaseRecipient.count({
      where: {
        purchaserUserId: user.id,
        status: {
          not: "REMOVED",
        },
      },
    });

    const existingRecipient = await prisma.purchaseRecipient.findUnique({
      where: {
        purchaserUserId_normalizedRecipientEmail: {
          purchaserUserId: user.id,
          normalizedRecipientEmail: normalizedEmail,
        },
      },
    });

    if (!existingRecipient && activeRecipientCount >= MAX_PURCHASE_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `You can add up to ${MAX_PURCHASE_RECIPIENTS} purchase recipients.`,
        },
        { status: 400 }
      );
    }

    if (existingRecipient?.status === "VERIFIED") {
      return NextResponse.json({
        ok: true,
        message: "This recipient is already verified.",
        recipient: serializeRecipient(existingRecipient),
      });
    }

    const rawToken = generateRawToken();
    const inviteTokenHash = hashToken(rawToken);
    const inviteExpiresAt = new Date(
      Date.now() + INVITE_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    const recipient = existingRecipient
      ? await prisma.purchaseRecipient.update({
          where: { id: existingRecipient.id },
          data: {
            recipientName,
            recipientEmail: parsed.email,
            normalizedRecipientEmail: normalizedEmail,
            status: "PENDING",
            inviteTokenHash,
            invitedAt: new Date(),
            inviteExpiresAt,
          },
        })
      : await prisma.purchaseRecipient.create({
          data: {
            purchaserUserId: user.id,
            recipientName,
            recipientEmail: parsed.email,
            normalizedRecipientEmail: normalizedEmail,
            status: "PENDING",
            inviteTokenHash,
            inviteExpiresAt,
          },
        });

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/purchase-for-others/accept?token=${encodeURIComponent(
      rawToken
    )}`;

    const deliveryResult = await sendVerificationDelivery({
      identifier: normalizedEmail,
      delivery: "link",
      verifyUrl,
      target: PURCHASE_RECIPIENT_INVITE_TARGET,
      contextMetadata: {
        purchaserName: user.name || user.email || "Someone",
        recipientName,
        purchaseRecipientId: recipient.id,
      },
    });

    if (!deliveryResult.ok) {
      return NextResponse.json(
        {
          error:
            deliveryResult.error?.message ||
            "Recipient was saved, but the invite email could not be sent.",
          recipient: serializeRecipient(recipient),
          deliveryResult,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Invite sent. The recipient must accept before store purchase.",
      recipient: serializeRecipient(recipient),
    });
  } catch (error) {
    console.error("PURCHASE RECIPIENT CREATE ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not add purchase recipient.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
