export type PasswordRequirementResult = {
  label: string;
  met: boolean;
};

export type PasswordStrengthResult = {
  label: "Weak password" | "Medium password" | "Strong password";
  score: number;
};

export function getPasswordRequirementResults(
  password: string
): PasswordRequirementResult[];

export function getPasswordStrength(password: string): PasswordStrengthResult;