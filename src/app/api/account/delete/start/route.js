import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { AUTH_RULES } from "@/customerAccess/config/authRules";
import {
  getSessionFromCookie,
  clearSessionCookie,
} from "@/lib/auth/sessionServer";
import { revokeAllUserSessions } from "@/lib/auth/passwordReset";

function getDeletionConfig() {
  return {
    mode: AUTH_RULES?.accountDeletion?.mode || "delayed",
    delayDays: Number(AUTH_RULES?.accountDeletion?.delayDays ?? 30),
    anonymizeInsteadOfDelete:
      AUTH_RULES?.accountDeletion?.anonymizeInsteadOfDelete === true,
    requireVerificationCode:
      AUTH_RULES?.accountDeletion?.requireVerificationCode === true,
    maxCodeAttempts: Number(AUTH_RULES?.verification?.maxCodeAttempts) || 5,
  };
}

async function anonymizeUser(userId) {
  const suffix = `${userId}-${Date.now()}`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: null,
      phone: null,
      name: "Deleted account",
      country: null,
      city: null,
      addressLine1: null,
      addressLine2: null,
      parishOrRegion: null,
      postalCode: null,
      password: `deleted-${suffix}`,
      deletedAt: new Date(),
      deletionStatus: "deleted",
    },
  });
}

async function verifyDeletionCode({ userId, deleteCode, maxCodeAttempts }) {
  if (!deleteCode) {
    return { ok: false, status: 400, error: "Enter the deletion verification code." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user?.email) {
    return {
      ok: false,
      status: 400,
      error: "No email is available for deletion verification.",
    };
  }

  const latestRecord = await prisma.verificationCode.findFirst({
    where: {
      userId,
      identifier: user.email,
      target: "accountDeletion",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestRecord) {
    return {
      ok: false,
      status: 400,
      error: "No deletion code found. Please request a new code.",
    };
  }

  if (latestRecord.expiresAt < new Date()) {
    await prisma.verificationCode.deleteMany({
      where: {
        userId,
        target: "accountDeletion",
      },
    });

    return {
      ok: false,
      status: 400,
      error: "Deletion code expired. Please request a new code.",
    };
  }

  if ((latestRecord.attempts ?? 0) >= maxCodeAttempts) {
    return {
      ok: false,
      status: 429,
      error: "Too many incorrect attempts. Please request a new deletion code.",
    };
  }

  const codeMatches = await bcrypt.compare(String(deleteCode), latestRecord.code);

  if (!codeMatches) {
    await prisma.verificationCode.update({
      where: {
        id: latestRecord.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return {
      ok: false,
      status: 400,
      error: "Invalid deletion code.",
    };
  }

  await prisma.verificationCode.deleteMany({
    where: {
      userId,
      target: "accountDeletion",
    },
  });

  return { ok: true };
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const deleteCode = String(body.deleteCode || "").trim();

    const userId = session.userId;
    const config = getDeletionConfig();
    const now = new Date();

    if (config.requireVerificationCode) {
      const verified = await verifyDeletionCode({
        userId,
        deleteCode,
        maxCodeAttempts: config.maxCodeAttempts,
      });

      if (!verified.ok) {
        return Response.json(
          { error: verified.error },
          { status: verified.status || 400 }
        );
      }
    }

    if (config.mode === "immediate" || config.delayDays <= 0) {
      if (config.anonymizeInsteadOfDelete) {
        await anonymizeUser(userId);
      } else {
        await prisma.user.delete({
          where: { id: userId },
        });
      }

      await clearSessionCookie();

      return Response.json({
        ok: true,
        status: "deleted",
        message: "Your account has been deleted.",
      });
    }

    const deletionScheduledAt = new Date(
      now.getTime() + config.delayDays * 24 * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: now,
        deletionScheduledAt,
        deletionStatus: "pending",
      },
    });

    await revokeAllUserSessions(userId);
    await clearSessionCookie();

    return Response.json({
      ok: true,
      status: "pending",
      deletionScheduledAt,
      message: `Your account is scheduled for deletion in ${config.delayDays} day(s).`,
    });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}