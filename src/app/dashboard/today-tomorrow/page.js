import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function TodayTomorrowPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Today and Tomorrow"
      description="Immediate seed sowing, transplant, deliveries, and people follow-up in one place."
    >
      <PlanningManager view="today-tomorrow" />
    </DashboardFrame>
  );
}
