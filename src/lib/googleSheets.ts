type SubmissionMirrorPayload = {
  secret: string;
  submissionId: string;
  createdAt: string;
  questionnaireSlug: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
  answers: Record<string, unknown>;
};

export async function mirrorSubmissionToGoogleSheets(
  payload: Omit<SubmissionMirrorPayload, "secret">
) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim();

  if (!webhookUrl) {
    return {
      attempted: false,
      ok: false,
      reason: "missing_webhook_url",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: webhookSecret || "",
      ...payload,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");

    throw new Error(
      `Google Sheets mirror failed: ${response.status} ${response.statusText}${
        responseText ? ` - ${responseText}` : ""
      }`
    );
  }

  return {
    attempted: true,
    ok: true,
  };
}