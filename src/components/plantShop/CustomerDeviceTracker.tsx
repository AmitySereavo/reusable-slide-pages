"use client";

import { useEffect } from "react";

const DEVICE_KEY_STORAGE_KEY = "reusable-slide-pages:browser-device-key";

function makeDeviceKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bd-${crypto.randomUUID()}`;
  }

  return `bd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBrowserDeviceKey() {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    if (existing) return existing;

    const nextKey = makeDeviceKey();
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, nextKey);
    return nextKey;
  } catch {
    return "";
  }
}

export default function CustomerDeviceTracker({
  token,
  source,
}: {
  token: string;
  source: string;
}) {
  useEffect(() => {
    const deviceKey = getBrowserDeviceKey();
    if (!token || !deviceKey) return;

    fetch("/api/plant-shop/customer-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        deviceKey,
        source,
      }),
    }).catch(() => {});
  }, [source, token]);

  return null;
}
