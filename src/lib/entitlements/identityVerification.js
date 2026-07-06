import { prisma } from "@/lib/prisma";

export async function getApprovedIdentityVerification(userId) {
  if (!userId) return null;

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return null;
  }

  return prisma.userIdentityVerification.findFirst({
    where: {
      userId,
      status: "APPROVED",
    },
    orderBy: {
      reviewedAt: "desc",
    },
  });
}

export async function userHasApprovedIdentityVerification(userId) {
  const verification = await getApprovedIdentityVerification(userId);
  return Boolean(verification);
}
