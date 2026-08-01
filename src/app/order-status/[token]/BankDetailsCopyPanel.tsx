"use client";

import { useState } from "react";

type BankDetailsCopyPanelProps = {
  title: string;
  lines: string[];
};

export default function BankDetailsCopyPanel({
  title,
  lines,
}: BankDetailsCopyPanelProps) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <section style={bankPanelStyle}>
      <strong>{title}</strong>
      <span style={bankLineStackStyle}>
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
      <button
        type="button"
        style={{
          ...copyButtonStyle,
          ...(isCopied ? copyButtonCopiedStyle : null),
        }}
        onClick={async () => {
          await navigator.clipboard?.writeText([title, ...lines].join("\n"));
          setIsCopied(true);
          window.setTimeout(() => setIsCopied(false), 1800);
        }}
      >
        {isCopied ? "Copied" : "Copy bank info"}
      </button>
    </section>
  );
}

const bankPanelStyle = {
  background: "#FFFDF8",
  border: "1px solid rgba(53, 94, 59, 0.24)",
  borderRadius: "12px",
  color: "#28231F",
  display: "grid",
  gap: "8px",
  marginTop: "10px",
  padding: "12px",
};

const bankLineStackStyle = {
  display: "grid",
  gap: "4px",
  lineHeight: 1.35,
};

const copyButtonStyle = {
  background: "#355E3B",
  border: "0",
  borderRadius: "999px",
  color: "#FFFFFF",
  cursor: "pointer",
  fontWeight: 800,
  justifySelf: "start",
  padding: "9px 14px",
};

const copyButtonCopiedStyle = {
  background: "#1F7A3B",
};
