import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import OrdersManager from "../OrdersManager";

export default async function DashboardOrdersPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Orders"
      description="View digital and physical order items, fulfillment status, delivery notes, and tracking updates."
    >
      <OrdersManager />
    </DashboardFrame>
  );
}
