import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import InventoryManager from "../InventoryManager";

export default async function DashboardInventoryPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Inventory"
      description="Manage reusable shop products, stock, fulfillment, recipient limits, and SKUs."
    >
      <InventoryManager />
    </DashboardFrame>
  );
}
