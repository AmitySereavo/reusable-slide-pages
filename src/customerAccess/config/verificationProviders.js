export const verificationProviders = {
  email: {
    mode:
      process.env.EMAIL_PROVIDER_MODE ||
      (process.env.SMTP_HOST
        ? "smtp"
        : process.env.RESEND_API_KEY
          ? "resend"
          : "console"),

    from:
      process.env.SMTP_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "no-reply@example.com",

    devTestMode:
      process.env.EMAIL_DEV_TEST_MODE === "true" ||
      (process.env.NODE_ENV !== "production" &&
        process.env.EMAIL_DEV_TEST_MODE !== "false"),

    devTestInbox:
      process.env.EMAIL_DEV_TEST_INBOX ||
      process.env.RESEND_DEV_TEST_EMAIL ||
      "delivered@resend.dev",

    smtp: {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  },

  sms: {
    mode: process.env.TWILIO_ACCOUNT_SID ? "twilio" : "console",
    from: process.env.TWILIO_SMS_FROM || null,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || null,
  },

  whatsapp: {
    mode: process.env.WHATSAPP_ACCESS_TOKEN ? "meta" : "console",
    messageMode: process.env.WHATSAPP_MESSAGE_MODE || "text",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    from: process.env.WHATSAPP_FROM || null,
    templateName: process.env.WHATSAPP_AUTH_TEMPLATE_NAME || "",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
  },
};