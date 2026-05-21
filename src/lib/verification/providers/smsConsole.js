import { buildDeliverySuccessResult } from "../result";

export async function sendSmsVerification({
  to,
  originalTo = to,
  rewritten = false,
  from = null,
  text,
  channel = "sms",
  provider = "sms-console",
  mode = "console",
}) {
  const label = channel === "whatsapp" ? "WHATSAPP" : "SMS";

  console.log(`\n=== ${label} VERIFICATION (${mode.toUpperCase()}) ===`);
  console.log("Provider:", provider);
  console.log("To:", to);
  console.log("Original To:", originalTo);

  if (from) {
    console.log("From:", from);
  }

  console.log("Message:");
  console.log(text);
  console.log("=== END VERIFICATION MESSAGE ===\n");

  return buildDeliverySuccessResult({
    provider,
    channel,
    mode,
    to,
    originalTo,
    rewritten,
    providerMessageId: null,
    status: "simulated",
  });
}