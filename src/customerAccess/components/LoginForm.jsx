"use client";

import AuthForm from "./AuthForm";
import { loginConfig } from "../config/loginConfig";
import { AUTH_MESSAGES } from "../config/authMessages";
import { setPendingVerificationContext } from "../utils/verificationSession";
import { siteConfig } from "../config/siteConfig";

export default function LoginForm({
  businessName = siteConfig.businessName,
  successRedirect,
  routes = {
    signup: siteConfig.routes.signup,
    dashboard: siteConfig.routes.dashboard,
    verify: siteConfig.routes.verify,
    forgotPassword: siteConfig.routes.forgotPassword,
  },
  footerLinks = siteConfig.footerLinks,
}) {
  async function handleLoginSubmit({
    formData,
    routes,
    setMessage,
    setMessageType,
  }) {
    const { identifier, password } = formData;

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (data.needsVerification) {
          setPendingVerificationContext({
          identifier,
          target: "account",
          successRedirect: successRedirect || routes.dashboard || "/dashboard",
        });
      setMessage("Your account needs verification before login.");
      setMessageType("info");

      setTimeout(() => {
        window.location.replace(routes.verify || "/verify");
      }, 800);
      return;
    }

    if (res.ok) {
      setMessage(data.message || AUTH_MESSAGES.login.loginSuccess);
      setMessageType("success");

      setTimeout(() => {
        window.location.replace(successRedirect || routes.dashboard || "/dashboard");
      }, 1000);
      return;
    }

    setMessage(data.error || AUTH_MESSAGES.common.serverError);
    setMessageType("error");
  }

  return (
    <AuthForm
      businessName={businessName}
      config={loginConfig}
      routes={routes}
      footerLinks={footerLinks}
      title="Login"
      subtitle="Access your account"
      auxiliaryLinks={
        routes.forgotPassword
          ? [{ href: routes.forgotPassword, label: "Forgot password?" }]
          : []
      }
      onSubmit={handleLoginSubmit}
    />
  );
}
