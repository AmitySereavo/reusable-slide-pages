import { AUTH_RULES } from "../config/authRules";

export function getPasswordPolicy() {
  return AUTH_RULES.password || {};
}

export function getPasswordRequirementResults(password, policy = getPasswordPolicy()) {
  const value = String(password || "");
  const specialCharacterRegex = new RegExp(
    policy.specialCharacterPattern || "[^A-Za-z0-9]"
  );

  return [
    {
      key: "minLength",
      label: `At least ${policy.signupMinLength || policy.minLength || 8} characters`,
      met: value.length >= (policy.signupMinLength || policy.minLength || 8),
      required: true,
    },
    {
      key: "maxLength",
      label: `No more than ${policy.signupMaxLength || 128} characters`,
      met: value.length <= (policy.signupMaxLength || 128),
      required: true,
    },
    {
      key: "uppercase",
      label: "At least one uppercase letter",
      met: /[A-Z]/.test(value),
      required: policy.requireUppercase === true,
    },
    {
      key: "lowercase",
      label: "At least one lowercase letter",
      met: /[a-z]/.test(value),
      required: policy.requireLowercase === true,
    },
    {
      key: "number",
      label: "At least one number",
      met: /[0-9]/.test(value),
      required: policy.requireNumber === true,
    },
    {
      key: "specialCharacter",
      label: "At least one special character",
      met: specialCharacterRegex.test(value),
      required: policy.requireSpecialCharacter === true,
    },
  ].filter((rule) => rule.required);
}

export function validatePasswordPolicy(password, policy = getPasswordPolicy()) {
  const failed = getPasswordRequirementResults(password, policy).filter(
    (rule) => !rule.met
  );

  if (!failed.length) {
    return null;
  }

  return `Password must include: ${failed.map((rule) => rule.label).join(", ")}.`;
}

export function getPasswordStrength(password, policy = getPasswordPolicy()) {
  const value = String(password || "");

  if (!value) {
    return {
      label: "",
      score: 0,
      level: "empty",
      requirements: getPasswordRequirementResults(value, policy),
    };
  }

  const requirements = getPasswordRequirementResults(value, policy);
  const metCount = requirements.filter((rule) => rule.met).length;
  const lengthBonus = value.length >= 12 ? 1 : 0;
  const score = metCount + lengthBonus;

  const mediumScore = policy.strength?.mediumScore || 3;
  const strongScore = policy.strength?.strongScore || 5;

  if (score >= strongScore) {
    return {
      label: "Strong password",
      score,
      level: "strong",
      requirements,
    };
  }

  if (score >= mediumScore) {
    return {
      label: "Medium password",
      score,
      level: "medium",
      requirements,
    };
  }

  return {
    label: "Weak password",
    score,
    level: "weak",
    requirements,
  };
}