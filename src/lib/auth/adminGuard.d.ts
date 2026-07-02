import type { NextResponse } from "next/server";
import type { AuthSession } from "./sessionServer";

export function getAdminSession(): Promise<AuthSession | null>;

export function requireAdminSessionJson(): Promise<{
  session: AuthSession | null;
  response: NextResponse | null;
}>;
