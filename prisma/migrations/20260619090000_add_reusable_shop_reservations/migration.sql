CREATE TABLE "ReusableShopInventoryReservation" (
    "id" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "catalogKey" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReusableShopInventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReusableShopInventoryReservation_reservationKey_lineKey_key" ON "ReusableShopInventoryReservation"("reservationKey", "lineKey");
CREATE INDEX "ReusableShopInventoryReservation_reservationKey_status_idx" ON "ReusableShopInventoryReservation"("reservationKey", "status");
CREATE INDEX "ReusableShopInventoryReservation_expiresAt_status_idx" ON "ReusableShopInventoryReservation"("expiresAt", "status");
CREATE INDEX "ReusableShopInventoryReservation_sizeOptionId_status_idx" ON "ReusableShopInventoryReservation"("sizeOptionId", "status");

ALTER TABLE "ReusableShopInventoryReservation" ADD CONSTRAINT "ReusableShopInventoryReservation_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "ReusableShopSizeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
