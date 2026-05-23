import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

function cleanString(value) {
  const cleaned = String(value || "").trim();
  return cleaned.length ? cleaned : null;
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      country,
      city,
      addressLine1,
      addressLine2,
      parishOrRegion,
      postalCode,
    } = body;

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: cleanString(name),
        country: cleanString(country),
        city: cleanString(city),
        addressLine1: cleanString(addressLine1),
        addressLine2: cleanString(addressLine2),
        parishOrRegion: cleanString(parishOrRegion),
        postalCode: cleanString(postalCode),
      },
      select: {
        id: true,
        name: true,
        country: true,
        city: true,
        addressLine1: true,
        addressLine2: true,
        parishOrRegion: true,
        postalCode: true,
        updatedAt: true,
      },
    });

    return Response.json({
      ok: true,
      message: "Account information updated.",
      user,
    });
  } catch (error) {
    console.error("ACCOUNT UPDATE INFO ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}