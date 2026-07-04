import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import TicketManager from "../TicketManager";

export default async function DashboardTicketsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Tickets"
      description="Create reusable event tickets, ticket types, and optional admin-defined upgrades."
    >
      <TicketManager />
    </DashboardFrame>
  );
}
