import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import DashboardFrame, { dashboardLinkStyle } from "./DashboardFrame";
import PlanningManager from "./PlanningManager";

const dashboardSections = [
  {
    href: "/dashboard/today-tomorrow",
    label: "Today and Tomorrow",
    description: "See immediate deliveries, seed sowing, transplant, and people follow-up in one place.",
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    description: "Enable admin push alerts and open prepared WhatsApp follow-up messages.",
  },
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
    href: "/dashboard/affiliates",
    label: "Affiliates",
    description: "Review affiliate applications, approve levels, and set store or product commission scope.",
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    description: "View digital and physical order items, fulfillment status, notes, and tracking.",
  },
  {
    href: "/dashboard/plant-batches",
    label: "Plant Batches",
    description: "View, add, edit, and remove nursery plant batches that feed shop availability.",
  },
  {
    href: "/dashboard/upcoming-deliveries",
    label: "Upcoming Deliveries",
    description: "Plan delivery days across Callaloo, Little Orchard, Seedling Shop, and future shops.",
  },
  {
    href: "/dashboard/upcoming-seed-sowing",
    label: "Upcoming Seed Sowing",
    description: "See Saturday sowing tasks calculated from future customer commitments.",
  },
  {
    href: "/dashboard/upcoming-propagation",
    label: "Upcoming Propagation",
    description: "Plan cuttings, air layers, suckers, grafts, divisions, and other non-seed starts.",
  },
  {
    href: "/dashboard/upcoming-transplant",
    label: "Upcoming Transplant",
    description: "Prepare Sunday transplant work for seedlings reaching the next stage.",
  },
  {
    href: "/dashboard/plant-production-timeline",
    label: "Plant Production Timeline",
    description: "Edit reusable day-slot timelines for propagation, shop-stage checks, and nursery production work.",
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
    href: "/seedlings",
    label: "Seedling Shop",
    description: "Open the public seedling batch shop for dated pre-orders.",
  },
  {
    href: "/dashboard/discount-codes",
    label: "Discount Codes",
    description: "Create product, cart, shop, customer, date-limited, and usage-limited discounts.",
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
      <div style={featuredSectionStyle}>
        <PlanningManager view="today-tomorrow" />
      </div>
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

const featuredSectionStyle = {
  marginBottom: "18px",
};

const cardLinkStyle = {
  ...dashboardLinkStyle,
  alignContent: "start",
  display: "grid",
  gap: "8px",
  minHeight: "120px",
  padding: "16px",
};
