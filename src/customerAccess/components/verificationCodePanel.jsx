"use client";

import { useEffect, useRef, useState } from "react";
import { AUTH_RULES } from "../config/authRules";
import { AUTH_MESSAGES } from "../config/authMessages";
import { isEmail } from "../utils/identifier";

const CODE_LENGTH = AUTH_RULES.verification.codeLength;
const RESEND_COOLDOWN = AUTH_RULES.verification.resendCooldownSeconds;

function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function maskPhone(phone) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(digits.length - 4, 3))}${digits.slice(-4)}`;
}

function getMaskedIdentifier(identifier) {
  if (!identifier) return "";
  return isEmail(identifier) ? maskEmail(identifier) : maskPhone(identifier);
}

export default function VerificationCodePanel({
  pendingContext,
  routes = {},
  classNames = {},
  onVerified,
  onMessage,
  autoSend = true,
}) {
  const [codeDigits, setCodeDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const inputRefs = useRef([]);

  const identifier = pendingContext?.identifier || "";
  const maskedIdentifier = getMaskedIdentifier(identifier);
  const deliveryLabel = pendingContext?.delivery === "link" ? "link" : "code";

  function emitMessage(message, type = "error") {
    onMessage?.({ message, type });
  }

  useEffect(() => {
    if (!identifier || !pendingContext || autoSent || !autoSend) return;

    async function autoSendCode() {
      await sendVerificationCode(true);
      setAutoSent(true);
    }

    autoSendCode();
  }, [identifier, pendingContext, autoSent, autoSend]);

  useEffect(() => {
    if (!identifier) return;

    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [identifier]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  function clearCodeInputs() {
    const empty = Array(CODE_LENGTH).fill("");
    setCodeDigits(empty);

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
  }

  function buildVerifyStartPayload(context) {
    return {
      identifier: context.identifier,
      delivery: context.delivery || "code",
      method: context.method || "same-as-identifier",
      target: context.target || null,
      successRedirect: context.successRedirect || null,
      expiresInMinutes: context.expiresInMinutes,
      expiresInHours: context.expiresInHours,
      phoneChannel: context.phoneChannel || null,
    };
  }

  async function sendVerificationCode(isAuto = false) {
    if (!pendingContext?.identifier) {
      emitMessage(
        AUTH_MESSAGES?.verification?.noIdentifierForVerification ||
          "Missing identifier for verification.",
        "error"
      );
      return;
    }

    if (!isAuto && cooldown > 0) return;

    setSendingCode(true);

    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildVerifyStartPayload(pendingContext)),
      });

      const data = await res.json();

      if (res.ok) {
        const resendLabel =
          pendingContext.delivery === "link"
            ? AUTH_MESSAGES?.verification?.resendLinkSent ||
              "Verification link resent."
            : AUTH_MESSAGES?.verification?.resendCodeSent ||
              "Verification code resent.";

        const autoLabel =
          pendingContext.delivery === "link"
            ? AUTH_MESSAGES?.verification?.autoLinkSent ||
              "Verification link sent."
            : AUTH_MESSAGES?.verification?.autoCodeSent ||
              "Verification code sent.";

        emitMessage(isAuto ? autoLabel : data.message || resendLabel, "info");
        setCooldown(RESEND_COOLDOWN);
      } else {
        emitMessage(
          data.message ||
            data.error ||
            AUTH_MESSAGES?.common?.serverError ||
            "Server error",
          "error"
        );

        if (data.retryAfterSeconds) {
          setCooldown(data.retryAfterSeconds);
        }
      }
    } catch (error) {
      emitMessage(
        error?.message || AUTH_MESSAGES?.common?.serverError || "Server error",
        "error"
      );
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode(codeToCheck) {
    if (!identifier) {
      emitMessage(
        AUTH_MESSAGES?.verification?.noIdentifierForVerification ||
          "Missing identifier for verification.",
        "error"
      );
      return;
    }

    if (codeToCheck.length !== CODE_LENGTH) {
      emitMessage(
        AUTH_MESSAGES?.verification?.incompleteCode ||
          "Please enter the full verification code.",
        "error"
      );
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, code: codeToCheck }),
      });

      const data = await res.json();

      if (res.ok) {
        emitMessage(
          data.message ||
            AUTH_MESSAGES?.verification?.verificationSuccess ||
            "Verification successful.",
          "success"
        );

        onVerified?.({ data, identifier });

        if (routes.login) {
          setTimeout(() => {
            window.location.href = routes.login;
          }, 1200);
        }

        return;
      }

      emitMessage(
        data.message ||
          data.error ||
          AUTH_MESSAGES?.common?.serverError ||
          "Server error",
        "error"
      );
      clearCodeInputs();
    } catch (error) {
      emitMessage(
        error?.message || AUTH_MESSAGES?.common?.serverError || "Server error",
        "error"
      );
    } finally {
      setVerifying(false);
    }
  }

  async function tryAutoVerify(nextDigits) {
    const fullCode = nextDigits.join("");
    if (fullCode.length !== CODE_LENGTH || nextDigits.includes("")) return;
    await verifyCode(fullCode);
  }

  function handleDigitChange(index, value) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...codeDigits];
    nextDigits[index] = cleanValue;
    setCodeDigits(nextDigits);

    if (cleanValue && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (cleanValue && index === CODE_LENGTH - 1) {
      tryAutoVerify(nextDigits);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const nextDigits = [...codeDigits];

      if (nextDigits[index]) {
        nextDigits[index] = "";
        setCodeDigits(nextDigits);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        setCodeDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) return;

    const newDigits = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((digit, index) => {
      newDigits[index] = digit;
    });

    setCodeDigits(newDigits);

    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === CODE_LENGTH) {
      tryAutoVerify(newDigits);
    }
  }

  return (
    <div className={classNames.form || "auth-form"}>
      {maskedIdentifier ? (
        <p className={classNames.helpText || ""}>
          Enter the {deliveryLabel} sent to {maskedIdentifier}.
        </p>
      ) : null}

      <div className={classNames.codeGroup || "verification-code-group"}>
        {codeDigits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={classNames.codeBox || "verification-code-box"}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => verifyCode(codeDigits.join(""))}
        disabled={verifying || codeDigits.join("").length !== CODE_LENGTH}
        className={classNames.primaryButton || ""}
      >
        {verifying ? "Verifying..." : "Verify"}
      </button>

      <button
        type="button"
        onClick={() => sendVerificationCode(false)}
        disabled={sendingCode || cooldown > 0 || !identifier || !pendingContext}
        className={classNames.secondaryButton || ""}
      >
        {sendingCode
          ? "Sending..."
          : cooldown > 0
            ? `Resend ${pendingContext?.delivery === "link" ? "Link" : "Code"} (${cooldown}s)`
            : `Resend ${pendingContext?.delivery === "link" ? "Link" : "Code"}`}
      </button>
    </div>
  );
}