import { AUTH_RULES } from "../config/authRules";
import { isEmail, isPhone } from "./identifier";

function isIdentifier(value, minPhoneLength = AUTH_RULES.phone.minLength) {
  return isEmail(value) || isPhone(value, minPhoneLength);
}

export function validateField({ key, value, meta, settings, formData }) {
  const label = meta.label || key;
  const stringValue = typeof value === "string" ? value.trim() : value;

  if (settings.required) {
    if (meta.type === "checkbox") {
      // checkbox may remain unchecked unless required logic changes later
    } else if (
      value === undefined ||
      value === null ||
      stringValue === ""
    ) {
      return `${label} is required.`;
    }
  }

  if (
    (value === undefined || value === null || stringValue === "") &&
    !settings.required
  ) {
    return null;
  }

  const rules = {
    ...(meta.validation || {}),
    ...(settings.validation || {}),
  };

  if (rules.minLength && typeof stringValue === "string") {
    if (stringValue.length < rules.minLength) {
      return `${label} must be at least ${rules.minLength} characters.`;
    }
  }

  if (rules.maxLength && typeof stringValue === "string") {
    if (stringValue.length > rules.maxLength) {
      return `${label} must be no more than ${rules.maxLength} characters.`;
    }
  }

  if (rules.email && typeof stringValue === "string") {
    if (!isEmail(stringValue)) {
      return `Enter a valid email address.`;
    }
  }

  if (rules.phone && typeof stringValue === "string") {
    const minPhoneLength = rules.minPhoneLength || rules.minLength || AUTH_RULES.phone.minLength;

    if (!isPhone(stringValue, minPhoneLength)) {
      return `Enter a valid phone number.`;
    }
  }

  if (rules.identifier && typeof stringValue === "string") {
    const minPhoneLength = rules.minPhoneLength || AUTH_RULES.phone.minLength;

    if (!isIdentifier(stringValue, minPhoneLength)) {
      return `Enter a valid email or phone number.`;
    }
  }

  if (key === "confirmPassword") {
    if (stringValue !== formData.password) {
      return "Passwords do not match.";
    }
  }

  return null;
}

export function validateFormFields(visibleFields, formData) {
  for (const field of visibleFields) {
    const { key, settings, meta } = field;

    const error = validateField({
      key,
      value: formData[key],
      meta,
      settings,
      formData,
    });

    if (error) {
      return error;
    }
  }

  return null;
}