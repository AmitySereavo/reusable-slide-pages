"use client";

import { useEffect, useState } from "react";
import AuthShell from "./AuthShell";
import VerificationCodePanel from "./verificationCodePanel.jsx";
import { siteConfig } from "../config/siteConfig";
import { AUTH_MESSAGES } from "../config/authMessages";
import {
  getPendingVerificationContext,
  clearPendingVerificationContext,
} from "../utils/verificationSession";

export default function VerifyForm({
  businessName = siteConfig.businessName,
  footerLinks = siteConfig.footerLinks,
  routes = {
    login: siteConfig.routes.login,
  },
  title = "Verify Your Account",
  subtitle,
}) {
  const [pendingContext, setPendingContext] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  useEffect(() => {
    const storedContext = getPendingVerificationContext();

    if (storedContext?.identifier) {
      setPendingContext(storedContext);
    } else {
      setMessage(
        AUTH_MESSAGES?.verification?.noSessionFound ||
          "No verification session found. Please sign up or log in again."
      );
      setMessageType("error");
    }
  }, []);

  return (
    <AuthShell
      businessName={businessName}
      footerLinks={footerLinks}
      title={title}
      subtitle={subtitle || "Enter your verification code."}
      message={message}
      messageType={messageType}
    >
      <VerificationCodePanel
        pendingContext={pendingContext}
        routes={routes}
        onMessage={({ message, type }) => {
          setMessage(message);
          setMessageType(type);
        }}
        onVerified={() => {
          clearPendingVerificationContext();
        }}
      />
    </AuthShell>
  );
}
