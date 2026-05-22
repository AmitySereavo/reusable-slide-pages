import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

export async function POST() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledAt: null,
        deletionStatus: null,
      },
    });

    return Response.json({
      ok: true,
      message: "Account deletion has been canceled.",
    });
  } catch (error) {
    console.error("CANCEL ACCOUNT DELETE ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}