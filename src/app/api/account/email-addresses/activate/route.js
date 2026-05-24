import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();
    const emailAddressId = String(body.emailAddressId || "").trim();

    if (!emailAddressId) {
      return Response.json(
        { error: "Email address id is required." },
        { status: 400 }
      );
    }

    const emailAddress = await prisma.userEmailAddress.findFirst({
      where: {
        id: emailAddressId,
        userId: session.userId,
      },
    });

    if (!emailAddress) {
      return Response.json(
        { error: "Email address not found on this account." },
        { status: 404 }
      );
    }

    if (!emailAddress.isVerified) {
      return Response.json(
        { error: "Only verified email addresses can be made active." },
        { status: 400 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.userEmailAddress.updateMany({
        where: { userId: session.userId },
        data: { isActive: false },
      });

      await tx.userEmailAddress.update({
        where: { id: emailAddress.id },
        data: { isActive: true },
      });

      return tx.user.update({
        where: { id: session.userId },
        data: {
          email: emailAddress.email,
          emailVerifiedAt: emailAddress.verifiedAt || new Date(),
        },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          updatedAt: true,
        },
      });
    });

    return Response.json({
      ok: true,
      message: "Active email updated.",
      user,
    });
  } catch (error) {
    console.error("ACCOUNT ACTIVATE EMAIL ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}