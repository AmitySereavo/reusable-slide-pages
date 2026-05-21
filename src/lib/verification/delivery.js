import { verificationProviders } from "@/customerAccess/config/verificationProviders";
import { verificationContent } from "@/customerAccess/config/verificationContent";
import { sendEmailVerification } from "./providers/emailConsole";
import { sendEmailVerificationWithResend } from "./providers/emailResend";
import { sendEmailVerificationWithSmtp } from "./providers/emailSmtp";
import { sendSmsVerification } from "./providers/smsConsole";
import { sendSmsVerificationWithTwilio } from "./providers/smsTwilio";
import { sendWhatsAppVerificationWithMeta } from "./providers/whatsappMeta";
import { createVerificationDeliveryAttempt } from "./audit";
import { buildDeliveryErrorResult, normalizeProviderError } from "./result";

function isEmailIdentifier(identifier) {
  return typeof identifier === "string" && identifier.includes("@");
}

function resolveChannel({ identifier, phoneChannel = null }) {
  if (isEmailIdentifier(identifier)) {
    return "email";
  }

  if (phoneChannel === "whatsapp") {
    return "whatsapp";
  }

  return "sms";
}

function getProviderForChannel(channel) {
  if (channel === "email") {
    return verificationProviders.email;
  }

  if (channel === "sms") {
    return verificationProviders.sms;
  }

  if (channel === "whatsapp") {
    return verificationProviders.whatsapp || {
      mode: "console",
      from: null,
    };
  }

  throw new Error(`Unsupported verification channel: ${channel}`);
}

function resolveContentConfig({ delivery, channel, target = null }) {
  const targetConfig =
    target &&
    verificationContent?.targets?.[target]?.[delivery]?.[channel];

  if (targetConfig) {
    return targetConfig;
  }

  const defaultConfig = verificationContent?.defaults?.[delivery]?.[channel];

  if (defaultConfig) {
    return defaultConfig;
  }

  throw new Error(
    `Missing verification content config for target=${target || "default"}, delivery=${delivery}, channel=${channel}`
  );
}

function getResolvedContent({
  identifier,
  delivery,
  phoneChannel = null,
  code = null,
  verifyUrl = null,
  target = null,
}) {
  const channel = resolveChannel({ identifier, phoneChannel });
  const config = resolveContentConfig({
    delivery,
    channel,
    target,
  });

  return {
    channel,
    subject: config.subject || null,
    text: config.getText({ code, verifyUrl, target }),
    html: config.getHtml ? config.getHtml({ code, verifyUrl, target }) : null,
  };
}

function isResendTestInbox(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@resend.dev");
}

function resolveDevSafeEmailRecipient(provider, identifier) {
  if (!provider.devTestMode) {
    return {
      to: identifier,
      rewritten: false,
      originalTo: identifier,
    };
  }

  if (isResendTestInbox(identifier)) {
    return {
      to: identifier,
      rewritten: false,
      originalTo: identifier,
    };
  }

  return {
    to: provider.devTestInbox,
    rewritten: true,
    originalTo: identifier,
  };
}

async function sendEmailViaProvider({
  provider,
  identifier,
  subject,
  text,
  html,
}) {
  if (provider.mode === "console") {
    return sendEmailVerification({
      to: identifier,
      originalTo: identifier,
      rewritten: false,
      from: provider.from,
      subject,
      text,
      html,
    });
  }

  if (provider.mode === "resend") {
    const recipient = resolveDevSafeEmailRecipient(provider, identifier);

    const finalText = recipient.rewritten
      ? `[DEV TEST MODE] Original recipient: ${recipient.originalTo}\n\n${text}`
      : text;

    const finalHtml =
      recipient.rewritten && html
        ? `<p><strong>[DEV TEST MODE]</strong> Original recipient: ${recipient.originalTo}</p>${html}`
        : html;

    return sendEmailVerificationWithResend({
      to: recipient.to,
      originalTo: recipient.originalTo,
      rewritten: recipient.rewritten,
      from: provider.from,
      subject,
      text: finalText,
      html: finalHtml,
    });
  }

  if (provider.mode === "smtp") {
    const recipient = resolveDevSafeEmailRecipient(provider, identifier);

    const finalText = recipient.rewritten
      ? `[DEV TEST MODE] Original recipient: ${recipient.originalTo}\n\n${text}`
      : text;

    const finalHtml =
      recipient.rewritten && html
        ? `<p><strong>[DEV TEST MODE]</strong> Original recipient: ${recipient.originalTo}</p>${html}`
        : html;

    return sendEmailVerificationWithSmtp({
      to: recipient.to,
      originalTo: recipient.originalTo,
      rewritten: recipient.rewritten,
      from: provider.from,
      subject,
      text: finalText,
      html: finalHtml,
      smtp: provider.smtp,
    });
  }

  throw new Error(`Unsupported email provider mode: ${provider.mode}`);
}

