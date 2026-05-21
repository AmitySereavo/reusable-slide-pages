"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
        cache: "no-store",
      });

      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{
        marginTop: "1rem",
        padding: "0.75rem 1rem",
        cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}