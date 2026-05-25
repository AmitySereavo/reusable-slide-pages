import crypto from "crypto";

export const GATED_ACCESS_COOKIE_NAME = "questionnaire_gated_access";

const isProduction = process.env.NODE_ENV === "production";

function getSecret() {
  const secret =
    process.env.GATED_SLIDE_ACCESS_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-gated-slide-access-secret-change-me";

  if (
    isProduction &&
    secret === "dev-only-gated-slide-access-secret-change-me"
  ) {
    throw new Error(
      "Set GATED_SLIDE_ACCESS_SECRET or AUTH_SECRET before using gated slide access in production."
    );
  }

  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function buildGatedAccessValue(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseGatedAccessValue(value) {
  if (!value || typeof value !== "string" || !value.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (
      typeof payload.expiresAt === "string" &&
      new Date(payload.expiresAt) < new Date()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildGatedAccessCookie(payload) {
  const value = buildGatedAccessValue(payload);

  return {
    name: GATED_ACCESS_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.expiresAt),
  };
}

export function buildExpiredGatedAccessCookie() {
  return {
    name: GATED_ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  };
}