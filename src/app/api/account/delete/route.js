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
      password: `deleted-${suffix}`,
      deletedAt: new Date(),
      deletionStatus: "deleted",
    },
  });
}

export async function POST() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const userId = session.userId;
    const config = getDeletionConfig();
    const now = new Date();

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