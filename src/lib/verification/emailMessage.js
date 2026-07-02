import { verificationProviders } from "@/customerAccess/config/verificationProviders";
import { sendEmailVerificationWithResend } from "@/lib/verification/providers/emailResend";
import { sendEmailVerificationWithSmtp } from "@/lib/verification/providers/emailSmtp";
import {
  buildDeliveryErrorResult,
  buildDeliverySuccessResult,
  normalizeProviderError,
} from "@/lib/verification/result";

function isResendTestInbox(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@resend.dev");
}

function resolveDevSafeEmailRecipient(provider, to) {
  if (!provider.devTestMode) {
    return {
      to,
      originalTo: to,
      rewritten: false,
    };
  }

  if (isResendTestInbox(to)) {
    return {
      to,
      originalTo: to,
      rewritten: false,
    };
  }

  return {
    to: provider.devTestInbox,
    originalTo: to,
    rewritten: true,
  };
}

function buildFrom({ provider, fromEmail, fromName }) {
  const from = fromEmail || provider.from;

  if (!fromName || !from) {
    return from;
  }

  return `${fromName} <${from}>`;
}

function withDevRewrite({ recipient, text, html }) {
  if (!recipient.rewritten) {
    return { text, html };
  }

  return {
    text: `[DEV TEST MODE] Original recipient: ${recipient.originalTo}\n\n${text || ""}`,
    html: html
      ? `<p><strong>[DEV TEST MODE]</strong> Original recipient: ${recipient.originalTo}</p>${html}`
      : null,
  };
}

async function sendConsoleEmail({
  to,
  originalTo,
  rewritten,
  from,
  replyTo,
  subject,
  text,
  html,
  purpose,
}) {
  console.log("EMAIL MESSAGE");
  console.log({
    to,
    originalTo,
    rewritten,
    from,
    replyTo,
    subject,
    text,
    html,
    purpose,
  });

  return buildDeliverySuccessResult({
    provider: "email-console",
    channel: "email",
    mode: "console",
    to,
    originalTo,
    rewritten,
    providerMessageId: null,
    status: "simulated",
  });
}

export async function sendEmailMessage({
  to,
  subject,
  text,
  html = null,
  fromEmail = null,
  fromName = null,
  replyTo = null,
  purpose = "email-message",
}) {
  const provider = verificationProviders.email;
  const recipient = resolveDevSafeEmailRecipient(provider, to);
  const from = buildFrom({ provider, fromEmail, fromName });
  const rewrittenContent = withDevRewrite({ recipient, text, html });

  try {
    if (provider.mode === "console") {
      return sendConsoleEmail({
        to: recipient.to,
        originalTo: recipient.originalTo,
        rewritten: recipient.rewritten,
        from,
        replyTo,
        subject,
        text: rewrittenContent.text,
        html: rewrittenContent.html,
        purpose,
      });
    }

    if (provider.mode === "resend") {
      return sendEmailVerificationWithResend({
        to: recipient.to,
        originalTo: recipient.originalTo,
        rewritten: recipient.rewritten,
        from,
        subject,
        text: rewrittenContent.text,
        html: rewrittenContent.html,
      });
    }

    if (provider.mode === "smtp") {
      return sendEmailVerificationWithSmtp({
        to: recipient.to,
        originalTo: recipient.originalTo,
        rewritten: recipient.rewritten,
        from,
        subject,
        text: rewrittenContent.text,
        html: rewrittenContent.html,
        smtp: provider.smtp,
      });
    }

    throw new Error(`Unsupported email provider mode: ${provider.mode}`);
  } catch (error) {
    const normalized = normalizeProviderError(error);

    return buildDeliveryErrorResult({
      provider: provider.mode || "email",
      channel: "email",
      mode: provider.mode || "unknown",
      to: recipient.to,
      originalTo: recipient.originalTo,
      rewritten: recipient.rewritten,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });
  }
}
