import DashboardSidePanels from "./DashboardSidePanels";

export default function DashboardFrame({ adminLevel, title, description, children }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f5f2ee", color: "#201c1d" }}>
      <DashboardSidePanels adminLevel={adminLevel} />
      <div style={{ padding: "24px clamp(16px, 3vw, 40px)" }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "16px",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", margin: 0 }}>{title}</h1>
            {description ? (
              <p style={{ margin: "6px 0 0", opacity: 0.72 }}>{description}</p>
            ) : null}
          </div>
          <span style={{ fontSize: "12px", fontWeight: 800, opacity: 0.65 }}>
            Admin level {adminLevel}
          </span>
        </div>

        {children}
      </div>
    </main>
  );
}

export const dashboardLinkStyle = {
  background: "#fffdfa",
  border: "1px solid rgba(32, 28, 29, 0.14)",
  borderRadius: "6px",
  color: "inherit",
  fontSize: "14px",
  fontWeight: 800,
  padding: "9px 12px",
  textDecoration: "none",
};
