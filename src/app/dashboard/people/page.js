import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import PeopleManager from "../PeopleManager";

export default async function DashboardPeoplePage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="People"
      description="Review leads, accounts, purchases, content activity, answers, and email engagement."
    >
      <PeopleManager />
    </DashboardFrame>
  );
}
