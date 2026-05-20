import { AUTH_RULES } from "../config/authRules";

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

export function normalizePhone(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const hasLeadingPlus = raw.startsWith("+");
  const digitsOnly = raw.replace(/\D/g, "");

  if (!digitsOnly) return "";

  if (hasLeadingPlus) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

export function isPhone(value, minLength = AUTH_RULES.phone.minLength) {
  const normalized = normalizePhone(value);
  const digitCount = normalized.replace(/\D/g, "").length;
  return digitCount >= minLength;
}

export function parseIdentifier(
  rawIdentifier,
  minPhoneLength = AUTH_RULES.phone.minLength
) {
  const trimmed = String(rawIdentifier || "").trim();

  if (!trimmed) {
    return {
      valid: false,
      email: null,
      phone: null,
      normalizedIdentifier: "",
      type: null,
    };
  }

  if (isEmail(trimmed)) {
    const email = normalizeEmail(trimmed);

    return {
      valid: true,
      email,
      phone: null,
      normalizedIdentifier: email,
      type: "email",
    };
  }

  const phone = normalizePhone(trimmed);

  if (isPhone(phone, minPhoneLength)) {
    return {
      valid: true,
      email: null,
      phone,
      normalizedIdentifier: phone,
      type: "phone",
    };
  }

  return {
    valid: false,
    email: null,
    phone: null,
    normalizedIdentifier: trimmed,
    type: null,
  };
}