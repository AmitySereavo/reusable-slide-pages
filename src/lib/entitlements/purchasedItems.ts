import { prisma } from "@/lib/prisma";
import type { DownloadCatalogItem } from "@/config/downloads/downloadCatalog";

export const ESCAPE_ALBUM_ITEM_KEY = "escape-album";

const ACTIVE_PURCHASE_STATUSES = new Set(["ACTIVE", "PURCHASED", "COMPLETED"]);

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
