"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/customerAccess/components/AuthShell";
import { siteConfig } from "@/customerAccess/config/siteConfig";
import { getPasswordStrength } from "@/customerAccess/utils/passwordPolicy";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const returnTo = searchParams.get("returnTo") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const hasConfirmPasswordValue = confirmPassword.length > 0;
  const confirmPasswordMatches =
    hasConfirmPasswordValue && confirmPassword === password;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    if (!password || !confirmPassword) {
      setMessage("Enter and confirm your new password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Unable to reset password.");
        setMessageType("error");
        return;
      }

      setMessage(data.message || "Password reset successful.");
      setMessageType("success");

      setTimeout(() => {
        const loginPath = siteConfig.routes.login || "/login";
        router.replace(
          returnTo
            ? `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`
            : loginPath
        );
      }, 1000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      businessName={siteConfig.businessName}
      title="Reset Password"
      subtitle="Choose a new password"
      message={message}
      messageType={messageType}
      footerLinks={siteConfig.footerLinks}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          New Password
          <div className="auth-password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter a new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {passwordStrength.label ? (
            <div
              className={`auth-password-strength auth-password-strength-${passwordStrength.level}`}
            >
              <div className="auth-password-strength-label">
                {passwordStrength.label}
              </div>
              <ul className="auth-password-requirements">
                {passwordStrength.requirements.map((rule) => (
                  <li
                    key={rule.key}
                    className={
                      rule.met
                        ? "auth-password-requirement-met"
                        : "auth-password-requirement-unmet"
                    }
                  >
                    {rule.met ? "✓" : "•"} {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </label>

        <label>
          Confirm Password
          <div className="auth-password-input-wrap">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <span className="auth-help-text">
            Please type the password again instead of pasting.
          </span>

          {hasConfirmPasswordValue ? (
            <span
              className={
                confirmPasswordMatches
                  ? "auth-password-match auth-password-match-success"
                  : "auth-password-match auth-password-match-error"
              }
            >
              {confirmPasswordMatches
                ? "✓ Passwords match."
                : "Passwords do not match yet."}
            </span>
          ) : null}
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Reset Password"}
        </button>
      </form>
    </AuthShell>
  );
}
