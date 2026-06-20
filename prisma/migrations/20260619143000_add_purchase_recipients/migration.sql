CREATE TABLE "PurchaseRecipient" (
    "id" TEXT NOT NULL,
    "purchaserUserId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "normalizedRecipientEmail" TEXT NOT NULL,
    "confirmedName" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "parishOrRegion" TEXT,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inviteTokenHash" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteExpiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseRecipient_inviteTokenHash_key" ON "PurchaseRecipient"("inviteTokenHash");
CREATE UNIQUE INDEX "PurchaseRecipient_purchaserUserId_normalizedRecipientEmail_key" ON "PurchaseRecipient"("purchaserUserId", "normalizedRecipientEmail");
CREATE INDEX "PurchaseRecipient_purchaserUserId_status_idx" ON "PurchaseRecipient"("purchaserUserId", "status");
CREATE INDEX "PurchaseRecipient_normalizedRecipientEmail_status_idx" ON "PurchaseRecipient"("normalizedRecipientEmail", "status");
CREATE INDEX "PurchaseRecipient_inviteExpiresAt_status_idx" ON "PurchaseRecipient"("inviteExpiresAt", "status");

ALTER TABLE "PurchaseRecipient" ADD CONSTRAINT "PurchaseRecipient_purchaserUserId_fkey" FOREIGN KEY ("purchaserUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseRecipient" ADD CONSTRAINT "PurchaseRecipient_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
