import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function UpcomingSeedSowingPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Upcoming Seed Sowing"
      description="Saturday seed-sowing tasks calculated from future subscriptions and shop orders."
    >
      <PlanningManager view="sowing" />
    </DashboardFrame>
  );
}
