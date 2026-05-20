export const extendedProfileConfig = {
  mode: "profile-completion",
  target: "user",

  fields: {
    fullName: { visible: true, required: true },
    country: { visible: true, required: true },
    city: { visible: true, required: true },
    addressLine1: { visible: true, required: false },
    addressLine2: { visible: true, required: false },
    postalCode: { visible: true, required: false },
    idPhoto: { visible: true, required: false },
  },

  verification: {
    required: true,
    autoStart: false,
    method: "none",//same-as-identifier
    delivery: "code", // or "link"
    redirectToVerifyPage: false,
    expiresInMinutes: 15,
    expiresInHours: 24,
  },

  submit: {
    endpoint: "/api/profile/complete",
    successMessage: "Profile updated successfully.",
    successRedirect: null,
  },
};