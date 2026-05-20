import { AUTH_RULES } from "./authRules";

export const loginConfig = {
  mode: "login",
  target: "user",
  fields: {
    identifier: {
      visible: true,
      required: true,
      label: "Email or phone",
      placeholder: "Enter your email or phone",
      helpText: "If using a phone number, include country code and area code.",
      validation: {
        identifier: true,
        minPhoneLength: AUTH_RULES.phone.minLength,
      },
    },
    password: {
      visible: true,
      required: true,
      label: "Password",
      placeholder: "Enter your password",
    },
  },
  submit: {
    buttonLabel: "Log In",
  },
};