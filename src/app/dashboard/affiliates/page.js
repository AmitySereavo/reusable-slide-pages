import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import AffiliateManager from "../AffiliateManager";

export default async function DashboardAffiliatesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Affiliates"
      description="Review affiliate sign-up requests, assign levels, and control commission scope."
    >
      <AffiliateManager />
    </DashboardFrame>
  );
}
