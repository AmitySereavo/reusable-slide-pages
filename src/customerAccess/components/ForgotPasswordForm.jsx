"use client";

import { useRouter } from "next/navigation";
import AuthForm from "./AuthForm";
import { forgotPasswordConfig } from "../config/forgotPasswordConfig";
import { AUTH_MESSAGES } from "../config/authMessages";
import { siteConfig } from "../config/siteConfig";
import { setPendingPasswordResetContext } from "../utils/passwordResetSession";
import { parseIdentifier } from "../utils/identifier";

export default function ForgotPasswordForm({
  businessName = siteConfig.businessName,
  routes = {
    login: siteConfig.routes.login,
    resetPassword: siteConfig.routes.resetPassword,
    forgotPasswordCode: siteConfig.routes.forgotPasswordCode,
  },
  footerLinks = siteConfig.footerLinks,
}) {
  const router = useRouter();

  async function handleForgotPasswordSubmit({
    formData,
    setMessage,
    setMessageType,
  }) {
    const parsed = parseIdentifier(formData.identifier);

    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: formData.identifier,
        phoneChannel:
          parsed.type === "phone" ? formData.phoneVerificationChannel : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || AUTH_MESSAGES.common.serverError);
      setMessageType("error");
      return;
    }

    setMessage(data.message || AUTH_MESSAGES.passwordReset.requestAccepted);
    setMessageType("success");

    if (data.nextStep === "enter-code") {
      setPendingPasswordResetContext({
        identifier: data.identifier,
        phoneChannel: data.phoneChannel,
      });

      setTimeout(() => {
        router.replace(routes.forgotPasswordCode || "/forgot-password/code");
      }, 800);

      return;
    }
  }

  return (
    <AuthForm
      businessName={businessName}
      config={forgotPasswordConfig}
      routes={routes}
      footerLinks={footerLinks}
      title="Forgot Password"
      subtitle="Enter your email or phone number to continue"
      onSubmit={handleForgotPasswordSubmit}
    />
  );
}