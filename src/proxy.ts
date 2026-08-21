import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_FUNNEL_SLUG = "home-gardener-plant-giveaway";
const DEFAULT_FUNNEL_PATH = "/gift";
const LITTLE_ORCHARD_SHOP_SLUG = "little-orchard-shop";
const LITTLE_ORCHARD_SHOP_PATH = "/shop";
const GARDEN_PACKAGE_SHOP_SLUG = "garden-package";
const GARDEN_PACKAGE_SHOP_PATH = "/gardenpackage";
const GROW_GUIDE_HUB_PATH = "/grow-guides";
const GROW_GUIDE_ROUTES = {
  "/lettuce": "lettuce-grow-guide",
  "/cabbage": "cabbage-grow-guide",
  "/cilantro": "cilantro-grow-guide",
  "/culinary-basil": "culinary-basil-grow-guide",
  "/dill": "dill-grow-guide",
  "/eggplant": "eggplant-grow-guide",
  "/lemon-balm": "lemon-balm-grow-guide",
  "/black-pepper": "black-pepper-grow-guide",
  "/green-onion": "green-onion-grow-guide",
  "/lychee": "lychee-grow-guide",
  "/marigold": "marigold-grow-guide",
  "/mint": "mint-grow-guide",
  "/orange-ortanique": "orange-ortanique-grow-guide",
  "/parsley": "parsley-grow-guide",
  "/rosemary": "rosemary-grow-guide",
  "/scotch-bonnet": "scotch-bonnet-grow-guide",
  "/slicing-tomato": "slicing-tomato-grow-guide",
  "/sweet-pepper": "sweet-pepper-grow-guide",
  "/tree-mint": "tree-mint-grow-guide",
  "/wax-apple": "wax-apple-grow-guide",
} as const;
const DEFAULT_GROW_GUIDE_HOSTS = ["growguide.paralifetrees.com"];
const AMITY_SEREAVO_HOSTS = ["amitysereavo.com", "www.amitysereavo.com"];
const AMITY_SEREAVO_ROUTES = {
  "/": "invitation",
  "/invitation": "invitation",
  "/tickets": "ticket-shop",
  "/ticket-shop": "ticket-shop",
  "/music-merch": "music-merch-shop",
  "/merch": "music-merch-shop",
  "/book-artist": "artist-booking",
  "/artist-booking": "artist-booking",
  "/itasl": "itasl",
  "/escape": "escape-album",
  "/escape-album": "escape-album",
} as const;

