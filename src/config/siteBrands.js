export const SITE_BRANDS = {
  paralifeTrees: {
    key: "paralifeTrees",
    displayName: "ParaLife Trees",
    fromName: "ParaLife Trees",
    fromEmail:
      process.env.PARALIFE_TREES_FROM_EMAIL || "paralifetrees@gmail.com",
    smtp: {
      host: process.env.PARALIFE_TREES_SMTP_HOST || process.env.SMTP_HOST || "",
      port: Number(
        process.env.PARALIFE_TREES_SMTP_PORT || process.env.SMTP_PORT || 587
      ),
      secure:
        String(
          process.env.PARALIFE_TREES_SMTP_SECURE ??
            process.env.SMTP_SECURE ??
            ""
        ) === "true",
      user: process.env.PARALIFE_TREES_SMTP_USER || "",
      pass: process.env.PARALIFE_TREES_SMTP_PASS || "",
    },
    domains: [
      "paralifetrees.com",
      "growguide.paralifetrees.com",
      "littleorchardnursery.paralifetrees.com",
    ],
  },
  amitySereavo: {
    key: "amitySereavo",
    displayName: "Amity Sereavo",
    fromName: "Amity Sereavo",
    fromEmail: process.env.AMITY_SEREAVO_FROM_EMAIL || "amitysereavo@gmail.com",
    smtp: {
      host: process.env.AMITY_SEREAVO_SMTP_HOST || process.env.SMTP_HOST || "",
      port: Number(
        process.env.AMITY_SEREAVO_SMTP_PORT || process.env.SMTP_PORT || 587
      ),
      secure:
        String(
          process.env.AMITY_SEREAVO_SMTP_SECURE ??
            process.env.SMTP_SECURE ??
            ""
        ) === "true",
      user: process.env.AMITY_SEREAVO_SMTP_USER || "",
      pass: process.env.AMITY_SEREAVO_SMTP_PASS || "",
    },
    domains: ["amitysereavo.com"],
  },
};

const AMITY_SLUGS = new Set([
  "invitation",
  "ticket-shop",
  "music-merch-shop",
  "ticket-purchase-assistant",
  "escape-album",
  "itasl",
  "artist-booking",
]);

const PARALIFE_SLUGS = new Set([
  "home-gardener-plant-giveaway",
  "little-orchard-shop",
  "seedling-shop",
  "garden-package",
  "callaloo",
  "affiliate-sign-up",
]);

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function getRequestHost(request) {
  if (!request) return "";

  try {
    const url = new URL(request.url);
    if (url.hostname) return url.hostname;
  } catch {
  }

  if (typeof request.headers?.get === "function") {
    return (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      ""
    );
  }

  return "";
}

export function getSiteBrandByKey(brandKey) {
  return SITE_BRANDS[brandKey] || null;
}

export function getSiteBrandByHost(host) {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) return null;

  return (
    Object.values(SITE_BRANDS).find((brand) =>
      brand.domains.some(
        (domain) =>
          normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
      )
    ) || null
  );
}

export function getSiteBrandByQuestionnaireSlug(slug) {
  const normalizedSlug = String(slug || "").trim();

  if (!normalizedSlug) return null;

  if (AMITY_SLUGS.has(normalizedSlug)) return SITE_BRANDS.amitySereavo;
  if (
    PARALIFE_SLUGS.has(normalizedSlug) ||
    normalizedSlug.endsWith("-grow-guide")
  ) {
    return SITE_BRANDS.paralifeTrees;
  }

  return null;
}

export function getEmailBrandForContext({
  brandKey = null,
  questionnaireSlug = null,
  request = null,
  host = null,
} = {}) {
  return (
    getSiteBrandByKey(brandKey) ||
    getSiteBrandByQuestionnaireSlug(questionnaireSlug) ||
    getSiteBrandByHost(host || getRequestHost(request)) ||
    SITE_BRANDS.paralifeTrees
  );
}

export function getEmailSenderForContext(context = {}) {
  const brand = getEmailBrandForContext(context);

  return {
    brandKey: brand.key,
    fromName: brand.fromName,
    fromEmail: brand.fromEmail,
    displayName: brand.displayName,
  };
}

export function getSmtpConfigForFromEmail(fromEmail) {
  const normalizedEmail = String(fromEmail || "").trim().toLowerCase();

  if (!normalizedEmail) return null;

  const brand = Object.values(SITE_BRANDS).find(
    (candidate) => candidate.fromEmail.toLowerCase() === normalizedEmail
  );

  if (!brand?.smtp?.user || !brand?.smtp?.pass) {
    return null;
  }

  return brand.smtp;
}
