import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import IdentityVerificationManager from "../IdentityVerificationManager";

export default async function DashboardIdentityVerificationsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Identity Verifications"
      description="Review ID uploads, social profiles, and approve restricted-access accounts."
    >
      <IdentityVerificationManager />
    </DashboardFrame>
  );
}
