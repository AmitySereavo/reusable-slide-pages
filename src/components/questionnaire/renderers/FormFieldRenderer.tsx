"use client";

import type {
  FormField,
  QuestionnaireAnswers,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ThemeConfig,
} from "@/types/questionnaire";
import { useEffect, useState } from "react";
import {
  getPasswordRequirementResults,
  getPasswordStrength,
} from "@/customerAccess/utils/passwordPolicy";
import { replaceDynamicText } from "@/lib/questionnaire/dynamicText";
import styles from "../QuestionnaireShell.module.css";

const COPYABLE_INFO_FIELD_NAMES = new Set([
  "paymentScotiaDetails",
  "paymentNcbDetails",
]);

type FormFieldRendererProps = {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  variables?: QuestionnaireVariableMap;
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  errorMessage?: string;
};

function renderInlineLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (!match) {
      return part;
    }

    const [, label, href] = match;

    return (
      <a
        key={`${href}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  });
}

function renderInfoText(text: string) {
  const lines = text
    .split(/\s*;;\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return <span>{renderInlineLinks(text)}</span>;
  }

  return (
    <span className={styles.fieldInfoLineStack}>
      {lines.map((line) => (
        <span key={line}>{renderInlineLinks(line)}</span>
      ))}
    </span>
  );
}

function getCopyableInfoText(text: string) {
  return text
    .split(/\s*;;\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export default function FormFieldRenderer({
  field,
  theme,
  answers,
  variables,
  setAnswer,
  isPasswordVisible,
  onTogglePasswordVisibility,
  errorMessage,
}: FormFieldRendererProps) {
  const [copiedInfoFieldName, setCopiedInfoFieldName] = useState("");
  const resolvedLabel =
    replaceDynamicText(field.label, answers, variables) ?? field.label;

  const resolvedPlaceholder = replaceDynamicText(
    field.placeholder ?? field.label,
    answers,
    variables
  );

  const fieldFrameStyle = {
    display: "grid",
    gap: "8px",
  } as const;

  const fieldLabelStyle = {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.35,
    color: theme.colors.text,
  } as const;

  const fieldError = errorMessage ? (
    <p className={styles.fieldError}>{errorMessage}</p>
  ) : null;

  useEffect(() => {
    if (!copiedInfoFieldName) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedInfoFieldName("");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copiedInfoFieldName]);

  if (field.type === "checkbox") {
    return (
      <div style={fieldFrameStyle}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={Boolean(answers[field.name] ?? false)}
            onChange={(e) => setAnswer(field.name, e.target.checked)}
          />
          {resolvedLabel}
        </label>
        {fieldError}
      </div>
    );
  }

  if (field.type === "info") {
    const canCopyInfo = COPYABLE_INFO_FIELD_NAMES.has(field.name);
    const isCopied = copiedInfoFieldName === field.name;

    return (
      <div className={styles.fieldInfoPanel}>
        <strong>{resolvedLabel}</strong>
        {resolvedPlaceholder ? (
          renderInfoText(resolvedPlaceholder)
        ) : null}
        {canCopyInfo && resolvedPlaceholder ? (
          <button
            type="button"
            className={`${styles.copyInfoButton} ${
              isCopied ? styles.copyInfoButtonCopied : ""
            }`}
            onClick={async () => {
              await navigator.clipboard?.writeText(
                getCopyableInfoText(resolvedPlaceholder)
              );
              setCopiedInfoFieldName(field.name);
            }}
          >
            {isCopied ? "Copied" : "Copy bank info"}
          </button>
        ) : null}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div style={fieldFrameStyle}>
        <div style={fieldLabelStyle}>{resolvedLabel}</div>
        <div className={styles.radioOptionStack}>
          {(field.options ?? []).map((option) => (
            <label
              key={`${field.name}-${option.value}`}
              className={styles.radioOptionRow}
            >
              <input
                type="radio"
                name={field.name}
                value={String(option.value)}
                checked={answers[field.name] === option.value}
                onChange={() => setAnswer(field.name, option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldError}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const selectedValues = Array.isArray(answers[field.name])
      ? (answers[field.name] as Array<string | number | boolean>)
      : [];
    const maxSelections =
      field.name === "affiliateProductSkuSelection" ? 3 : Number.POSITIVE_INFINITY;

    return (
      <div style={fieldFrameStyle}>
        <div style={fieldLabelStyle}>{resolvedLabel}</div>
        {resolvedPlaceholder ? (
          <p className={styles.fieldHelpText}>{resolvedPlaceholder}</p>
        ) : null}
        <div className={styles.radioOptionStack}>
          {(field.options ?? []).map((option) => {
            const isSelected = selectedValues.includes(option.value);
            const hasReachedLimit =
              !isSelected && selectedValues.length >= maxSelections;

            return (
              <label
                key={`${field.name}-${option.value}`}
                className={styles.radioOptionRow}
              >
                <input
                  type="checkbox"
                  value={String(option.value)}
                  checked={isSelected}
                  disabled={option.disabled === true || hasReachedLimit}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value].slice(0, maxSelections)
                      : selectedValues.filter((value) => value !== option.value);

                    setAnswer(field.name, nextValues);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {Number.isFinite(maxSelections) ? (
          <p className={styles.fieldHelpText}>
            Choose up to {maxSelections}. Selected: {selectedValues.length}.
          </p>
        ) : null}
        {fieldError}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <textarea
          className={styles.input}
          placeholder={resolvedPlaceholder}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => setAnswer(field.name, e.target.value)}
          style={{
            borderColor: theme.colors.border,
            minHeight: "120px",
            resize: "vertical",
          }}
        />
        {fieldError}
      </div>
    );
  }

  if (field.type === "date") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayValue = `${yyyy}-${mm}-${dd}`;

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            className={styles.input}
            type="date"
            value={String(answers[field.name] ?? "")}
            onChange={(e) => setAnswer(field.name, e.target.value)}
            style={{ borderColor: theme.colors.border }}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setAnswer(field.name, todayValue)}
            style={{
              borderColor: theme.colors.border,
              background: "#FFFFFF",
              color: theme.colors.text,
            }}
          >
            Use today
          </button>
        </div>
        {fieldError}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <select
          className={styles.input}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => setAnswer(field.name, e.target.value)}
          style={{ borderColor: theme.colors.border }}
        >
          <option value="">
            {resolvedPlaceholder || `Select ${resolvedLabel}`}
          </option>
          {(field.options ?? []).map((option) => (
            <option
              key={`${field.name}-${option.value}`}
              value={option.value}
              disabled={option.disabled === true}
            >
              {option.label}
            </option>
          ))}
        </select>
        {fieldError}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          step="0.0001"
          placeholder={resolvedPlaceholder}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === "") {
              setAnswer(field.name, "");
              return;
            }

            const parsed = Number(raw);

            if (Number.isNaN(parsed)) {
              return;
            }

            setAnswer(field.name, Math.max(0, parsed));
          }}
          style={{ borderColor: theme.colors.border }}
        />
        {fieldError}
      </div>
    );
  }

  if (field.type === "password") {
    const fieldValue = String(answers[field.name] ?? "");
    const passwordValue = String(answers.password ?? "");
    const confirmPasswordValue = String(answers.confirmPassword ?? "");
    const isConfirmPassword = field.name === "confirmPassword";

    const hasConfirmPasswordValue =
      isConfirmPassword && confirmPasswordValue.length > 0;

    const confirmPasswordMatches =
      hasConfirmPasswordValue && confirmPasswordValue === passwordValue;

    const passwordStrength =
      field.name === "password" ? getPasswordStrength(fieldValue) : null;
    const passwordAutocomplete = getPasswordAutocomplete(field);

    const passwordRequirementResults =
      field.name === "password"
        ? getPasswordRequirementResults(fieldValue)
        : [];

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>

        <div className={styles.passwordInputWrap}>
          <input
            className={styles.input}
            type={isPasswordVisible ? "text" : "password"}
            placeholder={resolvedPlaceholder}
            value={fieldValue}
            onChange={(e) => setAnswer(field.name, e.target.value)}
            onPaste={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            onDrop={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            autoComplete={passwordAutocomplete}
            style={{ borderColor: theme.colors.border }}
          />

          <button
            type="button"
            className={styles.passwordToggleButton}
            onClick={onTogglePasswordVisibility}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>

        {field.name === "password" && passwordStrength ? (
          <div className={styles.passwordFeedbackStack}>
            <div
              className={`${styles.passwordStrength} ${
                passwordStrength.label === "Strong password"
                  ? styles.passwordStrengthStrong
                  : passwordStrength.label === "Medium password"
                    ? styles.passwordStrengthMedium
                    : styles.passwordStrengthWeak
              }`}
            >
              {passwordStrength.label}
            </div>

            {passwordRequirementResults.length ? (
              <ul className={styles.passwordRequirementList}>
                {passwordRequirementResults.map(
                  (item: { label: string; met: boolean }) => (
                    <li
                      key={item.label}
                      className={
                        item.met
                          ? styles.passwordRequirementMet
                          : styles.passwordRequirementMissing
                      }
                    >
                      {item.met ? "✓" : "•"} {item.label}
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </div>
        ) : null}

        {isConfirmPassword ? (
          <div className={styles.passwordFeedbackStack}>
            <div className={styles.authSlideHelpText}>
              Please type the password again instead of pasting.
            </div>

            {hasConfirmPasswordValue ? (
              <div
                className={
                  confirmPasswordMatches
                    ? styles.passwordMatchSuccess
                    : styles.passwordMatchError
                }
              >
                {confirmPasswordMatches
                  ? "✓ Passwords match."
                  : "Passwords do not match yet."}
              </div>
            ) : null}
          </div>
        ) : null}
        {fieldError}
      </div>
    );
  }

  return (
    <div style={fieldFrameStyle}>
      <label style={fieldLabelStyle}>{resolvedLabel}</label>
      <input
        className={styles.input}
        type={field.type}
        placeholder={resolvedPlaceholder}
        value={String(answers[field.name] ?? "")}
      onChange={(e) => setAnswer(field.name, e.target.value)}
      style={{ borderColor: theme.colors.border }}
    />
    {fieldError}
  </div>
);
}

function getPasswordAutocomplete(field: FormField) {
  const fieldName = String(field.name || "").toLowerCase();
  const label = String(field.label || "").toLowerCase();
  const placeholder = String(field.placeholder || "").toLowerCase();
  const combined = `${fieldName} ${label} ${placeholder}`;

  if (
    fieldName.includes("confirm") ||
    combined.includes("new password") ||
    combined.includes("create") ||
    combined.includes("confirm")
  ) {
    return "new-password";
  }

  return "current-password";
}
