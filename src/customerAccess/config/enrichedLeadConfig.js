export const enrichedLeadConfig = {
  mode: "lead-capture",
  target: "lead",

  fields: {
    fullName: { visible: true, required: true },
    identifier: { visible: true, required: true, allow: ["email", "phone"],helpText: "If using a phone number, include country code and area code.", },
    country: { visible: true, required: false },
    city: { visible: true, required: false },
    preferredContactMethod: { visible: true, required: false },
    updatesOptIn: { visible: true, required: false },
  },

  verification: {
    required: true,
    autoStart: true,
    method: "same-as-identifier",
    delivery: "code", // or "link"
    redirectToVerifyPage: true,
    expiresInMinutes: 15,
    expiresInHours: 24,
  },

  submit: {
  endpoint: "/api/profile/complete",
  successMessage: "Profile updated successfully.",
  successRedirect: null,
  buttonLabel: "Save Profile",
},
};