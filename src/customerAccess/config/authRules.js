export const AUTH_RULES = {
  phone: {
    minLength: 10,
    maxLength: 20,
  },
    password: {
    minLength: 8,
    signupMinLength: 8,
    signupMaxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialCharacter: true,
    specialCharacterPattern: "[^A-Za-z0-9]",
    strength: {
      mediumScore: 3,
      strongScore: 5,
    },
  },
  verification: {
    codeLength: 6,
    resendCooldownSeconds: 60,
    defaultExpiryMinutes: 10,
    maxCodeAttempts: 5,
    enabledPhoneChannels: ["whatsapp"],
  },
  passwordReset: {
    resendCooldownSeconds: 60,
  },
  rateLimit: {
    signup: {
      limit: 8,
      windowSeconds: 15 * 60,
    },
    login: {
      limit: 10,
      windowSeconds: 10 * 60,
    },
    verificationStart: {
      limit: 8,
      windowSeconds: 10 * 60,
    },
    verificationCheck: {
      limit: 12,
      windowSeconds: 10 * 60,
    },
    passwordForgot: {
      limit: 5,
      windowSeconds: 15 * 60,
    },
    passwordVerifyCode: {
      limit: 10,
      windowSeconds: 10 * 60,
    },
    passwordReset: {
      limit: 5,
      windowSeconds: 15 * 60,
    },
  },
};