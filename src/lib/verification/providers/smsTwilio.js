import twilio from "twilio";
import {
  buildDeliveryErrorResult,
  buildDeliverySuccessResult,
  normalizeProviderError,
} from "../result";

let twilioClient = null;

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    throw new Error("Missing TWILIO_ACCOUNT_SID.");
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("Missing TWILIO_AUTH_TOKEN.");
  }

  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  return twilioClient;
}

function getStatusCallbackUrl() {
  const explicit = process.env.TWILIO_STATUS_CALLBACK_URL;
  if (explicit) {
    return explicit;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/webhooks/twilio/status`;
}

function buildTwilioPayload({ to, from, messagingServiceSid, text }) {
  const payload = {
    to,
    body: text,
  };

  const statusCallback = getStatusCallbackUrl();
  if (statusCallback) {
    payload.statusCallback = statusCallback;
  }

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  } else if (from) {
    payload.from = from;
  } else {
    throw new Error(
      "Twilio SMS requires either a from number or a messagingServiceSid."
    );
  }

  return payload;
}

export async function sendSmsVerificationWithTwilio({
  to,
  originalTo = to,
  rewritten = false,
  text,
  from = null,
  messagingServiceSid = null,
}) {
  try {
    const client = getTwilioClient();

    const payload = buildTwilioPayload({
      to,
      from,
      messagingServiceSid,
      text,
    });

    const message = await client.messages.create(payload);

    return buildDeliverySuccessResult({
      provider: "twilio",
      channel: "sms",
      mode: "twilio",
      to,
      originalTo,
      rewritten,
      providerMessageId: message?.sid || null,
      status: message?.status || "queued",
    });
  } catch (error) {
    const normalized = normalizeProviderError(error);

    return buildDeliveryErrorResult({
      provider: "twilio",
      channel: "sms",
      mode: "twilio",
      to,
      originalTo,
      rewritten,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });
  }
}