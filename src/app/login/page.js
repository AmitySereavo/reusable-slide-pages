import { redirect } from "next/navigation";
import LoginForm from "../../customerAccess/components/LoginForm";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

function getSafeReturnTo(value) {
  const text = String(value || "").trim();

  if (!text.startsWith("/") || text.startsWith("//")) {
    return "";
  }

  return text;
}

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const returnTo = getSafeReturnTo(resolvedSearchParams?.returnTo);
  const session = await getSessionFromCookie();

  if (session?.user) {
    redirect(returnTo || "/dashboard");
  }

  return <LoginForm successRedirect={returnTo || undefined} />;
}
