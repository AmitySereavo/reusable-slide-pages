import nodemailer from "nodemailer";
import {
  buildDeliveryErrorResult,
  buildDeliverySuccessResult,
  normalizeProviderError,
} from "../result";

function createSmtpTransporter(config) {
  if (!config?.host) {
    throw new Error("Missing SMTP_HOST.");
  }

  if (!config?.user) {
    throw new Error("Missing SMTP_USER.");
  }

  if (!config?.pass) {
    throw new Error("Missing SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port || 587),
    secure: config.secure === true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendEmailVerificationWithSmtp({
  to,
  originalTo = to,
  rewritten = false,
  from,
  subject,
  text,
  html,
  smtp,
}) {
  try {
    const transporter = createSmtpTransporter(smtp);

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || undefined,
    });

    return buildDeliverySuccessResult({
      provider: "smtp",
      channel: "email",
      mode: "smtp",
      to,
      originalTo,
      rewritten,
      providerMessageId: info?.messageId || null,
      status: "sent",
    });
  } catch (error) {
    const normalized = normalizeProviderError(error);

    return buildDeliveryErrorResult({
      provider: "smtp",
      channel: "email",
      mode: "smtp",
      to,
      originalTo,
      rewritten,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });
  }
}