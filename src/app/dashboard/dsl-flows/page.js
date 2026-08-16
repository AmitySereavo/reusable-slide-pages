import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminGuard";
import { questionnaireRegistry } from "@/config/questionnaires/registry";
import DashboardFrame from "../DashboardFrame";

const aliasBySlug = {
  "affiliate-sign-up": "/affiliate",
  "home-gardener-plant-giveaway": "/gift",
  "little-orchard-shop": "/shop",
  "garden-package": "/gardenpackage",
  "seedling-shop": "/seedlings",
  callaloo: "/callaloo",
  "callaloo-recipe": "/callaloo-recipe",
  "lettuce-grow-guide": "/lettuce",
  "lemon-balm-grow-guide": "/lemon-balm",
  "black-pepper-grow-guide": "/black-pepper",
  "scotch-bonnet-grow-guide": "/scotch-bonnet",
  "green-onion-grow-guide": "/green-onion",
  "cabbage-grow-guide": "/cabbage",
  "eggplant-grow-guide": "/eggplant",
  "orange-ortanique-grow-guide": "/orange-ortanique",
  "slicing-tomato-grow-guide": "/slicing-tomato",
  "sweet-pepper-grow-guide": "/sweet-pepper",
  "tree-mint-grow-guide": "/tree-mint",
  "wax-apple-grow-guide": "/wax-apple",
  "lychee-grow-guide": "/lychee",
  "culinary-basil-grow-guide": "/culinary-basil",
  "cilantro-grow-guide": "/cilantro",
  "dill-grow-guide": "/dill",
  "marigold-grow-guide": "/marigold",
  "mint-grow-guide": "/mint",
  "parsley-grow-guide": "/parsley",
  "rosemary-grow-guide": "/rosemary",
};

export default async function DashboardDslFlowsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  const groupedFlows = groupFlowsByCategory(
    Object.values(questionnaireRegistry)
  );

  return (
    <DashboardFrame
      adminLevel={session.user.adminLevel}
      title="DSL Flows"
      description="Quick links to every registry-backed DSL flow in the project."
    >
      <div style={categoryStackStyle}>
        {groupedFlows.map((group, index) => (
          <details
            key={group.key}
            open={index === 0}
            style={categorySectionStyle}
          >
            <summary style={categoryHeaderStyle}>
              <span style={categoryTitleStyle}>{group.label}</span>
              <span style={categoryCountStyle}>{group.flows.length}</span>
            </summary>

            <div style={gridStyle}>
              {group.flows.map((flow) => {
                const questionnaireHref = `/questionnaire/${flow.slug}`;
                const aliasHref = aliasBySlug[flow.slug];

                return (
                  <article key={flow.slug} style={cardStyle}>
                    <div>
                      <h3 style={titleStyle}>{flow.name}</h3>
                      <p style={slugStyle}>{flow.slug}</p>
                      <p style={pathStyle}>{flow.dslPath}</p>
                    </div>

                    <div style={linkRowStyle}>
                      {aliasHref ? (
                        <a href={aliasHref} style={primaryLinkStyle}>
                          Open alias
                        </a>
                      ) : null}
                      <a href={questionnaireHref} style={secondaryLinkStyle}>
                        Open flow
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </DashboardFrame>
  );
}

function groupFlowsByCategory(flows) {
  const categories = [
    { key: "shops", label: "Shops & Commerce", flows: [] },
    { key: "grow-guides", label: "Grow Guides", flows: [] },
    { key: "lead-flows", label: "Lead & Marketing Flows", flows: [] },
    { key: "account-auth", label: "Account & Auth", flows: [] },
    { key: "admin-ops", label: "Admin & Operations", flows: [] },
    { key: "docs", label: "Project Docs", flows: [] },
    { key: "other", label: "Other DSL Flows", flows: [] },
  ];
  const categoryByKey = new Map(
    categories.map((category) => [category.key, category])
  );

  for (const flow of flows) {
    categoryByKey.get(getFlowCategoryKey(flow))?.flows.push(flow);
  }

  for (const category of categories) {
    category.flows.sort((a, b) => a.name.localeCompare(b.name));
  }

  return categories.filter((category) => category.flows.length > 0);
}

function getFlowCategoryKey(flow) {
  const slug = String(flow.slug || "");
  const name = String(flow.name || "").toLowerCase();

  if (
    slug.endsWith("-grow-guide") ||
    name.includes("grow guide") ||
    slug === "grow-guides"
  ) {
    return "grow-guides";
  }

  if (
    slug.includes("shop") ||
    slug.includes("package") ||
    slug.includes("ticket") ||
    slug.includes("purchase") ||
    slug.includes("invitation") ||
    slug === "callaloo" ||
    slug === "callaloo-recipe"
  ) {
    return "shops";
  }

  if (
    slug.includes("affiliate") ||
    slug.includes("giveaway") ||
    slug.includes("seed") ||
    slug.includes("garden-herbs") ||
    slug.includes("self-trust")
  ) {
    return "lead-flows";
  }

  if (
    slug.includes("auth") ||
    slug.includes("login") ||
    slug.includes("signup") ||
    slug.includes("password") ||
    slug.includes("account")
  ) {
    return "account-auth";
  }

  if (
    slug.includes("nursery") ||
    slug.includes("assistant") ||
    slug.includes("itasl") ||
    slug.includes("album")
  ) {
    return "admin-ops";
  }

  if (slug.includes("docs") || slug.includes("readme")) {
    return "docs";
  }

  return "other";
}

const categoryStackStyle = {
  display: "grid",
  gap: "22px",
};

const categorySectionStyle = {
  display: "grid",
  gap: "12px",
  background: "#fffdfa",
  border: "1px solid rgba(32, 28, 29, 0.12)",
  borderRadius: "8px",
  padding: "12px",
};

const categoryHeaderStyle = {
  alignItems: "center",
  cursor: "pointer",
  display: "flex",
  gap: "10px",
  justifyContent: "space-between",
  listStyle: "none",
};

const categoryTitleStyle = {
  fontSize: "20px",
  fontWeight: 900,
  margin: 0,
};

const categoryCountStyle = {
  background: "#201c1d",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 800,
  minWidth: "28px",
  padding: "5px 9px",
  textAlign: "center",
};

const gridStyle = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid rgba(32, 28, 29, 0.14)",
  borderRadius: "8px",
  display: "grid",
  gap: "16px",
  padding: "16px",
};

const titleStyle = {
  fontSize: "18px",
  margin: 0,
};

const slugStyle = {
  color: "#6d625b",
  fontSize: "13px",
  fontWeight: 800,
  margin: "6px 0 0",
};

const pathStyle = {
  color: "#6d625b",
  fontSize: "12px",
  margin: "8px 0 0",
  overflowWrap: "anywhere",
};

const linkRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const primaryLinkStyle = {
  background: "#2f6b3d",
  border: "1px solid #2f6b3d",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 800,
  padding: "9px 12px",
  textDecoration: "none",
};

const secondaryLinkStyle = {
  background: "#ffffff",
  border: "1px solid rgba(32, 28, 29, 0.18)",
  borderRadius: "6px",
  color: "#201c1d",
  fontSize: "14px",
  fontWeight: 800,
  padding: "9px 12px",
  textDecoration: "none",
};
