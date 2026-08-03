import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import { listDiscountCodes, saveDiscountCode } from "@/lib/discountCodes";

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    const discounts = await listDiscountCodes(prisma as any);

    return NextResponse.json({ ok: true, discounts });
  } catch (error) {
    console.error("Discount codes GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Discount codes could not be loaded.",
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
    const body = await request.json().catch(() => null);
    const discount = await saveDiscountCode(prisma as any, body || {});

    return NextResponse.json({ ok: true, discount });
  } catch (error) {
    console.error("Discount codes POST error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Discount code could not be saved.",
      },
      { status: 400 }
    );
  }
}
