import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { getUserStoreCreditBalance } from "@/lib/storeCredit/balance";

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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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
        preferredCurrencyCode: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        passwordUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
        deletedAt: true,
        deletionStatus: true,
        emailAddresses: {
          orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            email: true,
            normalizedEmail: true,
            isActive: true,
            isVerified: true,
            verifiedAt: true,
            reservedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const normalizedUserEmail = normalizeEmail(user.email);
    const preferredCurrencyCode = user.preferredCurrencyCode || "USD";
    const storeCreditBalance = await getUserStoreCreditBalance(
      user.id,
      preferredCurrencyCode
    );

    const activeEmailAddress =
      user.emailAddresses.find((item) => item.isActive) ||
      user.emailAddresses.find(
        (item) => item.normalizedEmail === normalizedUserEmail
      ) ||
      null;

    return Response.json({
      user: {
        ...user,

        // Current display email should come from the active email record when it exists.
        email: activeEmailAddress?.email ?? user.email,
        maskedEmail: maskEmail(activeEmailAddress?.email ?? user.email),

        // This is the important fix:
        // the account card can now know whether the active email itself is verified.
        activeEmailAddress: activeEmailAddress
          ? {
              ...activeEmailAddress,
              maskedEmail: maskEmail(activeEmailAddress.email),
            }
          : null,

        emailAddresses: user.emailAddresses.map((item) => ({
          ...item,
          maskedEmail: maskEmail(item.email),
        })),

        maskedPhone: maskPhone(user.phone),
        storeCreditBalance: storeCreditBalance.total,
        storeCreditPurchasedBalance: storeCreditBalance.purchased,
        storeCreditReturnedBalance: storeCreditBalance.returned,
        storeCreditCurrencyCode: storeCreditBalance.currencyCode,
        preferredCurrencyCode,
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
