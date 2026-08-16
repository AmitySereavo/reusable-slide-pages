import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function UpcomingDeliveriesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Upcoming Deliveries"
      description="See paid-confirmed customer delivery work across shops in one place."
    >
      <PlanningManager view="deliveries" />
    </DashboardFrame>
  );
}
