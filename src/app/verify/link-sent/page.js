"use client";

import { useEffect, useState } from "react";
import AuthShell from "@/customerAccess/components/AuthShell";
import { siteConfig } from "@/customerAccess/config/siteConfig";
import { getPendingVerificationContext } from "@/customerAccess/utils/verificationSession";
import { isEmail } from "@/customerAccess/utils/identifier";

function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(digits.length - 4, 3))}${digits.slice(-4)}`;
}

function getMaskedIdentifier(identifier) {
  if (!identifier) return "";
  return isEmail(identifier) ? maskEmail(identifier) : maskPhone(identifier);
}

export default function VerificationLinkSentPage() {
  const [pendingContext, setPendingContext] = useState(null);
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [message, setMessage] = useState(
    "Open the verification link we sent and confirm your details."
  );
  const [messageType, setMessageType] = useState("info");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const storedContext = getPendingVerificationContext();

    if (storedContext?.identifier) {
      setPendingContext(storedContext);
      setMaskedIdentifier(getMaskedIdentifier(storedContext.identifier));
      return;
    }

    setMessage("No identifier found for resend.");
    setMessageType("error");
  }, []);

  async function resendLink() {
    if (!pendingContext?.identifier) {
      setMessage("No identifier found for resend.");
      setMessageType("error");
      return;
    }

    setSending(true);
    setMessage("");
    setMessageType("info");

    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: pendingContext.identifier,
          delivery: pendingContext.delivery || "link",
          method: pendingContext.method || "same-as-identifier",
          target: pendingContext.target || "lead",
          successRedirect:
            pendingContext.successRedirect || siteConfig.routes.verifiedLead,
          expiresInMinutes: pendingContext.expiresInMinutes,
          expiresInHours: pendingContext.expiresInHours,
          phoneChannel: pendingContext.phoneChannel || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Could not resend verification link.");
        setMessageType("error");
        return;
      }

      setMessage(data.message || "Verification link resent.");
      setMessageType("success");
    } catch (error) {
      setMessage(error?.message || "Could not resend verification link.");
      setMessageType("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell
      title="Check your messages"
      subtitle={
        maskedIdentifier
          ? `We sent a verification link to ${maskedIdentifier}`
          : "We sent your verification link"
      }
      message={message}
      messageType={messageType}
    >
      <div className="auth-form">
        <button
          type="button"
          onClick={resendLink}
          disabled={sending || !pendingContext?.identifier}
        >
          {sending ? "Sending..." : "Resend Link"}
        </button>
      </div>
    </AuthShell>
  );
}