async function sendSmsLikeViaProvider({
  provider,
  identifier,
  text,
  channel,
  code = null,
  verifyUrl = null,
}) {
  if (provider.mode === "console") {
    return sendSmsVerification({
      to: identifier,
      originalTo: identifier,
      rewritten: false,
      from: provider.from,
      text: channel === "whatsapp" ? `[WhatsApp] ${text}` : text,
      channel,
      provider: channel === "whatsapp" ? "whatsapp-console" : "sms-console",
      mode: "console",
    });
  }

    if (channel === "sms" && provider.mode === "twilio") {
    const twilioResult = await sendSmsVerificationWithTwilio({
      to: identifier,
      originalTo: identifier,
      rewritten: false,
      from: provider.from,
      messagingServiceSid: provider.messagingServiceSid || null,
      text,
    });

    if (
      !twilioResult.ok &&
      process.env.NODE_ENV !== "production"
    ) {
      console.warn(
        "Twilio SMS failed in development. Falling back to console simulation.",
        twilioResult.error
      );

      return sendSmsVerification({
        to: identifier,
        originalTo: identifier,
        rewritten: false,
        from: provider.from,
        text: `[DEV FALLBACK AFTER TWILIO ERROR]\n${text}`,
        channel: "sms",
        provider: "sms-console",
        mode: "console",
      });
    }

    return twilioResult;
  }

  if (channel === "whatsapp" && provider.mode === "meta") {
    return sendWhatsAppVerificationWithMeta({
      to: identifier,
      originalTo: identifier,
      rewritten: false,
      text,
      code,
      verifyUrl,
      messageMode: provider.messageMode,
      templateName: provider.templateName,
      templateLanguage: provider.templateLanguage,
    });
  }

  throw new Error(`Unsupported ${channel} provider mode: ${provider.mode}`);
}

function getFallbackProviderName({ channel, provider }) {
    if (channel === "email") {
    if (provider.mode === "resend") return "resend";
    if (provider.mode === "smtp") return "smtp";
    return "email-console";
  }
  if (channel === "sms") {
    return provider.mode === "twilio" ? "twilio" : "sms-console";
  }

  if (channel === "whatsapp") {
    return provider.mode === "meta"
      ? "meta-whatsapp"
      : "whatsapp-console";
  }

  return "unknown";
}

export async function sendVerificationDelivery({
  identifier,
  delivery,
  phoneChannel = null,
  code = null,
  verifyUrl = null,
  target = null,
  successRedirect = null,
  verificationCodeId = null,
  verificationTokenId = null,
  contextMetadata = null,
}) {
  if (delivery === "code" && !code) {
    throw new Error("Missing verification code for code delivery.");
  }

  if (delivery === "link" && !verifyUrl) {
    throw new Error("Missing verification URL for link delivery.");
  }

  const content = getResolvedContent({
    identifier,
    delivery,
    phoneChannel,
    code,
    verifyUrl,
    target,
  });

  const provider = getProviderForChannel(content.channel);

  try {
    const result =
      content.channel === "email"
        ? await sendEmailViaProvider({
            provider,
            identifier,
            subject: content.subject,
            text: content.text,
            html: content.html,
          })
          : await sendSmsLikeViaProvider({
            provider,
            identifier,
            text: content.text,
            channel: content.channel,
            code,
            verifyUrl,
          });

    await createVerificationDeliveryAttempt({
      identifier,
      delivery,
      target,
      successRedirect,
      verificationCodeId,
      verificationTokenId,
      result,
      contextMetadata: {
        ...(contextMetadata || {}),
        contentChannel: content.channel,
        requestedPhoneChannel: phoneChannel,
      },
    });

    return result;
  } catch (error) {
    const normalized = normalizeProviderError(error);

    const errorResult = buildDeliveryErrorResult({
      provider: getFallbackProviderName({
        channel: content.channel,
        provider,
      }),
      channel: content.channel,
      mode: provider.mode,
      to: identifier,
      originalTo: identifier,
      rewritten: false,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });

    await createVerificationDeliveryAttempt({
      identifier,
      delivery,
      target,
      successRedirect,
      verificationCodeId,
      verificationTokenId,
      result: errorResult,
      contextMetadata: {
        ...(contextMetadata || {}),
        contentChannel: content.channel,
        requestedPhoneChannel: phoneChannel,
        exception: true,
      },
    });

    return errorResult;
  }
}