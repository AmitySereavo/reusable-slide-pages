import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/adminGuard";
import { prisma } from "@/lib/prisma";

function normalizeToken(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

async function findOrderByCashierToken(token: string) {
  const rows = await prisma.$queryRaw<Array<{ orderCode: string | null }>>(
    Prisma.sql`
      SELECT "orderCode"
      FROM "OrderFulfillmentItem"
      WHERE "sourceType" = 'little-orchard-shop'
        AND "metadata"->>'cashierToken' = ${token}
      ORDER BY "createdAt" ASC
      LIMIT 1
    `
  );

  return rows[0]?.orderCode || null;
}

export default async function CashierOrderLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = normalizeToken(rawToken);
  const session = await getAdminSession();

  if (!session) {
    redirect(`/order-status/${encodeURIComponent(token)}`);
  }

  const orderCode = token ? await findOrderByCashierToken(token) : null;

  if (!orderCode) {
    redirect("/dashboard/orders");
  }

  redirect(`/dashboard/orders?query=${encodeURIComponent(orderCode)}`);
}
