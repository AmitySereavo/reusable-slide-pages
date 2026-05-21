import { buildDeliverySuccessResult } from "../result";

export async function sendEmailVerification({
  to,
  originalTo = to,
  rewritten = false,
  subject,
  text,
  html = null,
  from,
}) {
  console.log("EMAIL VERIFICATION");
  console.log({
    to,
    originalTo,
    rewritten,
    from,
    subject,
    text,
    html,
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