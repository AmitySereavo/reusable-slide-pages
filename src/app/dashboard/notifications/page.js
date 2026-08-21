import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import NotificationsManager from "../NotificationsManager";

export default async function DashboardNotificationsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Admin Notifications"
      description="Enable browser push notifications and review WhatsApp follow-up alerts."
    >
      <NotificationsManager />
    </DashboardFrame>
  );
}
