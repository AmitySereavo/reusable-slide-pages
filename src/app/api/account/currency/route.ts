import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { prisma } from "@/lib/prisma";
import { normalizeCurrencyCode } from "@/lib/currency/currencies";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const preferredCurrencyCode = normalizeCurrencyCode(body?.currencyCode);

  const user = await prisma.user.update({
    where: {
      id: session.userId,
    },
    data: {
      preferredCurrencyCode,
    },
    select: {
      id: true,
      preferredCurrencyCode: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
