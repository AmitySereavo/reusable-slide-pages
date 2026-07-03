import { prisma } from "@/lib/prisma";
import type { DownloadCatalogItem } from "@/config/downloads/downloadCatalog";

export const ESCAPE_ALBUM_ITEM_KEY = "escape-album";

const ACTIVE_PURCHASE_STATUSES = new Set(["ACTIVE", "PURCHASED", "COMPLETED"]);
const ADMIN_PURCHASED_ITEM_KEYS = [ESCAPE_ALBUM_ITEM_KEY];

export function getRequiredPurchasedItemForDownload(
  item: DownloadCatalogItem
) {
  const normalizedPath = item.filePath.replace(/\\/g, "/");

  if (
    item.key.startsWith("escape-") ||
    normalizedPath.startsWith("protected-media/escape/")
  ) {
    return ESCAPE_ALBUM_ITEM_KEY;
  }

  return null;
}

export async function userHasPurchasedItem(userId: string, itemKey: string) {
  const item = await prisma.userPurchasedItem.findUnique({
    where: {
      userId_itemKey: {
        userId,
        itemKey,
      },
    },
    select: {
      status: true,
      expiresAt: true,
    },
  });

  if (!item || !ACTIVE_PURCHASE_STATUSES.has(item.status)) {
    return false;
  }

  return !item.expiresAt || item.expiresAt > new Date();
}

export async function ensureAdminPurchasedItems(
  userId: string,
  adminLevel = 0
) {
  if (adminLevel < 1) {
    return;
  }

  await Promise.all(
    ADMIN_PURCHASED_ITEM_KEYS.map((itemKey) =>
      prisma.userPurchasedItem.upsert({
        where: {
          userId_itemKey: {
            userId,
            itemKey,
          },
        },
        update: {
          status: "ACTIVE",
          source: "admin-entitlement",
          expiresAt: null,
        },
        create: {
          userId,
          itemKey,
          status: "ACTIVE",
          source: "admin-entitlement",
        },
      })
    )
  );
}
