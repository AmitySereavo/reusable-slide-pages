"use client";

import type { CSSProperties } from "react";

export default function PrintReceiptButton({
  style,
}: {
  style: CSSProperties;
}) {
  return (
    <>
      <style>{`
        @media print {
          .receipt-page-actions {
            display: none !important;
          }
        }
      `}</style>
      <button type="button" style={style} onClick={() => window.print()}>
        Download / print receipt
      </button>
    </>
  );
}
