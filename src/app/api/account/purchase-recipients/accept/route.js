import bcrypt from "bcrypt";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ITASL_LEAD_TAG,
  enrollTagSequencesForUser,
  upsertUserTag,
} from "@/lib/userTags";

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createTemporaryPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
}

async function createTemporaryPasswordHash() {
  return bcrypt.hash(createTemporaryPassword(), 10);
}

function asText(value) {
  return String(value || "").trim();
}

function serializeInvite(recipient) {
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
    inviteExpiresAt: recipient.inviteExpiresAt,
    acceptedAt: recipient.acceptedAt,
    purchaser: recipient.purchaserUser
      ? {
          name: recipient.purchaserUser.name,
          email: recipient.purchaserUser.email,
        }
      : null,
  };
}

async function findOrCreateRecipientUser(tx, recipient) {
  const normalizedEmail = normalizeEmail(recipient.recipientEmail);

  const reservedEmail = await tx.userEmailAddress.findUnique({
    where: {
      normalizedEmail,
    },
    include: {
      user: true,
    },
  });

  if (reservedEmail?.user) {
    return reservedEmail.user;
  }

  const existingUser = await tx.user.findFirst({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    await tx.userEmailAddress.upsert({
      where: {
        normalizedEmail,
      },
      update: {
        userId: existingUser.id,
        email: recipient.recipientEmail,
        isVerified: true,
        verifiedAt: new Date(),
      },
      create: {
        userId: existingUser.id,
        email: recipient.recipientEmail,
        normalizedEmail,
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    return existingUser;
  }

  const passwordHash = await createTemporaryPasswordHash();

  const user = await tx.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      name: recipient.confirmedName || recipient.recipientName,
      emailVerifiedAt: new Date(),
      createdBy: "algorithm",
    },
  });

  await tx.userEmailAddress.create({
    data: {
      userId: user.id,
      email: recipient.recipientEmail,
      normalizedEmail,
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return user;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = asText(searchParams.get("token"));

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required." },
        { status: 400 }
      );
    }

    const inviteTokenHash = hashToken(token);
    const recipient = await prisma.purchaseRecipient.findUnique({
      where: {
        inviteTokenHash,
      },
      include: {
        purchaserUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "This invite link is invalid." },
        { status: 400 }
      );
    }

    if (recipient.inviteExpiresAt < new Date() && recipient.status !== "VERIFIED") {
      await prisma.purchaseRecipient.update({
        where: { id: recipient.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { error: "This invite link has expired. Ask the purchaser to resend it." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      recipient: serializeInvite(recipient),
    });
  } catch (error) {
    console.error("PURCHASE RECIPIENT INVITE LOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not load this recipient invite.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const token = asText(body?.token);

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required." },
        { status: 400 }
      );
    }

    const inviteTokenHash = hashToken(token);
    const existingRecipient = await prisma.purchaseRecipient.findUnique({
      where: {
        inviteTokenHash,
      },
      include: {
        purchaserUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingRecipient) {
      return NextResponse.json(
        { error: "This invite link is invalid." },
        { status: 400 }
      );
    }

    if (existingRecipient.status === "VERIFIED") {
      return NextResponse.json({
        ok: true,
        message: "You already accepted this recipient invite.",
        recipient: existingRecipient,
      });
    }

    if (existingRecipient.inviteExpiresAt < new Date()) {
      await prisma.purchaseRecipient.update({
        where: { id: existingRecipient.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { error: "This invite link has expired. Ask the purchaser to resend it." },
        { status: 400 }
      );
    }

    const confirmedName =
      asText(body?.confirmedName) || existingRecipient.recipientName;
    const phone = asText(body?.phone);
    const addressLine1 = asText(body?.addressLine1);
    const addressLine2 = asText(body?.addressLine2);
    const parishOrRegion = asText(body?.parishOrRegion);
    const postalCode = asText(body?.postalCode);

    if (!confirmedName) {
      return NextResponse.json(
        { error: "Your name is required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const preparedRecipient = await tx.purchaseRecipient.update({
        where: { id: existingRecipient.id },
        data: {
          confirmedName,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          parishOrRegion: parishOrRegion || null,
          postalCode: postalCode || null,
        },
      });

      const recipientUser = await findOrCreateRecipientUser(
        tx,
        preparedRecipient
      );

      const acceptedRecipient = await tx.purchaseRecipient.update({
        where: { id: existingRecipient.id },
        data: {
          recipientUserId: recipientUser.id,
          recipientName: confirmedName,
          status: "VERIFIED",
          acceptedAt: new Date(),
          inviteTokenHash: `${existingRecipient.inviteTokenHash}-accepted-${Date.now()}`,
        },
      });

      await tx.user.update({
        where: { id: recipientUser.id },
        data: {
          name: confirmedName,
          phone: phone || undefined,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          parishOrRegion: parishOrRegion || undefined,
          postalCode: postalCode || undefined,
        },
      });

      await upsertUserTag(tx, {
        userId: recipientUser.id,
        tagKey: ITASL_LEAD_TAG,
        source: "purchase-recipient-accepted",
        metadata: {
          role: "purchase-recipient",
          purchaserUserId: existingRecipient.purchaserUser?.id || null,
          purchaseRecipientId: acceptedRecipient.id,
        },
      });

      return {
        recipient: acceptedRecipient,
        recipientUser,
      };
    });

    await enrollTagSequencesForUser({
      user: result.recipientUser,
      email: result.recipientUser.email,
      name: result.recipientUser.name,
      tagKey: ITASL_LEAD_TAG,
      source: "purchase-recipient-accepted",
      context: {
        role: "purchase-recipient",
        purchaserUserId: existingRecipient.purchaserUser?.id || null,
        purchaseRecipientId: result.recipient.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "You accepted the invite. The purchaser can now select your name in the store.",
      purchaser: existingRecipient.purchaserUser,
      recipient: result.recipient,
    });
  } catch (error) {
    console.error("PURCHASE RECIPIENT ACCEPT ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not accept this recipient invite.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
