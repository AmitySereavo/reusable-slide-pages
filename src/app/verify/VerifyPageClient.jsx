"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import VerifyForm from "@/customerAccess/components/VerifyForm";
import AuthShell from "@/customerAccess/components/AuthShell";
import { siteConfig } from "@/customerAccess/config/siteConfig";
import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";

export default function VerifyPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const redirectTimeoutRef = useRef(null);
  const consumeStartedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    token ? AUTH_MESSAGES.verification.tokenFlow.initialMessage : ""
  );
  const [messageType, setMessageType] = useState("info");
  const [done, setDone] = useState(false);

  async function handleVerifyLink() {
    if (!token || loading || done || consumeStartedRef.current) return;

    consumeStartedRef.current = true;
    setLoading(true);
    setMessage(
      AUTH_MESSAGES?.verification?.verifyingLink || "Verifying your link..."
    );
    setMessageType("info");

    try {
      const res = await fetch("/api/verify/consume-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          data.error ||
            AUTH_MESSAGES?.verification?.verificationFailed ||
            "Verification failed."
        );
        setMessageType("error");
        setDone(true);
        return;
      }

      setMessage(
        data.message ||
          AUTH_MESSAGES?.verification?.verificationSuccess ||
          "Verification successful."
      );
      setMessageType("success");
      setDone(true);

      const redirectTo = data.successRedirect || siteConfig.routes.login;

      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    } catch (error) {
    consumeStartedRef.current = false;

    setMessage(
      error?.message ||
        AUTH_MESSAGES?.verification?.verificationFailed ||
        "Verification failed."
    );
      setMessageType("error");
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <AuthShell
        title="Verify"
        subtitle={
          done
            ? AUTH_MESSAGES.verification.tokenFlow.subtitleDone
            : AUTH_MESSAGES.verification.tokenFlow.subtitlePending
        }
        message={message}
        messageType={messageType}
      >
        <div className="auth-form">
          {!done ? (
            <button
              type="button"
              onClick={handleVerifyLink}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          ) : null}
        </div>
      </AuthShell>
    );
  }

  return <VerifyForm />;
}