import { AUTH_RULES } from "./authRules";

export const accountSignupConfig = {
  mode: "account-signup",
  target: "user",

  fields: {
    fullName: { visible: true, required: true },
    identifier: {
      visible: true,
      required: true,
      helpText: "If using a phone number, include country code and area code.",
      validation: {
        identifier: true,
        minPhoneLength: AUTH_RULES.phone.minLength,
      },
    },
    password: {
      visible: true,
      required: true,
      placeholder: "Create a password",
      validation: {
        minLength: AUTH_RULES.password.signupMinLength,
        maxLength: AUTH_RULES.password.signupMaxLength,
      },
      helpText: `Minimum ${AUTH_RULES.password.signupMinLength} characters`,
    },
    
    confirmPassword: {
      visible: true,
      required: true,
    },
    country: { visible: true, required: false },
    city: { visible: true, required: false },
  },

  verification: {
    required: true,
    autoStart: true,
    method: "same-as-identifier",
    delivery: "code",
    redirectToVerifyPage: true,
    successRedirect: "/verify/verified-lead",
    verifiedContentRedirect: "/verify/verified-lead",
    expiresInMinutes: 15,
    expiresInHours: 24,
    promptForPhoneChannel: true,
    defaultPhoneChannel: "whatsapp",
        phoneChannelOptions: [
      {
        value: "whatsapp",
        label: "WhatsApp",
        disabled: false,
      },
      {
        value: "sms",
        label: "SMS",
        disabled: true,
        disabledReason: "SMS verification is not available.",
      },
    ],
    phoneChannelLabel: "Send verification by",
  },

  submit: {
    endpoint: "/api/signup",
    buttonLabel: "Create Account",
    successMessage: "Account created successfully.",
    successRedirect: null,
    redirectDelayMs: 1200,
  },
};