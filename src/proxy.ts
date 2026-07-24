import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_FUNNEL_SLUG = "home-gardener-plant-giveaway";
const DEFAULT_FUNNEL_PATH = "/gift";
const LITTLE_ORCHARD_SHOP_SLUG = "little-orchard-shop";
const LITTLE_ORCHARD_SHOP_PATH = "/shop";

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

function isAllowedGiveawayPath(
  pathname: string,
  slug: string,
  publicPath: string
) {
  const allowedExactPaths = new Set([
    "/",
    publicPath,
    LITTLE_ORCHARD_SHOP_PATH,
    `/questionnaire/${slug}`,
    `/questionnaire/${LITTLE_ORCHARD_SHOP_SLUG}`,
    "/api/questionnaires/submit",
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
    pathname.startsWith(`${publicPath}/`) ||
    pathname.startsWith(`${LITTLE_ORCHARD_SHOP_PATH}/`) ||
    pathname.startsWith("/order-status/") ||
    pathname.startsWith("/api/plant-shop/orders/") ||
    pathname.startsWith("/api/password/") ||
    pathname.startsWith("/admin/event-orders/order/") ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/api/dashboard/") ||
    pathname.startsWith("/api/verify/") ||
    pathname.startsWith("/api/auth/temporary-lead-account")
  );
}

export function proxy(request: NextRequest) {
  const funnelHosts = getConfiguredFunnelHosts();

  if (!funnelHosts.length) {
    return NextResponse.next();
  }

  const host = normalizeHost(request.headers.get("host"));

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
  const { pathname } = request.nextUrl;

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

  if (pathname === "/questionnaire") {
    const url = request.nextUrl.clone();
    url.pathname = publicPath;
    return NextResponse.redirect(url);
  }

  if (isAllowedGiveawayPath(pathname, slug, publicPath)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = publicPath;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|media/|images/|assets/|manifest).*)",
  ],
};
