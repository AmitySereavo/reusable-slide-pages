import { prisma } from "@/lib/prisma";

export async function cleanupExpiredAuthRecords(now = new Date()) {
  const [
    expiredVerificationCodes,
    expiredVerificationTokens,
    expiredPasswordResetTokens,
    expiredPasswordResetChallenges,
    expiredPasswordResetAccessGrants,
  ] = await Promise.all([
    prisma.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),

    prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),

    prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),

    prisma.passwordResetChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),

    prisma.passwordResetAccessGrant.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),
  ]);

  return {
    verificationCodes: expiredVerificationCodes.count,
    verificationTokens: expiredVerificationTokens.count,
    passwordResetTokens: expiredPasswordResetTokens.count,
    passwordResetChallenges: expiredPasswordResetChallenges.count,
    passwordResetAccessGrants: expiredPasswordResetAccessGrants.count,
  };
}