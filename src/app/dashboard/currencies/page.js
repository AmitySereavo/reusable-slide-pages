import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import CurrencyManager from "../CurrencyManager";

export default async function DashboardCurrenciesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Currencies"
      description="Manage shop/account currencies and exchange-rate settings."
    >
      <CurrencyManager />
    </DashboardFrame>
  );
}
