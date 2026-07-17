import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_FUNNEL_SLUG = "home-gardener-plant-giveaway";

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

function isStaticOrInternalPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap")
  );
}

function isAllowedGiveawayPath(pathname: string, slug: string) {
  const allowedExactPaths = new Set([
    "/",
    "/questionnaire",
    `/questionnaire/${slug}`,
    "/api/questionnaires/submit",
    "/api/session",
    "/api/questionnaires/gated-access/status",
    "/api/questionnaires/visitor-state/clear",
    "/verify",
    "/verify/link-sent",
    "/verify/verified-lead",
    "/privacy-policy",
    "/terms",
  ]);

  return (
    allowedExactPaths.has(pathname) ||
    pathname.startsWith(`/questionnaire/${slug}/`) ||
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
  const { pathname } = request.nextUrl;

  if (isStaticOrInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/questionnaire/${slug}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/questionnaire") {
    const url = request.nextUrl.clone();
    url.pathname = `/questionnaire/${slug}`;
    return NextResponse.redirect(url);
  }

  if (isAllowedGiveawayPath(pathname, slug)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/questionnaire/${slug}`;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
