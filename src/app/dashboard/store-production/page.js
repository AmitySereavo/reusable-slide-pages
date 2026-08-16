import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlanningManager from "../PlanningManager";

export default async function StoreProductionPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Store Production"
      description="See production targets the store is making for future inventory, separate from customer orders."
    >
      <PlanningManager view="store-production" />
    </DashboardFrame>
  );
}
