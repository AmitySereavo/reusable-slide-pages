"use client";

import type { CSSProperties } from "react";

const DEVICE_KEY_STORAGE_KEY = "reusable-slide-pages:browser-device-key";

function getBrowserDeviceKey() {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    if (existing) return existing;

    const nextKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `bd-${crypto.randomUUID()}`
        : `bd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, nextKey);
    return nextKey;
  } catch {
    return "";
  }
}

export default function PrintReceiptButton({
  style,
  token,
}: {
  style: CSSProperties;
  token?: string;
}) {
  function handlePrintReceipt() {
    const deviceKey = getBrowserDeviceKey();

    if (token && deviceKey) {
      fetch("/api/plant-shop/customer-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deviceKey,
          source: "receipt-download-print",
        }),
      }).catch(() => {});
    }

    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          .receipt-page-actions {
            display: none !important;
          }
        }
      `}</style>
      <button type="button" style={style} onClick={handlePrintReceipt}>
        Download / print receipt
      </button>
    </>
  );
}
