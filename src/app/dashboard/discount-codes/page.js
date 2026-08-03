import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import DiscountCodesManager from "../DiscountCodesManager";

export default async function DashboardDiscountCodesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Discount Codes"
      description="Create and manage cart, product, shop, time, usage, and customer-specific discounts."
    >
      <DiscountCodesManager />
    </DashboardFrame>
  );
}
