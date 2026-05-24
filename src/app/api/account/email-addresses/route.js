import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || null;

  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const emailAddresses = await prisma.userEmailAddress.findMany({
      where: { userId: session.userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    return Response.json({
      ok: true,
      emailAddresses: emailAddresses.map((item) => ({
        id: item.id,
        email: item.email,
        maskedEmail: maskEmail(item.email),
        isActive: item.isActive,
        isVerified: item.isVerified,
        verifiedAt: item.verifiedAt,
        reservedAt: item.reservedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error("ACCOUNT EMAIL ADDRESSES ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}