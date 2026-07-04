import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import EmailSequenceManager from "../EmailSequenceManager";

export default async function DashboardEmailSequencesPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Email Sequences"
      description="Edit operational emails, nurture sequences, delivery timing, and activity tracking."
    >
      <EmailSequenceManager />
    </DashboardFrame>
  );
}
