export const quickLeadConfig = {
  mode: "lead-capture",
  target: "lead",

  fields: {
    fullName: { visible: true, required: true },
    identifier: { visible: true, required: true, allow: ["email", "phone"],helpText: "If using a phone number, include country code and area code.", },
    updatesOptIn: { visible: true, required: false, defaultValue: true },
  },

  verification: {
    required: true,
    autoStart: true,
    method: "same-as-identifier",
    delivery: "link",
    redirectToVerifyPage: false,
    successRedirect: "/verify/verified-lead",
    verifiedContentRedirect: "/verify/verified-lead",
    expiresInMinutes: 15,
    expiresInHours: 24,
    promptForPhoneChannel: true,
    defaultPhoneChannel: "whatsapp",
    phoneChannelOptions: ["whatsapp", "sms"],
    phoneChannelLabel: "Send verification by",
  },

  submit: {
    endpoint: "/api/capture/lead",
    buttonLabel: "Join List",
    successMessage: "Your info was submitted.",
    successRedirect: "/verify/link-sent",
    redirectDelayMs: 1200,
  },
};