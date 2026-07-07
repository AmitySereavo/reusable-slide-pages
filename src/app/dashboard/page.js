import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame, { dashboardLinkStyle } from "./DashboardFrame";

const dashboardSections = [
  {
    href: "/dashboard/projects",
    label: "Projects",
    description: "Create questionnaire projects, DSL files, and reusable slide flows.",
  },
  {
    href: "/dashboard/people",
    label: "People",
    description: "Review leads, accounts, purchases, answers, content activity, and email engagement.",
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    description: "View digital and physical order items, fulfillment status, notes, and tracking.",
  },
  {
    href: "/dashboard/tickets",
    label: "Tickets",
    description: "Create reusable event tickets, ticket types, and admin-defined upgrades.",
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    description: "Manage music, merch, gift cards, store credit, and reusable shop products.",
  },
  {
    href: "/dashboard/currencies",
    label: "Currencies",
    description: "Manage account/shop currencies and exchange-rate settings.",
  },
  {
    href: "/dashboard/identity-verifications",
    label: "ID Verifications",
    description: "Review uploaded IDs, social profiles, and restricted-access approval status.",
  },
  {
    href: "/dashboard/email-sequences",
    label: "Email Sequences",
    description: "Edit operational emails, nurture sequences, delivery timing, and activity tracking.",
  },
];

export default async function DashboardPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="Project Dashboard"
      description="Choose one dashboard section. Each section loads its own data only when opened."
    >
      <nav aria-label="Dashboard sections" style={gridStyle}>
        {dashboardSections.map((section) => (
          <a key={section.href} href={section.href} style={cardLinkStyle}>
            <strong style={{ fontSize: "18px" }}>{section.label}</strong>
            <span style={{ color: "#6b625c", lineHeight: 1.45 }}>
              {section.description}
            </span>
          </a>
        ))}
      </nav>
    </DashboardFrame>
  );
}

const gridStyle = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const cardLinkStyle = {
  ...dashboardLinkStyle,
  alignContent: "start",
  display: "grid",
  gap: "8px",
  minHeight: "120px",
  padding: "16px",
};
