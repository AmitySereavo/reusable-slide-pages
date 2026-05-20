"use client";

import { useEffect, useMemo, useState } from "react";
import AuthShell from "./AuthShell";
import { fieldRegistry } from "../config/fieldRegistry";
import { validateFormFields } from "../utils/validation";
import "../styles/auth.css";
import { siteConfig } from "../config/siteConfig";
import { getPasswordStrength } from "../utils/passwordPolicy";
import { AUTH_MESSAGES } from "../config/authMessages";
import { setPendingVerificationContext } from "../utils/verificationSession";
import { parseIdentifier } from "../utils/identifier";

function getDefaultValue(settings, meta) {
  if (settings && Object.prototype.hasOwnProperty.call(settings, "defaultValue")) {
    return settings.defaultValue;
  }

  if (meta?.type === "checkbox") return false;
  if (meta?.type === "file") return null;

  return "";
}

export default function AuthForm({
  businessName = siteConfig.businessName,
  config,
  routes = {},
  footerLinks = siteConfig.footerLinks,
  title,
  subtitle,
  onSubmit,
  auxiliaryLinks = [],
}) {
  const visibleFields = useMemo(() => {
    return Object.entries(config.fields)
      .filter(([, settings]) => settings.visible)
      .map(([fieldKey, settings]) => ({
        key: fieldKey,
        settings,
        meta: fieldRegistry[fieldKey],
      }))
      .filter((field) => field.meta);
  }, [config]);

  const initialFormData = useMemo(() => {
    const values = {};

    visibleFields.forEach(({ key, settings, meta }) => {
      values[key] = getDefaultValue(settings, meta);
    });

    if (!Object.prototype.hasOwnProperty.call(values, "phoneVerificationChannel")) {
      values.phoneVerificationChannel =
        config.verification?.defaultPhoneChannel || "";
    }

    return values;
  }, [visibleFields, config]);

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  const [visiblePasswordFields, setVisiblePasswordFields] = useState({});

  function togglePasswordVisibility(fieldKey) {
    setVisiblePasswordFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  }

  const verificationConfig = config.verification || {};
  const phoneChannelEnabled = !!verificationConfig.promptForPhoneChannel;

  const identifierValue = formData.identifier || formData.phone || "";

  const parsedIdentifier = useMemo(() => {
    return parseIdentifier(identifierValue);
  }, [identifierValue]);

  const isDetectedPhone = parsedIdentifier.type === "phone";
  const shouldShowPhoneChannelChoice =
    phoneChannelEnabled && isDetectedPhone;

  useEffect(() => {
    if (!shouldShowPhoneChannelChoice && formData.phoneVerificationChannel) {
      setFormData((prev) => ({
        ...prev,
        phoneVerificationChannel: "",
      }));
      return;
    }

    if (
      shouldShowPhoneChannelChoice &&
      !formData.phoneVerificationChannel &&
      verificationConfig.defaultPhoneChannel
    ) {
      setFormData((prev) => ({
        ...prev,
        phoneVerificationChannel: verificationConfig.defaultPhoneChannel,
      }));
    }
  }, [
    shouldShowPhoneChannelChoice,
    formData.phoneVerificationChannel,
    verificationConfig.defaultPhoneChannel,
  ]);

  function updateField(name, value) {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm() {
    const error = validateFormFields(visibleFields, formData);

    if (error) return error;

    if (shouldShowPhoneChannelChoice && !formData.phoneVerificationChannel) {
      return "Choose whether to receive verification by WhatsApp or SMS.";
    }

    return null;
  }

  function getPostSubmitRedirect(data, submitConfig, verificationConfig) {
    if (data?.postSubmitRedirect) {
      return data.postSubmitRedirect;
    }

    if (data?.alreadyVerifiedForSubmittedChannel) {
      return (
        verificationConfig.verifiedContentRedirect ||
        submitConfig.alreadyVerifiedRedirect ||
        submitConfig.successRedirect ||
        null
      );
    }

    return submitConfig.successRedirect || null;
  }

  function buildPendingVerificationContext(payload, identifier, parsed) {
    return {
      identifier,
      delivery: verificationConfig.delivery || "code",
      method: verificationConfig.method || "same-as-identifier",
      target: config.target || null,
      successRedirect: verificationConfig.successRedirect || null,
      expiresInMinutes: verificationConfig.expiresInMinutes,
      expiresInHours: verificationConfig.expiresInHours,
      phoneChannel:
        parsed.type === "phone"
          ? payload.phoneVerificationChannel || null
          : null,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const payload = { ...formData };
      const submitConfig = config.submit || {};

      const identifier =
        payload.identifier || payload.email || payload.phone || "";

      const parsedForSubmit = parseIdentifier(identifier);

      const pendingVerificationContext = identifier
        ? buildPendingVerificationContext(payload, identifier, parsedForSubmit)
        : null;

      if (onSubmit) {
        await onSubmit({
          formData: payload,
          config,
          routes,
          setMessage,
          setMessageType,
          pendingVerificationContext,
        });
        return;
      }

      const res = await fetch(submitConfig.endpoint, {
        method: submitConfig.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.details || data.error || AUTH_MESSAGES.common.serverError);
        setMessageType("error");
        return;
      }

      setMessage(data.message || submitConfig.successMessage || "Success.");
      setMessageType("success");

      const shouldStartVerification =
        verificationConfig.required &&
        verificationConfig.autoStart !== false &&
        identifier &&
        data?.shouldStartVerification !== false;

      const postSubmitRedirect = getPostSubmitRedirect(
        data,
        submitConfig,
        verificationConfig
      );

      if (pendingVerificationContext?.identifier) {
        setPendingVerificationContext(pendingVerificationContext);
      }

      if (shouldStartVerification) {
        const verifyStartResponse = await fetch("/api/verify/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier,
            expiresInMinutes: verificationConfig.expiresInMinutes,
            expiresInHours: verificationConfig.expiresInHours,
            method: verificationConfig.method,
            delivery: verificationConfig.delivery || "code",
            target: config.target || null,
            successRedirect: verificationConfig.successRedirect || null,
            phoneChannel:
              parsedForSubmit.type === "phone"
                ? payload.phoneVerificationChannel || null
                : null,
          }),
        });

        const verifyStartData = await verifyStartResponse.json();

        if (!verifyStartResponse.ok) {
          setMessage(
            verifyStartData.details ||
              verifyStartData.error ||
              "Account was created, but the verification message could not be sent."
          );
          setMessageType("error");
          return;
        }

        if (verifyStartData?.delivery?.ok === false) {
          setMessage(
            verifyStartData.delivery.message ||
              verifyStartData.delivery.error ||
              "Account was created, but the verification message could not be delivered."
          );
          setMessageType("error");
          return;
        }
      }

      if (
        shouldStartVerification &&
        verificationConfig.redirectToVerifyPage &&
        identifier
      ) {
        const verifyPath = routes.verify || "/verify";

        setTimeout(() => {
          window.location.href = verifyPath;
        }, submitConfig.redirectDelayMs || 1000);

        return;
      }

      if (postSubmitRedirect) {
        setTimeout(() => {
          window.location.href = postSubmitRedirect;
        }, submitConfig.redirectDelayMs || 1200);
      }
    } catch (error) {
      setMessage(error?.message || AUTH_MESSAGES.common.serverError);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function renderHelpText(settings, meta) {
    const helpText = settings?.helpText || meta?.helpText || "";

    if (!helpText) return null;

    return <span className="auth-help-text">{helpText}</span>;
  }

  function renderPasswordStrength(fieldKey) {
    if (fieldKey !== "password") {
      return null;
    }

    const strength = getPasswordStrength(formData.password || "");

    if (!strength.label) {
      return null;
    }

    return (
      <div className={`auth-password-strength auth-password-strength-${strength.level}`}>
        <div className="auth-password-strength-label">{strength.label}</div>
        <ul className="auth-password-requirements">
          {strength.requirements.map((rule) => (
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
    );
  }

  function renderPasswordInput({ key, placeholder, settings, meta }) {
    const isVisible = visiblePasswordFields[key] === true;
    const isConfirmPassword = key === "confirmPassword";
    const confirmPasswordValue = String(formData.confirmPassword || "");
    const passwordValue = String(formData.password || "");
    const hasConfirmPasswordValue =
      isConfirmPassword && confirmPasswordValue.length > 0;
    const confirmPasswordMatches =
      hasConfirmPasswordValue && confirmPasswordValue === passwordValue;

    return (
      <label key={key}>
        {settings?.label || meta.label}
        <div className="auth-password-input-wrap">
          <input
            type={isVisible ? "text" : "password"}
            placeholder={placeholder}
            value={formData[key] || ""}
            onChange={(e) => updateField(key, e.target.value)}
            onPaste={key === "confirmPassword" ? (e) => e.preventDefault() : undefined}
            onDrop={key === "confirmPassword" ? (e) => e.preventDefault() : undefined}
            autoComplete={key === "confirmPassword" ? "new-password" : "new-password"}
            required={!!settings.required}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => togglePasswordVisibility(key)}
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? "Hide" : "Show"}
          </button>
        </div>
        {renderPasswordStrength(key)}

        {isConfirmPassword ? (
          <span className="auth-help-text">
            Please type the password again instead of pasting.
          </span>
        ) : null}

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

        {renderHelpText(settings, meta)}
      </label>
    );
  }

  function renderField(field) {
    const { key, settings, meta } = field;

    if (!meta) return null;

    const label = settings?.label || meta.label;
    const placeholder = settings?.placeholder || meta.placeholder;

    if (meta.type === "checkbox") {
      return (
        <label key={key} className="auth-checkbox-row">
          <input
            type="checkbox"
            checked={!!formData[key]}
            onChange={(e) => updateField(key, e.target.checked)}
          />
          <span>{label}</span>
        </label>
      );
    }

    if (meta.type === "radio") {
      const configuredOptions = Array.isArray(settings?.options)
        ? settings.options
        : Array.isArray(verificationConfig?.phoneChannelOptions) &&
            key === "phoneVerificationChannel"
          ? verificationConfig.phoneChannelOptions
          : meta.options || [];

      return (
        <fieldset key={key} className="auth-radio-group">
          <legend>{label}</legend>
          <div className="auth-radio-options">
            {configuredOptions.map((option) => {
              const normalizedOption =
                typeof option === "string"
                  ? {
                      value: option,
                      label:
                        option === "sms"
                          ? "SMS"
                          : option === "whatsapp"
                            ? "WhatsApp"
                            : option,
                    }
                  : option;

              return (
                <label
                  key={normalizedOption.value}
                  className={`auth-radio-option ${
                    normalizedOption.disabled ? "auth-radio-option-disabled" : ""
                  }`}
                  title={normalizedOption.disabledReason || undefined}
                >
                  <input
                    type="radio"
                    name={key}
                    value={normalizedOption.value}
                    checked={formData[key] === normalizedOption.value}
                    onChange={(e) => updateField(key, e.target.value)}
                    required={!!settings.required}
                    disabled={!!normalizedOption.disabled}
                  />
                  <span>
                    {normalizedOption.label}
                    {normalizedOption.disabled &&
                    normalizedOption.disabledReason ? (
                      <small className="auth-option-disabled-note">
                        {normalizedOption.disabledReason}
                      </small>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          {renderHelpText(settings, meta)}
        </fieldset>
      );
    }

    if (meta.type === "select") {
      return (
        <label key={key}>
          {label}
          <select
            value={formData[key] || ""}
            onChange={(e) => updateField(key, e.target.value)}
            required={!!settings.required}
          >
            <option value="">Select an option</option>
            {meta.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {renderHelpText(settings, meta)}
        </label>
      );
    }

    if (meta.type === "file") {
      return (
        <label key={key}>
          {label}
          <input
            type="file"
            accept={meta.accept}
            onChange={(e) => updateField(key, e.target.files?.[0] || null)}
            required={!!settings.required}
          />
          {renderHelpText(settings, meta)}
        </label>
      );
    }

    if (meta.type === "password") {
      return renderPasswordInput({
        key,
        placeholder,
        settings,
        meta,
      });
    }

    return (
      <label key={key}>
        {label}
        <input
          type={meta.type}
          placeholder={placeholder}
          value={formData[key] || ""}
          onChange={(e) => updateField(key, e.target.value)}
          required={!!settings.required}
        />
        {renderHelpText(settings, meta)}
      </label>
    );
  }

  return (
    <AuthShell
      businessName={businessName}
      title={title || "Get Started"}
      subtitle={subtitle || `Continue with ${businessName}`}
      message={message}
      messageType={messageType}
      footerLinks={footerLinks}
      auxiliaryLinks={auxiliaryLinks}
      bottomLinks={
        routes.login
          ? {
              prefix: "Already have an account?",
              href: routes.login,
              label: "Log in",
            }
          : routes.signup
            ? {
                prefix: "Need an account?",
                href: routes.signup,
                label: "Sign up",
              }
            : null
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {visibleFields.map(renderField)}

        {shouldShowPhoneChannelChoice &&
          fieldRegistry.phoneVerificationChannel &&
          renderField({
            key: "phoneVerificationChannel",
            settings: {
              visible: true,
              required: true,
              options: verificationConfig.phoneChannelOptions,
            },
            meta: fieldRegistry.phoneVerificationChannel,
          })}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : config.submit?.buttonLabel || "Submit"}
        </button>
      </form>
    </AuthShell>
  );
}