export function buildDeliverySuccessResult({
  provider,
  channel,
  mode,
  to,
  originalTo,
  rewritten = false,
  providerMessageId = null,
  status = "sent",
}) {
  return {
    ok: true,
    provider,
    channel,
    mode,
    to,
    originalTo,
    rewritten,
    providerMessageId,
    status,
    error: null,
  };
}

export function buildDeliveryErrorResult({
  provider,
  channel,
  mode,
  to,
  originalTo,
  rewritten = false,
  code = null,
  message,
  category = "unknown",
}) {
  return {
    ok: false,
    provider,
    channel,
    mode,
    to,
    originalTo,
    rewritten,
    providerMessageId: null,
    status: "failed",
    error: {
      code,
      message,
      category,
    },
  };
}

export function normalizeProviderError(error) {
  const message = error?.message || "Unknown delivery error";
  const lower = String(message).toLowerCase();

  let category = "unknown";
  if (
    lower.includes("api key") ||
    lower.includes("unauthorized") ||
    lower.includes("authentication")
  ) {
    category = "auth";
  } else if (
    lower.includes("validation") ||
    lower.includes("verified domain") ||
    lower.includes("invalid")
  ) {
    category = "validation";
  } else if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("provider")
  ) {
    category = "provider";
  }

  return {
    code: error?.code || null,
    message,
    category,
  };
}