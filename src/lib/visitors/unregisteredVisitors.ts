import { prisma } from "@/lib/prisma";

export async function ensureUnregisteredVisitorActivityTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "UnregisteredVisitorActivity" (
      "id" TEXT PRIMARY KEY,
      "deviceKey" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "questionnaireSlug" TEXT,
      "slideId" TEXT,
      "slideLabel" TEXT,
      "path" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3)
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UnregisteredVisitorActivity_deviceKey_createdAt_idx" ON "UnregisteredVisitorActivity"("deviceKey", "createdAt")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UnregisteredVisitorActivity_eventType_createdAt_idx" ON "UnregisteredVisitorActivity"("eventType", "createdAt")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UnregisteredVisitorActivity_expiresAt_idx" ON "UnregisteredVisitorActivity"("expiresAt")`;
}
