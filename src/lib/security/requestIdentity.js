import crypto from "crypto";
import { headers } from "next/headers";

function firstHeaderValue(value) {
  return (
    String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] || null
  );
}

function getIdentitySecret() {
  return (
    process.env.DEVICE_IDENTITY_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-device-identity-secret-change-me"
  );
}

function hashValue(value) {
  return crypto
    .createHmac("sha256", getIdentitySecret())
    .update(String(value || ""))
    .digest("hex");
}

export async function getRequestIdentity() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress =
    firstHeaderValue(forwardedFor) ||
    headerStore.get("x-real-ip") ||
    headerStore.get("cf-connecting-ip") ||
    null;
  const userAgent = headerStore.get("user-agent") || "";
  const acceptLanguage = headerStore.get("accept-language") || "";
  const platform =
    headerStore.get("sec-ch-ua-platform") ||
    headerStore.get("x-device-platform") ||
    "";
  const city =
    headerStore.get("x-vercel-ip-city") ||
    headerStore.get("cf-ipcity") ||
    null;
  const region =
    headerStore.get("x-vercel-ip-country-region") ||
    headerStore.get("cf-region") ||
    null;
  const country =
    headerStore.get("x-vercel-ip-country") ||
    headerStore.get("cf-ipcountry") ||
    null;
  const timezone = headerStore.get("x-vercel-ip-timezone") || null;
  const deviceBasis = [userAgent, acceptLanguage, platform].join("|");

  return {
    deviceKey: hashValue(deviceBasis),
    ipHash: ipAddress ? hashValue(ipAddress) : null,
    ipAddress,
    userAgent,
    acceptLanguage,
    platform,
    location: {
      city,
      region,
      country,
      timezone,
    },
  };
}
