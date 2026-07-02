import { verificationProviders } from "@/customerAccess/config/verificationProviders";
import { verificationContent } from "@/customerAccess/config/verificationContent";
import { prisma } from "@/lib/prisma";
import { sendSmsVerification } from "./providers/smsConsole";
import { sendSmsVerificationWithTwilio } from "./providers/smsTwilio";
import { sendWhatsAppVerificationWithMeta } from "./providers/whatsappMeta";
import { createVerificationDeliveryAttempt } from "./audit";
import { buildDeliveryErrorResult, normalizeProviderError } from "./result";
import { sendEmailMessage } from "./emailMessage";
import {
  PERMANENT_WEBSITE_OP_TAG,
  getWebsiteOperationEmailTemplate,
} from "./websiteOperationEmailTemplates";

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

function toKebabKey(value) {
  return String(value || "default")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderTemplate(value, context) {
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const parts = String(key).split(".");
    let current = context;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        return "";
      }

      current = current[part];
    }

    return current == null ? "" : String(current);
  });
}

function buildHtmlFromText(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

async function getOperationalEmailContent({
  delivery,
  channel,
  target = null,
  contentContext,
}) {
  if (channel !== "email") {
    return null;
  }

  const sequenceKey = `website-op-${toKebabKey(target)}-${delivery}-email`;
  const fallbackSequenceKey = `website-op-default-${delivery}-email`;
  const defaultTemplate =
    getWebsiteOperationEmailTemplate(sequenceKey) ||
    getWebsiteOperationEmailTemplate(fallbackSequenceKey);

  try {
    const sequence = await prisma.emailSequence.findUnique({
      where: { sequenceKey },
      include: {
        steps: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });

    const metadata = sequence?.metadata || {};
    const step =
      metadata.systemTag === PERMANENT_WEBSITE_OP_TAG ? sequence?.steps?.[0] : null;
    const subjectTemplate =
      String(step?.subject || "").trim() || defaultTemplate?.subject || "";
    const bodyTemplate =
      String(step?.bodyText || "").trim() || defaultTemplate?.bodyText || "";

    if (!subjectTemplate || !bodyTemplate) {
      throw new Error(`Missing website operation email template: ${sequenceKey}`);
    }

    const text = renderTemplate(bodyTemplate, contentContext);

    return {
      subject: renderTemplate(subjectTemplate, contentContext),
      text,
      html: buildHtmlFromText(text),
    };
  } catch (error) {
    console.warn("Operational email template lookup failed.", error);

    if (!defaultTemplate) {
      throw error;
    }

    const text = renderTemplate(defaultTemplate.bodyText, contentContext);

    return {
      subject: renderTemplate(defaultTemplate.subject, contentContext),
      text,
      html: buildHtmlFromText(text),
    };
  }
}

async function getResolvedContent({
  identifier,
  delivery,
  phoneChannel = null,
  code = null,
  verifyUrl = null,
  target = null,
  contextMetadata = null,
}) {
  const channel = resolveChannel({ identifier, phoneChannel });
  const contentContext = {
    code,
    verifyUrl,
    target,
    ...(contextMetadata && typeof contextMetadata === "object"
      ? contextMetadata
      : {}),
  };
  const operationalContent = await getOperationalEmailContent({
    delivery,
    channel,
    target,
    contentContext,
  });

  if (operationalContent) {
    return {
      channel,
      ...operationalContent,
    };
  }

  const config = resolveContentConfig({
    delivery,
    channel,
    target,
  });

  return {
    channel,
    subject:
      typeof config.subject === "function"
        ? config.subject(contentContext)
        : config.subject || null,
    text: config.getText(contentContext),
    html: config.getHtml ? config.getHtml(contentContext) : null,
  };
}

async function sendEmailViaProvider({
  identifier,
  subject,
  text,
  html,
  target = null,
  delivery = null,
  contextMetadata = null,
}) {
  return sendEmailMessage({
    to: identifier,
    subject,
    text,
    html,
    purpose:
      contextMetadata?.purpose ||
      [target, delivery].filter(Boolean).join(":") ||
      "verification-delivery",
  });
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

  const content = await getResolvedContent({
    identifier,
    delivery,
    phoneChannel,
    code,
    verifyUrl,
    target,
    contextMetadata,
  });

  const provider = getProviderForChannel(content.channel);

  try {
    const result =
      content.channel === "email"
        ? await sendEmailViaProvider({
            identifier,
            subject: content.subject,
            text: content.text,
            html: content.html,
            target,
            delivery,
            contextMetadata,
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
