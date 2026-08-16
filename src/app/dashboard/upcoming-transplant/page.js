import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function UpcomingTransplantPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Upcoming Transplant"
      description="Sunday transplant tasks for seedlings reaching transplant stage."
    >
      <PlanningManager view="transplant" />
    </DashboardFrame>
  );
}
