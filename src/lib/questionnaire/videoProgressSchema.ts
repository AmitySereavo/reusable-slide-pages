import type { PrismaClient } from "@prisma/client";

export async function ensureUserVideoProgressAnalyticsColumns(
  prisma: PrismaClient
) {
  await prisma.$executeRaw`
    ALTER TABLE "UserVideoProgress"
      ADD COLUMN IF NOT EXISTS "totalWatchSeconds" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "maxPositionSeconds" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "playEventCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "seekForwardCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "seekBackwardCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lastEventType" TEXT
  `;
}
