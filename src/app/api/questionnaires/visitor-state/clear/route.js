import { cookies } from "next/headers";
import { logoutCurrentSession } from "@/lib/auth/sessionServer";
import {
  GATED_ACCESS_COOKIE_NAME,
  buildExpiredGatedAccessCookie,
} from "@/lib/questionnaire/gatedAccessCookie";

export async function POST() {
  try {
    await logoutCurrentSession();

    const cookieStore = await cookies();
    const expiredGatedCookie = buildExpiredGatedAccessCookie();

    cookieStore.set(
      expiredGatedCookie.name,
      expiredGatedCookie.value,
      expiredGatedCookie
    );

    cookieStore.set(GATED_ACCESS_COOKIE_NAME, "", {
      path: "/",
      expires: new Date(0),
    });

    return Response.json({
      ok: true,
      message: "Visitor state cleared.",
    });
  } catch (error) {
    console.error("CLEAR VISITOR STATE ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to clear visitor state.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}