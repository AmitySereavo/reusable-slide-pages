import { sendVerificationDelivery } from "@/lib/verification/delivery";

export const ESCAPE_ALBUM_ACCESS_TARGET = "escapeAlbumAccess";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBaseUrlFromRequest(request: Request | null) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  const origin = request?.headers?.get("origin");

  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function getBaseUrlFromOrigin(origin: string) {
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function orderIncludesEscapeAlbumAccess(resolvedLines: unknown) {
  if (!Array.isArray(resolvedLines)) {
    return false;
  }

  return resolvedLines.some((line) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      return false;
    }

    const record = line as Record<string, unknown>;

    return (
      record.productId === "escape-album-digital" ||
      record.sizeOptionId === "escape-album-full-download"
    );
  });
}

export async function sendEscapeAlbumAccessEmail({
  request = null,
  origin = "",
  purchaserEmail,
  purchaserName,
  temporaryPassword,
  accountWasCreated,
  temporaryPasswordWasIssued,
  questionnaireSlug,
  receiptLink = "",
}: {
  request?: Request | null;
  origin?: string;
  purchaserEmail: string;
  purchaserName?: string | null;
  temporaryPassword?: string | null;
  accountWasCreated?: boolean;
  temporaryPasswordWasIssued?: boolean;
  questionnaireSlug?: string | null;
  receiptLink?: string | null;
}) {
  const baseUrl = request
    ? getBaseUrlFromRequest(request)
    : getBaseUrlFromOrigin(origin);
  const albumUrl = `${baseUrl}/questionnaire/escape-album`;
  const loginUrl = `${baseUrl}/questionnaire/auth-login`;
  const forgotPasswordUrl = `${baseUrl}/questionnaire/auth-forgot-password`;

  return sendVerificationDelivery({
    identifier: purchaserEmail,
    delivery: "link",
    verifyUrl: albumUrl,
    target: ESCAPE_ALBUM_ACCESS_TARGET,
    successRedirect: "/questionnaire/escape-album",
    contextMetadata: {
      brandKey: "amitySereavo",
      questionnaireSlug,
      purpose: "escape-album-access",
      recipientName: purchaserName,
      albumUrl,
      receiptLink: asString(receiptLink) || "",
      loginUrl,
      forgotPasswordUrl,
      temporaryPassword,
      accountWasCreated,
      temporaryPasswordWasIssued,
    },
  });
}
