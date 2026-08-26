import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import ReceiptSettingsManager from "../ReceiptSettingsManager";

export default async function DashboardReceiptSettingsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Receipt Settings"
      description="Configure each shop receipt page button, promotion link, and receipt colors."
    >
      <ReceiptSettingsManager />
    </DashboardFrame>
  );
}
