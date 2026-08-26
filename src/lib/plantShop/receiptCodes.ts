import { Prisma } from "@prisma/client";

export function makeReceiptCode(orderCode: string) {
  let hash = 0;
  const input = String(orderCode || "");

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 10000;
  }

  return String(hash).padStart(4, "0");
}

export function readMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeReceiptLookupValue(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function normalizeReceiptPhoneValue(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeReceiptTextKey(value: unknown) {
  return normalizeReceiptLookupValue(value).replace(/[^A-Z0-9]/g, "");
}

export async function ensureLittleOrchardReceiptCode(
  prisma: any,
  orderCode: string
) {
  const safeOrderCode = String(orderCode || "").trim();

  if (!safeOrderCode) {
    return "";
  }

  const firstItem = await prisma.orderFulfillmentItem.findFirst({
    where: {
      orderCode: safeOrderCode,
    },
    orderBy: { createdAt: "asc" },
  });
  const existing = String(
    readMetadata(firstItem?.metadata).receiptCode || ""
  ).trim();

  if (existing) {
    return existing;
  }

  const receiptCode = makeReceiptCode(safeOrderCode);
  const items = await prisma.orderFulfillmentItem.findMany({
    where: {
      orderCode: safeOrderCode,
    },
  });

  await Promise.all(
    items.map((item: any) => {
      const metadata = readMetadata(item.metadata);

      return prisma.orderFulfillmentItem.update({
        where: { id: item.id },
        data: {
          metadata: {
            ...metadata,
            receiptCode,
          } as Prisma.InputJsonObject,
        },
      });
    })
  );

  return receiptCode;
}
