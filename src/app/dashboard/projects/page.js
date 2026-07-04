import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame from "../DashboardFrame";
import DslBuilder from "../DslBuilder";

export default async function DashboardProjectsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Projects"
      description="Create questionnaire projects, DSL files, and reusable slide flows."
    >
      <section id="dashboard-projects">
        <DslBuilder />
      </section>
    </DashboardFrame>
  );
}
