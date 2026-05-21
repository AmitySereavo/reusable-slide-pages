import { Resend } from "resend";
import {
  buildDeliveryErrorResult,
  buildDeliverySuccessResult,
  normalizeProviderError,
} from "../result";

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendEmailVerificationWithResend({
  to,
  originalTo = to,
  rewritten = false,
  subject,
  text,
  html = null,
  from,
}) {
  const resend = getResendClient();

  const payload = {
    from,
    to,
    subject,
  };

  if (html) {
    payload.html = html;
  }

  if (text) {
    payload.text = text;
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    const normalized = normalizeProviderError(error);

    return buildDeliveryErrorResult({
      provider: "resend",
      channel: "email",
      mode: "resend",
      to,
      originalTo,
      rewritten,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });
  }

  return buildDeliverySuccessResult({
    provider: "resend",
    channel: "email",
    mode: "resend",
    to,
    originalTo,
    rewritten,
    providerMessageId: data?.id || null,
    status: "sent",
  });
}