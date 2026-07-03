import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { ensureAdminPurchasedItems } from "@/lib/entitlements/purchasedItems";

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    await ensureAdminPurchasedItems(session.userId, session.user.adminLevel);

    const items = await prisma.userPurchasedItem.findMany({
      where: {
        userId: session.userId,
        status: {
          in: ["ACTIVE", "PURCHASED", "COMPLETED"],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: {
        purchasedAt: "desc",
      },
      select: {
        itemKey: true,
        status: true,
        source: true,
        purchasedAt: true,
        expiresAt: true,
      },
    });

    return Response.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("PURCHASED ITEMS ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
