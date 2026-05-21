import {
  buildDeliveryErrorResult,
  buildDeliverySuccessResult,
  normalizeProviderError,
} from "../result";

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN.");
  }

  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID.");
  }

  return {
    accessToken,
    phoneNumberId,
  };
}

function getGraphApiUrl(phoneNumberId) {
  return `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
}

function buildWhatsAppTextPayload({ to, text }) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };
}

function buildTemplateBodyParameters({ code, verifyUrl, text }) {
  if (code) {
    return [
      {
        type: "text",
        text: String(code),
      },
    ];
  }

  if (verifyUrl) {
    return [
      {
        type: "text",
        text: String(verifyUrl),
      },
    ];
  }

  return [
    {
      type: "text",
      text: String(text || ""),
    },
  ];
}

function buildWhatsAppTemplatePayload({
  to,
  templateName,
  templateLanguage,
  code,
  verifyUrl,
  text,
}) {
  if (!templateName) {
    throw new Error("Missing WHATSAPP_AUTH_TEMPLATE_NAME.");
  }

  const bodyParameters = buildTemplateBodyParameters({
    code,
    verifyUrl,
    text,
  });

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLanguage || "en_US",
      },
      components: [
        {
          type: "body",
          parameters: bodyParameters,
        },
      ],
    },
  };
}

function buildWhatsAppPayload({
  to,
  text,
  code,
  verifyUrl,
  messageMode,
  templateName,
  templateLanguage,
}) {
  if (messageMode === "template") {
    return buildWhatsAppTemplatePayload({
      to,
      templateName,
      templateLanguage,
      code,
      verifyUrl,
      text,
    });
  }

  return buildWhatsAppTextPayload({ to, text });
}

export async function sendWhatsAppVerificationWithMeta({
  to,
  originalTo = to,
  rewritten = false,
  text,
  code = null,
  verifyUrl = null,
  messageMode = "text",
  templateName = "",
  templateLanguage = "en_US",
}) {
  try {
    const { accessToken, phoneNumberId } = getWhatsAppConfig();

    const response = await fetch(getGraphApiUrl(phoneNumberId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildWhatsAppPayload({
          to,
          text,
          code,
          verifyUrl,
          messageMode,
          templateName,
          templateLanguage,
        })
      ),
    });

    const data = await response.json();

    if (!response.ok) {
      const normalized = normalizeProviderError(
        data?.error || new Error("WhatsApp API request failed.")
      );

      return buildDeliveryErrorResult({
        provider: "meta-whatsapp",
        channel: "whatsapp",
        mode: "meta",
        to,
        originalTo,
        rewritten,
        code: normalized.code,
        message: normalized.message,
        category: normalized.category,
      });
    }

    return buildDeliverySuccessResult({
      provider: "meta-whatsapp",
      channel: "whatsapp",
      mode: "meta",
      to,
      originalTo,
      rewritten,
      providerMessageId: data?.messages?.[0]?.id || null,
      status: "sent",
    });
  } catch (error) {
    const normalized = normalizeProviderError(error);

    return buildDeliveryErrorResult({
      provider: "meta-whatsapp",
      channel: "whatsapp",
      mode: "meta",
      to,
      originalTo,
      rewritten,
      code: normalized.code,
      message: normalized.message,
      category: normalized.category,
    });
  }
}