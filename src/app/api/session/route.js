import { getSessionFromCookie, touchSession } from "@/lib/auth/sessionServer";

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.user) {
      return Response.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    await touchSession(session.id);

    return Response.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        adminLevel: session.user.adminLevel,
      },
    });
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return Response.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}