export const forgotPasswordConfig = {
  mode: "forgot-password",
  target: "passwordReset",

  fields: {
    identifier: {
      visible: true,
      required: true,
      helpText: "If using a phone number, include country code and area code.",
    },
  },

  verification: {
    promptForPhoneChannel: true,
    defaultPhoneChannel: "whatsapp",
  },

  submit: {
    buttonLabel: "Send reset instructions",
  },
};