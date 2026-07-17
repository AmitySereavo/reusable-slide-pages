export const PERMANENT_WEBSITE_OP_TAG = "Permanent Website Op";

export const permanentWebsiteOperationSequences = [
  {
    sequenceKey: "website-op-user-code-email",
    name: "Website Op - Verify account code",
    description: "Operational auth email for account verification codes.",
    triggerEvent: "website_operation",
    stepKey: "user-code-email",
    subject: "Verify your account",
    bodyText:
      "Use this verification code to finish setting up your account: {{code}}",
  },
  {
    sequenceKey: "website-op-user-link-email",
    name: "Website Op - Verify account link",
    description: "Operational auth email for account verification links.",
    triggerEvent: "website_operation",
    stepKey: "user-link-email",
    subject: "Verify your account",
    bodyText:
      "Use this link to finish setting up your account: {{verifyUrl}}",
  },
  {
    sequenceKey: "website-op-password-reset-code-email",
    name: "Website Op - Password reset code",
    description: "Operational auth email for password reset codes.",
    triggerEvent: "website_operation",
    stepKey: "password-reset-code-email",
    subject: "Your password reset code",
    bodyText: "Use this code to continue resetting your password: {{code}}",
  },
  {
    sequenceKey: "website-op-password-reset-link-email",
    name: "Website Op - Password reset link",
    description: "Operational auth email for password reset links.",
    triggerEvent: "website_operation",
    stepKey: "password-reset-link-email",
    subject: "Reset your password",
    bodyText: "Use this link to reset your password: {{verifyUrl}}",
  },
  {
    sequenceKey: "website-op-account-email-update-code-email",
    name: "Website Op - Account email update code",
    description: "Operational auth email for confirming a new account email address.",
    triggerEvent: "website_operation",
    stepKey: "account-email-update-code-email",
    subject: "Confirm your new email address",
    bodyText:
      "Use this code to confirm your new email address: {{code}}\n\nIf you did not request this, do not share this code.",
  },
  {
    sequenceKey: "website-op-account-deletion-code-email",
    name: "Website Op - Account deletion code",
    description: "Operational auth email for account deletion confirmation codes.",
    triggerEvent: "website_operation",
    stepKey: "account-deletion-code-email",
    subject: "Confirm account deletion",
    bodyText:
      "Use this account deletion code to confirm deleting your account: {{code}}\n\nIf you did not request this, do not share this code.",
  },
  {
    sequenceKey: "website-op-account-deletion-link-email",
    name: "Website Op - Account deletion link",
    description: "Operational auth email for account deletion confirmation links.",
    triggerEvent: "website_operation",
    stepKey: "account-deletion-link-email",
    subject: "Confirm account deletion",
    bodyText:
      "Use this link to confirm deleting your account: {{verifyUrl}}\n\nIf you did not request this, do not click this link.",
  },
  {
    sequenceKey: "website-op-lead-code-email",
    name: "Website Op - Lead confirmation code",
    description: "Operational email for lead confirmation codes.",
    triggerEvent: "website_operation",
    stepKey: "lead-code-email",
    subject: "Confirm your details",
    bodyText:
      "Please confirm your details using this verification code: {{code}}",
  },
  {
    sequenceKey: "website-op-lead-link-email",
    name: "Website Op - Lead confirmation link",
    description: "Operational email for lead confirmation links.",
    triggerEvent: "website_operation",
    stepKey: "lead-link-email",
    subject: "Confirm your details",
    bodyText: "Please confirm your details using this link: {{verifyUrl}}",
  },
  {
    sequenceKey: "website-op-default-code-email",
    name: "Website Op - Default verification code",
    description: "Fallback operational email for verification codes.",
    triggerEvent: "website_operation",
    stepKey: "default-code-email",
    subject: "Your verification code",
    bodyText: "Your verification code is: {{code}}",
  },
  {
    sequenceKey: "website-op-default-link-email",
    name: "Website Op - Default verification link",
    description: "Fallback operational email for verification links.",
    triggerEvent: "website_operation",
    stepKey: "default-link-email",
    subject: "Verify your details",
    bodyText: "Use this link to verify your details: {{verifyUrl}}",
  },
  {
    sequenceKey: "website-op-purchase-recipient-invite-link-email",
    name: "Website Op - Purchase recipient invite",
    description: "Operational email for verified purchase recipient invites.",
    triggerEvent: "website_operation",
    stepKey: "purchase-recipient-invite-link-email",
    subject: "{{purchaserName}} wants to add you as a purchase recipient",
    bodyText:
      "Hi {{recipientName}},\n\n{{purchaserName}} wants to add you to their verified recipient list so they can buy selected items for you.\n\nConfirm or correct your details here: {{verifyUrl}}\n\nOnly after you accept can they select your name while purchasing in the store.",
  },
  {
    sequenceKey: "website-op-ticket-owner-access-link-email",
    name: "Website Op - Ticket owner access",
    description: "Operational email for ticket owner access links.",
    triggerEvent: "website_operation",
    stepKey: "ticket-owner-access-link-email",
    subject: "Your ticket access link",
    bodyText:
      "Hi {{recipientName}},\n\nYou have ticket access for the event.\n\n{{ticketSummary}}\n\nUse this private link to view your ticket and meal details: {{verifyUrl}}\n\nLogin URL: {{loginUrl}}\nTemporary password: {{temporaryPassword}}",
  },
  {
    sequenceKey: "website-op-escape-album-access-link-email",
    name: "Website Op - Escape album access",
    description: "Operational email for Escape album access links.",
    triggerEvent: "website_operation",
    stepKey: "escape-album-access-link-email",
    subject: "Your Escape album access",
    bodyText:
      "Hi {{recipientName}},\n\nYour Escape album access is ready.\n\nOpen the album here: {{verifyUrl}}\n\nLogin URL: {{loginUrl}}\nTemporary password: {{temporaryPassword}}",
  },
  {
    sequenceKey: "website-op-gated-lead-access-link-email",
    name: "Website Op - Private video link",
    description: "Operational email for gated lead/private video access.",
    triggerEvent: "website_operation",
    stepKey: "gated-lead-access-link-email",
    subject: "Your private video link",
    bodyText:
      "Hi {{recipientName}},\n\nUse this private link to continue watching: {{verifyUrl}}",
  },
  {
    sequenceKey: "website-op-mailing-address-update-link-email",
    name: "Website Op - Mailing address update request",
    description:
      "Operational email for requesting updated mailing details for a physical order.",
    triggerEvent: "website_operation",
    stepKey: "mailing-address-update-link-email",
    subject: "Please update your mailing address for order {{orderNumber}}",
    bodyText:
      "Hi {{recipientName}},\n\nWe need you to confirm or update your mailing address so we can fulfill this physical order.\n\nOrder number: {{orderNumber}}\nOrder details: {{orderDetails}}\n\nUpdate your account details here: {{verifyUrl}}\n\nAfter your mailing address is updated, our team can continue processing the order.",
  },
];

export function getWebsiteOperationEmailTemplate(sequenceKey) {
  return (
    permanentWebsiteOperationSequences.find(
      (template) => template.sequenceKey === sequenceKey
    ) || null
  );
}
