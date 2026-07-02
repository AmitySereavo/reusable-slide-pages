import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

export async function getAdminSession() {
  const session = await getSessionFromCookie();
  const adminLevel = Number(session?.user?.adminLevel || 0);

  return adminLevel >= 1 ? session : null;
}

export async function requireAdminSessionJson() {
  const session = await getAdminSession();

  if (session) {
    return { session, response: null };
  }

  return {
    session: null,
    response: NextResponse.json(
      { error: "Admin access is required." },
      { status: 403 }
    ),
  };
}
