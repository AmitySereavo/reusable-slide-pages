import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ResetPasswordPageClient from "./ResetPasswordPageClient";
import { PASSWORD_RESET_ACCESS_COOKIE_NAME } from "@/lib/auth/passwordReset";

export default async function ResetPasswordPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const tokenValue = resolvedSearchParams?.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue || "";

  const cookieStore = await cookies();
  const hasAccessCookie = !!cookieStore.get(PASSWORD_RESET_ACCESS_COOKIE_NAME)?.value;

  if (!token && !hasAccessCookie) {
    redirect("/forgot-password");
  }

  return <ResetPasswordPageClient />;
}