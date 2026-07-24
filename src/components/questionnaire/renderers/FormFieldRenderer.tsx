"use client";

import type {
  FormField,
  QuestionnaireAnswers,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ThemeConfig,
} from "@/types/questionnaire";
import {
  getPasswordRequirementResults,
  getPasswordStrength,
} from "@/customerAccess/utils/passwordPolicy";
import { replaceDynamicText } from "@/lib/questionnaire/dynamicText";
import styles from "../QuestionnaireShell.module.css";

type FormFieldRendererProps = {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  variables?: QuestionnaireVariableMap;
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
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

export default function FormFieldRenderer({
  field,
  theme,
  answers,
  variables,
  setAnswer,
  isPasswordVisible,
  onTogglePasswordVisibility,
}: FormFieldRendererProps) {
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

  if (field.type === "checkbox") {
    return (
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={Boolean(answers[field.name] ?? false)}
          onChange={(e) => setAnswer(field.name, e.target.checked)}
        />
        {resolvedLabel}
      </label>
    );
  }

  if (field.type === "info") {
    return (
      <div className={styles.fieldInfoPanel}>
        <strong>{resolvedLabel}</strong>
        {resolvedPlaceholder ? (
          <span>{renderInlineLinks(resolvedPlaceholder)}</span>
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
            autoComplete="new-password"
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
    </div>
  );
}
