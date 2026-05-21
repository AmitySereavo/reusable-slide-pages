import { redirect } from "next/navigation";
import LoginForm from "../../customerAccess/components/LoginForm";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";

export default async function LoginPage() {
  const session = await getSessionFromCookie();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}