"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/customerAccess/components/AuthShell";
import { siteConfig } from "@/customerAccess/config/siteConfig";
import {
  getPendingPasswordResetContext,
  clearPendingPasswordResetContext,
} from "@/customerAccess/utils/passwordResetSession";

export default function ForgotPasswordCodePageClient() {
  const router = useRouter();
  const [context, setContext] = useState(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pending = getPendingPasswordResetContext();

    if (!pending?.identifier) {
      router.replace("/forgot-password");
      return;
    }

    setContext(pending);
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    if (!code.trim()) {
      setMessage("Enter the reset code.");
      return;
    }

    if (!context?.identifier) {
      setMessage("No password reset session found. Please start again.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/password/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: context.identifier,
          code,
          phoneChannel: context.phoneChannel || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Unable to verify code.");
        setMessageType("error");
        return;
      }

      clearPendingPasswordResetContext();
      setMessage(data.message || "Code verified.");
      setMessageType("success");

      setTimeout(() => {
        router.replace(data.redirectTo || "/reset-password");
      }, 700);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      businessName={siteConfig.businessName}
      title="Enter Reset Code"
      subtitle="Enter the code that was sent to your phone"
      message={message}
      messageType={messageType}
      footerLinks={siteConfig.footerLinks}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Reset Code
          <input
            type="text"
            placeholder="Enter the code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Verify Code"}
        </button>
      </form>
    </AuthShell>
  );
}