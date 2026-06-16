import DslBuilder from "./DslBuilder";

export default async function DashboardPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f5f2ee", color: "#201c1d" }}>
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
            <h1 style={{ fontSize: "28px", margin: 0 }}>Project Dashboard</h1>
            <p style={{ margin: "6px 0 0", opacity: 0.72 }}>
              Create questionnaire projects, DSL files, and reusable slide flows.
            </p>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 800, opacity: 0.65 }}>
            Dev mode: auth gate disabled
          </span>
        </div>

        <DslBuilder />
      </div>
    </main>
  );
}
