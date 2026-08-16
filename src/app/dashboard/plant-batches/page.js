import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PlantBatchesManager from "../PlantBatchesManager";

export default async function DashboardPlantBatchesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Plant Batches"
      description="View, add, edit, and remove plant batches. Shops use batch purpose and plant type to determine living inventory availability."
    >
      <PlantBatchesManager />
    </DashboardFrame>
  );
}
