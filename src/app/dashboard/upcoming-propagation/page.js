import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function UpcomingPropagationPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Upcoming Propagation"
      description="See cuttings, air layers, suckers, grafts, divisions, and other non-seed starts across shops."
    >
      <PlanningManager view="propagation" />
    </DashboardFrame>
  );
}
