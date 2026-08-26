import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { SHOP_IDENTITIES } from "@/config/shopIdentities";
import {
  listShopReceiptSettings,
  saveShopReceiptSetting,
} from "@/lib/receipt/shopReceiptSettings";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const shopKeys = Object.keys(SHOP_IDENTITIES);

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const settings = await listShopReceiptSettings(prisma as any, shopKeys);
    const shops = shopKeys.map((shopKey) => ({
      shopKey,
      displayName: SHOP_IDENTITIES[shopKey]?.displayName || shopKey,
    }));

    return NextResponse.json({ ok: true, shops, settings });
  } catch (error) {
    console.error("DASHBOARD RECEIPT SETTINGS GET ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Receipt settings could not be loaded.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const shopKey = cleanText(body?.shopKey);

    if (!shopKeys.includes(shopKey)) {
      return NextResponse.json(
        { ok: false, error: "Choose a valid shop." },
        { status: 400 }
      );
    }

    const setting = await saveShopReceiptSetting({
      db: prisma as any,
      shopKey,
      input: body || {},
      updatedByUserId: guard.session?.user?.id || null,
      updatedByName:
        guard.session?.user?.name || guard.session?.user?.email || null,
    });

    return NextResponse.json({ ok: true, setting });
  } catch (error) {
    console.error("DASHBOARD RECEIPT SETTINGS POST ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Receipt settings could not be saved.",
      },
      { status: 500 }
    );
  }
}