function getConfiguredFunnelHosts() {
  return String(
    process.env.PUBLIC_FUNNEL_HOSTS ||
      process.env.NEXT_PUBLIC_FUNNEL_HOSTS ||
      ""
  )
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function getConfiguredGrowGuideHosts() {
  const configured = String(
    process.env.PUBLIC_GROW_GUIDE_HOSTS ||
      process.env.NEXT_PUBLIC_GROW_GUIDE_HOSTS ||
      ""
  )
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_GROW_GUIDE_HOSTS;
}

function normalizeHost(hostHeader: string | null) {
  return String(hostHeader || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function normalizePublicPath(path: string | undefined) {
  const trimmed = String(path || DEFAULT_FUNNEL_PATH).trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function isStaticOrInternalPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/media/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap")
  );
}

function isAllowedGrowGuidePath(pathname: string) {
  const guidePaths = Object.keys(GROW_GUIDE_ROUTES);
  const guideSlugs = Object.values(GROW_GUIDE_ROUTES);

  return (
    pathname === GROW_GUIDE_HUB_PATH ||
    pathname === "/api/session" ||
    pathname === "/api/grow-guide-links/track" ||
    pathname === "/privacy-policy" ||
    pathname === "/terms" ||
    pathname.startsWith("/guide-link/") ||
    guidePaths.some(
      (guidePath) => pathname === guidePath || pathname.startsWith(`${guidePath}/`)
    ) ||
    guideSlugs.some(
      (slug) =>
        pathname === `/questionnaire/${slug}` ||
        pathname.startsWith(`/questionnaire/${slug}/`)
    )
  );
}

function isAllowedAmityPath(pathname: string) {
  const amitySlugs = new Set(Object.values(AMITY_SEREAVO_ROUTES));

  return (
    pathname === "/api/session" ||
    pathname === "/api/questionnaires/submit" ||
    pathname === "/api/questionnaires/gated-access/status" ||
    pathname === "/api/questionnaires/visitor-state/clear" ||
    pathname === "/api/questionnaires/engagement/sequence-access" ||
    pathname === "/api/invitation/orders/create" ||
    pathname === "/api/verify/start" ||
    pathname === "/api/verify/consume-link" ||
    pathname === "/api/login" ||
    pathname === "/api/logout" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/forgot-password/code" ||
    pathname === "/reset-password" ||
    pathname === "/verify" ||
    pathname === "/verify/link-sent" ||
    pathname === "/verify/verified-lead" ||
    pathname === "/privacy-policy" ||
    pathname === "/terms" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/api/dashboard/") ||
    pathname.startsWith("/api/password/") ||
    pathname.startsWith("/api/auth/temporary-lead-account") ||
    pathname.startsWith("/order-status/") ||
    pathname.startsWith("/receipt/") ||
    pathname.startsWith("/api/plant-shop/orders/") ||
    pathname.startsWith("/api/plant-shop/receipt-lookup") ||
    pathname.startsWith("/questionnaire/auth-") ||
    Array.from(amitySlugs).some(
      (slug) =>
        pathname === `/questionnaire/${slug}` ||
        pathname.startsWith(`/questionnaire/${slug}/`)
    )
  );
}

function isAllowedGiveawayPath(
  pathname: string,
  slug: string,
  publicPath: string
) {
  const allowedExactPaths = new Set([
    "/",
    publicPath,
    LITTLE_ORCHARD_SHOP_PATH,
    GARDEN_PACKAGE_SHOP_PATH,
    `/questionnaire/${slug}`,
    `/questionnaire/${LITTLE_ORCHARD_SHOP_SLUG}`,
    `/questionnaire/${GARDEN_PACKAGE_SHOP_SLUG}`,
    "/api/questionnaires/submit",
    "/api/questionnaires/garden-package/catalog",
    "/api/plant-shop/orders",
    "/api/session",
    "/api/login",
    "/api/logout",
    "/api/questionnaires/gated-access/status",
    "/api/questionnaires/visitor-state/clear",
    "/verify",
    "/verify/link-sent",
    "/verify/verified-lead",
    "/login",
    "/forgot-password",
    "/forgot-password/code",
    "/reset-password",
    "/receipt",
    "/privacy-policy",
    "/terms",
    "/admin/event-orders",
    "/dashboard",
    "/dashboard/orders",
    "/api/dashboard/orders",
  ]);

  return (
    allowedExactPaths.has(pathname) ||
    pathname.startsWith(`/questionnaire/${slug}/`) ||
    pathname.startsWith(`/questionnaire/${LITTLE_ORCHARD_SHOP_SLUG}/`) ||
    pathname.startsWith(`/questionnaire/${GARDEN_PACKAGE_SHOP_SLUG}/`) ||
    pathname.startsWith("/questionnaire/auth-") ||
    pathname.startsWith(`${publicPath}/`) ||
    pathname.startsWith(`${LITTLE_ORCHARD_SHOP_PATH}/`) ||
    pathname.startsWith(`${GARDEN_PACKAGE_SHOP_PATH}/`) ||
    pathname.startsWith("/order-status/") ||
    pathname.startsWith("/receipt/") ||
    pathname.startsWith("/api/plant-shop/orders/") ||
    pathname.startsWith("/api/plant-shop/receipt-lookup") ||
    pathname.startsWith("/api/password/") ||
    pathname.startsWith("/admin/event-orders/order/") ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/api/dashboard/") ||
    pathname.startsWith("/api/verify/") ||
    pathname.startsWith("/api/auth/temporary-lead-account")
  );
}

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host"));
  const { pathname } = request.nextUrl;
  const growGuideHosts = getConfiguredGrowGuideHosts();

  if (growGuideHosts.includes(host)) {
    if (isStaticOrInternalPath(pathname)) {
      return NextResponse.next();
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = GROW_GUIDE_HUB_PATH;
      return NextResponse.rewrite(url);
    }

    const growGuideSlug =
      GROW_GUIDE_ROUTES[
        Object.keys(GROW_GUIDE_ROUTES).find(
          (guidePath) =>
            pathname === guidePath || pathname.startsWith(`${guidePath}/`)
        ) as keyof typeof GROW_GUIDE_ROUTES
      ];

    if (growGuideSlug) {
      const url = request.nextUrl.clone();
      url.pathname = `/questionnaire/${growGuideSlug}`;
      return NextResponse.rewrite(url);
    }

    if (pathname === "/questionnaire") {
      const url = request.nextUrl.clone();
      url.pathname = GROW_GUIDE_HUB_PATH;
      return NextResponse.redirect(url);
    }

    if (isAllowedGrowGuidePath(pathname)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = GROW_GUIDE_HUB_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (AMITY_SEREAVO_HOSTS.includes(host)) {
    if (isStaticOrInternalPath(pathname)) {
      return NextResponse.next();
    }

    const amitySlug =
      AMITY_SEREAVO_ROUTES[
        Object.keys(AMITY_SEREAVO_ROUTES).find(
          (routePath) =>
            pathname === routePath || pathname.startsWith(`${routePath}/`)
        ) as keyof typeof AMITY_SEREAVO_ROUTES
      ];

    if (amitySlug) {
      const url = request.nextUrl.clone();
      url.pathname = `/questionnaire/${amitySlug}`;
      return NextResponse.rewrite(url);
    }

    if (pathname === "/questionnaire") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (isAllowedAmityPath(pathname)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const funnelHosts = getConfiguredFunnelHosts();

  if (!funnelHosts.length) {
    return NextResponse.next();
  }

  if (!funnelHosts.includes(host)) {
    return NextResponse.next();
  }

  const slug =
    process.env.PUBLIC_FUNNEL_SLUG ||
    process.env.NEXT_PUBLIC_FUNNEL_SLUG ||
    DEFAULT_FUNNEL_SLUG;
  const publicPath = normalizePublicPath(
    process.env.PUBLIC_FUNNEL_PATH || process.env.NEXT_PUBLIC_FUNNEL_PATH
  );

  if (isStaticOrInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = publicPath;
    return NextResponse.redirect(url);
  }

  if (pathname === publicPath || pathname.startsWith(`${publicPath}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = `/questionnaire/${slug}`;
    return NextResponse.rewrite(url);
  }

  if (
    pathname === LITTLE_ORCHARD_SHOP_PATH ||
    pathname.startsWith(`${LITTLE_ORCHARD_SHOP_PATH}/`)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/questionnaire/${LITTLE_ORCHARD_SHOP_SLUG}`;
    return NextResponse.rewrite(url);
  }

  if (
    pathname === GARDEN_PACKAGE_SHOP_PATH ||
    pathname.startsWith(`${GARDEN_PACKAGE_SHOP_PATH}/`)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/questionnaire/${GARDEN_PACKAGE_SHOP_SLUG}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/questionnaire") {
    const url = request.nextUrl.clone();
    url.pathname = publicPath;
    return NextResponse.redirect(url);
  }

  if (pathname === "/dasboard" || pathname.startsWith("/dasboard/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/dasboard/, "/dashboard");
    return NextResponse.redirect(url);
  }

  if (isAllowedGiveawayPath(pathname, slug, publicPath)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|media/|images/|assets/|manifest).*)",
  ],
};
