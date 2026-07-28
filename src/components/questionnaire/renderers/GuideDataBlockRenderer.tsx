import type { CSSProperties, ReactNode } from "react";

import type { ThemeConfig } from "@/types/questionnaire";

type GuideDataBlockProps = {
  text: string;
  theme: ThemeConfig;
};

const separator = "||";

export function GuideDataBlockRenderer({
  text,
  theme,
}: GuideDataBlockProps): ReactNode {
  const trimmed = text.trim();

  if (trimmed.startsWith("GUIDEGRID|")) {
    return renderGrid(trimmed.slice("GUIDEGRID|".length), theme);
  }

  if (trimmed.startsWith("GUIDETABLE|")) {
    return renderTable(trimmed.slice("GUIDETABLE|".length), theme);
  }

  return null;
}

function renderGrid(payload: string, theme: ThemeConfig) {
  const items = payload
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, ...valueParts] = item.split("::");
      return {
        label: label?.trim() ?? "",
        value: valueParts.join("::").trim(),
      };
    })
    .filter((item) => item.label && item.value);

  if (!items.length) return null;

  return (
    <div style={styles.grid}>
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          style={{
            ...styles.gridItem,
            borderColor: theme.colors.border,
            background: "rgba(255, 255, 255, 0.78)",
          }}
        >
          <span style={{ ...styles.gridLabel, color: theme.colors.subtitle }}>
            {item.label}
          </span>
          <strong style={{ ...styles.gridValue, color: theme.colors.text }}>
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function renderTable(payload: string, theme: ThemeConfig) {
  const rows = payload
    .split(separator)
    .map((row) =>
      row
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((row) => row.length);

  if (rows.length < 2) return null;

  const [headers, ...bodyRows] = rows;

  return (
    <div
      style={{
        ...styles.tableWrap,
        borderColor: theme.colors.border,
        background: "rgba(255, 255, 255, 0.82)",
      }}
    >
      <table style={styles.table}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  ...styles.th,
                  borderColor: theme.colors.border,
                  color: theme.colors.accent,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {headers.map((header, cellIndex) => (
                <td
                  key={`${header}-${cellIndex}`}
                  style={{
                    ...styles.td,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  {row[cellIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    width: "100%",
  },
  gridItem: {
    border: "1px solid",
    borderRadius: "8px",
    display: "grid",
    gap: "4px",
    padding: "12px",
  },
  gridLabel: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  gridValue: {
    fontSize: "1rem",
    lineHeight: 1.3,
  },
  tableWrap: {
    border: "1px solid",
    borderRadius: "8px",
    overflowX: "auto",
    width: "100%",
  },
  table: {
    borderCollapse: "collapse",
    fontSize: "0.95rem",
    minWidth: "100%",
    textAlign: "left",
  },
  th: {
    borderBottom: "1px solid",
    fontWeight: 800,
    padding: "10px 12px",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid",
    lineHeight: 1.35,
    padding: "10px 12px",
    verticalAlign: "top",
  },
};
