import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || null;

  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return null;

  const digits = phone.replace(/[^\d+]/g, "");

  if (digits.length <= 4) return digits;

  return `${"*".repeat(Math.max(digits.length - 4, 3))}${digits.slice(-4)}`;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        city: true,
        addressLine1: true,
        addressLine2: true,
        parishOrRegion: true,
        postalCode: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        passwordUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
        deletedAt: true,
        deletionStatus: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({
      user: {
        ...user,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
      },
    });
  } catch (error) {
    console.error("ACCOUNT PROFILE ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}