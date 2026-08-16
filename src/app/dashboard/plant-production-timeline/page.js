import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlantProductionTimelineManager from "../PlantProductionTimelineManager";

export default async function PlantProductionTimelinePage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Plant Production Timeline"
      description="Edit reusable day-slot production timelines for each plant type and propagation method."
    >
      <PlantProductionTimelineManager />
    </DashboardFrame>
  );
}
