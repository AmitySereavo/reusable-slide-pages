import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const session = await getSessionFromCookie();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Dashboard</h1>
      <p>You are logged in.</p>

      <LogoutButton />
    </main>
  );
}