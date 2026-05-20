export const AUTH_MESSAGES = {
  common: {
    serverError: "Server error",
    invalidIdentifier: "Enter a valid email or phone number.",
    identifierRequired: "Email or phone number is required.",
    identifierAndPasswordRequired: "Email or phone number and password are required.",
    identifierAndCodeRequired: "Identifier and code are required.",
    tooManyRequests: "Too many requests. Please try again later.",
  },

  signup: {
    userExists: "User already exists.",
    accountCreated: "Account created successfully.",
    accountNeedsVerification:
      "Account already exists but still needs verification. We sent a new verification code.",
    weakPassword: "Password does not meet the minimum requirements.",
  },

  login: {
    invalidCredentials: "Invalid credentials.",
    verifyEmailFirst: "Please verify your email before logging in.",
    verifyPhoneFirst: "Please verify your phone before logging in.",
    loginSuccess: "Login successful",
  },

  verification: {
    codeSent: "Verification code sent",
    noCodeFound: "No verification code found. Please request a new code.",
    codeExpired: "Code expired. Please request a new code.",
    invalidCode: "Invalid code. Please use the most recent code sent to you.",
    verificationSuccess: "Verification successful",
    verificationFailed: "Verification failed.",
    verifyingLink: "Verifying your link...",
    noMatchingRecord: "No matching user or lead found.",
    noSessionFound: "No verification session found. Please sign up or log in again.",
    noIdentifierForVerification: "No identifier found for verification.",
    incompleteCode: "Please enter the full verification code.",
    autoCodeSent: "A verification code has been sent.",
    resendCodeSent: "A new verification code has been sent.",
    autoLinkSent: "A verification link has been sent.",
    resendLinkSent: "A new verification link has been sent.",
    tooManyAttempts: "Too many incorrect attempts. Please request a new verification code.",

    tokenFlow: {
      initialMessage: "Click Verify to confirm your details.",
      subtitlePending: "Review this step, then click Verify to continue.",
      subtitleDone: "Your verification request has been processed.",
    },
  },

  lead: {
    leadExists: "You are already on the list.",
    leadCaptured: "Lead captured successfully.",
  },

  passwordReset: {
  requestAccepted:
    "If the account can be recovered through that channel, reset instructions have been sent.",
  emailLinkSentNeutral:
    "If an account matches that email, a reset link has been sent.",
  phoneCodeSentNeutral:
    "If an account matches that phone number, reset instructions have been processed.",
  codeSent: "A password reset code has been sent.",
  resendCooldown:
    "Please wait before requesting another password reset.",
  choosePhoneChannel: "Choose whether to receive the reset code by WhatsApp or SMS.",
  invalidCode: "Invalid reset code. Please use the most recent code sent to you.",
  codeExpired: "That reset code has expired. Please request a new one.",
  tooManyCodeAttempts: "Too many incorrect attempts. Please request a new code.",
  codeVerified: "Code verified. You can now reset your password.",
  passwordRequired: "Enter and confirm your new password.",
  passwordsDoNotMatch: "Passwords do not match.",
  invalidOrExpiredLink: "This reset link is invalid or has expired.",
  resetAccessRequired: "You need a valid reset link or verified reset code to continue.",
  passwordResetSuccess: "Password reset successful. Please log in.",
},
};